const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    expense: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
