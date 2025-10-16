const express = require("express");
const router = express.Router();
const Unit = require("../models/Unit");
const User = require("../models/User");

// Middleware to verify admin role using JWT (same as other routes)
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "yourSecretKey"
    );

    const user = await User.findById(decoded.userId);
    if (!user || user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

// List all units
router.get("/", async (req, res) => {
  try {
    const units = await Unit.find({}).sort({ unit: 1 });
    res.json({ success: true, data: units });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Create unit
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { unit, symbol } = req.body;
    if (!unit || !symbol) {
      return res.status(400).json({ success: false, message: "unit and symbol are required" });
    }

    const existing = await Unit.findOne({ unit: new RegExp(`^${unit}$`, "i") });
    if (existing) {
      return res.status(409).json({ success: false, message: "Unit already exists" });
    }

    const newUnit = new Unit({ unit, symbol, created_by: req.user?._id });
    await newUnit.save();
    res.status(201).json({ success: true, data: newUnit });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Update unit
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { unit, symbol } = req.body;
    const doc = await Unit.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Unit not found" });

    if (unit !== undefined) doc.unit = unit;
    if (symbol !== undefined) doc.symbol = symbol;
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete unit
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const doc = await Unit.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Unit not found" });
    await Unit.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Unit deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Distinct symbols for convenience
router.get("/symbols/list", async (req, res) => {
  try {
    const symbols = await Unit.distinct("symbol");
    res.json({ success: true, data: symbols });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;


