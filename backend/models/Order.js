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
  // Table number (required for dine_in, optional for online orders)
  table_number: {
    type: String,
    trim: true,
    required: function () {
      return this.order_type === "dine_in";
    },
  },
  // Customer reference (for online orders from logged-in users)
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Customer phone number (for delivery/pickup)
  customer_phone: {
    type: String,
    trim: true,
  },
  // Delivery address (for delivery orders)
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

// Static method to check if a table is available
OrderSchema.statics.isTableAvailable = async function (tableNumber) {
  const activeOrder = await this.findOne({
    table_number: tableNumber,
    status: { $in: ["pending", "preparing", "ready"] },
  });

  // If there's an active order, table is not available
  if (activeOrder) {
    return false;
  }

  // Check for confirmed reservations - these always block the table until completed
  const Reservation = mongoose.model("Reservation");
  const confirmedReservation = await Reservation.findOne({
    table_number: tableNumber,
    status: "confirmed",
  });

  if (confirmedReservation) {
    return false; // Table is not available if there's a confirmed reservation
  }

  // Check for pending reservations within a 2-hour window
  const now = new Date();
  const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourAfter = new Date(now.getTime() + 60 * 60 * 1000);

  const pendingReservation = await Reservation.findOne({
    table_number: tableNumber,
    reservation_date: {
      $gte: oneHourBefore,
      $lte: oneHourAfter,
    },
    status: "pending",
  });

  return !pendingReservation; // Table is available if no active reservation exists
};

// Static method to get table status
OrderSchema.statics.getTableStatus = async function (tableNumber) {
  const activeOrder = await this.findOne({
    table_number: tableNumber,
    status: { $in: ["pending", "preparing", "ready"] },
  }).populate("staff_member", "name");

  if (activeOrder) {
    return {
      available: false,
      order: activeOrder,
      status: activeOrder.status,
      customer: activeOrder.customer_name,
      staff: activeOrder.staff_member?.name || "Unknown",
      type: "order", // Indicate this is an order conflict
    };
  }

  // Check for confirmed reservations first - these always block the table until completed
  const Reservation = mongoose.model("Reservation");
  const confirmedReservation = await Reservation.findOne({
    table_number: tableNumber,
    status: "confirmed",
  });

  if (confirmedReservation) {
    return {
      available: false,
      reservation: confirmedReservation,
      status: confirmedReservation.status,
      customer: confirmedReservation.customer_name,
      reservation_date: confirmedReservation.reservation_date,
      type: "reservation", // Indicate this is a reservation conflict
    };
  }

  // Check for pending reservations within a 2-hour window
  const now = new Date();
  const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourAfter = new Date(now.getTime() + 60 * 60 * 1000);

  const pendingReservation = await Reservation.findOne({
    table_number: tableNumber,
    reservation_date: {
      $gte: oneHourBefore,
      $lte: oneHourAfter,
    },
    status: "pending",
  });

  if (pendingReservation) {
    return {
      available: false,
      reservation: pendingReservation,
      status: pendingReservation.status,
      customer: pendingReservation.customer_name,
      reservation_date: pendingReservation.reservation_date,
      type: "reservation", // Indicate this is a reservation conflict
    };
  }

  return { available: true, order: null, reservation: null };
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
