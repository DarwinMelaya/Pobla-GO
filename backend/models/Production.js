const mongoose = require("mongoose");

const productionSchema = new mongoose.Schema(
  {
    menu_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuMaintenance",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    production_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Planned", "In Progress", "Completed", "Cancelled"],
      default: "Planned",
    },
    expected_cost: {
      type: Number,
      default: 0,
    },
    actual_cost: {
      type: Number,
      default: 0,
    },
    srp: {
      type: Number,
      default: 0,
    },
    notes: {
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
productionSchema.index({ menu_id: 1 });
productionSchema.index({ production_date: -1 });
productionSchema.index({ status: 1 });

module.exports = mongoose.model("Production", productionSchema);
