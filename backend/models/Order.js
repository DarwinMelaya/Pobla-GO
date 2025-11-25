const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  customer_name: {
    type: String,
    required: true,
    trim: true,
  },
  // Order type: "dine_in", "delivery", or "pickup"
  order_type: {
    type: String,
    enum: ["dine_in", "delivery", "pickup"],
    default: "dine_in",
  },
  // Customer reference (for online orders from logged-in users)
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Customer phone number (required for delivery orders)
  customer_phone: {
    type: String,
    trim: true,
    required: function () {
      return this.order_type === "delivery";
    },
  },
  // Delivery address (for delivery orders)
  delivery_address: {
    type: String,
    trim: true,
    required: function () {
      return this.order_type === "delivery";
    },
  },
  // Delivery fee (for delivery orders)
  delivery_fee: {
    type: Number,
    min: 0,
    default: 0,
  },
  delivery_distance_km: {
    type: Number,
    min: 0,
    default: 0,
  },
  delivery_coordinates: {
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "preparing", "ready", "completed", "cancelled"],
    default: "pending",
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
  discount_id_number: {
    type: String,
    trim: true,
    required: function () {
      return this.discount_type === "pwd" || this.discount_type === "senior";
    },
  },
  packaging_fee: {
    type: Number,
    min: 0,
    default: 0,
  },
  packaging_box_count: {
    type: Number,
    min: 0,
    default: 0,
  },
  // Staff member who took the order (required for dine_in, optional for online)
  staff_member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: function () {
      return this.order_type === "dine_in";
    },
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
OrderSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Virtual to populate order items
OrderSchema.virtual("order_items", {
  ref: "OrderItem",
  localField: "_id",
  foreignField: "order_id",
});

// Ensure virtual fields are serialized
OrderSchema.set("toJSON", { virtuals: true });
OrderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Order", OrderSchema);
