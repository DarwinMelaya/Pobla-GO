const express = require("express");
const router = express.Router();
const Supplier = require("../models/Supplier");
const User = require("../models/User");

// Middleware to verify admin role using JWT
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "yourSecretKey");
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

// List suppliers
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const filter = search
      ? { $or: [
          { company_name: new RegExp(search, "i") },
          { contact_person: new RegExp(search, "i") },
          { business_address: new RegExp(search, "i") },
        ] }
      : {};
    const suppliers = await Supplier.find(filter).sort({ company_name: 1 });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Create supplier
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { company_name, business_address, contact_person, contact_number, other_contact_number } = req.body;
    if (!company_name || !business_address || !contact_person || !contact_number) {
      return res.status(400).json({ success: false, message: "Required fields: company_name, business_address, contact_person, contact_number" });
    }
    const supplier = new Supplier({ company_name, business_address, contact_person, contact_number, other_contact_number, created_by: req.user?._id });
    await supplier.save();
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Update supplier
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { company_name, business_address, contact_person, contact_number, other_contact_number } = req.body;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
    if (company_name !== undefined) supplier.company_name = company_name;
    if (business_address !== undefined) supplier.business_address = business_address;
    if (contact_person !== undefined) supplier.contact_person = contact_person;
    if (contact_number !== undefined) supplier.contact_number = contact_number;
    if (other_contact_number !== undefined) supplier.other_contact_number = other_contact_number;
    await supplier.save();
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete supplier
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Supplier deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;


