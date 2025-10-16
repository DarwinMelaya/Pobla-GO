const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    company_name: { type: String, required: true, trim: true },
    business_address: { type: String, required: true, trim: true },
    contact_person: { type: String, required: true, trim: true }, // full name
    contact_number: { type: String, required: true, trim: true }, // cellphone
    other_contact_number: { type: String, trim: true, default: "" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
