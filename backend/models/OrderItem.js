const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  item_name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  total_price: {
    type: Number,
    required: true,
    min: 0,
  },
  container_fee: {
    type: Number,
    min: 0,
    default: 0,
  },
  // Reference to the menu item (optional, for tracking)
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Menu",
  },
  // Special instructions for this item
  special_instructions: {
    type: String,
    trim: true,
  },
  // Item status within the order
  item_status: {
    type: String,
    enum: ["pending", "preparing", "ready", "served"],
    default: "pending",
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
OrderItemSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Ensure total_price is calculated correctly
OrderItemSchema.pre("save", function (next) {
  if (this.isModified("quantity") || this.isModified("price")) {
    this.total_price = this.quantity * this.price;
  }
  next();
});

// Virtual to populate the order
OrderItemSchema.virtual("order", {
  ref: "Order",
  localField: "order_id",
  foreignField: "_id",
  justOne: true,
});

// Virtual to populate the menu item
OrderItemSchema.virtual("menu_item", {
  ref: "Menu",
  localField: "menu_item_id",
  foreignField: "_id",
  justOne: true,
});

// Ensure virtual fields are serialized
OrderItemSchema.set("toJSON", { virtuals: true });
OrderItemSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("OrderItem", OrderItemSchema);
