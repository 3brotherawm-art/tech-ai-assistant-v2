const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Usage = require("../models/Usage");
const { todayKey } = require("../lib/limits");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// POST /api/admin/login { password }
// Admin password ONLY from process.env.ADMIN_PASSWORD — never in code.
router.post("/login", (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(503).json({
      error: "server_not_configured",
      message: "Admin abhi tayyar nahi, thodi der baad try karo.",
    });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      error: "server_not_configured",
      message: "Server abhi tayyar ho raha hai, thodi der baad try karo.",
    });
  }
  const supplied = String(req.body && req.body.password ? req.body.password : "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(adminPassword);
  const match =
    a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    return res.status(401).json({
      error: "invalid_admin",
      message: "Admin password ghalat hai.",
    });
  }
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });
  return res.json({ token });
});

// GET /api/admin/stats — totals only the admin can see.
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "database_not_configured",
        message: "Database abhi tayyar nahi.",
      });
    }
    const [users, chats, messages] = await Promise.all([
      User.countDocuments({}),
      Chat.countDocuments({}),
      Message.countDocuments({}),
    ]);
    return res.json({ users, chats, messages });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

// GET /api/admin/users — recent users (admin only).
router.get("/users", requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "database_not_configured",
        message: "Database abhi tayyar nahi.",
      });
    }
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const chatCounts = await Chat.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    const counts = {};
    chatCounts.forEach((c) => {
      counts[c._id.toString()] = c.count;
    });
    // Today's free-limit usage per user (for the "Aaj" column).
    const todayUsage = await Usage.find({ date: todayKey() }).lean();
    const usedToday = {};
    todayUsage.forEach((u) => {
      usedToday[u.userId.toString()] = u.messages;
    });
    return res.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        chats: counts[u._id.toString()] || 0,
        messagesToday: usedToday[u._id.toString()] || 0,
        createdAt: u.createdAt,
      })),
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

// GET /api/admin/messages — recent messages from ALL users (admin only).
router.get("/messages", requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "database_not_configured",
        message: "Database abhi tayyar nahi.",
      });
    }
    const messages = await Message.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const userIds = [...new Set(messages.map((m) => m.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const byId = {};
    users.forEach((u) => {
      byId[u._id.toString()] = u;
    });
    return res.json({
      messages: messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        userName: byId[m.userId.toString()] ? byId[m.userId.toString()].name : "-",
        userEmail: byId[m.userId.toString()] ? byId[m.userId.toString()].email : "-",
      })),
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

module.exports = router;
