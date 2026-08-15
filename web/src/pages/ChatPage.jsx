import { useEffect, useRef, useState } from "react";
import { loadPersonas } from "../store/personas.js";
import { getChat, appendMessage } from "../store/chats.js";
import { readFileAsDataURL, downscaleImage, isImageAvatar } from "../lib/image.js";
import MessageBubble from "../components/MessageBubble.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";

const MAX_IMAGES = 3; // 单条消息最多图片数（微信风格）

export default function ChatPage() {
  const personas = loadPersonas();
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState([]); // 待发送图片 [{ id, dataUrl }]
  const [panel, setPanel] = useState(null);   // "emoji" | null
  const listRef = useRef(null);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  const persona = personas.find((p) => p.id === personaId);

  useEffect(() => {
    setMessages(getChat(personaId));
    setPending([]);
    setPanel(null);
  }, [personaId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  async function handleFiles(fileList) {
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) continue;
      if (pending.length >= MAX_IMAGES) {
        alert(`一次最多发 ${MAX_IMAGES} 张图片`);
        break;
      }
      try {
        const dataUrl = await readFileAsDataURL(file);
        const small = await downscaleImage(dataUrl, 1280, 0.85);
        setPending((p) => [...p, { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(), dataUrl: small }]);
      } catch {
        alert("图片读取失败");
      }
    }
  }

  function sendMessage(payload = {}) {
    if (sending) return;
    const content = (payload.content ?? text).trim();
    const images = payload.images ?? pending.map((p) => p.dataUrl);
    const sticker = payload.sticker ?? null;
    if (!content && images.length === 0 && !sticker) return;

    appendMessage(personaId, { role: "user", content, images, sticker, ts: Date.now() });
    setMessages(getChat(personaId));
    setText("");
    setPending([]);
    setPanel(null);
    setSending(true);

    // ============================================================
    // 框架阶段占位：核心对话逻辑待实现
    // 下一步实现：
    //   1. 组装 messages：人设 system prompt + 风格 + 示例 + 历史 + 当前消息
    //   2. 从 settings 取 provider/apiKey/model
    //   3. POST /api/chat（SSE 流式），边收边追加 assistant 气泡
    //   4. 图片：先只对支持多模态的模型传图，其余模型只传文字
    // ============================================================
    setTimeout(() => {
      appendMessage(personaId, {
        role: "assistant",
        content: "（框架预览）核心对话逻辑还没接上。下一步会把你的人设 + 历史 + 消息发给模型，并流式显示回复。",
        ts: Date.now(),
        meta: true,
      });
      setMessages(getChat(personaId));
      setSending(false);
    }, 400);
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-head-row">
          <div className="chat-head-avatar">
            {persona && isImageAvatar(persona.avatar) ? <img src={persona.avatar} alt="" className="chat-head-avatar-img" /> : (persona?.avatar || "🤖")}
          </div>
          <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className="persona-select">
            {personas.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {persona && <div className="chat-sub">{persona.description}</div>}
      </header>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>和「{persona?.name || "TA"}」开始聊天吧</p>
            <p className="empty-sub">先到「设置」填好 API Key，再到「人设」配好 TA 的样子</p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} avatar={persona?.avatar} />
        ))}
      </div>

      {pending.length > 0 && (
        <div className="pending-row">
          {pending.map((p) => (
            <div key={p.id} className="pending-chip">
              <img src={p.dataUrl} alt="" />
              <button className="pending-x" onClick={() => setPending((list) => list.filter((x) => x.id !== p.id))}>×</button>
            </div>
          ))}
        </div>
      )}

      {panel === "emoji" && (
        <EmojiPicker
          onInsertEmoji={(e) => setText((t) => t + e)}
          onSendSticker={(s) => sendMessage({ sticker: s })}
        />
      )}

      <div className="chat-input-bar">
        <button className="icon-btn" title="相册" onClick={() => galleryRef.current?.click()}>📎</button>
        <button className="icon-btn" title="拍照" onClick={() => cameraRef.current?.click()}>📷</button>
        <button className={panel === "emoji" ? "icon-btn active" : "icon-btn"} title="表情" onClick={() => setPanel(panel === "emoji" ? null : "emoji")}>😊</button>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <input
          className="chat-input"
          placeholder={sending ? "TA 正在输入…" : "说点什么…"}
          value={text}
          disabled={sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="btn primary" onClick={() => sendMessage()} disabled={sending || (!text.trim() && pending.length === 0)}>
          {sending ? "…" : "发送"}
        </button>
      </div>
    </div>
  );
}