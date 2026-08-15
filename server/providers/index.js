// 供应商注册表：接入新模型只需在这里加一条，路由层按 type 分发
//
// type 说明：
//   openai-compatible -> POST {baseUrl}{chatPath}，body: { model, messages, stream, ... }
//   anthropic         -> POST {baseUrl}{chatPath}，body: { model, messages, system, stream, ... }（headers: x-api-key）
//   gemini            -> POST {baseUrl}{chatPath}，body: { contents, ... }（key 走 query 参数）
// 注：models 只是前端提示用的候选列表，实际以各家平台为准，用户可手填任意模型名。

export const providers = {
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    type: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    chatPath: "/chat/completions",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"],
    defaultModel: "deepseek-v4-flash",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    type: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    chatPath: "/chat/completions",
    models: ["gpt-4o", "gpt-4o-mini"],
    defaultModel: "gpt-4o",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    chatPath: "/chat/completions",
    models: [],
    defaultModel: "",
  },
  siliconflow: {
    id: "siliconflow",
    name: "硅基流动",
    type: "openai-compatible",
    baseUrl: "https://api.siliconflow.cn/v1",
    chatPath: "/chat/completions",
    models: [],
    defaultModel: "",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com",
    chatPath: "/v1/messages",
    models: ["claude-sonnet-4-5", "claude-opus-4-1"],
    defaultModel: "claude-sonnet-4-5",
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    type: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    chatPath: "/models/gemini-2.5-flash:streamGenerateContent",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
    defaultModel: "gemini-2.5-flash",
  },
  custom: {
    id: "custom",
    name: "自定义（OpenAI 兼容）",
    type: "openai-compatible",
    baseUrl: "",
    chatPath: "/chat/completions",
    models: [],
    defaultModel: "",
  },
};

export function getProvider(id) {
  return providers[id] ?? null;
}