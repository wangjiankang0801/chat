// 对话记录：按 personaId 分组，只存浏览器 localStorage
const KEY = "aicomp.chats.v1";
const MAX_PER_CHAT = 200; // 本地保留上限，防止 localStorage 撑爆

export function loadChats() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveChats(chats) {
  localStorage.setItem(KEY, JSON.stringify(chats));
}

export function getChat(personaId) {
  return loadChats()[personaId] ?? [];
}

export function appendMessage(personaId, message) {
  const chats = loadChats();
  const list = chats[personaId] ?? [];
  list.push(message);
  if (list.length > MAX_PER_CHAT) list.splice(0, list.length - MAX_PER_CHAT);
  chats[personaId] = list;
  saveChats(chats);
  return list;
}