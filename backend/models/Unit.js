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
    equivalent_units: {
      type: [String],
      default: [],
      set: (values) =>
        Array.isArray(values)
          ? values
              .map((value) => (typeof value === "string" ? value.trim() : ""))
              .filter(Boolean)
          : [],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Unit", unitSchema);
