import { Router } from "express";
import { getProvider } from "../providers/index.js";

const router = Router();

// ============================================================
// 聊天代理（框架阶段）
//
// 请求契约（核心逻辑阶段实现，契约已定，前端按此对接）：
//   POST /api/chat
//   {
//     provider: "deepseek" | "openai" | "openrouter" | "siliconflow" | "anthropic" | "gemini" | "custom",
//     apiKey:   "sk-xxx",                          // 仅本次请求携带，服务端不落盘
//     baseUrl:  "https://...",                     // 仅 provider=custom 时必填
//     model:    "deepseek-v4-flash",
//     messages: [{ role: "system"|"user"|"assistant", content: "..." }],  // 已含人设注入
//     stream:   true,                              // 统一走 SSE 流式
//     temperature: 0.8,
//     maxTokens: 2048
//   }
//
// 响应：stream=true 时以 SSE 流回（event: delta / done / error）
// ============================================================

router.post("/", (req, res) => {
  const { provider: providerId, apiKey, baseUrl, model, messages } = req.body ?? {};

  // —— 参数校验（框架阶段已就位） ——
  const provider = getProvider(providerId);
  if (!provider) {
    return res.status(400).json({ error: `未知供应商: ${providerId}` });
  }
  if (!apiKey) {
    return res.status(400).json({ error: "缺少 apiKey" });
  }
  if (!model) {
    return res.status(400).json({ error: "缺少 model" });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages 不能为空" });
  }
  if (provider.id === "custom" && !baseUrl) {
    return res.status(400).json({ error: "自定义供应商需要 baseUrl" });
  }

  // —— 核心逻辑（待实现，见 README 路线图） ——
  // 1. 按 provider.type 组装请求：
  //    openai-compatible: fetch(`${baseUrl}${chatPath}`, { headers: { Authorization: Bearer } })
  //    anthropic:         headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }
  //    gemini:            key 拼到 query：?key=xxx
  // 2. 使用 fetch + ReadableStream 把上游 SSE 转发给客户端
  // 3. 统一输出 { delta } / { done } / { error } 事件，前端流式渲染

  return res.status(501).json({
    error: "框架阶段：核心对话逻辑待实现",
    received: {
      provider: provider.id,
      model,
      messageCount: messages.length,
    },
    next: [
      "1. 按 provider.type 组装并转发请求（openai-compatible / anthropic / gemini）",
      "2. fetch 流式读取上游，SSE 回传客户端",
      "3. 接入人设注入与长对话压缩（前端已在组装 system 消息）",
    ],
  });
});

export default router;