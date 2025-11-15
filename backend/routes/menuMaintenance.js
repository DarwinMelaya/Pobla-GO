const express = require("express");
const router = express.Router();
const MenuMaintenance = require("../models/MenuMaintenance");
const User = require("../models/User");
const Category = require("../models/Category");
const {
  uploadImageToSupabase,
  deleteImageFromSupabase,
  isBase64Image,
  isUrl,
} = require("../utils/supabaseStorage");

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

// GET /menuMaintenance - Get all menu maintenance items
router.get("/", async (req, res) => {
  try {
    const { category, critical_level } = req.query;
    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (critical_level) {
      filter.critical_level = critical_level;
    }

    const menuItems = await MenuMaintenance.find(filter)
      .populate("created_by", "name")
      .sort({ createdAt: -1 });

    res.json(menuItems);
  } catch (error) {
    console.error("Menu Maintenance API error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menuMaintenance/:id - Get specific menu maintenance item
router.get("/:id", async (req, res) => {
  try {
    const menuItem = await MenuMaintenance.findById(req.params.id).populate(
      "created_by",
      "name"
    );

    if (!menuItem) {
      return res
        .status(404)
        .json({ message: "Menu maintenance item not found" });
    }

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /menuMaintenance - Create new menu maintenance item (Admin only)
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { name, category, critical_level, description, image } = req.body;

    // Validate required fields
    if (!name || !category || !critical_level) {
      return res.status(400).json({
        message: "Missing required fields: name, category, and critical_level",
      });
    }

    // Validate that the category exists and is active
    const categoryExists = await Category.findOne({
      name: category,
      is_active: { $ne: false },
    });

    if (!categoryExists) {
      return res.status(400).json({
        message: "Invalid category. Please select a valid active category.",
      });
    }

    // Handle image upload to Supabase if base64 image is provided
    let imageUrl = image || "";
    if (image && isBase64Image(image)) {
      try {
        const uploadResult = await uploadImageToSupabase(
          image,
          "menu-maintenance"
        );
        imageUrl = uploadResult.url;
        console.log("✅ Image uploaded to Supabase:", imageUrl);
      } catch (uploadError) {
        console.error("Error uploading image to Supabase:", uploadError);
        return res.status(500).json({
          message: "Failed to upload image to storage",
          error: uploadError.message,
        });
      }
    } else if (image && isUrl(image)) {
      // If it's already a URL, use it directly
      imageUrl = image;
    }

    const menuItem = new MenuMaintenance({
      name,
      category,
      critical_level,
      description,
      image: imageUrl,
      created_by: req.user._id,
    });

    await menuItem.save();

    // Populate the response
    await menuItem.populate("created_by", "name");

    res.status(201).json(menuItem);
  } catch (error) {
    console.error("Error creating menu maintenance item:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /menuMaintenance/:id - Update menu maintenance item (Admin only)
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { name, category, critical_level, description, image } = req.body;

    const menuItem = await MenuMaintenance.findById(req.params.id);

    if (!menuItem) {
      return res
        .status(404)
        .json({ message: "Menu maintenance item not found" });
    }

    // Validate category if it's being updated
    if (category !== undefined) {
      const categoryExists = await Category.findOne({
        name: category,
        is_active: { $ne: false },
      });

      if (!categoryExists) {
        return res.status(400).json({
          message: "Invalid category. Please select a valid active category.",
        });
      }
    }

    // Handle image update
    if (image !== undefined) {
      // If new image is provided and it's base64, upload to Supabase
      if (image && isBase64Image(image)) {
        try {
          // Delete old image from Supabase if it exists
          if (menuItem.image) {
            await deleteImageFromSupabase(menuItem.image);
          }

          // Upload new image
          const uploadResult = await uploadImageToSupabase(
            image,
            "menu-maintenance"
          );
          menuItem.image = uploadResult.url;
          console.log("✅ Image updated in Supabase:", menuItem.image);
        } catch (uploadError) {
          console.error("Error uploading image to Supabase:", uploadError);
          return res.status(500).json({
            message: "Failed to upload image to storage",
            error: uploadError.message,
          });
        }
      } else if (image && isUrl(image)) {
        // If it's already a URL, use it directly (but delete old image if different)
        if (menuItem.image && menuItem.image !== image) {
          await deleteImageFromSupabase(menuItem.image);
        }
        menuItem.image = image;
      } else if (!image) {
        // If image is empty/null, delete old image
        if (menuItem.image) {
          await deleteImageFromSupabase(menuItem.image);
        }
        menuItem.image = "";
      }
    }

    // Update other fields
    if (name !== undefined) menuItem.name = name;
    if (category !== undefined) menuItem.category = category;
    if (critical_level !== undefined) menuItem.critical_level = critical_level;
    if (description !== undefined) menuItem.description = description;

    await menuItem.save();

    // Populate the response
    await menuItem.populate("created_by", "name");

    res.json(menuItem);
  } catch (error) {
    console.error("Error updating menu maintenance item:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /menuMaintenance/:id - Delete menu maintenance item (Admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const menuItem = await MenuMaintenance.findById(req.params.id);

    if (!menuItem) {
      return res
        .status(404)
        .json({ message: "Menu maintenance item not found" });
    }

    // Delete image from Supabase if it exists
    if (menuItem.image) {
      try {
        await deleteImageFromSupabase(menuItem.image);
        console.log("✅ Image deleted from Supabase");
      } catch (deleteError) {
        console.error("Error deleting image from Supabase:", deleteError);
        // Continue with deletion even if image deletion fails
      }
    }

    await MenuMaintenance.findByIdAndDelete(req.params.id);
    res.json({ message: "Menu maintenance item deleted successfully" });
  } catch (error) {
    console.error("Error deleting menu maintenance item:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menuMaintenance/categories/list - Get all available categories
router.get("/categories/list", async (req, res) => {
  try {
    const categories = await MenuMaintenance.distinct("category");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menuMaintenance/critical-levels/list - Get all available critical levels
router.get("/critical-levels/list", async (req, res) => {
  try {
    const criticalLevels = await MenuMaintenance.distinct("critical_level");
    res.json(criticalLevels);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /menuMaintenance/debug - Debug endpoint to check database connection
router.get("/debug", async (req, res) => {
  try {
    const totalItems = await MenuMaintenance.countDocuments();
    const sampleItems = await MenuMaintenance.find()
      .limit(3)
      .select("name category critical_level");

    res.json({
      totalItems,
      sampleItems,
      message: "Database connection working",
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});

module.exports = router;
