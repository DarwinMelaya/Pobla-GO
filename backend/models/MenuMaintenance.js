const mongoose = require("mongoose");

const MenuMaintenanceSchema = new mongoose.Schema({
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
  critical_level: {
    type: Number,
    required: true,
    min: 0,
    default: 5,
    validate: {
      validator: Number.isFinite,
      message: "Critical level must be a valid number",
    },
  },
  description: {
    type: String,
    trim: true,
  },
  // Supabase Storage URL for the image
  image: {
    type: String, // Will store Supabase Storage public URL
  },
  // Admin who created this menu maintenance item
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
MenuMaintenanceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("MenuMaintenance", MenuMaintenanceSchema);
