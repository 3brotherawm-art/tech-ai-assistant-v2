const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function dbReady(res) {
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      error: "database_not_configured",
      message: "Server abhi tayyar ho raha hai, thodi der baad try karo.",
    });
    return false;
  }
  return true;
}

function jwtReady(res) {
  if (!process.env.JWT_SECRET) {
    res.status(503).json({
      error: "server_not_configured",
      message: "Server abhi tayyar ho raha hai, thodi der baad try karo.",
    });
    return false;
  }
  return true;
}

function signUser(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function isEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// POST /api/auth/register { name, email, password }
router.post("/register", async (req, res) => {
  try {
    if (!dbReady(res) || !jwtReady(res)) return;
    const name = String(req.body && req.body.name ? req.body.name : "").trim();
    const email = String(req.body && req.body.email ? req.body.email : "")
      .trim()
      .toLowerCase();
    const password = String(req.body && req.body.password ? req.body.password : "");

    if (!name || name.length < 2) {
      return res.status(400).json({ error: "bad_request", message: "Apna naam likho." });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ error: "bad_request", message: "Sahi email likho." });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: "bad_request",
        message: "Password kam se kam 6 harf ka ho.",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        error: "email_taken",
        message: "Is email se account pehle se hai — login karo.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = signUser(user);
    return res.status(201).json({
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email },
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

// POST /api/auth/login { email, password }
router.post("/login", async (req, res) => {
  try {
    if (!dbReady(res) || !jwtReady(res)) return;
    const email = String(req.body && req.body.email ? req.body.email : "")
      .trim()
      .toLowerCase();
    const password = String(req.body && req.body.password ? req.body.password : "");

    if (!isEmail(email) || !password) {
      return res.status(400).json({
        error: "bad_request",
        message: "Email aur password dono likho.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: "invalid_login",
        message: "Email ya password ghalat hai.",
      });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        error: "invalid_login",
        message: "Email ya password ghalat hai.",
      });
    }

    const token = signUser(user);
    return res.json({
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email },
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: "Kuch ghalat ho gaya, dobara try karo.",
    });
  }
});

module.exports = router;
