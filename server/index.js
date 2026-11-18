// Tech AI Assistant by Asad Tech — Express + MongoDB backend.
// Env vars (all from process.env, never hardcoded):
//   MONGODB_URI     — MongoDB Atlas connection string
//   GEMINI_API_KEY  — Google Gemini API key (for /api/chat)
//   JWT_SECRET      — secret for user + admin login tokens
//   ADMIN_PASSWORD  — password for the /admin panel
//   PORT            — default 5000
// The server always starts, even with env vars missing — it reports what is
// missing in plain words instead of crash-looping.
//
// Runs two ways:
//   - node server/index.js (local / Render): connects to MongoDB and listens.
//   - Vercel serverless (api/index.js requires this file): the app is
//     exported and the database is connected lazily per request.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Health check — also tells the frontend what is ready.
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: "Tech AI Assistant by Asad Tech",
    db: mongoose.connection.readyState === 1 ? "connected" : "not_connected",
    gemini: process.env.GEMINI_API_KEY ? "set" : "missing",
    auth: process.env.JWT_SECRET ? "set" : "missing",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api/admin", adminRoutes);

// In production, serve the built React client from client/dist
// (same origin, so the frontend needs no API URL config).
const clientDist = path.join(__dirname, "..", "client", "dist");
const fs = require("fs");
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "not_found", message: "Ye page nahi mila." });
});

// MongoDB connection, cached so serverless invocations reuse it.
let connectPromise = null;
function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (connectPromise) return connectPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) return Promise.reject(new Error("MONGODB_URI missing"));
  connectPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10000 })
    .catch((e) => {
      connectPromise = null;
      throw e;
    });
  return connectPromise;
}

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("[server] MONGODB_URI missing — database band hai.");
    console.log("[server] Login aur chat history ke liye MongoDB Atlas URI set karein (server/.env dekho).");
  } else {
    try {
      await connectDb();
      console.log("[server] MongoDB connected.");
    } catch (e) {
      console.log("[server] MongoDB connect nahi hua:", e.message);
      console.log("[server] Server phir bhi chal raha hai — database wale kaam 503 denge.");
    }
  }

  if (!process.env.JWT_SECRET) {
    console.log("[server] JWT_SECRET missing — login band hai.");
  }
  if (!process.env.GEMINI_API_KEY) {
    console.log("[server] GEMINI_API_KEY missing — chat jawab nahi dega.");
  }
  if (!process.env.ADMIN_PASSWORD) {
    console.log("[server] ADMIN_PASSWORD missing — admin panel band hai.");
  }

  app.listen(PORT, () => {
    console.log("[server] Tech AI Assistant by Asad Tech — http://localhost:" + PORT);
  });
}

// Only auto-start when run directly (node server/index.js).
// When required by the Vercel serverless function, the app is exported
// and the database is connected lazily per request instead.
if (require.main === module) {
  start();
}

module.exports = { app, connectDb };
