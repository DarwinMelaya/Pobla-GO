const express = require("express");
const router = express.Router();
const Production = require("../models/Production");
const MenuMaintenance = require("../models/MenuMaintenance");
const MenuCosting = require("../models/MenuCosting");
const MenuRecipe = require("../models/MenuRecipe");
const Material = require("../models/Material");
const RawMaterial = require("../models/RawMaterial");
const UnitConversion = require("../models/UnitConversion");
const User = require("../models/User");

// Helper function to deduct inventory based on recipe
const deductInventoryForProduction = async (menuId, productionQuantity) => {
  try {
    // Get all recipe items for this menu
    const recipeItems = await MenuRecipe.find({ menu_id: menuId }).populate(
      "raw_material_id"
    );

    if (recipeItems.length === 0) {
      throw new Error("No recipe found for this menu item");
    }

    const deductionResults = [];
    const insufficientStock = [];

    for (const recipeItem of recipeItems) {
      const rawMaterial = recipeItem.raw_material_id;
      const recipeUnit = recipeItem.unit;
      const quantityPerPiece = recipeItem.quantity;
      const totalNeeded = quantityPerPiece * productionQuantity;

      // Find material in inventory by raw_material reference
      const material = await Material.findOne({
        raw_material: rawMaterial._id,
      });

      if (!material) {
        insufficientStock.push({
          name: rawMaterial.name,
          needed: totalNeeded,
          unit: recipeUnit,
          reason: "Not found in inventory",
        });
        continue;
      }

      let quantityToDeduct = totalNeeded;
      let materialUnit = material.unit;

      // Handle unit conversion if recipe unit is different from material unit
      if (recipeUnit !== materialUnit) {
        // Try to find unit conversion
        const conversion = await UnitConversion.findOne({
          raw_material_id: rawMaterial._id,
          equivalent_unit: recipeUnit,
        });

        if (conversion) {
          // Convert recipe unit to material's base unit
          // Example: Recipe needs 10 kg, material is in sacks
          // If 1 sack = 25 kg, then need 10/25 = 0.4 sacks
          quantityToDeduct = totalNeeded / conversion.quantity;
        } else {
          // No conversion found, cannot proceed
          insufficientStock.push({
            name: rawMaterial.name,
            needed: totalNeeded,
            unit: recipeUnit,
            materialUnit: materialUnit,
            reason: `No unit conversion from ${recipeUnit} to ${materialUnit}`,
          });
          continue;
        }
      }

      // Check if enough stock available
      if (material.available < quantityToDeduct) {
        insufficientStock.push({
          name: rawMaterial.name,
          needed: quantityToDeduct,
          available: material.available,
          unit: materialUnit,
          reason: "Insufficient stock",
        });
        continue;
      }

      // Deduct from available stock
      material.available -= quantityToDeduct;
      await material.save();

      deductionResults.push({
        materialName: rawMaterial.name,
        deducted: quantityToDeduct,
        unit: materialUnit,
        remainingAvailable: material.available,
      });
    }

    // If there are any insufficient stock items, rollback and throw error
    if (insufficientStock.length > 0) {
      // Rollback deductions
      for (const result of deductionResults) {
        const material = await Material.findOne({
          name: result.materialName,
        });
        if (material) {
          material.available += result.deducted;
          await material.save();
        }
      }

      const errorDetails = insufficientStock
        .map(
          (item) =>
            `${item.name}: ${item.reason} (needed: ${item.needed} ${item.unit}${
              item.available !== undefined
                ? `, available: ${item.available} ${item.unit}`
                : ""
            })`
        )
        .join("; ");

      throw new Error(`Cannot proceed with production. ${errorDetails}`);
    }

    return {
      success: true,
      deductions: deductionResults,
    };
  } catch (error) {
    throw error;
  }
};

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

