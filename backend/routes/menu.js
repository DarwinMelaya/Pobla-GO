const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu");
const MenuMaintenance = require("../models/MenuMaintenance");
const User = require("../models/User");

// Middleware to verify admin role using JWT
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

// GET /menu/stock - Get menu items with stock information (Admin only)
router.get("/stock", verifyAdmin, async (req, res) => {
  try {
    const menuItems = await Menu.find({})
      .populate(
        "menu_maintenance_id",
        "name category description critical_level"
      )
      .populate("production_id", "production_date status")
      .populate("updated_by", "firstName lastName")
      .sort({ updatedAt: -1 });

    const menuItemsWithStock = menuItems.map((item) => {
      return {
        ...item.toObject(),
        stockStatus: item.getStockStatus(),
        availableServings: item.servings,
      };
    });

    res.json(menuItemsWithStock);
  } catch (error) {
    console.error("Menu stock API error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu - Get all menu items (public access - for customer ordering)
router.get("/", async (req, res) => {
  try {
    const { category, available } = req.query;
    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (available !== undefined) {
      filter.is_available = available === "true";
    }

    const menuItems = await Menu.find(filter)
      .populate("menu_maintenance_id", "name category description")
      .sort({ category: 1, name: 1 });

    // Add stock status and servings info to each menu item
    const menuItemsWithInfo = menuItems.map((item) => {
      return {
        ...item.toObject(),
        stockStatus: item.getStockStatus(),
        availableServings: item.servings,
      };
    });

    // Add cache control headers to prevent stale data
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.json(menuItemsWithInfo);
  } catch (error) {
    console.error("Menu API error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu/:id - Get specific menu item with full details
router.get("/:id", async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id)
      .populate(
        "menu_maintenance_id",
        "name category description critical_level"
      )
      .populate("production_id", "production_date status quantity")
      .populate(
        "production_history.production_id",
        "production_date quantity status"
      )
      .populate("updated_by", "firstName lastName");

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const response = {
      ...menuItem.toObject(),
      stockStatus: menuItem.getStockStatus(),
      availableServings: menuItem.servings,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /menu - Menu items are now auto-created from Production
router.post("/", verifyAdmin, async (req, res) => {
  return res.status(400).json({
    success: false,
    message:
      "Menu items are now automatically created from Productions. Please create a Production with 'Completed' status to add menu items.",
    redirectTo: "/productions",
  });
});

// PUT /menu/:id - Update menu item (Admin only - limited updates)
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { price, is_available } = req.body;

    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Only allow updating price and availability
    // Servings are managed through productions
    if (price !== undefined) menuItem.price = price;
    if (is_available !== undefined) menuItem.is_available = is_available;

    menuItem.updated_by = req.user._id;
    await menuItem.save();

    // Populate the response
    await menuItem.populate([
      { path: "menu_maintenance_id", select: "name category description" },
      { path: "updated_by", select: "firstName lastName" },
    ]);

    res.json({
      success: true,
      data: menuItem,
      message: "Menu item updated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /menu/:id - Delete menu item (Admin only - use with caution)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    await Menu.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message:
        "Menu item deleted successfully. Note: This will not affect production records.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /menu/:id/toggle-availability - Toggle menu item availability (Admin only)
router.put("/:id/toggle-availability", verifyAdmin, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    menuItem.is_available = !menuItem.is_available;
    menuItem.updated_by = req.user._id;
    await menuItem.save();

    res.json({
      success: true,
      message: `Menu item ${
        menuItem.is_available ? "enabled" : "disabled"
      } successfully`,
      is_available: menuItem.is_available,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu/categories/list - Get all available categories
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await Menu.distinct("category");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu/stats - Get menu statistics
router.get("/stats/summary", verifyAdmin, async (req, res) => {
  try {
    const totalItems = await Menu.countDocuments();
    const availableItems = await Menu.countDocuments({ is_available: true });
    const outOfStockItems = await Menu.countDocuments({ servings: 0 });

    // Get low stock items based on critical levels
    const lowStockItems = await Menu.find({
      servings: { $gt: 0, $lte: 20 },
    }).select("name servings critical_level");

    res.json({
      success: true,
      data: {
        total: totalItems,
        available: availableItems,
        outOfStock: outOfStockItems,
        lowStock: lowStockItems.length,
        lowStockDetails: lowStockItems,
      },
      message: "Menu statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Menu stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /menu/:id/deduct - Deduct servings when ordered (for order processing)
router.post("/:id/deduct", verifyAdmin, async (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required",
      });
    }

    const menuItem = await Menu.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    await menuItem.deductServings(quantity);

    res.json({
      success: true,
      message: `Deducted ${quantity} serving(s) from ${menuItem.name}`,
      remainingServings: menuItem.servings,
      stockStatus: menuItem.getStockStatus(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /menu/debug/all - Debug endpoint to check all menu data
router.get("/debug/all", verifyAdmin, async (req, res) => {
  try {
    const menuItems = await Menu.find({})
      .populate("menu_maintenance_id")
      .populate("production_id")
      .populate("production_history.production_id");

    const productions = await require("../models/Production")
      .find({})
      .populate("menu_id");

    const menuMaintenance = await MenuMaintenance.find({});

    res.json({
      success: true,
      data: {
        menuItems: menuItems,
        menuItemsCount: menuItems.length,
        productions: productions,
        productionsCount: productions.length,
        menuMaintenance: menuMaintenance,
        menuMaintenanceCount: menuMaintenance.length,
      },
      message: "Debug data retrieved",
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      success: false,
      message: "Debug error",
      error: error.message,
      stack: error.stack,
    });
  }
});

module.exports = router;
