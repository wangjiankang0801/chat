import { useRef, useState } from "react";
import { loadPersonas, savePersonas, emptyPersona } from "../store/personas.js";
import { readFileAsDataURL, downscaleImage, isImageAvatar } from "../lib/image.js";
import { parseChatText, detectSpeakers, buildPersonaFromTurns } from "../lib/importer.js";
import PersonaCard from "../components/PersonaCard.jsx";
import ImageCropModal from "../components/ImageCropModal.jsx";

const EMPTY_FORM = () => ({ ...emptyPersona(), examplesText: "" });

export default function PersonaPage() {
  const [list, setList] = useState(loadPersonas());
  const [form, setForm] = useState(null);        // 编辑中的表单；null = 列表视图
  const [cropSrc, setCropSrc] = useState(null);  // 待裁剪的头像原图
  const [importOpen, setImportOpen] = useState(false); // 导入弹窗
  const [importText, setImportText] = useState("");
  const [turns, setTurns] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [personaSpeaker, setPersonaSpeaker] = useState("");

  // —— 导入模式：chat=聊天记录, prompt=已有提示词 ——
  const [importMode, setImportMode] = useState("chat");
  const [promptText, setPromptText] = useState("");
  const [promptName, setPromptName] = useState("");
  const [promptExamples, setPromptExamples] = useState("");
  const [promptMemory, setPromptMemory] = useState("");
  const avatarFileRef = useRef(null);
  const importFileRef = useRef(null);

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
      const small = await downscaleImage(dataUrl, 1024, 0.9);
      setCropSrc(small);
    } catch {
      alert("图片读取失败：iPhone 的 HEIC 照片可能不支持，请先转成 JPEG/PNG 再试");
    }
  }

  // —— 聊天记录导入 ——
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    applyImportText(text);
  }

  function applyImportText(text) {
    const parsed = parseChatText(text);
    setTurns(parsed);
    const spk = detectSpeakers(parsed);
    setSpeakers(spk);
    setPersonaSpeaker(spk[0]?.name || "");
  }

  function handleGenerate() {
    if (!personaSpeaker) {
      alert("请选择 TA 是哪位说话人");
      return;
    }
    const persona = buildPersonaFromTurns(turns, personaSpeaker);
    persona.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const next = [...list, persona];
    persist(next);
    setImportOpen(false);
    setImportText("");
    openEdit(persona);
  }

  function handleCreateFromPrompt() {
    const sp = (promptText || "").trim();
    if (!sp) {
      alert("请先粘贴你训练好的提示词");
      return;
    }
    const examples = [];
    (promptExamples || "")
      .split(/\n{2,}|\n(?=用户：)/)
      .map((block) => block.trim())
      .filter(Boolean)
      .forEach((block) => {
        const u = block.match(/用户[：:]\s*(.+)/);
        const a = block.match(/TA[：:]\s*(.+)/);
        if (u && a) examples.push({ user: u[1].trim(), assistant: a[1].trim() });
      });
    const persona = {
      ...emptyPersona(),
      name: (promptName || "").trim() || "新角色",
      description: "由已训练提示词创建",
      systemPrompt: sp,
      examples,
      memory: (promptMemory || "").trim(),
    };
    const next = [...list, persona];
    persist(next);
    setImportOpen(false);
    setPromptText("");
    setPromptName("");
    setPromptExamples("");
    setPromptMemory("");
    openEdit(persona);
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

  // —— 编辑视图 ——
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
            <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />
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

  // —— 导入弹窗 ——
  if (importOpen) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>导入人设</h1>
          <button className="btn ghost" onClick={() => setImportOpen(false)}>返回</button>
        </header>
        <div className="import-tabs">
          <button className={importMode === "chat" ? "import-tab active" : "import-tab"} onClick={() => setImportMode("chat")}>📄 聊天记录</button>
          <button className={importMode === "prompt" ? "import-tab active" : "import-tab"} onClick={() => setImportMode("prompt")}>✨ 已有提示词</button>
        </div>
        {importMode === "chat" ? (
        <div className="form">
          <p className="form-tip">把你的聊天记录文本粘贴进来，或上传 .txt 文件。格式示例：</p>
          <pre className="import-preview">2024/05/01 12:34 张三: 今天好累啊&#10;我：摸摸头，跟我说说～</pre>
          <textarea
            className="import-textarea"
            placeholder="粘贴聊天记录，每行一条：&#10;说话人：内容&#10;（时间戳可有可无）"
            value={importText}
            onChange={(e) => { setImportText(e.target.value); applyImportText(e.target.value); }}
          />
          <button className="btn ghost" onClick={() => importFileRef.current?.click()}>📄 上传 .txt 文件</button>
          <input ref={importFileRef} type="file" accept=".txt,text/plain" style={{ display: "none" }} onChange={handleImportFile} />

          {speakers.length > 0 && (
            <>
              <label>TA 是哪位？（选择后自动生成人设）</label>
              <div className="speaker-list">
                {speakers.map((s) => (
                  <label key={s.name} className={personaSpeaker === s.name ? "speaker-option selected" : "speaker-option"}>
                    <input type="radio" name="speaker" checked={personaSpeaker === s.name} onChange={() => setPersonaSpeaker(s.name)} />
                    {s.name}（{s.count} 条）
                  </label>
                ))}
              </div>
              <p className="form-tip">已解析 {turns.length} 条消息。生成后会打开人设编辑页，你可以再调整。</p>
              <button className="btn primary block" onClick={handleGenerate}>生成人设</button>
            </>
          )}
        </div>
        ) : (
        <div className="form">
          <p className="form-tip">直接粘贴你训练好的提示词（启发式提炼 / 角色设定 / System Prompt），聊天时会整段注入。</p>
          <label>角色名字 <input value={promptName} onChange={(e) => setPromptName(e.target.value)} placeholder="可留空，默认「新角色」" /></label>
          <label>提示词内容（必填）
            <textarea className="import-textarea" style={{ minHeight: 200 }} placeholder="把 AI 训练好的提示词整段粘贴到这里…" value={promptText} onChange={(e) => setPromptText(e.target.value)} />
          </label>
          <label>示例对话（可选，每段：用户：… 换行 TA：…，空行分隔）
            <textarea rows={4} value={promptExamples} onChange={(e) => setPromptExamples(e.target.value)} placeholder={"用户：今天好累啊\nTA：摸摸头，跟我说说～"} />
          </label>
          <label>长期记忆 / 补充设定（可选）
            <textarea rows={2} value={promptMemory} onChange={(e) => setPromptMemory(e.target.value)} placeholder="TA 知道的关于你的事、共同经历等" />
          </label>
          <button className="btn primary block" onClick={handleCreateFromPrompt}>创建人设</button>
        </div>
        )}
      </div>
    );
  }

  // —— 列表视图 ——
  return (
    <div className="page">
      <header className="page-header">
        <h1>人设</h1>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => setImportOpen(true)}>导入</button>
          <button className="btn primary" onClick={openCreate}>＋ 新建</button>
        </div>
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