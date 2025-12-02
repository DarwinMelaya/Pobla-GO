const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
  // Reference to MenuMaintenance (the base menu item definition)
  menu_maintenance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuMaintenance",
    required: true,
  },
  // Reference to the latest/source production
  production_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Production",
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  // SRP (Suggested Retail Price) from production costing
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  // Supabase Storage URL for the image (from MenuMaintenance)
  image: {
    type: String, // Supabase Storage public URL
  },
  // Total available servings from all completed productions
  servings: {
    type: Number,
    min: 0,
    default: 0,
  },
  // Critical level threshold (copied from MenuMaintenance)
  critical_level: {
    type: Number,
    min: 0,
    default: 5,
    validate: {
      validator: Number.isFinite,
      message: "Critical level must be a valid number",
    },
  },
  // Availability status (auto-calculated based on servings, but can be manually overridden)
  is_available: {
    type: Boolean,
    default: false,
  },
  // Track if availability was manually set (to prevent auto-override)
  manually_disabled: {
    type: Boolean,
    default: false,
  },
  // Track production history
  production_history: [
    {
      production_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Production",
      },
      quantity_added: {
        type: Number,
        default: 0,
      },
      date_added: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // Last updated by
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
MenuSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Auto-update availability based on servings
  // But respect manual disabling (manually_disabled flag)
  if (this.servings > 0 && !this.manually_disabled) {
    this.is_available = true;
  } else if (this.servings === 0) {
    // Always set to unavailable if no servings
    this.is_available = false;
    this.manually_disabled = false; // Reset manual override
  }
  // If manually_disabled and servings > 0, keep is_available as set manually

  next();
});

// Method to add servings from a completed production
MenuSchema.methods.addFromProduction = async function (production, userId) {
  this.servings += production.quantity;

  // Add to production history
  this.production_history.push({
    production_id: production._id,
    quantity_added: production.quantity,
    date_added: new Date(),
  });

  this.production_id = production._id;
  this.updated_by = userId;

  await this.save();
  return this;
};

// Method to check if sufficient servings are available
MenuSchema.methods.hasSufficientServings = function (quantity = 1) {
  return this.servings >= quantity;
};

// Method to deduct servings when menu item is ordered
MenuSchema.methods.deductServings = async function (quantity = 1) {
  if (!this.hasSufficientServings(quantity)) {
    throw new Error(
      `Insufficient servings. Available: ${this.servings}, Requested: ${quantity}`
    );
  }

  this.servings -= quantity;
  await this.save();
  return this;
};

// Method to restore servings (when order is cancelled)
MenuSchema.methods.restoreServings = async function (quantity = 1) {
  this.servings += quantity;
  await this.save();
  return this;
};

// Method to update inventory when an order is placed
MenuSchema.methods.updateInventoryOnOrder = async function (quantity = 1) {
  // This method can be expanded to track ingredient usage if needed
  // For now, it just logs the order
  console.log(
    `📦 Inventory updated: ${this.name} - ${quantity} servings ordered`
  );
  return this;
};

// Method to check stock status based on critical level
MenuSchema.methods.getStockStatus = function () {
  if (this.servings <= 0) {
    return "out_of_stock";
  }
  // Use per-item critical_level as the low-stock threshold.
  // Fallback to a sensible default if not set.
  const DEFAULT_THRESHOLD = 5;
  const level =
    typeof this.critical_level === "number" && !Number.isNaN(this.critical_level)
      ? this.critical_level
      : DEFAULT_THRESHOLD;

  if (this.servings <= level) {
    return "low_stock";
  }

  return "in_stock";
};

// Static method to create or update menu from production
MenuSchema.statics.createOrUpdateFromProduction = async function (
  production,
  userId
) {
  try {
    const MenuMaintenance = mongoose.model("MenuMaintenance");
    const MenuCosting = mongoose.model("MenuCosting");

    console.log("📋 Menu.createOrUpdateFromProduction called");
    console.log("  Production menu_id:", production.menu_id);
    console.log("  Production menu_id type:", typeof production.menu_id);

    // Get menu maintenance details
    const menuMaintenance = await MenuMaintenance.findById(production.menu_id);
    if (!menuMaintenance) {
      console.error("❌ MenuMaintenance not found for ID:", production.menu_id);
      throw new Error(
        `Menu maintenance item not found for ID: ${production.menu_id}`
      );
    }
    console.log("✅ Found MenuMaintenance:", menuMaintenance.name);

    // Get costing details
    const costing = await MenuCosting.findOne({ menu_id: production.menu_id });
    console.log(
      "💰 Costing found:",
      costing ? `SRP: ${costing.srp}` : "No costing data"
    );

    // Check if menu already exists
    let menu = await this.findOne({ menu_maintenance_id: production.menu_id });

    if (menu) {
      console.log("♻️ Existing menu found - updating servings");
      console.log("  Current servings:", menu.servings);
      console.log("  Adding:", production.quantity);
      // Update existing menu - add servings
      await menu.addFromProduction(production, userId);
      console.log("  New servings:", menu.servings);
    } else {
      console.log("✨ Creating new menu item");
      // Create new menu item
      menu = new this({
        menu_maintenance_id: production.menu_id,
        production_id: production._id,
        name: menuMaintenance.name,
        description: menuMaintenance.description || "",
        category: menuMaintenance.category,
        price: costing?.srp || 0,
        image: menuMaintenance.image || "",
        servings: production.quantity,
        critical_level: menuMaintenance.critical_level,
        is_available: production.quantity > 0,
        production_history: [
          {
            production_id: production._id,
            quantity_added: production.quantity,
            date_added: new Date(),
          },
        ],
        updated_by: userId,
      });

      await menu.save();
      console.log("✅ New menu item created with ID:", menu._id);
    }

    return menu;
  } catch (error) {
    console.error("❌ Error in createOrUpdateFromProduction:", error);
    throw error;
  }
};

module.exports = mongoose.model("Menu", MenuSchema);
