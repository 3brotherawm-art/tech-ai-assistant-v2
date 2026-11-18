import { useState } from "react";
import { login, register } from "../lib/api";
import { DiamondMark } from "./Logo";

// Step 1: Durood Pak screen (same flow as the Asad Tools store).
// Step 2: Login / Register with email + password.
export default function AuthScreen({ onAuth }) {
  const [step, setStep] = useState("durood");
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result =
      mode === "register"
        ? await register(name.trim(), email.trim(), password)
        : await login(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onAuth(result.user);
  }

  if (step === "durood") {
    return (
      <div className="auth-page">
        <div className="auth-card durood-card">
          <DiamondMark size={56} />
          <p className="durood-arabic">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="durood-arabic">
            اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ
          </p>
          <p className="durood-meaning">
            Aye Allah, Muhammad (SAW) aur un ki aal par rehmat bhej.
          </p>
          <button
            type="button"
            className="btn-primary btn-block"
            onClick={() => setStep("auth")}
          >
            Shuru karein
          </button>
          <p className="auth-foot">Tech AI Assistant by Asad Tech</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <DiamondMark size={48} />
          <div>
            <h1>Tech AI Assistant</h1>
            <p>by Asad Tech</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <label>
              <span>Naam</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apna naam likho"
                autoComplete="name"
                required
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="apna@email.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password likho"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy
              ? "Ruko..."
              : mode === "register"
                ? "Account banao"
                : "Login karo"}
          </button>
        </form>

        <p className="auth-note">
          Login kar ke apni chats save karo — apni purani chats kabhi bhi dobara
          khol sakte ho.
        </p>
        <p className="auth-foot">Tech AI Assistant by Asad Tech</p>
      </div>
    </div>
  );
}
