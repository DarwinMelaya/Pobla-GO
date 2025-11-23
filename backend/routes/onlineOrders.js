const express = require("express");
const router = express.Router();
const OnlineOrder = require("../models/OnlineOrder");
const OnlineOrderItem = require("../models/OnlineOrderItem");
const Menu = require("../models/Menu");
const User = require("../models/User");

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
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
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
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

// POST /online-orders - Create new online order (delivery or pickup)
router.post("/", verifyAuth, async (req, res) => {
  try {
    const {
      customer_name,
      order_type, // "delivery" or "pickup"
      order_items,
      delivery_address,
      customer_phone,
      payment_method,
      notes,
    } = req.body;

    // Validate required fields
    if (!customer_name || !order_items || !Array.isArray(order_items) || order_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customer_name and order_items array",
      });
    }

    // Validate order_type
    if (!order_type || !["delivery", "pickup"].includes(order_type)) {
      return res.status(400).json({
        success: false,
        message: "order_type must be 'delivery' or 'pickup'",
      });
    }

    // Validate delivery-specific fields
    if (order_type === "delivery") {
      if (!delivery_address || !delivery_address.trim()) {
        return res.status(400).json({
          success: false,
          message: "delivery_address is required for delivery orders",
        });
      }
      if (!customer_phone || !customer_phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "customer_phone is required for delivery orders",
        });
      }
    }

    // Validate customer_phone for pickup as well
    if (!customer_phone || !customer_phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "customer_phone is required",
      });
    }

    // Calculate subtotal and validate items
    let subtotal_amount = 0;
    const validated_items = [];

    for (const item of order_items) {
      if (!item.item_name || !item.quantity || !item.price || !item.menu_item_id) {
        return res.status(400).json({
          success: false,
          message: "Each order item must have item_name, quantity, price, and menu_item_id",
        });
      }

      // Check if menu item exists and has sufficient servings
      const menuItem = await Menu.findById(item.menu_item_id);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item not found: ${item.item_name}`,
        });
      }

      // Check if sufficient servings are available
      if (!menuItem.hasSufficientServings(item.quantity)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient servings for ${menuItem.name}. Available: ${menuItem.servings}, Required: ${item.quantity}`,
        });
      }

      const item_total = item.quantity * item.price;
      subtotal_amount += item_total;

      validated_items.push({
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        total_price: item_total,
        menu_item_id: item.menu_item_id,
        special_instructions: item.special_instructions || "",
      });
    }

    // Calculate delivery fee (50 PHP for delivery)
    const delivery_fee = order_type === "delivery" ? 50 : 0;
    const total_amount = subtotal_amount + delivery_fee;

    // Get customer_id from user if logged in
    const customer_id = req.user && req.user.role === "Customer" ? req.user._id : null;

    // Create the order (servings will be deducted when order is completed/delivered)
    const order = new OnlineOrder({
      customer_name,
      order_type,
      customer_id,
      customer_phone,
      delivery_address: delivery_address || null,
      delivery_fee,
      subtotal_amount,
      total_amount,
      notes: notes || "",
      payment_method: payment_method || "cash",
      payment_status: payment_method === "gcash" ? "paid" : "pending",
      discount_type: "none",
      discount_rate: 0,
      discount_amount: 0,
      servings_deducted: false, // Will be set to true when order is completed
    });

    await order.save();

    // Create order items
    const orderItems = validated_items.map((item) => ({
      ...item,
      order_id: order._id,
    }));

    await OnlineOrderItem.insertMany(orderItems);

    // Populate the response
    if (order.customer_id) {
      await order.populate("customer_id", "name email");
    }
    await order.populate({
      path: "order_items",
      populate: {
        path: "menu_item_id",
        select: "name category",
      },
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
});

// GET /online-orders - Get all online orders
router.get("/", verifyAuth, async (req, res) => {
  try {
    const {
      status,
      order_type,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (order_type) {
      filter.order_type = order_type;
    }

    // Search by customer name
    if (search) {
      filter.customer_name = { $regex: search, $options: "i" };
    }

    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) {
        filter.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        filter.created_at.$lte = new Date(date_to);
      }
    }

    const orders = await OnlineOrder.find(filter)
      .populate("customer_id", "name email phone")
      .populate({
        path: "order_items",
        populate: {
          path: "menu_item_id",
          select: "name category",
        },
      })
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await OnlineOrder.countDocuments(filter);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
});

