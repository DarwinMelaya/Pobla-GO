const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  customer_name: {
    type: String,
    required: true,
    trim: true,
  },
  table_number: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "preparing", "ready", "completed", "cancelled"],
    default: "pending",
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  // Staff member who took the order
  staff_member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
    enum: ["cash", "card", "digital"],
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

// Static method to check if a table is available
OrderSchema.statics.isTableAvailable = async function (tableNumber) {
  const activeOrder = await this.findOne({
    table_number: tableNumber,
    status: { $in: ["pending", "preparing", "ready"] },
  });
  return !activeOrder; // Table is available if no active order exists
};

// Static method to get table status
OrderSchema.statics.getTableStatus = async function (tableNumber) {
  const activeOrder = await this.findOne({
    table_number: tableNumber,
    status: { $in: ["pending", "preparing", "ready"] },
  }).populate("staff_member", "name");

  if (!activeOrder) {
    return { available: true, order: null };
  }

  return {
    available: false,
    order: activeOrder,
    status: activeOrder.status,
    customer: activeOrder.customer_name,
    staff: activeOrder.staff_member?.name || "Unknown",
  };
};

// Static method to get all table statuses
OrderSchema.statics.getAllTableStatuses = async function () {
  const activeOrders = await this.find({
    status: { $in: ["pending", "preparing", "ready"] },
  }).populate("staff_member", "name");

  const tableStatuses = {};

  // Get all unique table numbers from active orders
  const tableNumbers = [
    ...new Set(activeOrders.map((order) => order.table_number)),
  ];

  // Mark occupied tables
  tableNumbers.forEach((tableNumber) => {
    const order = activeOrders.find((o) => o.table_number === tableNumber);
    tableStatuses[tableNumber] = {
      available: false,
      order: order,
      status: order.status,
      customer: order.customer_name,
      staff: order.staff_member?.name || "Unknown",
    };
  });

  return tableStatuses;
};

// Ensure virtual fields are serialized
OrderSchema.set("toJSON", { virtuals: true });
OrderSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Order", OrderSchema);
