const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema({
  customer_name: {
    type: String,
    required: true,
    trim: true,
  },
  contact_number: {
    type: String,
    required: true,
    trim: true,
  },
  reservation_date: {
    type: Date,
    required: true,
  },
  number_of_persons: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  // Food items for the reservation
  food_items: [
    {
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
      menu_item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu",
      },
      special_instructions: {
        type: String,
        trim: true,
      },
    },
  ],
  // Total amount for food items
  total_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
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
ReservationSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model("Reservation", ReservationSchema);
