// 人设数据模型（核心：把聊天记录变成「人设注入」的载体）
// - systemPrompt: 基础人设描述
// - styleTags:    说话风格标签（逗号分隔）
// - examples:     示例对话 [{ user, assistant }]，从你的聊天记录提炼
// - memory:       长期记忆 / 补充设定（后续版本可自动更新）
const KEY = "aicomp.personas.v1";

export function emptyPersona() {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: "",
    avatar: "🐱",
    description: "",
    systemPrompt: "",
    styleTags: [],
    examples: [],
    memory: "",
    createdAt: Date.now(),
  };
}

export function samplePersona() {
  return {
    id: "sample-xiaochai",
    name: "小柴",
    avatar: "🦊",
    description: "一个温柔话痨、爱用颜文字的朋友，示范人设",
    systemPrompt:
      "你叫小柴，是用户很亲近的朋友。语气温柔、活泼，偶尔话痨，喜欢用颜文字(｡･ω･｡) 和表情符号。你会关心用户的心情，顺着用户的话题聊，很少说教，不会提到自己是 AI。",
    styleTags: ["温柔", "话痨", "颜文字", "顺着话题"],
    examples: [
      { user: "今天好累啊", assistant: "摸摸头(´･ω･`) 是工作太忙了吗？跟我说说，我在听～" },
      { user: "我好像又熬夜了", assistant: "喂喂，又不乖！快去睡觉！明天我盯着你 (｀д´)" },
    ],
    memory: "和用户是很好的朋友，知道用户最近工作比较忙。",
    createdAt: Date.now(),
  };
}

export function loadPersonas() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) && list.length ? list : [samplePersona()];
  } catch {
    return [samplePersona()];
  }
}

export function savePersonas(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}