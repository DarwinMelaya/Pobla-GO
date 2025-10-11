const express = require("express");
const Inventory = require("../models/Inventory");
const User = require("../models/User");
const router = express.Router();

// Middleware to verify admin role
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

// Apply admin verification to all routes
router.use(verifyAdmin);

// GET /inventory - Get all inventory items
router.get("/", async (req, res) => {
  try {
    const { category, search, sortBy = "name", sortOrder = "asc" } = req.query;

    let query = {};

    // Filter by category if provided
    if (category) {
      query.category = new RegExp(category, "i");
    }

    // Search by name if provided
    if (search) {
      query.name = new RegExp(search, "i");
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const inventory = await Inventory.find(query).sort(sortOptions);

    res.status(200).json({
      success: true,
      data: inventory,
      count: inventory.length,
    });
  } catch (error) {
    console.error("Get inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /inventory/:id - Get single inventory item
router.get("/:id", async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory item error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// POST /inventory - Create new inventory item
router.post("/", async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      expiry_date,
      description,
      supplier,
      purchase_price,
    } = req.body;

    // Validate required fields
    if (!name || !category || quantity === undefined || !unit || !expiry_date) {
      return res.status(400).json({
        success: false,
        message: "Name, category, quantity, unit, and expiry_date are required",
      });
    }

    // Validate quantity
    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
      });
    }

    // Validate expiry date
    const expiryDate = new Date(expiry_date);
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date format",
      });
    }

    const newInventory = new Inventory({
      name,
      category,
      quantity,
      unit,
      expiry_date: expiryDate,
      description,
      supplier,
      purchase_price,
    });

    await newInventory.save();

    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: newInventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// PUT /inventory/:id - Update inventory item
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      expiry_date,
      description,
      supplier,
      purchase_price,
    } = req.body;

    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    // Validate quantity if provided
    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
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
    if (name !== undefined) inventory.name = name;
    if (category !== undefined) inventory.category = category;
    if (quantity !== undefined) inventory.quantity = quantity;
    if (unit !== undefined) inventory.unit = unit;
    if (expiry_date !== undefined)
      inventory.expiry_date = new Date(expiry_date);
    if (description !== undefined) inventory.description = description;
    if (supplier !== undefined) inventory.supplier = supplier;
    if (purchase_price !== undefined) inventory.purchase_price = purchase_price;

    await inventory.save();

    res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Update inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// DELETE /inventory/:id - Delete inventory item
router.delete("/:id", async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    await Inventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// GET /inventory/expiring/soon - Get items expiring soon (within 30 days)
router.get("/expiring/soon", async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = await Inventory.find({
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

// GET /inventory/categories - Get all unique categories
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await Inventory.distinct("category");

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

module.exports = router;
