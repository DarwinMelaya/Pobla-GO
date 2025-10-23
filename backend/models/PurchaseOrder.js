const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    po_number: { type: String, unique: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    item_type: {
      type: String,
      required: true,
      enum: ["Raw Materials"],
      default: "Raw Materials",
    },
    items: [
      {
        raw_material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RawMaterial",
          required: true,
        },
        unit_conversion: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UnitConversion",
          required: false,
          default: null,
        },
        quantity: { type: Number, required: true, min: 0.01 },
        received_quantity: { type: Number, default: 0, min: 0 },
        unit: { type: String, required: true, trim: true },
        unit_price: { type: Number, required: true, min: 0 },
        total_price: { type: Number, required: true, min: 0 },
      },
    ],
    total_amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Delivered", "Cancelled"],
      default: "Pending",
    },
    order_date: { type: Date, default: Date.now },
    expected_delivery_date: { type: Date },
    date_received: { type: Date },
    notes: { type: String, trim: true, default: "" },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approved_at: { type: Date },
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Generate PO number before saving
purchaseOrderSchema.pre("save", async function (next) {
  if (this.isNew && !this.po_number) {
    const count = await mongoose.model("PurchaseOrder").countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");
    const sequence = String(count + 1).padStart(4, "0");
    this.po_number = `PO-${year}${month}${day}-${sequence}`;
  }
  next();
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
