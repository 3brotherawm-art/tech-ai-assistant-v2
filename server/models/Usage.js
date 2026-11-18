const mongoose = require("mongoose");

// One row per user per day (date = "YYYY-MM-DD", Asia/Karachi).
// Counts what the user spent on the shared free Gemini key, so the
// free daily limit can be enforced per user — never shared across users.
const usageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    messages: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

usageSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Usage", usageSchema);
