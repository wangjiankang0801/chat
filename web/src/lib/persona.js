import { VISION_PROVIDERS } from "../constants/providers.js";

// 把「人设 + 风格 + 记忆」组装成 System Prompt（人设注入的核心）
export function buildPersonaPrompt(persona) {
  const parts = [];
  if (persona?.systemPrompt?.trim()) parts.push(persona.systemPrompt.trim());
  if (persona?.styleTags?.length) parts.push(`说话风格：${persona.styleTags.join("、")}`);
  if (persona?.memory?.trim()) parts.push(`长期记忆 / 你们之间发生过的事：${persona.memory.trim()}`);
  parts.push("你就是角色本人，不是 AI 助手。请始终以角色的身份、语气和说话习惯自然地回复用户，用第一人称，不要提及自己是人工智能或语言模型。");
  return parts.join("\n\n");
}

function textParts(content, images, vision) {
  if (!vision || !images?.length) return content || "";
  return [
    ...(content ? [{ type: "text", text: content }] : []),
    ...images.map((url) => ({ type: "image_url", image_url: { url } })),
  ];
}

// 组装发给模型的完整 messages：system 人设 + 示例对话 + 近期历史 + 当前消息
export function buildMessages({ persona, history = [], content = "", images = [], provider = "deepseek", maxHistory = 30, maxExamples = 6 }) {
  const vision = VISION_PROVIDERS.includes(provider);
  const messages = [{ role: "system", content: buildPersonaPrompt(persona) }];

  // few-shot：示例对话，教模型「TA 怎么说话」
  for (const ex of (persona?.examples || []).slice(0, maxExamples)) {
    if (!ex.user || !ex.assistant) continue;
    messages.push({ role: "user", content: ex.user });
    messages.push({ role: "assistant", content: ex.assistant });
  }

  // 近期历史（跳过占位/空消息）
  const hist = history.filter((m) => !m.meta).slice(-maxHistory);
  for (const m of hist) {
    if (m.role === "user") {
      const c = m.content || (m.sticker ? `[表情]${m.sticker}` : "");
      messages.push({ role: "user", content: textParts(c, m.images, vision) });
    } else if (m.role === "assistant" && m.content) {
      messages.push({ role: "assistant", content: m.content });
    }
  }

  // 当前这条消息
  const cur = content || (images.length === 0 && content === "" ? "" : content);
  messages.push({ role: "user", content: textParts(cur, images, vision) });

  return messages;
}