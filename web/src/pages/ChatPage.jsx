import { useEffect, useRef, useState } from "react";
import { loadPersonas } from "../store/personas.js";
import { loadChats, saveChats, getChat } from "../store/chats.js";
import { loadSettings } from "../store/settings.js";
import { getProviderMeta } from "../constants/providers.js";
import { buildMessages } from "../lib/persona.js";
import { streamChat } from "../api/chat.js";
import { readFileAsDataURL, downscaleImage, isImageAvatar } from "../lib/image.js";
import MessageBubble from "../components/MessageBubble.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";

const MAX_IMAGES = 3;

export default function ChatPage() {
  const personas = loadPersonas();
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState([]);
  const [panel, setPanel] = useState(null);
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
  }, [messages, pending, sending]);

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

  async function sendMessage(payload = {}) {
    if (sending || !personaId) return;
    const content = (payload.content ?? text).trim();
    const images = payload.images ?? pending.map((p) => p.dataUrl);
    const sticker = payload.sticker ?? null;
    const userContent = sticker ? `[表情]${sticker}` : content;
    if (!userContent && images.length === 0) return;

    // —— 组装并保存用户消息 ——
    const chats = loadChats();
    const list = chats[personaId] ?? [];
    const userMsg = { role: "user", content: userContent, images, ts: Date.now() };
    const aiMsg = { role: "assistant", content: "", ts: Date.now() };
    list.push(userMsg, aiMsg);
    saveChats({ ...chats, [personaId]: list });
    setMessages(list);
    setText("");
    setPending([]);
    setPanel(null);
    setSending(true);

    // —— 真实对话核心 ——
    const settings = loadSettings();
    const provider = settings.defaultProvider || "deepseek";
    const meta = getProviderMeta(provider);
    const apiKey = settings.apiKeys?.[provider];
    const model = settings.defaultModel || meta?.defaultModel || "";
    const baseUrl = provider === "custom" ? settings.customBaseUrl : undefined;

    if (!apiKey) {
      aiMsg.content = "（还没填 API Key：去「设置」页填入你的模型供应商 Key，就能开始真实对话了）";
      aiMsg.meta = true;
      saveChats({ ...loadChats(), [personaId]: list });
      setMessages(getChat(personaId));
      setSending(false);
      return;
    }
    if (!model) {
      aiMsg.content = "（还没填模型名：去「设置」页确认默认模型，例如 deepseek-v4-flash）";
      aiMsg.meta = true;
      saveChats({ ...loadChats(), [personaId]: list });
      setMessages(getChat(personaId));
      setSending(false);
      return;
    }

    const history = messages.filter((m) => m !== userMsg);
    const modelMessages = buildMessages({ persona, history, content: userContent, images, provider });

    try {
      let acc = "";
      await streamChat({
        provider,
        apiKey,
        baseUrl,
        model,
        messages: modelMessages,
        onDelta: (t) => {
          acc += t;
          aiMsg.content = acc;
          setMessages([...list]);
        },
      });
      aiMsg.content = acc || "（没有收到回复，请重试）";
    } catch (err) {
      aiMsg.content = "";
      list.push({ role: "assistant", content: `⚠️ ${err.message || "请求失败"}`, meta: true, ts: Date.now() });
    }
    saveChats({ ...loadChats(), [personaId]: list });
    setMessages([...list]);
    setSending(false);
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
        {sending && <div className="typing-dot">TA 正在输入…</div>}
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
        <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        <input
          className="chat-input"
          placeholder={sending ? "TA 正在输入…" : "说点什么…"}
          value={text}
          disabled={sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
        />
        <button className="btn primary" onClick={() => sendMessage()} disabled={sending || (!text.trim() && pending.length === 0)}>
          {sending ? "…" : "发送"}
        </button>
      </div>
    </div>
  );
}