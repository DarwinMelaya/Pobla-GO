const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
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

// List all expenses
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search)
      filter.$or = [
        { expense: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    const expenses = await Expense.find(filter).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: expenses });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Create expense
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { expense, description } = req.body;

    if (!expense) {
      return res
        .status(400)
        .json({ success: false, message: "Expense name is required" });
    }

    const created = new Expense({
      expense,
      description,
      created_by: req.user?._id,
    });
    await created.save();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Update expense
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    const fields = ["expense", "description"];
    for (const key of fields) {
      if (req.body[key] !== undefined) {
        expense[key] = req.body[key];
      }
    }
    await expense.save();
    res.json({ success: true, data: expense });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete expense
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
