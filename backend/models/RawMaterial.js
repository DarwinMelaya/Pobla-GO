const mongoose = require("mongoose");

const rawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    supplier: { type: String, trim: true },
    unit: { type: String, required: true, trim: true },
    unit_price: { type: Number, min: 0, default: 0 },
    markup_percent: { type: Number, min: 0, default: 0 },
    category: { type: String, required: true, trim: true },
    critical_level: { type: Number, min: 0, default: 0 },
    description: { type: String, trim: true, default: "" },
    image: { type: String, default: "" }, // base64 or URL
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RawMaterial", rawMaterialSchema);


