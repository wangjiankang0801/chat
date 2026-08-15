import { isImageAvatar } from "../lib/image.js";

export default function PersonaCard({ persona, active, onUse, onEdit, onDelete }) {
  return (
    <div className={active ? "persona-card active" : "persona-card"}>
      <div className="persona-avatar big">
        {isImageAvatar(persona.avatar) ? <img src={persona.avatar} alt="" className="persona-avatar-img" /> : persona.avatar}
      </div>
      <div className="persona-info">
        <div className="persona-name">{persona.name}</div>
        <div className="persona-desc">{persona.description}</div>
        {persona.styleTags?.length > 0 && (
          <div className="persona-tags">
            {persona.styleTags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="persona-actions">
        <button className="btn small" onClick={onUse}>{active ? "使用中" : "去聊天"}</button>
        <button className="btn ghost small" onClick={onEdit}>编辑</button>
        <button className="btn danger small" onClick={onDelete}>删除</button>
      </div>
    </div>
  );
}