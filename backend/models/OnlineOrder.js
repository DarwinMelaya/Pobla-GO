const mongoose = require("mongoose");

const OnlineOrderSchema = new mongoose.Schema({
  customer_name: {
    type: String,
    required: true,
    trim: true,
  },
  // Order type: "delivery" or "pickup"
  order_type: {
    type: String,
    enum: ["delivery", "pickup"],
    required: true,
  },
  // Customer reference (for logged-in users)
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Customer phone number (required for delivery/pickup)
  customer_phone: {
    type: String,
    trim: true,
    required: true,
  },
  // Delivery address (required for delivery orders)
  delivery_address: {
    type: String,
    trim: true,
  },
  // Delivery fee (for delivery orders)
  delivery_fee: {
    type: Number,
    min: 0,
    default: 0,
  },
  status: {
    type: String,
    required: true,
    enum: ["Pending", "Cancelled", "Ready", "OnTheWay", "Completed"],
    default: "Pending",
  },
  subtotal_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  discount_type: {
    type: String,
    enum: ["none", "pwd", "senior"],
    default: "none",
  },
  discount_rate: {
    type: Number,
    min: 0,
    default: 0,
  },
  discount_amount: {
    type: Number,
    min: 0,
    default: 0,
  },
  // Additional order details
  notes: {
    type: String,
    trim: true,
  },
  // Payment information
  payment_status: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending",
  },
  payment_method: {
    type: String,
    enum: ["cash", "card", "digital", "gcash"],
  },
  // Track if servings have been deducted (to prevent double deduction)
  servings_deducted: {
    type: Boolean,
    default: false,
  },
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update the updated_at field before saving
OnlineOrderSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Virtual to populate order items
OnlineOrderSchema.virtual("order_items", {
  ref: "OnlineOrderItem",
  localField: "_id",
  foreignField: "order_id",
});

// Ensure virtual fields are serialized
OnlineOrderSchema.set("toJSON", { virtuals: true });
OnlineOrderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("OnlineOrder", OnlineOrderSchema);

