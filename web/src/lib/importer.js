// 聊天记录导入：解析文本 → 识别说话人 → 生成人设
// 支持的常见格式（每行一条）：
//   2024/05/01 12:34 张三: 今天好累啊
//   张三: 今天好累啊
//   我：摸摸头
// 也支持没有时间戳的纯 "说话人：内容" 格式

export function parseChatText(text) {
  const turns = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(
      /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s+)?([^:：]{1,12})[：:]\s*(.*)$/,
    );
    if (m && m[2] && m[1].trim() && !/^\d{4}[-/]/.test(m[1])) {
      turns.push({ speaker: m[1].trim(), content: m[2].trim() });
    }
  }
  return turns;
}

export function detectSpeakers(turns) {
  const counts = {};
  for (const t of turns) counts[t.speaker] = (counts[t.speaker] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));
}

export function buildPersonaFromTurns(turns, personaSpeaker) {
  const ta = turns.filter((t) => t.speaker === personaSpeaker);
  const others = turns.filter((t) => t.speaker !== personaSpeaker);

  // 提取「对方说话 → TA 回复」的回合作为示例
  const pairs = [];
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].speaker === personaSpeaker && turns[i - 1].speaker !== personaSpeaker) {
      pairs.push({ user: turns[i - 1].content, assistant: turns[i].content });
    }
  }
  // 均匀采样最多 8 条，作为 few-shot 示例
  const sampled = [];
  const n = Math.min(8, pairs.length);
  if (n > 0) {
    const step = pairs.length / n;
    for (let k = 0; k < n; k++) sampled.push(pairs[Math.min(pairs.length - 1, Math.floor(k * step))]);
  }

  const style = extractStyle(ta);

  return {
    name: personaSpeaker,
    avatar: "💬",
    description: `由聊天记录生成：TA 说了 ${ta.length} 条，共解析 ${turns.length} 条消息`,
    systemPrompt:
      `你是「${personaSpeaker}」。以下是从你和用户之间的真实聊天记录中提炼出的角色设定。` +
      `请完全以 ${personaSpeaker} 的身份、语气和说话习惯回复用户，用第一人称，自然、亲切，` +
      `不要提及自己是人工智能或语言模型。${style.summary}`,
    styleTags: style.tags,
    examples: sampled,
    memory: "",
    createdAt: Date.now(),
  };
}

function extractStyle(taMsgs) {
  const texts = taMsgs.map((t) => t.content).filter(Boolean);
  const totalLen = texts.reduce((s, t) => s + t.length, 0);
  const avg = texts.length ? Math.round(totalLen / texts.length) : 0;
  const joined = texts.join("");
  const emojiCount = joined.match(/[\p{Extended_Pictographic}]/gu)?.length || 0;

  const tags = [];
  if (avg < 15) tags.push("简短");
  else if (avg > 60) tags.push("话痨");
  else tags.push("中等长度");
  if (emojiCount > texts.length * 0.3) tags.push("爱用表情");
  if (texts.some((t) => /哈哈|哈哈哈|嘿嘿|嘻嘻/.test(t))) tags.push("爱笑");
  if (texts.some((t) => /[？?]/.test(t))) tags.push("爱提问");

  const summary = `TA 的回复平均约 ${avg} 字${tags.length ? "，风格：\n" + tags.join("、") : ""}。`;
  return { tags, summary };
}