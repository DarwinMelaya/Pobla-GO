const express = require("express");
const Material = require("../models/Material");
const User = require("../models/User");
const UnitConversion = require("../models/UnitConversion");
const router = express.Router();

// Middleware to verify admin or staff role (for read operations)
const verifyAdminOrStaff = async (req, res, next) => {
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
    if (!user || (user.role !== "Admin" && user.role !== "Staff")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Staff role required.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// Middleware to verify admin role (for write operations)
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
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// GET /materials - Get all material items (Admin or Staff)
router.get("/", verifyAdminOrStaff, async (req, res) => {
  try {
    const {
      category,
      search,
      sortBy = "name",
      sortOrder = "asc",
      type,
    } = req.query;

    let query = {};

    // Filter by category if provided
    if (category) {
      query.category = new RegExp(category, "i");
    }

    // Filter by type if provided (raw_material, finished_product, other)
    if (type) {
      query.type = type;
    }

    // Search by name if provided
    if (search) {
      query.name = new RegExp(search, "i");
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const materials = await Material.find(query)
      .populate("raw_material", "name unit category")
      .populate("supplier", "company_name contact_person")
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      data: materials,
      count: materials.length,
    });
  } catch (error) {
    console.error("Get materials error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /materials/expiring/soon - Get items expiring soon (within 30 days) (Admin or Staff)
router.get("/expiring/soon", verifyAdminOrStaff, async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = await Material.find({
      expiry_date: { $lte: thirtyDaysFromNow, $gte: new Date() },
    }).sort({ expiry_date: 1 });

    res.status(200).json({
      success: true,
      data: expiringItems,
      count: expiringItems.length,
    });
  } catch (error) {
    console.error("Get expiring items error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /materials/categories - Get all unique categories (Admin or Staff)
router.get("/categories/list", verifyAdminOrStaff, async (req, res) => {
  try {
    const categories = await Material.distinct("category");

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /materials/:id/conversions - Get material with all unit conversions (Admin or Staff)
router.get("/:id/conversions", verifyAdminOrStaff, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate("raw_material", "name unit category")
      .populate("supplier", "company_name contact_person");

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material item not found",
      });
    }

    // Get all unit conversions for this raw material
    const conversions = await UnitConversion.find({
      raw_material_id: material.raw_material,
    }).sort({ equivalent_unit: 1 });

    // Calculate equivalent quantities in all available units
    const equivalentQuantities = [
      {
        unit: material.unit,
        quantity: material.quantity,
        available: material.available,
        isBase: true,
      },
    ];

    // Add converted units
    conversions.forEach((conversion) => {
      // Convert base unit to equivalent unit
      // Example: 10 Sacks * 25 (kilos per sack) = 250 kilos
      const convertedQty = material.quantity * conversion.quantity;
      const convertedAvailable = material.available * conversion.quantity;

      equivalentQuantities.push({
        unit: conversion.equivalent_unit,
        quantity: convertedQty,
        available: convertedAvailable,
        isBase: false,
        conversionId: conversion._id,
        conversionFactor: conversion.quantity,
      });
    });

    res.status(200).json({
      success: true,
      data: {
        material,
        conversions,
        equivalentQuantities,
      },
    });
  } catch (error) {
    console.error("Get material conversions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /materials/:id - Get single material item (Admin or Staff)
router.get("/:id", verifyAdminOrStaff, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate("raw_material", "name unit category")
      .populate("supplier", "company_name contact_person");

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    console.error("Get material item error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// POST /materials - Create new material item (Admin only)
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const {
      raw_material,
      name,
      category,
      quantity,
      available,
      stocks,
      unit,
      expiry_date,
      description,
      supplier,
      supplier_name,
      purchase_price,
      type,
    } = req.body;

    // Validate required fields
    if (!name || !category || quantity === undefined || !unit) {
      return res.status(400).json({
        success: false,
        message: "Name, category, quantity, and unit are required",
      });
    }

    // Validate quantity
    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
      });
    }

    // Validate expiry date if provided
    let expiryDate = null;
    if (expiry_date) {
      expiryDate = new Date(expiry_date);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date format",
        });
      }
    }

    const newMaterial = new Material({
      raw_material: raw_material || undefined,
      name,
      category,
      quantity,
      available: available !== undefined ? available : quantity,
      stocks: stocks !== undefined ? stocks : quantity,
      unit,
      expiry_date: expiryDate,
      description,
      supplier: supplier || undefined,
      supplier_name,
      purchase_price,
      type: type || "raw_material",
    });

    await newMaterial.save();

    // Populate the response
    const populatedMaterial = await Material.findById(newMaterial._id)
      .populate("raw_material", "name unit category")
      .populate("supplier", "company_name contact_person");

    res.status(201).json({
      success: true,
      message: "Material item created successfully",
      data: populatedMaterial,
    });
  } catch (error) {
    console.error("Create material error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// PUT /materials/:id - Update material item (Admin only)
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const {
      raw_material,
      name,
      category,
      quantity,
      available,
      stocks,
      unit,
      expiry_date,
      description,
      supplier,
      supplier_name,
      purchase_price,
      type,
    } = req.body;

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material item not found",
      });
    }

    // Validate quantity if provided
    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
      });
    }

    // Validate available if provided
    if (available !== undefined && available < 0) {
      return res.status(400).json({
        success: false,
        message: "Available quantity must be a positive number",
      });
    }

    // Validate expiry date if provided
    if (expiry_date) {
      const expiryDate = new Date(expiry_date);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date format",
        });
      }
    }

    // Update fields
    if (raw_material !== undefined) material.raw_material = raw_material;
    if (name !== undefined) material.name = name;
    if (category !== undefined) material.category = category;
    if (quantity !== undefined) material.quantity = quantity;
    if (available !== undefined) material.available = available;
    if (stocks !== undefined) material.stocks = stocks;
    if (unit !== undefined) material.unit = unit;
    if (expiry_date !== undefined) material.expiry_date = new Date(expiry_date);
    if (description !== undefined) material.description = description;
    if (supplier !== undefined) material.supplier = supplier;
    if (supplier_name !== undefined) material.supplier_name = supplier_name;
    if (purchase_price !== undefined) material.purchase_price = purchase_price;
    if (type !== undefined) material.type = type;

    await material.save();

    // Populate the response
    const populatedMaterial = await Material.findById(material._id)
      .populate("raw_material", "name unit category")
      .populate("supplier", "company_name contact_person");

    res.status(200).json({
      success: true,
      message: "Material item updated successfully",
      data: populatedMaterial,
    });
  } catch (error) {
    console.error("Update material error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// DELETE /materials/:id - Delete material item (Admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material item not found",
      });
    }

    await Material.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Material item deleted successfully",
    });
  } catch (error) {
    console.error("Delete material error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
