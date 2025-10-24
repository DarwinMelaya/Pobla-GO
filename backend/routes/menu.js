const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu");
const Material = require("../models/Material");
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
      .populate("ingredients.inventoryItem", "name category unit quantity")
      .populate("created_by", "name")
      .sort({ createdAt: -1 });

    const menuItemsWithStock = await Promise.all(
      menuItems.map(async (item) => {
        const availableQuantity = await item.calculateAvailableQuantity();
        return {
          ...item.toObject(),
          availableQuantity,
          availableServings: item.servings,
          stockStatus:
            item.servings <= 0
              ? "out_of_stock"
              : item.servings <= 2
              ? "low_stock"
              : "in_stock",
        };
      })
    );

    res.json(menuItemsWithStock);
  } catch (error) {
    console.error("Menu stock API error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu - Get all menu items (public access)
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
      .populate("ingredients.inventoryItem", "name category unit")
      .populate("created_by", "name")
      .sort({ createdAt: -1 });

    // Add available quantity and servings info to each menu item
    const menuItemsWithQuantity = await Promise.all(
      menuItems.map(async (item) => {
        const availableQuantity = await item.calculateAvailableQuantity();
        return {
          ...item.toObject(),
          availableQuantity,
          availableServings: item.servings, // Include current servings
        };
      })
    );

    // Add cache control headers to prevent stale data
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.json(menuItemsWithQuantity);
  } catch (error) {
    console.error("Menu API error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu/:id - Get specific menu item
router.get("/:id", async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id)
      .populate(
        "ingredients.inventoryItem",
        "name category unit quantity expiry_date"
      )
      .populate("created_by", "name");

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu/:id/availability - Check ingredient availability for a menu item
router.get("/:id/availability", async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const availability = await menuItem.checkIngredientAvailability();
    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu/:id/available-quantity - Get how many of this menu item can be made
router.get("/:id/available-quantity", async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    const availableQuantity = await menuItem.calculateAvailableQuantity();
    res.json({ availableQuantity });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /menu - Create new menu item (Admin only)
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      image,
      ingredients,
      preparation_time,
      serving_size,
      servings,
      is_available,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !category ||
      !price ||
      !ingredients ||
      !Array.isArray(ingredients)
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: name, category, price, and ingredients array",
      });
    }

    // Validate ingredients exist in inventory
    for (const ingredient of ingredients) {
      if (
        !ingredient.inventoryItem ||
        !ingredient.quantity ||
        !ingredient.unit
      ) {
        return res.status(400).json({
          message:
            "Each ingredient must have inventoryItem, quantity, and unit",
        });
      }

      const inventoryItem = await Material.findById(ingredient.inventoryItem);
      if (!inventoryItem) {
        return res.status(400).json({
          message: `Inventory item with ID ${ingredient.inventoryItem} not found`,
        });
      }
    }

    const menuItem = new Menu({
      name,
      description,
      category,
      price,
      image, // Base64 encoded image - no size limit
      ingredients,
      preparation_time,
      serving_size,
      servings: servings || 1,
      is_available: is_available !== undefined ? is_available : true,
      created_by: req.user._id,
    });

    await menuItem.save();

    // Populate the response
    await menuItem.populate([
      { path: "ingredients.inventoryItem", select: "name category unit" },
      { path: "created_by", select: "name" },
    ]);

    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /menu/:id - Update menu item (Admin only)
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      image,
      ingredients,
      preparation_time,
      serving_size,
      servings,
      is_available,
    } = req.body;

    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Validate ingredients if provided
    if (ingredients && Array.isArray(ingredients)) {
      for (const ingredient of ingredients) {
        if (
          !ingredient.inventoryItem ||
          !ingredient.quantity ||
          !ingredient.unit
        ) {
          return res.status(400).json({
            message:
              "Each ingredient must have inventoryItem, quantity, and unit",
          });
        }

        const inventoryItem = await Material.findById(ingredient.inventoryItem);
        if (!inventoryItem) {
          return res.status(400).json({
            message: `Inventory item with ID ${ingredient.inventoryItem} not found`,
          });
        }
      }
    }

    // Update fields
    if (name !== undefined) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (category !== undefined) menuItem.category = category;
    if (price !== undefined) menuItem.price = price;
    if (image !== undefined) menuItem.image = image; // Base64 encoded image
    if (ingredients !== undefined) menuItem.ingredients = ingredients;
    if (preparation_time !== undefined)
      menuItem.preparation_time = preparation_time;
    if (serving_size !== undefined) menuItem.serving_size = serving_size;
    if (servings !== undefined) menuItem.servings = servings;
    if (is_available !== undefined) menuItem.is_available = is_available;

    await menuItem.save();

    // Populate the response
    await menuItem.populate([
      { path: "ingredients.inventoryItem", select: "name category unit" },
      { path: "created_by", select: "name" },
    ]);

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /menu/:id - Delete menu item (Admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    await Menu.findByIdAndDelete(req.params.id);
    res.json({ message: "Menu item deleted successfully" });
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
    await menuItem.save();

    res.json({
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

// GET /menu/inventory/available - Get inventory items that can be used as ingredients
router.get("/inventory/available", verifyAdmin, async (req, res) => {
  try {
    const inventoryItems = await Material.find({ quantity: { $gt: 0 } })
      .select("name category unit quantity")
      .sort({ name: 1 });

    res.json(inventoryItems);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menu/debug - Debug endpoint to check database connection
router.get("/debug", async (req, res) => {
  try {
    const totalItems = await Menu.countDocuments();
    const availableItems = await Menu.countDocuments({ is_available: true });
    const sampleItems = await Menu.find().limit(3).select("name is_available");

    res.json({
      totalItems,
      availableItems,
      sampleItems,
      message: "Database connection working",
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});

// POST /menu/test-data - Create sample menu items for testing (Admin only)
router.post("/test-data", verifyAdmin, async (req, res) => {
  try {
    // Check if test data already exists
    const existingItems = await Menu.find({ name: { $regex: /^Test/ } });
    if (existingItems.length > 0) {
      return res.json({
        message: "Test data already exists",
        count: existingItems.length,
      });
    }

    // Get the first admin user to use as created_by
    const adminUser = await User.findOne({ role: "Admin" });
    if (!adminUser) {
      return res.status(400).json({ message: "No admin user found" });
    }

    // Create sample menu items
    const sampleItems = [
      {
        name: "Test Burger",
        description: "A delicious test burger",
        category: "Main Course",
        price: 12.99,
        ingredients: [],
        is_available: true,
        created_by: adminUser._id,
      },
      {
        name: "Test Pizza",
        description: "A tasty test pizza",
        category: "Main Course",
        price: 15.99,
        ingredients: [],
        is_available: true,
        created_by: adminUser._id,
      },
      {
        name: "Test Salad",
        description: "Fresh test salad",
        category: "Appetizer",
        price: 8.99,
        ingredients: [],
        is_available: true,
        created_by: adminUser._id,
      },
      {
        name: "Test Drink",
        description: "Refreshing test beverage",
        category: "Beverage",
        price: 3.99,
        ingredients: [],
        is_available: true,
        created_by: adminUser._id,
      },
    ];

    const createdItems = await Menu.insertMany(sampleItems);
    res.json({
      message: "Test data created successfully",
      count: createdItems.length,
    });
  } catch (error) {
    console.error("Error creating test data:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
