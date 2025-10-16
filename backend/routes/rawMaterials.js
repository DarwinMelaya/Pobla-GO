const express = require("express");
const router = express.Router();
const RawMaterial = require("../models/RawMaterial");
const User = require("../models/User");

// Middleware to verify admin role using JWT (same approach as others)
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

// List all raw materials (public for listing)
router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (category) filter.category = new RegExp(category, "i");
    if (search) filter.$or = [
      { name: new RegExp(search, "i") },
      { supplier: new RegExp(search, "i") },
      { category: new RegExp(search, "i") },
    ];
    const materials = await RawMaterial.find(filter).sort({ name: 1 });
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Create raw material
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      supplier,
      unit,
      unit_price,
      markup_percent,
      category,
      critical_level,
      description,
      image,
    } = req.body;

    if (!name || !unit || !category) {
      return res.status(400).json({ success: false, message: "name, unit and category are required" });
    }

    const created = new RawMaterial({
      name,
      supplier,
      unit,
      unit_price,
      markup_percent,
      category,
      critical_level,
      description,
      image,
      created_by: req.user?._id,
    });
    await created.save();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Update raw material
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Raw material not found" });
    const fields = [
      "name",
      "supplier",
      "unit",
      "unit_price",
      "markup_percent",
      "category",
      "critical_level",
      "description",
      "image",
    ];
    for (const key of fields) {
      if (req.body[key] !== undefined) material[key] = req.body[key];
    }
    await material.save();
    res.json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete raw material
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Raw material not found" });
    await RawMaterial.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Raw material deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Distinct categories for convenience
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await RawMaterial.distinct("category");
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;


