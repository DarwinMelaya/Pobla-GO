const mongoose = require("mongoose");

const menuRecipeSchema = new mongoose.Schema(
  {
    menu_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuMaintenance",
      required: true,
    },
    raw_material_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
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
menuRecipeSchema.index({ menu_id: 1 });
menuRecipeSchema.index({ raw_material_id: 1 });

// Compound index to prevent duplicate ingredients for the same menu
menuRecipeSchema.index({ menu_id: 1, raw_material_id: 1 }, { unique: true });

module.exports = mongoose.model("MenuRecipe", menuRecipeSchema);
