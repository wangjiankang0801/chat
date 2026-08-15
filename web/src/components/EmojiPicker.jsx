import { useRef, useState } from "react";
import { loadStickers, addSticker } from "../store/stickers.js";
import { readFileAsDataURL, downscaleImage } from "../lib/image.js";

const EMOJIS = [
  "😀", "😄", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘",
  "😜", "🤪", "😎", "🤩", "🥳", "😏", "😢", "😭", "😤", "😡", "🤯", "😴",
  "🥺", "😳", "🤔", "🤫", "🤭", "😶", "🙄", "😬", "🥹", "🤗", "🤤", "😱",
  "🤡", "💀", "👻", "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤙", "👏", "🙏",
  "💪", "🫶", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💖", "💯", "🔥",
  "✨", "🎉", "🎂", "🍺", "☕", "🐱", "🦊", "🐶", "🐼", "🌸", "🌙", "⚡",
];

export default function EmojiPicker({ onInsertEmoji, onSendSticker }) {
  const [tab, setTab] = useState("emoji");
  const [stickers, setStickers] = useState(loadStickers());
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      const small = await downscaleImage(dataUrl, 512, 0.85);
      setStickers(addSticker(small));
    } catch (err) {
      alert(err.message || "添加表情包失败");
    }
  }

  return (
    <div className="emoji-panel">
      <div className="emoji-tabs">
        <button className={tab === "emoji" ? "emoji-tab active" : "emoji-tab"} onClick={() => setTab("emoji")}>Emoji</button>
        <button className={tab === "sticker" ? "emoji-tab active" : "emoji-tab"} onClick={() => setTab("sticker")}>表情包</button>
      </div>

      {tab === "emoji" ? (
        <div className="emoji-grid">
          {EMOJIS.map((e) => (
            <button key={e} className="emoji-cell" onClick={() => onInsertEmoji(e)}>{e}</button>
          ))}
        </div>
      ) : (
        <>
          <div className="sticker-grid">
            {stickers.map((s, i) =>
              s.startsWith("data:") ? (
                <button key={i} className="sticker-item" onClick={() => onSendSticker(s)}>
                  <img src={s} alt="表情包" />
                </button>
              ) : (
                <button key={i} className="sticker-item emoji" onClick={() => onSendSticker(s)}>{s}</button>
              ),
            )}
            <button className="sticker-item add" onClick={() => fileRef.current?.click()}>＋</button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}