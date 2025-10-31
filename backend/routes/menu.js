/**
 * Menu Routes - Integration with Order Management System
 * =====================================================
 * 
 * This routes file handles the Menu items that are available for ordering.
 * 
 * IMPORTANT: Menu vs MenuMaintenance
 * ----------------------------------
 * - MenuMaintenance: Base menu item definitions (recipes, ingredients, etc.)
 * - Menu: Actual available items with servings from Production
 * 
 * Flow:
 * 1. MenuMaintenance items are created in the system
 * 2. Production creates menu items based on MenuMaintenance
 * 3. Menu items are automatically created/updated with servings from Production
 * 4. Orders deduct servings from Menu items
 * 5. When orders are cancelled, servings are restored
 * 
 * Integration Points:
 * - GET /menu - Fetch available menu items for ordering (with servings)
 * - Orders automatically update Menu.servings when created/cancelled/deleted
 * - Menu.is_available is auto-calculated based on servings > 0
 * - Stock status (out_of_stock, low_stock, in_stock) based on critical_level
 */

const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu");
const User = require("../models/User");

// Middleware to verify authentication (optional for public menu viewing)
const verifyAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      // Allow public access to menu
      req.user = null;
      return next();
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "yourSecretKey"
    );

    const user = await User.findById(decoded.userId);
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    // Allow public access even if token is invalid
    req.user = null;
    next();
  }
};

// GET /menu - Get all available menu items with servings
router.get("/", verifyAuth, async (req, res) => {
  try {
    const { category, search, available_only = "true" } = req.query;

    let filter = {};

    // Filter by availability
    if (available_only === "true") {
      filter.is_available = true;
      filter.servings = { $gt: 0 };
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Search by name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const menuItems = await Menu.find(filter)
      .populate("menu_maintenance_id", "name category description")
      .populate("updated_by", "name")
      .sort({ category: 1, name: 1 });

    // Add availableServings field for frontend compatibility
    const itemsWithServings = menuItems.map((item) => ({
      _id: item._id,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      image: item.image,
      servings: item.servings,
      availableServings: item.servings, // Alias for frontend
      critical_level: item.critical_level,
      is_available: item.is_available,
      stock_status: item.getStockStatus(),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.json({
      success: true,
      items: itemsWithServings,
      total: itemsWithServings.length,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET /menu/:id - Get specific menu item
router.get("/:id", verifyAuth, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id)
      .populate("menu_maintenance_id")
      .populate("production_id")
      .populate("updated_by", "name");

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...menuItem.toObject(),
        availableServings: menuItem.servings,
        stock_status: menuItem.getStockStatus(),
      },
    });
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET /menu/categories/list - Get all unique categories
router.get("/categories/list", verifyAuth, async (req, res) => {
  try {
    const categories = await Menu.distinct("category");
    res.json({
      success: true,
      categories: categories.sort(),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET /menu/stats/inventory - Get inventory statistics
router.get("/stats/inventory", verifyAuth, async (req, res) => {
  try {
    const allItems = await Menu.find();

    const stats = {
      total_items: allItems.length,
      available_items: allItems.filter((item) => item.is_available).length,
      out_of_stock: allItems.filter(
        (item) => item.getStockStatus() === "out_of_stock"
      ).length,
      low_stock: allItems.filter((item) => item.getStockStatus() === "low_stock")
        .length,
      in_stock: allItems.filter((item) => item.getStockStatus() === "in_stock")
        .length,
      total_servings: allItems.reduce((sum, item) => sum + item.servings, 0),
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// POST /menu/check-availability - Check if multiple items have sufficient servings
router.post("/check-availability", verifyAuth, async (req, res) => {
  try {
    const { items } = req.body; // Expected: [{ menu_item_id, quantity }]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required",
      });
    }

    const availabilityResults = [];

    for (const item of items) {
      const menuItem = await Menu.findById(item.menu_item_id);

      if (!menuItem) {
        availabilityResults.push({
          menu_item_id: item.menu_item_id,
          available: false,
          reason: "Menu item not found",
        });
        continue;
      }

      const hasStock = menuItem.hasSufficientServings(item.quantity);
      availabilityResults.push({
        menu_item_id: item.menu_item_id,
        name: menuItem.name,
        requested: item.quantity,
        available_servings: menuItem.servings,
        available: hasStock,
        reason: hasStock ? "Available" : "Insufficient servings",
      });
    }

    const allAvailable = availabilityResults.every((result) => result.available);

    res.json({
      success: true,
      all_available: allAvailable,
      items: availabilityResults,
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// PUT /menu/:id/toggle-availability - Toggle menu item availability
router.put("/:id/toggle-availability", verifyAuth, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Check if we can enable (need servings > 0)
    if (!menuItem.is_available && menuItem.servings === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot enable menu item with 0 servings. Please produce more servings first.",
      });
    }

    // Toggle availability
    if (menuItem.is_available) {
      // Disabling: Set manually_disabled flag
      menuItem.is_available = false;
      menuItem.manually_disabled = true;
    } else {
      // Enabling: Clear manually_disabled flag
      menuItem.is_available = true;
      menuItem.manually_disabled = false;
    }
    
    await menuItem.save();

    res.json({
      success: true,
      message: `Menu item ${menuItem.is_available ? "enabled" : "disabled"} successfully`,
      data: {
        _id: menuItem._id,
        name: menuItem.name,
        is_available: menuItem.is_available,
        servings: menuItem.servings,
      },
    });
  } catch (error) {
    console.error("Error toggling availability:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
