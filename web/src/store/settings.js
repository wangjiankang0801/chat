// 设置持久化：API Key、默认供应商/模型，只存在浏览器 localStorage，服务端不保存
const KEY = "aicomp.settings.v1";

const DEFAULTS = {
  apiKeys: {},            // { deepseek: "sk-xxx", openai: "sk-xxx", ... }
  defaultProvider: "deepseek",
  defaultModel: "deepseek-v4-flash",
};

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}