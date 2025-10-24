const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema({
  // Reference to raw material (for raw materials inventory)
  raw_material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RawMaterial",
    required: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  // Total stock quantity (all inventory)
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  // Available quantity (not reserved/allocated)
  available: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  // Stocks (same as quantity, for compatibility)
  stocks: {
    type: Number,
    required: false,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  expiry_date: {
    type: Date,
    required: false, // Made optional for raw materials without expiry
  },
  // Optional fields for better management
  description: {
    type: String,
    trim: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: false,
  },
  supplier_name: {
    type: String,
    trim: true,
  },
  purchase_price: {
    type: Number,
    min: 0,
  },
  // Inventory type (for filtering)
  type: {
    type: String,
    enum: ["raw_material", "finished_product", "other"],
    default: "raw_material",
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
MaterialSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Material", MaterialSchema);
