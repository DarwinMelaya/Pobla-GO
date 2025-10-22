const mongoose = require("mongoose");

const menuExpenseSchema = new mongoose.Schema(
  {
    menu_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuMaintenance",
      required: true,
    },
    expense: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
menuExpenseSchema.index({ menu_id: 1 });

module.exports = mongoose.model("MenuExpense", menuExpenseSchema);
