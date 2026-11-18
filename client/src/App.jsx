import { useState } from "react";
import AuthScreen from "./components/AuthScreen.jsx";
import ChatApp from "./components/ChatApp.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { clearSession, getUser } from "./lib/api";

export default function App() {
  const [user, setUser] = useState(() => getUser());

  // /admin is a separate page (password-gated inside AdminPanel).
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminPanel />;
  }

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  if (!user) {
    return <AuthScreen onAuth={(u) => setUser(u)} />;
  }

  return <ChatApp user={user} onLogout={handleLogout} />;
}
