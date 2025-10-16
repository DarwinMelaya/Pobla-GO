const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Unit", unitSchema);