// List all productions with filtering
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const { status, menu_id, start_date, end_date } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (menu_id) filter.menu_id = menu_id;
    if (start_date || end_date) {
      filter.production_date = {};
      if (start_date) filter.production_date.$gte = new Date(start_date);
      if (end_date) filter.production_date.$lte = new Date(end_date);
    }

    const productions = await Production.find(filter)
      .populate("menu_id", "name category description image")
      .populate("created_by", "firstName lastName email")
      .sort({ production_date: -1 });

    res.json({ success: true, data: productions });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get single production by ID
router.get("/:id", verifyAdmin, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id)
      .populate("menu_id", "name category description image")
      .populate("created_by", "firstName lastName email");

    if (!production) {
      return res
        .status(404)
        .json({ success: false, message: "Production not found" });
    }

    res.json({ success: true, data: production });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Create new production
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { menu_id, quantity, production_date, status, notes } = req.body;

    if (!menu_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "menu_id and quantity are required",
      });
    }

    // Verify menu item exists
    const menuItem = await MenuMaintenance.findById(menu_id);
    if (!menuItem) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    }

    // Deduct inventory for production (this will throw error if insufficient stock)
    let inventoryDeductions;
    try {
      inventoryDeductions = await deductInventoryForProduction(
        menu_id,
        parseInt(quantity)
      );
    } catch (inventoryError) {
      return res.status(400).json({
        success: false,
        message: inventoryError.message,
      });
    }

    // Get menu costing to calculate expected cost and SRP
    const costing = await MenuCosting.findOne({ menu_id });
    let expectedCost = 0;
    let srp = 0;
    if (costing && costing.production_cost_per_piece) {
      expectedCost = costing.production_cost_per_piece * quantity;
      srp = costing.srp || 0;
    }

    const production = new Production({
      menu_id,
      quantity: parseInt(quantity),
      production_date: production_date || Date.now(),
      status: status || "Planned",
      expected_cost: expectedCost,
      srp: srp,
      notes: notes || "",
      created_by: req.user._id,
    });

    await production.save();

    // Populate before sending response
    await production.populate("menu_id", "name category description image");
    await production.populate("created_by", "firstName lastName email");

    res.status(201).json({
      success: true,
      data: production,
      inventoryDeductions: inventoryDeductions.deductions,
      message: "Production created and inventory deducted successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Update production
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    if (!production) {
      return res
        .status(404)
        .json({ success: false, message: "Production not found" });
    }

    const { quantity, production_date, status, actual_cost, notes } = req.body;

    const fields = [
      "quantity",
      "production_date",
      "status",
      "actual_cost",
      "notes",
    ];

    for (const key of fields) {
      if (req.body[key] !== undefined) {
        if (key === "quantity" || key === "actual_cost") {
          production[key] = parseFloat(req.body[key]);
        } else if (key === "production_date") {
          production[key] = new Date(req.body[key]);
        } else {
          production[key] = req.body[key];
        }
      }
    }

    // Recalculate expected cost if quantity changed
    if (quantity !== undefined) {
      const costing = await MenuCosting.findOne({
        menu_id: production.menu_id,
      });
      if (costing && costing.production_cost_per_piece) {
        production.expected_cost =
          costing.production_cost_per_piece * production.quantity;
      }
    }

    await production.save();
    await production.populate("menu_id", "name category description image");
    await production.populate("created_by", "firstName lastName email");

    res.json({ success: true, data: production });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete production
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);
    if (!production) {
      return res
        .status(404)
        .json({ success: false, message: "Production not found" });
    }

    await Production.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Production deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get production statistics
router.get("/stats/summary", verifyAdmin, async (req, res) => {
  try {
    const totalProductions = await Production.countDocuments();
    const completedProductions = await Production.countDocuments({
      status: "Completed",
    });
    const inProgressProductions = await Production.countDocuments({
      status: "In Progress",
    });
    const plannedProductions = await Production.countDocuments({
      status: "Planned",
    });

    res.json({
      success: true,
      data: {
        total: totalProductions,
        completed: completedProductions,
        inProgress: inProgressProductions,
        planned: plannedProductions,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
