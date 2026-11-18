// Free-limit rules for Tech AI Assistant by Asad Tech.
// ONE limit only: free tokens per user per day (Asia/Karachi date —
// "aaj" for our users). There is NO message-count limit — a user with
// many short messages is fine as long as their tokens stay inside
// the limit. Default comes from the Gemini free-key math in README.md;
// the owner can change it with an env var, no code change needed.

function freeTokenLimit() {
  const n = parseInt(process.env.FREE_TOKENS_PER_DAY || "30000", 10);
  return Number.isFinite(n) && n > 0 ? n : 30000;
}

// "YYYY-MM-DD" in Asia/Karachi (PKT) — the day our users live in.
function todayKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t).value;
  return get("year") + "-" + get("month") + "-" + get("day");
}

// Rough token estimate when Gemini does not report usage:
// about 4 characters per token (English + Roman Urdu text).
function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}

module.exports = { freeTokenLimit, todayKey, estimateTokens };
