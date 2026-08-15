import { useState } from "react";
import { loadSettings, saveSettings } from "../store/settings.js";
import { PROVIDERS } from "../constants/providers.js";

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings());

  function update(patch) {
    const next = { ...settings, ...patch };
    saveSettings(next);
    setSettings(next);
  }

  function setKey(providerId, value) {
    update({ apiKeys: { ...settings.apiKeys, [providerId]: value } });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>设置</h1>
      </header>

      <section className="section">
        <h2>模型供应商（BYOK：填你自己的 Key）</h2>
        <p className="section-tip">Key 只保存在你浏览器里，发消息时仅经本站代理转发一次，服务端不落盘。</p>
        {PROVIDERS.map((p) => (
          <div key={p.id} className="provider-card">
            <div className="provider-head">
              <span className="provider-name">{p.name}</span>
              <span className="provider-type">{p.type === "openai-compatible" ? "OpenAI 兼容" : p.type}</span>
            </div>
            {p.baseUrl && <div className="provider-url">{p.baseUrl}</div>}
            <input
              type="password"
              className="key-input"
              placeholder={`粘贴 ${p.name} API Key`}
              value={settings.apiKeys[p.id] || ""}
              onChange={(e) => setKey(p.id, e.target.value)}
            />
            {p.id === "custom" && (
              <input
                className="key-input"
                placeholder="自定义 Base URL，如 https://api.xxx.com/v1"
                value={settings.customBaseUrl || ""}
                onChange={(e) => update({ customBaseUrl: e.target.value })}
              />
            )}
          </div>
        ))}
      </section>

      <section className="section">
        <h2>默认模型</h2>
        <label className="inline-label">
          供应商
          <select value={settings.defaultProvider} onChange={(e) => update({ defaultProvider: e.target.value })}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="inline-label">
          模型名
          <input value={settings.defaultModel} onChange={(e) => update({ defaultModel: e.target.value })} placeholder="deepseek-v4-flash" />
        </label>
        <p className="section-tip">模型名以各家平台为准，可直接手填，例如 deepseek-v4-flash / deepseek-v4-pro。</p>
      </section>

      <section className="section">
        <h2>聊天记录导入（核心逻辑阶段）</h2>
        <p className="section-tip">下一步会支持上传 txt / 微信导出等聊天记录文件，自动提炼成「人设 + 示例对话」。</p>
        <button className="btn ghost" disabled>导入聊天记录（开发中）</button>
      </section>
    </div>
  );
}