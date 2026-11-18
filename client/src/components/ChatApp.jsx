import { useEffect, useRef, useState } from "react";
import {
  clearSession,
  deleteChat,
  getChat,
  getChats,
  getUsage,
  sendChat,
} from "../lib/api";
import { DiamondMark, DiamondTile } from "./Logo";
import UpgradeModal from "./UpgradeModal";

const QUICK_CHIPS = [
  "Ek kahani sunao",
  "Business idea do",
  "English seekhna hai",
  "Maths samjhao",
];

const MAX_MSG_CHARS = 500;

const GREETING = {
  role: "assistant",
  content:
    "Assalam-o-Alaikum! Main Tech AI Assistant hoon — Asad Tech ka personal AI assistant. Kuch bhi poocho: sawal, seekhna, likhna, business idea ya roz ka kaam. Aaj kya madad karun?",
  createdAt: new Date().toISOString(),
};

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function ChatApp({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeTitle, setActiveTitle] = useState("Nayi chat");
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [usage, setUsage] = useState(null);
  const [limitHit, setLimitHit] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    loadChats();
    loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsage() {
    const r = await getUsage();
    if (!r.ok) {
      if (r.status === 401) handleLogout();
      return;
    }
    setUsage(r.usage);
    if (r.usage.tokensLeft <= 0) {
      setLimitHit(true);
    }
  }

  async function loadChats() {
    setLoadingChats(true);
    const r = await getChats();
    setLoadingChats(false);
    if (!r.ok) {
      if (r.status === 401) handleLogout();
      return;
    }
    setChats(r.chats);
  }

  function handleLogout() {
    clearSession();
    onLogout();
  }

  function startNewChat() {
    setActiveChatId(null);
    setActiveTitle("Nayi chat");
    setMessages([GREETING]);
    setInput("");
    setSidebarOpen(false);
  }

  async function openChat(id) {
    const r = await getChat(id);
    if (!r.ok) {
      if (r.status === 401) handleLogout();
      return;
    }
    setActiveChatId(r.chat.id);
    setActiveTitle(r.chat.title);
    setMessages(
      r.messages.length > 0 ? r.messages : [GREETING]
    );
    setSidebarOpen(false);
  }

  async function handleDeleteChat(id, e) {
    e.stopPropagation();
    if (!window.confirm("Ye chat delete karni hai?")) return;
    const r = await deleteChat(id);
    if (!r.ok) return;
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (id === activeChatId) startNewChat();
  }

  async function sendMessage(text) {
    const clean = (text || "").trim().slice(0, MAX_MSG_CHARS);
    if (!clean || sending) return;

    const userMsg = {
      role: "user",
      content: clean,
      createdAt: new Date().toISOString(),
    };
    setMessages([...messages, userMsg]);
    setInput("");
    setSending(true);

    const r = await sendChat(activeChatId, clean);
    setSending(false);
    if (!r.ok) {
      if (r.status === 401) {
        handleLogout();
        return;
      }
      if (r.status === 429) {
        setLimitHit(true);
        loadUsage();
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: r.message,
          createdAt: new Date().toISOString(),
          isError: true,
        },
      ]);
      return;
    }

    // Free usage refreshes after every reply (server sends the new count).
    if (r.usage) {
      setUsage({
        ...r.usage,
        tokensLeft: Math.max(0, r.usage.tokensLimit - r.usage.tokensUsed),
      });
      if (r.usage.tokensUsed >= r.usage.tokensLimit) {
        setLimitHit(true);
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: r.reply,
        createdAt: new Date().toISOString(),
      },
    ]);
    if (!activeChatId && r.chatId) {
      setActiveChatId(r.chatId);
      setActiveTitle(clean.length > 40 ? clean.slice(0, 40) + "..." : clean);
    }
    loadChats();
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  const initial = (user && user.name ? user.name : "A").charAt(0).toUpperCase();

  return (
    <div className="layout">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <DiamondMark size={36} />
          <div>
            <strong>Tech AI Assistant</strong>
            <span>by Asad Tech</span>
          </div>
        </div>

        <button type="button" className="btn-primary btn-block" onClick={startNewChat}>
          + Nayi chat
        </button>

        <p className="sidebar-heading">Meri chats</p>
        <nav className="chat-list">
          {loadingChats && <p className="muted">Chats load ho rahi hain...</p>}
          {!loadingChats && chats.length === 0 && (
            <p className="muted">Abhi koi chat nahi — pehli chat shuru karo.</p>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`chat-item ${c.id === activeChatId ? "active" : ""}`}
              onClick={() => openChat(c.id)}
            >
              <div className="chat-item-text">
                <span className="chat-item-title">{c.title}</span>
                <span className="chat-item-date">{formatDay(c.updatedAt)}</span>
              </div>
              <button
                type="button"
                className="chat-item-delete"
                title="Chat delete karo"
                onClick={(e) => handleDeleteChat(c.id, e)}
              >
                ×
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {usage && (
            <div className="usage-box">
              <strong>Free: {usage.tokensLeft} tokens bache aaj</strong>
              <span>Rozana limit: {usage.tokensLimit} tokens</span>
            </div>
          )}
          <button
            type="button"
            className="btn-gold btn-block"
            onClick={() => setShowUpgrade(true)}
          >
            ★ Upgrade
          </button>
          <div className="user-chip">
            <span className="user-avatar">{initial}</span>
            <div className="user-info">
              <strong>{user ? user.name : ""}</strong>
              <span>{user ? user.email : ""}</span>
            </div>
          </div>
          <div className="sidebar-actions">
            <a href="/admin">Admin</a>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menu kholo"
          >
            ☰
          </button>
          <DiamondTile size={34} />
          <div className="topbar-text">
            <h1>{activeTitle}</h1>
            <p>Tech AI Assistant by Asad Tech</p>
          </div>
          <span className="live-badge">Live</span>
        </header>

        <div className="chat-scroll">
          <div className="chat-column">
            {messages.map((m, i) => (
              <div
                key={m.id || i}
                className={`msg-row ${m.role === "user" ? "user" : "assistant"}`}
              >
                {m.role === "assistant" ? (
                  <DiamondTile size={32} className="msg-avatar" />
                ) : (
                  <span className="msg-avatar user-avatar">{initial}</span>
                )}
                <div className="msg-body">
                  <div className="msg-meta">
                    <strong>
                      {m.role === "assistant" ? "Tech AI Assistant" : "Aap"}
                    </strong>
                    <span>{formatTime(m.createdAt)}</span>
                  </div>
                  <div className={`msg-bubble ${m.isError ? "error" : ""}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="msg-row assistant">
                <DiamondTile size={32} className="msg-avatar" />
                <div className="msg-body">
                  <div className="msg-meta">
                    <strong>Tech AI Assistant</strong>
                  </div>
                  <div className="msg-bubble typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="composer-wrap">
          {limitHit && (
            <div className="limit-box">
              <p>
                <strong>Aaj ki free limit khatam ho gayi hai.</strong>
                <br />
                Kal dobara free tokens milenge — ya Upgrade kar ke be-rok-tok
                chat karein.
              </p>
              <button
                type="button"
                className="btn-gold"
                onClick={() => setShowUpgrade(true)}
              >
                Upgrade
              </button>
            </div>
          )}
          {messages.length <= 1 && (
            <div className="chips">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="chip"
                  disabled={sending || limitHit}
                  onClick={() => sendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <form className="composer" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              maxLength={MAX_MSG_CHARS}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                limitHit
                  ? "Free limit khatam — kal dobara try karein"
                  : "Kuch bhi poocho..."
              }
              aria-label="Apna sawal likho"
              disabled={sending || limitHit}
            />
            <button type="submit" disabled={sending || limitHit || !input.trim()}>
              {sending ? "..." : "Bhejo"}
            </button>
          </form>

          <p className="composer-note">
            Tech AI Assistant kabhi kabhi ghalti kar sakta hai — zaroori baat
            dobara check kar lein.
          </p>
        </div>
      </main>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
