// Vercel serverless entry point — runs the same Express app as local/Render.
// The app is exported from server/index.js; the database is connected lazily
// (and cached) so cold starts stay fast and the homepage works even if the
// database is briefly unreachable.
const { app, connectDb } = require("../server/index.js");

module.exports = async (req, res) => {
  const path = (req.url || "").split("?")[0];
  const needsDb = path.startsWith("/api") && path !== "/api/health";
  if (needsDb) {
    try {
      await connectDb();
    } catch (e) {
      // Raw Node response here (Express has not wrapped it yet), so use
      // writeHead/end instead of res.status().json().
      res.writeHead(503, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          error: "db_not_connected",
          message: "Database se connect nahi ho raha — thodi der baad try karo.",
        })
      );
    }
  }
  return app(req, res);
};
