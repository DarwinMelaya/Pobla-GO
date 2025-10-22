const express = require("express");
const router = express.Router();
const MenuCosting = require("../models/MenuCosting");
const MenuRecipe = require("../models/MenuRecipe");
const MenuExpense = require("../models/MenuExpense");
const jwt = require("jsonwebtoken");

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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "yourSecretKey"
    );

    const User = require("../models/User");
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

// Get menu costing for a specific menu
router.get("/menu/:menuId", async (req, res) => {
  try {
    const costing = await MenuCosting.findOne({ menu_id: req.params.menuId })
      .populate("menu_id", "name category")
      .sort({ created_at: -1 });

    if (!costing) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: costing });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Create or update menu costing
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { menu_id, yield, markup_percent, srp } = req.body;

    if (!menu_id || !yield || markup_percent === undefined || !srp) {
      return res.status(400).json({
        success: false,
        message: "Menu ID, yield, markup percent, and SRP are required",
      });
    }

    // Calculate total production cost from recipes and expenses
    const [recipes, expenses] = await Promise.all([
      MenuRecipe.find({ menu_id }).populate("raw_material_id", "unit_price"),
      MenuExpense.find({ menu_id }),
    ]);

    // Calculate total cost from recipes
    let totalRecipeCost = 0;
    recipes.forEach((recipe) => {
      const material = recipe.raw_material_id;
      if (material && material.unit_price) {
        totalRecipeCost += material.unit_price * recipe.quantity;
      }
    });

    // Calculate total cost from expenses
    const totalExpenseCost = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Total production cost
    const total_production_cost = totalRecipeCost + totalExpenseCost;

    // Calculate production cost per piece
    const production_cost_per_piece = total_production_cost / yield;

    // Calculate net profit
    const net_profit = srp - production_cost_per_piece;

    // Calculate gross sales
    const gross_sales = srp * yield;

    // Calculate total net income
    const total_net_income = net_profit * yield;

    // Check if costing already exists for this menu
    const existingCosting = await MenuCosting.findOne({ menu_id });

    let costing;
    if (existingCosting) {
      // Update existing costing
      costing = await MenuCosting.findByIdAndUpdate(
        existingCosting._id,
        {
          yield,
          markup_percent,
          srp,
          total_production_cost,
          production_cost_per_piece,
          net_profit,
          gross_sales,
          total_net_income,
        },
        { new: true }
      );
    } else {
      // Create new costing
      costing = new MenuCosting({
        menu_id,
        yield,
        markup_percent,
        srp,
        total_production_cost,
        production_cost_per_piece,
        net_profit,
        gross_sales,
        total_net_income,
        created_by: req.user._id,
      });
      await costing.save();
    }

    res.json({
      success: true,
      data: costing,
      message: existingCosting
        ? "Costing updated successfully"
        : "Costing created successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Update menu costing
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { yield, markup_percent, srp } = req.body;

    if (
      yield === undefined ||
      markup_percent === undefined ||
      srp === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Yield, markup percent, and SRP are required",
      });
    }

    const costing = await MenuCosting.findById(req.params.id);
    if (!costing) {
      return res
        .status(404)
        .json({ success: false, message: "Costing not found" });
    }

    // Recalculate costs based on current recipes and expenses
    const [recipes, expenses] = await Promise.all([
      MenuRecipe.find({ menu_id: costing.menu_id }).populate(
        "raw_material_id",
        "unit_price"
      ),
      MenuExpense.find({ menu_id: costing.menu_id }),
    ]);

    // Calculate total cost from recipes
    let totalRecipeCost = 0;
    recipes.forEach((recipe) => {
      const material = recipe.raw_material_id;
      if (material && material.unit_price) {
        totalRecipeCost += material.unit_price * recipe.quantity;
      }
    });

    // Calculate total cost from expenses
    const totalExpenseCost = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Total production cost
    const total_production_cost = totalRecipeCost + totalExpenseCost;

    // Calculate production cost per piece
    const production_cost_per_piece = total_production_cost / yield;

    // Calculate net profit
    const net_profit = srp - production_cost_per_piece;

    // Calculate gross sales
    const gross_sales = srp * yield;

    // Calculate total net income
    const total_net_income = net_profit * yield;

    const updatedCosting = await MenuCosting.findByIdAndUpdate(
      req.params.id,
      {
        yield,
        markup_percent,
        srp,
        total_production_cost,
        production_cost_per_piece,
        net_profit,
        gross_sales,
        total_net_income,
      },
      { new: true }
    );

    res.json({
      success: true,
      data: updatedCosting,
      message: "Costing updated successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete menu costing
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const costing = await MenuCosting.findByIdAndDelete(req.params.id);
    if (!costing) {
      return res
        .status(404)
        .json({ success: false, message: "Costing not found" });
    }

    res.json({ success: true, message: "Costing deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
