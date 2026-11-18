// Small API client for the Express backend.
// Same origin by default (the server serves the built client too).
// Set VITE_API_URL only if the backend is hosted separately.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "taa_token";
const USER_KEY = "taa_user";
const ADMIN_TOKEN_KEY = "taa_admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function saveAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request(path, { method = "GET", body = null, admin = false } = {}) {
  const token = admin ? getAdminToken() : getToken();
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: {
        error: "network",
        message: "Server se connect nahi ho raha — thodi der baad try karo.",
      },
    };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function messageOf(result) {
  if (result.data && result.data.message) return result.data.message;
  return "Kuch ghalat ho gaya, dobara try karo.";
}

// ---- Auth ----
export async function register(name, email, password) {
  const r = await request("/api/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
  if (!r.ok) return { ok: false, message: messageOf(r) };
  saveSession(r.data.token, r.data.user);
  return { ok: true, user: r.data.user };
}

export async function login(email, password) {
  const r = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!r.ok) return { ok: false, message: messageOf(r) };
  saveSession(r.data.token, r.data.user);
  return { ok: true, user: r.data.user };
}

// ---- Chats (own history only — the server enforces userId) ----
export async function getChats() {
  const r = await request("/api/chats");
  if (!r.ok) return { ok: false, message: messageOf(r), status: r.status, chats: [] };
  return { ok: true, chats: r.data.chats || [] };
}

export async function getChat(id) {
  const r = await request("/api/chats/" + id);
  if (!r.ok) return { ok: false, message: messageOf(r), status: r.status };
  return { ok: true, chat: r.data.chat, messages: r.data.messages || [] };
}

export async function sendChat(chatId, content) {
  const r = await request("/api/chat", {
    method: "POST",
    body: { chatId: chatId || undefined, content },
  });
  if (!r.ok)
    return {
      ok: false,
      message: messageOf(r),
      status: r.status,
      limit: r.data.limit || null,
    };
  return {
    ok: true,
    reply: r.data.reply,
    chatId: r.data.chatId,
    usage: r.data.usage || null,
  };
}

// ---- Free usage ----
export async function getUsage() {
  const r = await request("/api/usage");
  if (!r.ok) return { ok: false, message: messageOf(r), status: r.status };
  return { ok: true, usage: r.data };
}

export async function deleteChat(id) {
  const r = await request("/api/chats/" + id, { method: "DELETE" });
  if (!r.ok) return { ok: false, message: messageOf(r) };
  return { ok: true };
}

// ---- Admin ----
export async function adminLogin(password) {
  const r = await request(
    "/api/admin/login",
    { method: "POST", body: { password } },
    { admin: true }
  );
  // request() above sends the (empty) admin token; that is fine for login.
  if (!r.ok) return { ok: false, message: messageOf(r) };
  saveAdminToken(r.data.token);
  return { ok: true };
}

export async function getAdminStats() {
  const r = await request("/api/admin/stats", {}, { admin: true });
  if (!r.ok) return { ok: false, message: messageOf(r), status: r.status };
  return { ok: true, stats: r.data };
}

export async function getAdminUsers() {
  const r = await request("/api/admin/users", {}, { admin: true });
  if (!r.ok) return { ok: false, message: messageOf(r), status: r.status };
  return { ok: true, users: r.data.users || [] };
}

export async function getAdminMessages() {
  const r = await request("/api/admin/messages", {}, { admin: true });
  if (!r.ok) return { ok: false, message: messageOf(r), status: r.status };
  return { ok: true, messages: r.data.messages || [] };
}
