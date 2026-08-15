// 调后端 /api/chat 并解析 SSE 流，边收边回调
export async function streamChat({ provider, apiKey, baseUrl, model, messages, signal, onDelta, onError }) {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey, baseUrl, model, messages, stream: true }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `请求失败 (HTTP ${resp.status})`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let data;
      try {
        data = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (data.type === "delta") {
        onDelta?.(data.text ?? "");
      } else if (data.type === "error") {
        onError?.(data.message || "未知错误");
        throw new Error(data.message || "未知错误");
      }
      // "done" 自然结束
    }
  }
}