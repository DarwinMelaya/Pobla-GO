const mongoose = require("mongoose");

const unitConversionSchema = new mongoose.Schema(
  {
    raw_material_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    base_unit: {
      type: String,
      required: true,
      trim: true,
    },
    equivalent_unit: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0,
    },
    markup_percent: {
      type: Number,
      default: 0,
      min: 0,
    },
    srp: {
      type: Number,
      required: true,
      min: 0,
    },
    is_default_retail: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
unitConversionSchema.index({ raw_material_id: 1 });
unitConversionSchema.index({ equivalent_unit: 1 });

module.exports = mongoose.model("UnitConversion", unitConversionSchema);
