const express = require("express");
const router = express.Router();
const MenuRecipe = require("../models/MenuRecipe");
const MenuMaintenance = require("../models/MenuMaintenance");
const RawMaterial = require("../models/RawMaterial");
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
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

// List all menu recipes
router.get("/", async (req, res) => {
  try {
    const { menu_id, raw_material_id } = req.query;
    const filter = {};

    if (menu_id) filter.menu_id = menu_id;
    if (raw_material_id) filter.raw_material_id = raw_material_id;

    const recipes = await MenuRecipe.find(filter)
      .populate("menu_id", "name category")
      .populate("raw_material_id", "name unit category unit_price")
      .sort({ created_at: -1 });

    res.json({ success: true, data: recipes });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get menu recipes for a specific menu
router.get("/menu/:menuId", async (req, res) => {
  try {
    const recipes = await MenuRecipe.find({
      menu_id: req.params.menuId,
    })
      .populate(
        "raw_material_id",
        "name unit category unit_price markup_percent"
      )
      .sort({ created_at: -1 });

    res.json({ success: true, data: recipes });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Create menu recipe
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { menu_id, raw_material_id, quantity, unit, notes } = req.body;

    // Validate required fields
    if (!menu_id || !raw_material_id || !quantity || !unit) {
      return res.status(400).json({
        success: false,
        message: "menu_id, raw_material_id, quantity, and unit are required",
      });
    }

    // Check if menu exists
    const menu = await MenuMaintenance.findById(menu_id);
    if (!menu) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    }

    // Check if raw material exists
    const rawMaterial = await RawMaterial.findById(raw_material_id);
    if (!rawMaterial) {
      return res
        .status(404)
        .json({ success: false, message: "Raw material not found" });
    }

    // Check if this ingredient already exists for this menu
    const existingRecipe = await MenuRecipe.findOne({
      menu_id,
      raw_material_id,
    });

    if (existingRecipe) {
      return res.status(409).json({
        success: false,
        message: "This ingredient is already added to this menu item",
      });
    }

    const recipe = new MenuRecipe({
      menu_id,
      raw_material_id,
      quantity: parseFloat(quantity),
      unit: unit.trim(),
      notes: notes ? notes.trim() : "",
      created_by: req.user._id,
    });

    await recipe.save();

    // Populate the data for response
    await recipe.populate([
      { path: "menu_id", select: "name category" },
      {
        path: "raw_material_id",
        select: "name unit category unit_price markup_percent",
      },
    ]);

    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This ingredient is already added to this menu item",
      });
    }
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Update menu recipe
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const recipe = await MenuRecipe.findById(req.params.id);
    if (!recipe) {
      return res
        .status(404)
        .json({ success: false, message: "Recipe ingredient not found" });
    }

    const { quantity, unit, notes } = req.body;

    // Update fields
    if (quantity !== undefined) recipe.quantity = parseFloat(quantity);
    if (unit !== undefined) recipe.unit = unit.trim();
    if (notes !== undefined) recipe.notes = notes.trim();

    await recipe.save();

    // Populate the data for response
    await recipe.populate([
      { path: "menu_id", select: "name category" },
      {
        path: "raw_material_id",
        select: "name unit category unit_price markup_percent",
      },
    ]);

    res.json({ success: true, data: recipe });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete menu recipe
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const recipe = await MenuRecipe.findById(req.params.id);
    if (!recipe) {
      return res
        .status(404)
        .json({ success: false, message: "Recipe ingredient not found" });
    }

    await MenuRecipe.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Recipe ingredient deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get recipe cost calculation for a menu
router.get("/cost/:menuId", async (req, res) => {
  try {
    const recipes = await MenuRecipe.find({
      menu_id: req.params.menuId,
    }).populate("raw_material_id", "name unit unit_price markup_percent");

    let totalCost = 0;
    const costBreakdown = [];

    for (const recipe of recipes) {
      const material = recipe.raw_material_id;
      const cost = (material.unit_price || 0) * recipe.quantity;
      totalCost += cost;

      costBreakdown.push({
        ingredient: material.name,
        quantity: recipe.quantity,
        unit: recipe.unit,
        unit_price: material.unit_price || 0,
        total_cost: cost,
      });
    }

    res.json({
      success: true,
      data: {
        total_cost: totalCost,
        cost_breakdown: costBreakdown,
        ingredient_count: recipes.length,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