// GET /online-orders/:id - Get specific online order
router.get("/:id", verifyAuth, async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id)
      .populate("customer_id", "name email phone")
      .populate({
        path: "order_items",
        populate: {
          path: "menu_item_id",
          select: "name category description",
        },
      });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Order not found" 
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
});

// PUT /online-orders/:id - Update online order (only for Pending status)
router.put("/:id", verifyAuth, async (req, res) => {
  try {
    const {
      order_type,
      order_items,
      delivery_address,
      customer_phone,
      payment_method,
      notes,
    } = req.body;

    const order = await OnlineOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Only allow editing if order status is Pending
    if (order.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be edited",
      });
    }

    // Verify that the user owns this order (if customer_id exists)
    if (order.customer_id && order.customer_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own orders",
      });
    }

    // Update order type if provided
    if (order_type && ["delivery", "pickup"].includes(order_type)) {
      order.order_type = order_type;
    }

    // Update delivery address if provided
    if (delivery_address !== undefined) {
      if (order.order_type === "delivery" && !delivery_address?.trim()) {
        return res.status(400).json({
          success: false,
          message: "delivery_address is required for delivery orders",
        });
      }
      order.delivery_address = delivery_address || null;
    }

    // Update customer phone if provided
    if (customer_phone !== undefined) {
      if (!customer_phone?.trim()) {
        return res.status(400).json({
          success: false,
          message: "customer_phone is required",
        });
      }
      order.customer_phone = customer_phone;
    }

    // Update payment method if provided
    if (payment_method && ["cash", "card", "digital", "gcash"].includes(payment_method)) {
      order.payment_method = payment_method;
      order.payment_status = payment_method === "gcash" ? "paid" : "pending";
    }

    // Update notes if provided
    if (notes !== undefined) {
      order.notes = notes;
    }

    // Update order items if provided
    if (order_items && Array.isArray(order_items) && order_items.length > 0) {
      // Validate order items
      let subtotal_amount = 0;
      const validated_items = [];

      for (const item of order_items) {
        if (!item.item_name || !item.quantity || !item.price || !item.menu_item_id) {
          return res.status(400).json({
            success: false,
            message: "Each order item must have item_name, quantity, price, and menu_item_id",
          });
        }

        // Check if menu item exists and has sufficient servings
        const menuItem = await Menu.findById(item.menu_item_id);
        if (!menuItem) {
          return res.status(400).json({
            success: false,
            message: `Menu item not found: ${item.item_name}`,
          });
        }

        // Check if sufficient servings are available
        // Get current order items to calculate available servings
        const currentOrderItems = await OnlineOrderItem.find({ order_id: order._id });
        const currentItemQuantity = currentOrderItems.find(
          (oi) => oi.menu_item_id.toString() === item.menu_item_id.toString()
        )?.quantity || 0;
        
        // Available servings = current servings + quantity from this order (if same item)
        const availableServings = menuItem.servings + (currentItemQuantity || 0);
        
        if (item.quantity > availableServings) {
          return res.status(400).json({
            success: false,
            message: `Insufficient servings for ${menuItem.name}. Available: ${availableServings}, Required: ${item.quantity}`,
          });
        }

        const item_total = item.quantity * item.price;
        subtotal_amount += item_total;

        validated_items.push({
          item_name: item.item_name,
          quantity: item.quantity,
          price: item.price,
          total_price: item_total,
          menu_item_id: item.menu_item_id,
          special_instructions: item.special_instructions || "",
        });
      }

      // Delete old order items
      await OnlineOrderItem.deleteMany({ order_id: order._id });

      // Create new order items
      const newOrderItems = validated_items.map((item) => ({
        ...item,
        order_id: order._id,
      }));

      await OnlineOrderItem.insertMany(newOrderItems);

      // Update subtotal and total
      order.subtotal_amount = subtotal_amount;
      const delivery_fee = order.order_type === "delivery" ? 50 : 0;
      order.total_amount = subtotal_amount + delivery_fee;
      order.delivery_fee = delivery_fee;
    } else if (order_items && Array.isArray(order_items) && order_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must have at least one item",
      });
    } else if (order_type) {
      // If only order_type changed, recalculate delivery fee
      const delivery_fee = order.order_type === "delivery" ? 50 : 0;
      order.delivery_fee = delivery_fee;
      order.total_amount = order.subtotal_amount + delivery_fee;
    }

    await order.save();

    // Populate response
    if (order.customer_id) {
      await order.populate("customer_id", "name email phone");
    }
    await order.populate({
      path: "order_items",
      populate: {
        path: "menu_item_id",
        select: "name category description",
      },
    });

    res.json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// PUT /online-orders/:id/status - Update online order status
