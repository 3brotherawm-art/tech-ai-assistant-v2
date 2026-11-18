const mongoose = require("mongoose");

// One message inside one chat. userId is stored on every message so
// no query can ever return another user's messages by accident.
const messageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 10000 },
  },
  { timestamps: true }
);

messageSchema.index({ userId: 1, chatId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
