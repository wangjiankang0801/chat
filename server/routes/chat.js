import { Router } from "express";
import { getProvider } from "../providers/index.js";

const router = Router();

// 统一 SSE 事件：data: {"type":"delta","text":"..."} / {"type":"done"} / {"type":"error","message":"..."}
function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function readUpstreamSSE(reader, decoder, onData) {
  // 逐块读取上游 SSE，把每条 data: 的 JSON 交给 onData
  return new Promise((resolve, reject) => {
    let buf = "";
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop();
          for (const part of parts) {
            const line = part.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              onData(JSON.parse(data));
            } catch { /* 忽略无法解析的行 */ }
          }
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    })();
  });
}

// ---- OpenAI 兼容（DeepSeek / OpenAI / OpenRouter / 硅基流动 / 自定义） ----
async function streamOpenAICompatible(res, provider, apiKey, body) {
  const url = provider.baseUrl + provider.chatPath;
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      stream: true,
      temperature: body.temperature ?? 0.8,
      max_tokens: body.maxTokens ?? 2048,
    }),
  });
  if (!upstream.ok) {
    const text = (await upstream.text()).slice(0, 300);
    throw new Error(`上游返回 ${upstream.status}: ${text}`);
  }
  await readUpstreamSSE(upstream.body.getReader(), new TextDecoder(), (json) => {
    const delta = json.choices?.[0]?.delta?.content;
    if (delta) sse(res, { type: "delta", text: delta });
  });
}

// ---- Anthropic Claude ----
async function streamAnthropic(res, provider, apiKey, body) {
  let system = "";
  const messages = [];
  for (const m of body.messages) {
    if (m.role === "system") {
      system = (system ? system + "\n" : "") + (typeof m.content === "string" ? m.content : "");
      continue;
    }
    const content = Array.isArray(m.content)
      ? m.content.map((part) => {
          if (part.type === "image_url" && part.image_url?.url?.startsWith("data:")) {
            const match = part.image_url.url.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
            if (match) {
              return { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } };
            }
          }
          return { type: "text", text: part.text ?? "" };
        })
      : m.content;
    messages.push({ role: m.role === "assistant" ? "assistant" : "user", content });
  }
  const upstream = await fetch(provider.baseUrl + provider.chatPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: body.maxTokens ?? 2048,
      temperature: body.temperature ?? 0.8,
      system: system || undefined,
      messages,
      stream: true,
    }),
  });
  if (!upstream.ok) {
    const text = (await upstream.text()).slice(0, 300);
    throw new Error(`上游返回 ${upstream.status}: ${text}`);
  }
  await readUpstreamSSE(upstream.body.getReader(), new TextDecoder(), (json) => {
    if (json.type === "content_block_delta" && json.delta?.type === "text_delta" && json.delta.text) {
      sse(res, { type: "delta", text: json.delta.text });
    }
  });
}

// ---- Google Gemini ----
async function streamGemini(res, provider, apiKey, body) {
  const system = body.messages.find((m) => m.role === "system");
  const contents = body.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: Array.isArray(m.content)
        ? m.content.map((part) => {
            if (part.type === "image_url" && part.image_url?.url?.startsWith("data:")) {
              const match = part.image_url.url.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
              if (match) return { inline_data: { mime_type: match[1], data: match[2] } };
            }
            return { text: part.text ?? "" };
          })
        : [{ text: m.content ?? "" }],
    }));
  const url = `${provider.baseUrl}/models/${encodeURIComponent(body.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: typeof system.content === "string" ? system.content : "" }] } : undefined,
      generationConfig: { temperature: body.temperature ?? 0.8, maxOutputTokens: body.maxTokens ?? 2048 },
    }),
  });
  if (!upstream.ok) {
    const text = (await upstream.text()).slice(0, 300);
    throw new Error(`上游返回 ${upstream.status}: ${text}`);
  }
  await readUpstreamSSE(upstream.body.getReader(), new TextDecoder(), (json) => {
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (text) sse(res, { type: "delta", text });
  });
}

router.post("/", async (req, res) => {
  const { provider: providerId, apiKey, baseUrl, model, messages, temperature, maxTokens } = req.body ?? {};

  const provider = getProvider(providerId);
  if (!provider) return res.status(400).json({ error: `未知供应商: ${providerId}` });
  if (!apiKey) return res.status(400).json({ error: "缺少 apiKey" });
  if (!model) return res.status(400).json({ error: "缺少 model" });
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: "messages 不能为空" });

  let finalBaseUrl = provider.baseUrl;
  if (provider.id === "custom") {
    if (!baseUrl) return res.status(400).json({ error: "自定义供应商需要 baseUrl" });
    finalBaseUrl = baseUrl;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const body = { model, messages, temperature, maxTokens };
  try {
    if (provider.type === "anthropic") {
      await streamAnthropic(res, { ...provider, baseUrl: finalBaseUrl }, apiKey, body);
    } else if (provider.type === "gemini") {
      await streamGemini(res, { ...provider, baseUrl: finalBaseUrl }, apiKey, body);
    } else {
      await streamOpenAICompatible(res, { ...provider, baseUrl: finalBaseUrl }, apiKey, body);
    }
    sse(res, { type: "done" });
  } catch (err) {
    sse(res, { type: "error", message: err.message || "请求失败" });
  } finally {
    res.end();
  }
});

export default router;