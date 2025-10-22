const mongoose = require("mongoose");

const MenuCostingSchema = new mongoose.Schema(
  {
    menu_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuMaintenance",
      required: true,
    },
    yield: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    markup_percent: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    srp: {
      type: Number,
      required: true,
      min: 0,
    },
    // Auto-calculated fields (computed from other data)
    total_production_cost: {
      type: Number,
      default: 0,
    },
    production_cost_per_piece: {
      type: Number,
      default: 0,
    },
    net_profit: {
      type: Number,
      default: 0,
    },
    gross_sales: {
      type: Number,
      default: 0,
    },
    total_net_income: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
MenuCostingSchema.index({ menu_id: 1 });

// Virtual to calculate production cost per piece
MenuCostingSchema.virtual("calculatedProductionCostPerPiece").get(function () {
  if (this.yield && this.yield > 0) {
    return this.total_production_cost / this.yield;
  }
  return 0;
});

// Virtual to calculate net profit
MenuCostingSchema.virtual("calculatedNetProfit").get(function () {
  return this.srp - this.production_cost_per_piece;
});

// Virtual to calculate gross sales
MenuCostingSchema.virtual("calculatedGrossSales").get(function () {
  return this.srp * this.yield;
});

// Virtual to calculate total net income
MenuCostingSchema.virtual("calculatedTotalNetIncome").get(function () {
  return this.calculatedNetProfit * this.yield;
});

module.exports = mongoose.model("MenuCosting", MenuCostingSchema);
