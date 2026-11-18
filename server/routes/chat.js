const express = require("express");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Usage = require("../models/Usage");
const {
  freeTokenLimit,
  todayKey,
  estimateTokens,
} = require("../lib/limits");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const MODEL = "gemini-3-flash-preview";
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  MODEL +
  ":generateContent";

// Tech AI Assistant by Asad Tech — natural, conversational personal assistant.
// Answers fully like a real helpful person, not one-line robotic replies.
const SYSTEM_PROMPT = `You are "Tech AI Assistant by Asad Tech" — a friendly, natural personal AI assistant made by Asad Tech in Pakistan.

How to talk:
- Talk like a real helpful person, warm and easy. Never sound robotic or copy-paste.
- Answer in the user's own language: if they write in Roman Urdu, reply in Roman Urdu; if they write in English, reply in English. Match their words and tone.
- Give full, useful answers — explain properly, give examples when it helps, and keep it simple and clear. Short one-line replies are not enough when the question needs more.
- When it helps, ask a friendly follow-up question at the end, so the chat keeps going (for example: "Aur kuch poochna hai?" or "Is ke baare mein mazeed bataun?").
- You can answer general questions, explain things step by step, write text, captions, messages and emails, give business and study ideas, help with maths, English and everyday problems.
- If you do not know something, say so honestly — never guess or make up facts, prices or names.

Brand context — use ONLY if the user asks about it:
- Made by Asad Tech. Asad Tools (asad-tools-liard.vercel.app) sells Muse AI accounts (1B Rs 250 up to 30B Rs 1000, 20 Days Guarantee), AuraBill billing software (1 month Rs 1000 up to 12 months Rs 7500), and Website Packages (Basic Rs 5000, Business Rs 7000, Premium Rs 15000). Orders on WhatsApp: 03039929254.
- Never invent prices or products. If you are not sure about a price, say the user can check on Asad Tools or WhatsApp 03039929254.

Rules: never claim to be human — if asked, say you are the AI assistant of Asad Tech.`;

const MAX_MSG_CHARS = 500;
const MAX_HISTORY = 10;
const MAX_TOTAL_CHARS = 4000;

async function dbReady(res) {
  // Try (re)connecting first — a frozen serverless instance can thaw with
  // a dead connection, and the first request after that must not fail.
  // The require is lazy: server/index.js requires this route file, so a
  // top-level require would read a half-loaded module. connectDb() itself
  // waits at most serverSelectionTimeoutMS (10s) — the wait is bounded.
  try {
    await require("../index.js").connectDb();
  } catch (e) {
    // Fall through to the readyState check below.
  }
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      error: "database_not_configured",
      message: "Server abhi tayyar ho raha hai, thodi der baad try karo.",
    });
    return false;
  }
  return true;
}

async function callGemini(history) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "assistant_not_configured",
        message: "Assistant abhi tayyar nahi, thodi der baad try karo.",
      },
    };
  }

  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let r;
  try {
    r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });
  } catch (e) {
    return {
      status: 502,
      body: {
        error: "assistant_error",
        message: "Kuch ghalat ho gaya, dobara try karo.",
      },
    };
  }

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    if (r.status === 429 || r.status === 403) {
      return {
        status: 502,
        body: {
          error: "quota_exceeded",
          message: "Quota khatam ho gaya hai, thodi der baad try karo.",
        },
      };
    }
    return {
      status: 502,
      body: {
        error: "assistant_error",
        message: "Kuch ghalat ho gaya, dobara try karo.",
      },
    };
  }

  const reply = (data && data.candidates && data.candidates[0]
    ? data.candidates[0].content
      ? data.candidates[0].content.parts || []
      : []
    : []
  )
    .map((p) => p.text || "")
    .join("")
    .trim();

  if (!reply) {
    return {
      status: 502,
      body: {
        error: "assistant_error",
        message: "Koi jawab nahi mila, dobara try karo.",
      },
    };
  }

  // Real token count when Gemini reports it; otherwise estimate from text.
  const reported = data && data.usageMetadata && data.usageMetadata.totalTokenCount;
  const tokensUsed =
    typeof reported === "number" && reported > 0
      ? reported
      : estimateTokens(history.map((m) => m.content).join(" ") + " " + reply);

  return { status: 200, body: { reply }, tokensUsed };
}

