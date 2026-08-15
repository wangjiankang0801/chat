import { useRef, useState } from "react";
import { loadPersonas, savePersonas, emptyPersona } from "../store/personas.js";
import { readFileAsDataURL, downscaleImage, isImageAvatar } from "../lib/image.js";
import PersonaCard from "../components/PersonaCard.jsx";
import ImageCropModal from "../components/ImageCropModal.jsx";

const EMPTY_FORM = () => ({ ...emptyPersona(), examplesText: "" });

export default function PersonaPage() {
  const [list, setList] = useState(loadPersonas());
  const [form, setForm] = useState(null); // 编辑中的表单；null = 列表视图
  const [cropSrc, setCropSrc] = useState(null); // 待裁剪的原图
  const avatarFileRef = useRef(null);

  function persist(next) {
    savePersonas(next);
    setList(next);
  }

  function handleDelete(p) {
    if (!confirm(`删除人设「${p.name}」？对话记录不会删除。`)) return;
    persist(list.filter((x) => x.id !== p.id));
  }

  function openCreate() {
    setForm(EMPTY_FORM());
  }

  function openEdit(p) {
    setForm({
      ...p,
      examplesText: (p.examples || []).map((e) => `用户：${e.user}\nTA：${e.assistant}`).join("\n\n"),
    });
  }

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      const small = await downscaleImage(dataUrl, 1024, 0.9); // 压缩后再裁剪，省内存
      setCropSrc(small);
    } catch {
      alert("图片读取失败：iPhone 的 HEIC 照片可能不支持，请先转成 JPEG/PNG 再试");
    }
  }

  function handleSave() {
    const examples = [];
    (form.examplesText || "")
      .split(/\n{2,}|\n(?=用户：)/)
      .map((block) => block.trim())
      .filter(Boolean)
      .forEach((block) => {
        const u = block.match(/用户[：:]\s*(.+)/);
        const a = block.match(/TA[：:]\s*(.+)/);
        if (u && a) examples.push({ user: u[1].trim(), assistant: a[1].trim() });
      });

    const styleTags = (form.styleTags || "")
      .split(/[,，、]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const { examplesText, styleTags: _tags, ...rest } = form;
    const saved = { ...rest, styleTags, examples };
    if (list.some((x) => x.id === saved.id)) {
      persist(list.map((x) => (x.id === saved.id ? saved : x)));
    } else {
      persist([...list, saved]);
    }
    setForm(null);
  }

  if (form) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>编辑人设</h1>
          <button className="btn ghost" onClick={() => setForm(null)}>返回</button>
        </header>
        <div className="form">
          <label>名字 <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="TA 叫什么" /></label>

          <label>头像（微信风格：1:1 裁剪框，可拖动/缩放）
            <div className="avatar-pick">
              <div className="avatar-preview">
                {isImageAvatar(form.avatar) ? <img src={form.avatar} alt="" className="avatar-preview-img" /> : <span className="avatar-preview-emoji">{form.avatar}</span>}
              </div>
              <div className="avatar-btns">
                <button className="btn small" onClick={() => avatarFileRef.current?.click()}>📷 上传图片</button>
                {isImageAvatar(form.avatar) && (
                  <button className="btn danger small" onClick={() => setForm({ ...form, avatar: "🐱" })}>移除图片</button>
                )}
              </div>
            </div>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarFile}
            />
            <input value={isImageAvatar(form.avatar) ? "" : form.avatar} disabled={isImageAvatar(form.avatar)} onChange={(e) => setForm({ ...form, avatar: e.target.value || "🐱" })} placeholder="或用 emoji 当头像，如 🦊" />
          </label>

          <label>一句话介绍 <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="温柔话痨的朋友" /></label>
          <label>人设描述（System Prompt）
            <textarea rows={6} value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} placeholder="你是谁、和用户什么关系、语气、禁忌等。这是 AI 模仿 TA 的核心。" />
          </label>
          <label>说话风格标签 <input value={form.styleTags || ""} onChange={(e) => setForm({ ...form, styleTags: e.target.value })} placeholder="温柔, 话痨, 颜文字" /></label>
          <label>示例对话（每段：用户：… 换行 TA：…，空行分隔）
            <textarea rows={6} value={form.examplesText} onChange={(e) => setForm({ ...form, examplesText: e.target.value })} placeholder={"用户：今天好累啊\nTA：摸摸头，跟我说说～"} />
          </label>
          <label>长期记忆 / 补充设定
            <textarea rows={3} value={form.memory || ""} onChange={(e) => setForm({ ...form, memory: e.target.value })} placeholder="TA 知道的关于你的事、共同经历等" />
          </label>
          <p className="form-tip">💡 核心逻辑阶段会加「导入聊天记录文件」，自动提炼风格和示例对话到这里。</p>
          <button className="btn primary block" onClick={handleSave}>保存人设</button>
        </div>

        {cropSrc && (
          <ImageCropModal
            src={cropSrc}
            outputSize={256}
            onConfirm={(cropped) => { setForm({ ...form, avatar: cropped }); setCropSrc(null); }}
            onCancel={() => setCropSrc(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>人设</h1>
        <button className="btn primary" onClick={openCreate}>＋ 新建</button>
      </header>
      {list.map((p) => (
        <PersonaCard
          key={p.id}
          persona={p}
          onUse={() => alert(`已切换到「${p.name}」，去聊天页开聊～`)}
          onEdit={() => openEdit(p)}
          onDelete={() => handleDelete(p)}
        />
      ))}
    </div>
  );
}