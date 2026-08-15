// 表情包：内置 emoji 表情 + 用户上传的自定义表情包图片（存 localStorage）
const KEY = "aicomp.stickers.v1";

export const DEFAULT_STICKERS = ["😂", "👍", "❤️", "😭", "🥹", "🐱", "🦊", "😡", "🤡", "💔", "👌", "🙏"];

export function loadStickers() {
  try {
    const custom = JSON.parse(localStorage.getItem(KEY) || "[]");
    return [...DEFAULT_STICKERS, ...custom];
  } catch {
    return [...DEFAULT_STICKERS];
  }
}

export function addSticker(dataUrl) {
  const custom = JSON.parse(localStorage.getItem(KEY) || "[]");
  if (custom.length >= 20) throw new Error("自定义表情包最多 20 个");
  custom.push(dataUrl);
  localStorage.setItem(KEY, JSON.stringify(custom));
  return [...DEFAULT_STICKERS, ...custom];
}