// POST /api/chat { chatId?, content }
// - chatId missing: starts a NEW chat (title = first message, short).
// - chatId given: continues that chat, only if it belongs to this user.
router.post("/chat", requireAuth, async (req, res) => {
  try {
    if (!(await dbReady(res))) return;
    const content = String(req.body && req.body.content ? req.body.content : "")
      .trim()
      .slice(0, MAX_MSG_CHARS);
    if (!content) {
      return res.status(400).json({
        error: "bad_request",
        message: "Koi sawal nahi mila. Dobara try karo.",
      });
    }

    // Free daily TOKEN limit — checked BEFORE anything is saved, so a
    // blocked message never eats the user's history or the shared key's
    // quota. There is NO message-count limit: only tokens count.
    // Estimated cost of this request = this message + max reply (500).
    const today = todayKey();
    const tokenLimit = freeTokenLimit();
    const usageDoc = await Usage.findOne({
      userId: req.user.id,
      date: today,
    }).lean();
    const usedMessages = usageDoc ? usageDoc.messages : 0;
    const usedTokens = usageDoc ? usageDoc.tokensUsed : 0;
    const estimatedCost = estimateTokens(content) + 500;
    if (usedTokens + estimatedCost > tokenLimit) {
      return res.status(429).json({
        error: "free_limit_reached",
        message:
          "Aaj ki free limit khatam ho gayi hai. Aap ke " +
          tokenLimit +
          " free tokens khatam ho gaye hain. Kal dobara free tokens milenge — ya Upgrade kar ke be-rok-tok chat karein.",
        limit: {
          messagesUsed: usedMessages,
          tokensUsed: usedTokens,
          tokensLimit: tokenLimit,
        },
      });
    }

    let chat = null;
    const chatId = req.body && req.body.chatId ? String(req.body.chatId) : "";
    if (chatId) {
      // Ownership enforced: a user can only continue their OWN chat.
      chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
      if (!chat) {
        return res.status(404).json({
          error: "not_found",
          message: "Ye chat nahi mili.",
        });
      }
    } else {
      chat = await Chat.create({
        userId: req.user.id,
        title: content.length > 40 ? content.slice(0, 40) + "..." : content,
      });
    }

    // Save the user's message first.
    await Message.create({
      userId: req.user.id,
      chatId: chat._id,
      role: "user",
      content,
    });

    // Last 10 messages of THIS chat only, for Gemini context.
    const historyDocs = await Message.find({
      userId: req.user.id,
      chatId: chat._id,
    })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY)
      .lean();
    const history = historyDocs.reverse();
    const capped = [];
    let running = 0;
    for (const m of history) {
      if (running + m.content.length > MAX_TOTAL_CHARS) break;
      running += m.content.length;
      capped.push(m);
    }

    const result = await callGemini(capped);
    if (result.status !== 200) {
      return res.status(result.status).json(result.body);
    }

    await Message.create({
      userId: req.user.id,
      chatId: chat._id,
      role: "assistant",
      content: result.body.reply,
    });
    chat.updatedAt = new Date();
    await chat.save();

    // Count this reply against the user's OWN daily usage (never shared).
    // Only successful replies count — a failed Gemini call costs nothing.
    const tokens = result.tokensUsed || 0;
    await Usage.updateOne(
      { userId: req.user.id, date: today },
      {
        $inc: { messages: 1, tokensUsed: tokens },
        $setOnInsert: { userId: req.user.id, date: today },
      },
      { upsert: true }
    );

    return res.json({
      reply: result.body.reply,
      chatId: chat._id.toString(),
      usage: {
        messagesUsed: usedMessages + 1,
        tokensUsed: usedTokens + tokens,
        tokensLimit: tokenLimit,
      },
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

// GET /api/usage — the logged-in user's remaining free tokens today.
// (messagesUsed is a stat only — no message limit exists.)
router.get("/usage", requireAuth, async (req, res) => {
  try {
    if (!(await dbReady(res))) return;
    const today = todayKey();
    const tokenLimit = freeTokenLimit();
    const usageDoc = await Usage.findOne({
      userId: req.user.id,
      date: today,
    }).lean();
    const usedMessages = usageDoc ? usageDoc.messages : 0;
    const usedTokens = usageDoc ? usageDoc.tokensUsed : 0;
    return res.json({
      date: today,
      messagesUsed: usedMessages,
      tokensUsed: usedTokens,
      tokensLimit: tokenLimit,
      tokensLeft: Math.max(0, tokenLimit - usedTokens),
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

// GET /api/chats — the logged-in user's own chats only, newest first.
router.get("/chats", requireAuth, async (req, res) => {
  try {
    if (!(await dbReady(res))) return;
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    return res.json({
      chats: chats.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

// GET /api/chats/:id — one of the user's OWN chats with its messages.
router.get("/chats/:id", requireAuth, async (req, res) => {
  try {
    if (!(await dbReady(res))) return;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!chat) {
      return res.status(404).json({ error: "not_found", message: "Ye chat nahi mili." });
    }
    const messages = await Message.find({
      userId: req.user.id,
      chatId: chat._id,
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    return res.json({
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

// DELETE /api/chats/:id — delete one of the user's OWN chats.
router.delete("/chats/:id", requireAuth, async (req, res) => {
  try {
    if (!(await dbReady(res))) return;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
    if (!chat) {
      return res.status(404).json({ error: "not_found", message: "Ye chat nahi mili." });
    }
    await Message.deleteMany({ userId: req.user.id, chatId: chat._id });
    await chat.deleteOne();
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

module.exports = router;
