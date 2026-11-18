const jwt = require("jsonwebtoken");

// User JWT: Authorization: Bearer <token>
// Attaches req.user = { id, email, name, role: "user" }.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Pehle login karein.",
    });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(503).json({
      error: "server_not_configured",
      message: "Server abhi tayyar ho raha hai, thodi der baad try karo.",
    });
  }
  try {
    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== "user" || !payload.id) {
      throw new Error("bad token");
    }
    req.user = { id: payload.id, email: payload.email, name: payload.name };
    return next();
  } catch (e) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Session khatam ho gaya hai, dobara login karein.",
    });
  }
}

// Admin JWT: same secret, payload role must be "admin".
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Admin login zaroori hai.",
    });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(503).json({
      error: "server_not_configured",
      message: "Server abhi tayyar ho raha hai, thodi der baad try karo.",
    });
  }
  try {
    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== "admin") {
      throw new Error("not admin");
    }
    req.admin = true;
    return next();
  } catch (e) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Admin login ghalat hai, dobara try karo.",
    });
  }
}

module.exports = { requireAuth, requireAdmin };
