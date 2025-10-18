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
    min: 1,
    max: 4,
  },
  description: {
    type: String,
    trim: true,
  },
  // Base64 encoded image - no size limit as requested
  image: {
    type: String, // Will store base64 encoded image data
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
