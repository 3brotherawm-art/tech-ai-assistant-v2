const mongoose = require("mongoose");

// One conversation (chat thread) belonging to one user.
// A user only ever sees chats where userId is their own id.
const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

chatSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);