router.put("/:id/status", verifyAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: "Status is required" 
      });
    }

    const order = await OnlineOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Order not found" 
      });
    }

    const oldStatus = order.status;

    // If order is being completed/delivered, deduct servings from menu items
    if (status === "Completed" && oldStatus !== "Completed" && !order.servings_deducted) {
      const orderItems = await OnlineOrderItem.find({ order_id: order._id });
      
      for (const item of orderItems) {
        if (item.menu_item_id) {
          try {
            const menuItem = await Menu.findById(item.menu_item_id);
            if (menuItem) {
              // Check if sufficient servings are available
              if (!menuItem.hasSufficientServings(item.quantity)) {
                return res.status(400).json({
                  success: false,
                  message: `Insufficient servings for ${menuItem.name}. Available: ${menuItem.servings}, Required: ${item.quantity}`,
                });
              }

              // Deduct servings using the model method
              await menuItem.deductServings(item.quantity);
              console.log(
                `✅ Deducted ${item.quantity} servings for ${menuItem.name} (Online Order #${order._id})`
              );
            }
          } catch (error) {
            console.error(
              `Failed to deduct servings for menu item ${item.menu_item_id}:`,
              error
            );
            return res.status(400).json({
              success: false,
              message: error.message || "Failed to process menu item",
            });
          }
        }
      }

      // Mark servings as deducted
      order.servings_deducted = true;
    }

    // If order is being cancelled, restore servings (only if they were deducted)
    if (status === "Cancelled" && oldStatus !== "Cancelled" && order.servings_deducted) {
      const orderItems = await OnlineOrderItem.find({ order_id: order._id });
      
      for (const item of orderItems) {
        if (item.menu_item_id) {
          try {
            const menuItem = await Menu.findById(item.menu_item_id);
            if (menuItem) {
              // Restore servings using the model method
              await menuItem.restoreServings(item.quantity);
              console.log(
                `✅ Restored ${item.quantity} servings for ${menuItem.name} (Online Order #${order._id} cancelled)`
              );
            }
          } catch (error) {
            console.error(
              `Failed to restore servings for menu item ${item.menu_item_id}:`,
              error
            );
          }
        }
      }

      // Mark servings as not deducted (since we restored them)
      order.servings_deducted = false;
    }

    order.status = status;
    await order.save();

    // Populate response
    await order.populate("customer_id", "name email");
    await order.populate({
      path: "order_items",
      populate: {
        path: "menu_item_id",
        select: "name category",
      },
    });

    res.json({ 
      success: true,
      message: "Order status updated successfully", 
      order 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
});

// DELETE /online-orders/:id - Delete online order
router.delete("/:id", verifyAuth, async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Order not found" 
      });
    }

    // Restore servings for menu items if they were deducted (only if not completed)
    if (order.servings_deducted && order.status !== "Completed") {
      const orderItems = await OnlineOrderItem.find({ order_id: order._id });
      
      for (const item of orderItems) {
        if (item.menu_item_id) {
          try {
            const menuItem = await Menu.findById(item.menu_item_id);
            if (menuItem) {
              // Restore servings using the model method
              await menuItem.restoreServings(item.quantity);
              console.log(
                `✅ Restored ${item.quantity} servings for ${menuItem.name} (Online Order deleted)`
              );
            }
          } catch (error) {
            console.error(
              `Failed to restore servings for menu item ${item.menu_item_id}:`,
              error
            );
          }
        }
      }
    }

    // Delete order items first
    await OnlineOrderItem.deleteMany({ order_id: order._id });

    // Delete the order
    await OnlineOrder.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true,
      message: "Order deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
});

module.exports = router;

