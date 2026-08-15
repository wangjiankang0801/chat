// 前端展示用的供应商列表（与 server/providers 保持一致，核心逻辑统一走后端代理）
export const PROVIDERS = [
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com", type: "openai-compatible", models: ["deepseek-v4-flash", "deepseek-v4-pro"] },
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", type: "openai-compatible", models: ["gpt-4o", "gpt-4o-mini"] },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", type: "openai-compatible", models: [] },
  { id: "siliconflow", name: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", type: "openai-compatible", models: [] },
  { id: "anthropic", name: "Anthropic Claude", baseUrl: "https://api.anthropic.com", type: "anthropic", models: ["claude-sonnet-4-5", "claude-opus-4-1"] },
  { id: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", type: "gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  { id: "custom", name: "自定义（OpenAI 兼容）", baseUrl: "", type: "openai-compatible", models: [] },
];