const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
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
    enum: [
      "Appetizer",
      "Main Course",
      "Dessert",
      "Beverage",
      "Side Dish",
      "Other",
    ],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  // Base64 encoded image - no size limit as requested
  image: {
    type: String, // Will store base64 encoded image data
  },
  // Ingredients array with references to inventory items
  ingredients: [
    {
      inventoryItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 0,
      },
      unit: {
        type: String,
        required: true,
        trim: true,
      },
    },
  ],
  // Additional fields for menu management
  preparation_time: {
    type: Number, // in minutes
    min: 0,
  },
  serving_size: {
    type: String,
    trim: true,
  },
  servings: {
    type: Number,
    min: 1,
    default: 1,
  },
  is_available: {
    type: Boolean,
    default: true,
  },
  // Admin who created this menu item
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
  next();
});

// Virtual to calculate total cost based on ingredients
MenuSchema.virtual("estimatedCost").get(function () {
  // This would need to be calculated based on inventory prices
  // For now, return 0 as we don't have pricing in inventory
  return 0;
});

// Method to check if all ingredients are available in sufficient quantity
MenuSchema.methods.checkIngredientAvailability = async function () {
  const Inventory = mongoose.model("Inventory");
  const availability = [];

  for (const ingredient of this.ingredients) {
    const inventoryItem = await Inventory.findById(ingredient.inventoryItem);
    if (!inventoryItem) {
      availability.push({
        ingredient: ingredient.inventoryItem,
        available: false,
        reason: "Item not found in inventory",
      });
    } else if (inventoryItem.quantity < ingredient.quantity) {
      availability.push({
        ingredient: inventoryItem.name,
        available: false,
        reason: `Insufficient quantity. Available: ${inventoryItem.quantity} ${inventoryItem.unit}, Required: ${ingredient.quantity} ${ingredient.unit}`,
      });
    } else {
      availability.push({
        ingredient: inventoryItem.name,
        available: true,
        availableQuantity: inventoryItem.quantity,
      });
    }
  }

  return availability;
};

// Method to calculate how many of this menu item can be made based on available ingredients
MenuSchema.methods.calculateAvailableQuantity = async function () {
  const Inventory = mongoose.model("Inventory");
  let maxAvailable = Infinity;

  for (const ingredient of this.ingredients) {
    const inventoryItem = await Inventory.findById(ingredient.inventoryItem);
    if (!inventoryItem) {
      return 0; // If ingredient doesn't exist, can't make any
    }

    if (inventoryItem.quantity <= 0) {
      return 0; // If no inventory, can't make any
    }

    // Check if units are compatible (same unit)
    if (inventoryItem.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
      console.warn(
        `Unit mismatch: Inventory has ${inventoryItem.unit}, recipe requires ${ingredient.unit} for ${inventoryItem.name}`
      );
      // For now, assume same unit if they're similar (basic conversion)
      // In a real application, you'd want a proper unit conversion system
    }

    // Calculate how many can be made with this ingredient
    const possibleWithThisIngredient = Math.floor(
      inventoryItem.quantity / ingredient.quantity
    );

    console.log(
      `Ingredient: ${inventoryItem.name}, Available: ${inventoryItem.quantity} ${inventoryItem.unit}, Required: ${ingredient.quantity} ${ingredient.unit}, Can make: ${possibleWithThisIngredient} servings`
    );

    maxAvailable = Math.min(maxAvailable, possibleWithThisIngredient);
  }

  const result = maxAvailable === Infinity ? 0 : maxAvailable;
  console.log(`Menu item "${this.name}" can make ${result} servings`);
  return result;
};

// Method to check if sufficient servings are available
MenuSchema.methods.hasSufficientServings = function (quantity = 1) {
  return this.servings >= quantity;
};

// Method to update inventory when menu item is ordered
MenuSchema.methods.updateInventoryOnOrder = async function (quantity = 1) {
  const Inventory = mongoose.model("Inventory");

  for (const ingredient of this.ingredients) {
    const inventoryItem = await Inventory.findById(ingredient.inventoryItem);
    if (inventoryItem) {
      const requiredQuantity = ingredient.quantity * quantity;
      if (inventoryItem.quantity >= requiredQuantity) {
        inventoryItem.quantity -= requiredQuantity;
        await inventoryItem.save();
      } else {
        throw new Error(`Insufficient ${inventoryItem.name} in inventory`);
      }
    }
  }
};

module.exports = mongoose.model("Menu", MenuSchema);
