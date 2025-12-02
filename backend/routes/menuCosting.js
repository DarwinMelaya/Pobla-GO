const express = require("express");
const router = express.Router();
const MenuCosting = require("../models/MenuCosting");
const MenuRecipe = require("../models/MenuRecipe");
const MenuExpense = require("../models/MenuExpense");
const UnitConversion = require("../models/UnitConversion");
const Menu = require("../models/Menu");
const Production = require("../models/Production");
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

// Helper to sync SRP/price changes to related collections
const syncSRPToMenuAndProductions = async ({
  menuId,
  finalSRP,
}) => {
  if (!menuId || typeof finalSRP !== "number" || Number.isNaN(finalSRP)) {
    return;
  }

  try {
    // Update all Menu documents that use this MenuMaintenance as source
    await Menu.updateMany(
      { menu_maintenance_id: menuId },
      { $set: { price: finalSRP } }
    );

    // Update all existing productions' SRP so admin screens see the new price
    await Production.updateMany(
      { menu_id: menuId },
      { $set: { srp: finalSRP } }
    );
  } catch (syncError) {
    // Log but don't fail the main costing request
    console.error(
      "Error syncing SRP to Menu/Productions for menu_id:",
      menuId,
      syncError
    );
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

    if (!menu_id || !yield) {
      return res.status(400).json({
        success: false,
        message: "Menu ID and yield are required",
      });
    }

    // Need either markup_percent or srp
    if (markup_percent === undefined && !srp) {
      return res.status(400).json({
        success: false,
        message: "Either markup percent or SRP is required",
      });
    }

    // Calculate total production cost from recipes and expenses
    const [recipes, expenses] = await Promise.all([
      MenuRecipe.find({ menu_id }).populate("raw_material_id", "unit_price unit"),
      MenuExpense.find({ menu_id }),
    ]);

    // Get all unit conversions for all materials in recipes
    const materialIds = recipes
      .map((r) => r.raw_material_id?._id || r.raw_material_id)
      .filter(Boolean);
    
    const allConversions = await UnitConversion.find({
      raw_material_id: { $in: materialIds },
    });

    // Calculate total cost from recipes
    let totalRecipeCost = 0;
    recipes.forEach((recipe) => {
      const material = recipe.raw_material_id;
      if (!material) return;

      const materialId = material._id || material;
      
      // Check if the unit matches the material's base unit
      const isBaseUnit = material.unit === recipe.unit;

      // Find unit conversion for this recipe's unit AND material
      const unitConversion = allConversions.find((conversion) => {
        const convMaterialId =
          conversion.raw_material_id?._id ||
          conversion.raw_material_id ||
          conversion.raw_material;
        return (
          String(convMaterialId) === String(materialId) &&
          conversion.equivalent_unit === recipe.unit
        );
      });

      // Use unit conversion price if available and not base unit, otherwise use material's base price
      const unitPrice =
        !isBaseUnit && unitConversion && unitConversion.unit_price
          ? unitConversion.unit_price
          : material.unit_price || 0;

      totalRecipeCost += unitPrice * recipe.quantity;
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

    // Calculate SRP from markup percentage if SRP is not provided
    let finalSRP = srp;
    let finalMarkup = markup_percent;
    
    if (!srp && markup_percent !== undefined && production_cost_per_piece > 0) {
      finalSRP = production_cost_per_piece * (1 + markup_percent / 100);
    }
    
    // Calculate markup percentage from SRP if markup is not provided
    if (markup_percent === undefined && srp && production_cost_per_piece > 0) {
      finalMarkup = ((srp - production_cost_per_piece) / production_cost_per_piece) * 100;
    }

    // Calculate net profit (markup amount / profit per piece)
    const net_profit = finalSRP - production_cost_per_piece;

    // Calculate gross sales
    const gross_sales = finalSRP * yield;

    // Calculate total net income (total profit from all pieces)
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
          markup_percent: finalMarkup,
          srp: finalSRP,
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
        markup_percent: finalMarkup,
        srp: finalSRP,
        total_production_cost,
        production_cost_per_piece,
        net_profit,
        gross_sales,
        total_net_income,
        created_by: req.user._id,
      });
      await costing.save();
    }

    // Propagate SRP changes to Menu and existing Productions
    await syncSRPToMenuAndProductions({
      menuId: menu_id,
      finalSRP,
    });

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

    if (yield === undefined) {
      return res.status(400).json({
        success: false,
        message: "Yield is required",
      });
    }

    // Need either markup_percent or srp
    if (markup_percent === undefined && !srp) {
      return res.status(400).json({
        success: false,
        message: "Either markup percent or SRP is required",
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
        "unit_price unit"
      ),
      MenuExpense.find({ menu_id: costing.menu_id }),
    ]);

    // Get all unit conversions for all materials in recipes
    const materialIds = recipes
      .map((r) => r.raw_material_id?._id || r.raw_material_id)
      .filter(Boolean);
    
    const allConversions = await UnitConversion.find({
      raw_material_id: { $in: materialIds },
    });

    // Calculate total cost from recipes
    let totalRecipeCost = 0;
    recipes.forEach((recipe) => {
      const material = recipe.raw_material_id;
      if (!material) return;

      const materialId = material._id || material;
      
      // Check if the unit matches the material's base unit
      const isBaseUnit = material.unit === recipe.unit;

      // Find unit conversion for this recipe's unit AND material
      const unitConversion = allConversions.find((conversion) => {
        const convMaterialId =
          conversion.raw_material_id?._id ||
          conversion.raw_material_id ||
          conversion.raw_material;
        return (
          String(convMaterialId) === String(materialId) &&
          conversion.equivalent_unit === recipe.unit
        );
      });

      // Use unit conversion price if available and not base unit, otherwise use material's base price
      const unitPrice =
        !isBaseUnit && unitConversion && unitConversion.unit_price
          ? unitConversion.unit_price
          : material.unit_price || 0;

      totalRecipeCost += unitPrice * recipe.quantity;
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

    // Calculate SRP from markup percentage if SRP is not provided
    let finalSRP = srp;
    let finalMarkup = markup_percent;
    
    if (!srp && markup_percent !== undefined && production_cost_per_piece > 0) {
      finalSRP = production_cost_per_piece * (1 + markup_percent / 100);
    }
    
    // Calculate markup percentage from SRP if markup is not provided
    if (markup_percent === undefined && srp && production_cost_per_piece > 0) {
      finalMarkup = ((srp - production_cost_per_piece) / production_cost_per_piece) * 100;
    }

    // Calculate net profit (markup amount / profit per piece)
    const net_profit = finalSRP - production_cost_per_piece;

    // Calculate gross sales
    const gross_sales = finalSRP * yield;

    // Calculate total net income (total profit from all pieces)
    const total_net_income = net_profit * yield;

    const updatedCosting = await MenuCosting.findByIdAndUpdate(
      req.params.id,
      {
        yield,
        markup_percent: finalMarkup,
        srp: finalSRP,
        total_production_cost,
        production_cost_per_piece,
        net_profit,
        gross_sales,
        total_net_income,
      },
      { new: true }
    );

    // Propagate SRP changes to Menu and existing Productions
    await syncSRPToMenuAndProductions({
      menuId: costing.menu_id,
      finalSRP,
    });

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
