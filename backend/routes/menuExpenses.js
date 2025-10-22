const express = require("express");
const router = express.Router();
const MenuExpense = require("../models/MenuExpense");
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
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

// List all menu expenses
router.get("/", async (req, res) => {
  try {
    const { menu_id } = req.query;
    const filter = {};

    if (menu_id) filter.menu_id = menu_id;

    const expenses = await MenuExpense.find(filter)
      .populate("menu_id", "name category")
      .sort({ created_at: -1 });

    res.json({ success: true, data: expenses });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get menu expenses for a specific menu
router.get("/menu/:menuId", async (req, res) => {
  try {
    const expenses = await MenuExpense.find({
      menu_id: req.params.menuId,
    })
      .populate("menu_id", "name category")
      .sort({ created_at: -1 });

    res.json({ success: true, data: expenses });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Create menu expense
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { menu_id, expense, amount, description } = req.body;

    // Validate required fields
    if (!menu_id || !expense || !amount) {
      return res.status(400).json({
        success: false,
        message: "menu_id, expense, and amount are required",
      });
    }

    // Check if menu exists
    const menu = await MenuMaintenance.findById(menu_id);
    if (!menu) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    }

    const menuExpense = new MenuExpense({
      menu_id,
      expense: expense.trim(),
      amount: parseFloat(amount),
      description: description ? description.trim() : "",
      created_by: req.user._id,
    });

    await menuExpense.save();

    // Populate the data for response
    await menuExpense.populate("menu_id", "name category");

    res.status(201).json({ success: true, data: menuExpense });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Update menu expense
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const menuExpense = await MenuExpense.findById(req.params.id);
    if (!menuExpense) {
      return res
        .status(404)
        .json({ success: false, message: "Menu expense not found" });
    }

    const { expense, amount, description } = req.body;

    // Update fields
    if (expense !== undefined) menuExpense.expense = expense.trim();
    if (amount !== undefined) menuExpense.amount = parseFloat(amount);
    if (description !== undefined) menuExpense.description = description.trim();

    await menuExpense.save();

    // Populate the data for response
    await menuExpense.populate("menu_id", "name category");

    res.json({ success: true, data: menuExpense });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete menu expense
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const menuExpense = await MenuExpense.findById(req.params.id);
    if (!menuExpense) {
      return res
        .status(404)
        .json({ success: false, message: "Menu expense not found" });
    }

    await MenuExpense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Menu expense deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get total expenses for a menu
router.get("/total/:menuId", async (req, res) => {
  try {
    const expenses = await MenuExpense.find({
      menu_id: req.params.menuId,
    });

    const totalExpenses = expenses.reduce((total, expense) => {
      return total + (expense.amount || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        total_expenses: totalExpenses,
        expense_count: expenses.length,
        expenses: expenses,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
