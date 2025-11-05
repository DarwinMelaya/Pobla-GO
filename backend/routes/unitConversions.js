const express = require("express");
const router = express.Router();
const UnitConversion = require("../models/UnitConversion");
const RawMaterial = require("../models/RawMaterial");
const User = require("../models/User");

// Middleware to verify admin role using JWT
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
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

// List all unit conversions
router.get("/", async (req, res) => {
  try {
    const { raw_material_id, equivalent_unit } = req.query;
    const filter = {};

    if (raw_material_id) filter.raw_material_id = raw_material_id;
    if (equivalent_unit)
      filter.equivalent_unit = new RegExp(equivalent_unit, "i");

    const conversions = await UnitConversion.find(filter)
      .populate("raw_material_id", "name unit category")
      .sort({ created_at: -1 });

    res.json({ success: true, data: conversions });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get unit conversions for a specific raw material
router.get("/material/:materialId", async (req, res) => {
  try {
    const conversions = await UnitConversion.find({
      raw_material_id: req.params.materialId,
    })
      .populate("raw_material_id", "name unit category")
      .sort({ created_at: -1 });

    res.json({ success: true, data: conversions });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Create unit conversion
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const {
      raw_material_id,
      base_unit,
      equivalent_unit,
      quantity,
      unit_price,
      markup_percent,
      srp,
      is_default_retail,
    } = req.body;

    // Validate required fields
    if (
      !raw_material_id ||
      !base_unit ||
      !equivalent_unit ||
      !quantity ||
      !unit_price ||
      !srp
    ) {
      return res.status(400).json({
        success: false,
        message:
          "raw_material_id, base_unit, equivalent_unit, quantity, unit_price, and srp are required",
      });
    }

    // Validate SRP is greater than or equal to unit price
    if (parseFloat(srp) < parseFloat(unit_price)) {
      return res.status(400).json({
        success: false,
        message: "SRP must be greater than or equal to unit price",
      });
    }

    // Check if raw material exists
    const rawMaterial = await RawMaterial.findById(raw_material_id);
    if (!rawMaterial) {
      return res
        .status(404)
        .json({ success: false, message: "Raw material not found" });
    }

    // If setting as default retail, unset other defaults for this material
    if (is_default_retail) {
      await UnitConversion.updateMany(
        { raw_material_id, is_default_retail: true },
        { is_default_retail: false }
      );
    }

    const conversion = new UnitConversion({
      raw_material_id,
      base_unit,
      equivalent_unit,
      quantity: parseFloat(quantity),
      unit_price: parseFloat(unit_price),
      markup_percent: parseFloat(markup_percent) || 0,
      srp: parseFloat(srp),
      is_default_retail: Boolean(is_default_retail),
      created_by: req.user._id,
    });

    await conversion.save();

    // Populate the raw material data for response
    await conversion.populate("raw_material_id", "name unit category");

    res.status(201).json({ success: true, data: conversion });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Update unit conversion
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const conversion = await UnitConversion.findById(req.params.id);
    if (!conversion) {
      return res
        .status(404)
        .json({ success: false, message: "Unit conversion not found" });
    }

    const {
      base_unit,
      equivalent_unit,
      quantity,
      unit_price,
      markup_percent,
      srp,
      is_default_retail,
    } = req.body;

    // Validate SRP is greater than or equal to unit price if provided
    if (
      srp !== undefined &&
      unit_price !== undefined &&
      parseFloat(srp) < parseFloat(unit_price)
    ) {
      return res.status(400).json({
        success: false,
        message: "SRP must be greater than or equal to unit price",
      });
    }

    // If setting as default retail, unset other defaults for this material
    if (is_default_retail) {
      await UnitConversion.updateMany(
        {
          raw_material_id: conversion.raw_material_id,
          is_default_retail: true,
          _id: { $ne: conversion._id },
        },
        { is_default_retail: false }
      );
    }

    // Update fields
    const fields = [
      "base_unit",
      "equivalent_unit",
      "quantity",
      "unit_price",
      "markup_percent",
      "srp",
      "is_default_retail",
    ];

    for (const key of fields) {
      if (req.body[key] !== undefined) {
        if (
          key === "quantity" ||
          key === "unit_price" ||
          key === "markup_percent" ||
          key === "srp"
        ) {
          conversion[key] = parseFloat(req.body[key]);
        } else if (key === "is_default_retail") {
          conversion[key] = Boolean(req.body[key]);
        } else {
          conversion[key] = req.body[key];
        }
      }
    }

    await conversion.save();
    await conversion.populate("raw_material_id", "name unit category");

    res.json({ success: true, data: conversion });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete unit conversion
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const conversion = await UnitConversion.findById(req.params.id);
    if (!conversion) {
      return res
        .status(404)
        .json({ success: false, message: "Unit conversion not found" });
    }

    await UnitConversion.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Unit conversion deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get default retail unit for a material
router.get("/default/:materialId", async (req, res) => {
  try {
    const conversion = await UnitConversion.findOne({
      raw_material_id: req.params.materialId,
      is_default_retail: true,
    }).populate("raw_material_id", "name unit category");

    res.json({ success: true, data: conversion });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
