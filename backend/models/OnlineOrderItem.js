const mongoose = require("mongoose");

const OnlineOrderItemSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OnlineOrder",
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
  // Reference to the menu item (for inventory management)
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Menu",
    required: true,
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
OnlineOrderItemSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Ensure total_price is calculated correctly
OnlineOrderItemSchema.pre("save", function (next) {
  if (this.isModified("quantity") || this.isModified("price")) {
    this.total_price = this.quantity * this.price;
  }
  next();
});

// Virtual to populate the order
OnlineOrderItemSchema.virtual("order", {
  ref: "OnlineOrder",
  localField: "order_id",
  foreignField: "_id",
  justOne: true,
});

// Virtual to populate the menu item
OnlineOrderItemSchema.virtual("menu_item", {
  ref: "Menu",
  localField: "menu_item_id",
  foreignField: "_id",
  justOne: true,
});

// Ensure virtual fields are serialized
OnlineOrderItemSchema.set("toJSON", { virtuals: true });
OnlineOrderItemSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("OnlineOrderItem", OnlineOrderItemSchema);

