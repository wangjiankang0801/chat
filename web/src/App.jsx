import { useState } from "react";
import ChatPage from "./pages/ChatPage.jsx";
import PersonaPage from "./pages/PersonaPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

const TABS = [
  { id: "chat", label: "聊天", icon: "💬" },
  { id: "persona", label: "人设", icon: "🎭" },
  { id: "settings", label: "设置", icon: "⚙️" },
];

export default function App() {
  const [tab, setTab] = useState("chat");

  return (
    <div className="app">
      <main className="app-main">
        {tab === "chat" && <ChatPage />}
        {tab === "persona" && <PersonaPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
      <nav className="app-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "nav-btn active" : "nav-btn"}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}