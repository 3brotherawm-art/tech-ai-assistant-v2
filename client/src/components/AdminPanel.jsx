import { useEffect, useState } from "react";
import {
  adminLogin,
  clearAdminToken,
  getAdminMessages,
  getAdminStats,
  getAdminToken,
  getAdminUsers,
} from "../lib/api";
import { DiamondMark } from "./Logo";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return (
    d.toLocaleDateString([], { day: "numeric", month: "short" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(!!getAdminToken());
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (authed) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function loadAll() {
    setLoading(true);
    const [s, u, m] = await Promise.all([
      getAdminStats(),
      getAdminUsers(),
      getAdminMessages(),
    ]);
    setLoading(false);
    if (s.status === 401 || u.status === 401 || m.status === 401) {
      clearAdminToken();
      setAuthed(false);
      setError("Admin session khatam ho gaya hai, dobara login karein.");
      return;
    }
    if (s.ok) setStats(s.stats);
    if (u.ok) setUsers(u.users);
    if (m.ok) setMessages(m.messages);
    if (!s.ok && s.message) setError(s.message);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await adminLogin(password);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setPassword("");
    setAuthed(true);
  }

  function handleLogout() {
    clearAdminToken();
    setAuthed(false);
    setStats(null);
    setUsers([]);
    setMessages([]);
  }

  if (!authed) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <DiamondMark size={48} />
            <div>
              <h1>Admin Panel</h1>
              <p>Tech AI Assistant by Asad Tech</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="auth-form">
            <label>
              <span>Admin password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password likho"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary btn-block" disabled={busy}>
              {busy ? "Ruko..." : "Admin login"}
            </button>
          </form>
          <p className="auth-note">
            Sirf owner ke liye. Password server par set hota hai.
          </p>
          <p className="auth-foot">
            <a href="/">← Wapas chat par jao</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <DiamondMark size={40} />
          <div>
            <h1>Admin Panel</h1>
            <p>Tech AI Assistant by Asad Tech</p>
          </div>
        </div>
        <div className="admin-actions">
          <a href="/" className="btn-ghost">
            Chat kholo
          </a>
          <button type="button" className="btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <p className="form-error admin-error">{error}</p>}
      {loading && <p className="muted">Data load ho raha hai...</p>}

      {stats && (
        <div className="stat-cards">
          <div className="stat-card">
            <strong>{stats.users}</strong>
            <span>Total users</span>
          </div>
          <div className="stat-card">
            <strong>{stats.chats}</strong>
            <span>Total chats</span>
          </div>
          <div className="stat-card">
            <strong>{stats.messages}</strong>
            <span>Total messages</span>
          </div>
        </div>
      )}

      <section className="admin-section">
        <h2>Recent users</h2>
        {users.length === 0 ? (
          <p className="muted">Abhi koi user nahi.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Email</th>
                  <th>Chats</th>
                  <th>Aaj</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.chats}</td>
                    <td>{u.messagesToday ?? 0}</td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Recent messages</h2>
        {messages.length === 0 ? (
          <p className="muted">Abhi koi message nahi.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.userName}
                      <br />
                      <span className="muted small">{m.userEmail}</span>
                    </td>
                    <td>{m.role === "user" ? "User" : "Assistant"}</td>
                    <td className="msg-cell">{m.content}</td>
                    <td>{formatTime(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
