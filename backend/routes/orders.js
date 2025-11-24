const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Menu = require("../models/Menu");
const User = require("../models/User");
const Reservation = require("../models/Reservation");

const DISCOUNT_RATES = {
  none: 0,
  pwd: 0.2,
  senior: 0.2,
};
const PACKAGING_FEE_PER_BOX = 10;

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

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin role required.",
    });
  }
  next();
};

// GET /orders - Get all orders (Admin and Staff)
router.get("/", verifyAuth, async (req, res) => {
  try {
    const {
      status,
      table_number,
      date_from,
      date_to,
      order_type,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (table_number) {
      filter.table_number = table_number;
    }

    if (order_type) {
      filter.order_type = order_type;
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

    const orders = await Order.find(filter)
      .populate("staff_member", "name")
      .populate("customer_id", "name email")
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

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/online - Get online orders (delivery and pickup)
router.get("/online", verifyAuth, async (req, res) => {
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

    let filter = {
      order_type: { $in: ["delivery", "pickup"] },
    };

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

    const orders = await Order.find(filter)
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

    const total = await Order.countDocuments(filter);

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

// GET /orders/:id - Get specific order
router.get("/:id", verifyAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("staff_member", "name")
      .populate({
        path: "order_items",
        populate: {
          path: "menu_item_id",
          select: "name category description",
        },
      });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user can access this order (Admin or Staff)
    if (req.user.role !== "Admin" && req.user.role !== "Staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /orders - Create new order
router.post("/", verifyAuth, async (req, res) => {
  try {
    const {
      customer_name,
      table_number,
      order_items,
      notes,
      payment_method,
      discount_type,
      order_type,
      packaging_boxes,
    } = req.body;
    const rawOrderType = (order_type || "").toLowerCase();
    const normalizedOrderType = ["dine_in", "delivery", "pickup"].includes(
      rawOrderType
    )
      ? rawOrderType
      : "dine_in";

    // Validate required fields
    if (
      !customer_name ||
      !order_items ||
      !Array.isArray(order_items) ||
      order_items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: customer_name and order_items array",
      });
    }

    if (normalizedOrderType === "dine_in" && !table_number) {
      return res.status(400).json({
        message: "Table number is required for dine-in orders",
      });
    }

    if (normalizedOrderType === "dine_in") {
      // Check if table is available (check for active orders)
      const isTableAvailable = await Order.isTableAvailable(table_number);
      if (!isTableAvailable) {
        const tableStatus = await Order.getTableStatus(table_number);
        return res.status(400).json({
          message: `Table ${table_number} is currently occupied. Current order status: ${tableStatus.status}`,
          tableStatus: tableStatus,
        });
      }

      // Check for confirmed reservations first - these always block the table until completed
      const confirmedReservation = await Reservation.findOne({
        table_number,
        status: "confirmed",
      });

      if (confirmedReservation) {
        const reservationTime = new Date(
          confirmedReservation.reservation_date
        ).toLocaleString();
        return res.status(400).json({
          message: `Table ${table_number} is reserved (confirmed). Customer: ${confirmedReservation.customer_name}. Reservation time: ${reservationTime}`,
          reservation: {
            id: confirmedReservation._id,
            customer_name: confirmedReservation.customer_name,
            reservation_date: confirmedReservation.reservation_date,
            status: confirmedReservation.status,
          },
          tableStatus: {
            available: false,
            type: "reservation",
            reservation: confirmedReservation,
          },
        });
      }

      // Check for pending reservations within a 2-hour window (1 hour before to 1 hour after current time)
      const now = new Date();
      const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourAfter = new Date(now.getTime() + 60 * 60 * 1000);

      const pendingReservation = await Reservation.findOne({
        table_number,
        reservation_date: {
          $gte: oneHourBefore,
          $lte: oneHourAfter,
        },
        status: "pending",
      });

      if (pendingReservation) {
        const reservationTime = new Date(
          pendingReservation.reservation_date
        ).toLocaleString();
        return res.status(400).json({
          message: `Table ${table_number} is reserved (pending) for ${reservationTime}. Customer: ${pendingReservation.customer_name}`,
          reservation: {
            id: pendingReservation._id,
            customer_name: pendingReservation.customer_name,
            reservation_date: pendingReservation.reservation_date,
            status: pendingReservation.status,
          },
          tableStatus: {
            available: false,
            type: "reservation",
            reservation: pendingReservation,
          },
        });
      }
    }

    // Calculate total amount
    let subtotal_amount = 0;
    const validated_items = [];

    for (const item of order_items) {
      if (!item.item_name || !item.quantity || !item.price) {
        return res.status(400).json({
          message: "Each order item must have item_name, quantity, and price",
        });
      }

      const quantity = Number(item.quantity) || 0;
      const item_total = quantity * item.price;
      subtotal_amount += item_total;

      validated_items.push({
        item_name: item.item_name,
        quantity,
        price: item.price,
        total_price: item_total,
        menu_item_id: item.menu_item_id || null,
        special_instructions: item.special_instructions || "",
        container_fee: 0,
      });
    }

    const normalizedDiscountType = Object.prototype.hasOwnProperty.call(
      DISCOUNT_RATES,
      discount_type
    )
      ? discount_type
      : "none";
    const discount_rate = DISCOUNT_RATES[normalizedDiscountType] || 0;
    const discount_amount = Number(
      (subtotal_amount * discount_rate).toFixed(2)
    );
    const packagingBoxCount = Math.max(
      0,
      parseInt(packaging_boxes ?? 0, 10) || 0
    );
    const packaging_fee =
      normalizedOrderType === "pickup"
        ? packagingBoxCount * PACKAGING_FEE_PER_BOX
        : 0;
    const total_amount =
      Math.max(0, subtotal_amount - discount_amount) + packaging_fee;

    // Create the order
    const order = new Order({
      customer_name,
      table_number: normalizedOrderType === "dine_in" ? table_number : null,
      subtotal_amount,
      total_amount,
      staff_member: req.user._id,
      notes: notes || "",
      payment_method: payment_method || "cash",
      discount_type: normalizedDiscountType,
      discount_rate,
      discount_amount,
      order_type: normalizedOrderType,
      packaging_fee,
      packaging_box_count:
        normalizedOrderType === "pickup" ? packagingBoxCount : 0,
    });

    await order.save();

    // Create order items
    const orderItems = validated_items.map((item) => ({
      ...item,
      order_id: order._id,
    }));

    await OrderItem.insertMany(orderItems);

    // Check availability and update servings for menu items
    for (const item of order_items) {
      if (item.menu_item_id) {
        try {
          const menuItem = await Menu.findById(item.menu_item_id);
          if (!menuItem) {
            return res.status(400).json({
              message: `Menu item not found: ${item.item_name}`,
            });
          }

          // Check if sufficient servings are available
          if (!menuItem.hasSufficientServings(item.quantity)) {
            return res.status(400).json({
              message: `Insufficient servings for ${menuItem.name}. Available: ${menuItem.servings}, Required: ${item.quantity}`,
            });
          }

          // Update inventory (ingredients) - for tracking purposes
          await menuItem.updateInventoryOnOrder(item.quantity);

          // Reduce servings using the model method
          await menuItem.deductServings(item.quantity);
        } catch (error) {
          console.error(
            `Failed to update inventory/servings for menu item ${item.menu_item_id}:`,
            error
          );
          return res.status(400).json({
            message: error.message || "Failed to process menu item",
          });
        }
      }
    }

    // Populate the response
    await order.populate("staff_member", "name");
    await order.populate({
      path: "order_items",
      populate: {
        path: "menu_item_id",
        select: "name category",
      },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /orders/online - Create online order (delivery or pickup)
router.post("/online", verifyAuth, async (req, res) => {
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
        message: "Missing required fields: customer_name and order_items array",
      });
    }

    // Validate order_type
    if (!order_type || !["delivery", "pickup"].includes(order_type)) {
      return res.status(400).json({
        message: "order_type must be 'delivery' or 'pickup'",
      });
    }

    // Validate delivery-specific fields
    if (order_type === "delivery") {
      if (!delivery_address || !delivery_address.trim()) {
        return res.status(400).json({
          message: "delivery_address is required for delivery orders",
        });
      }
      if (!customer_phone || !customer_phone.trim()) {
        return res.status(400).json({
          message: "customer_phone is required for delivery orders",
        });
      }
    }

    // Calculate subtotal
    let subtotal_amount = 0;
    const validated_items = [];

    for (const item of order_items) {
      if (!item.item_name || !item.quantity || !item.price) {
        return res.status(400).json({
          message: "Each order item must have item_name, quantity, and price",
        });
      }

      const item_total = item.quantity * item.price;
      subtotal_amount += item_total;

      validated_items.push({
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        total_price: item_total,
        menu_item_id: item.menu_item_id || null,
        special_instructions: item.special_instructions || "",
      });
    }

    // Calculate delivery fee (50 PHP for delivery)
    const delivery_fee = order_type === "delivery" ? 50 : 0;
    const total_amount = subtotal_amount + delivery_fee;

    // Get customer_id from user if logged in
    const customer_id = req.user && req.user.role === "Customer" ? req.user._id : null;

    // Create the order
    const order = new Order({
      customer_name,
      order_type,
      customer_id,
      customer_phone: customer_phone || null,
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
    });

    await order.save();

    // Create order items
    const orderItems = validated_items.map((item) => ({
      ...item,
      order_id: order._id,
    }));

    await OrderItem.insertMany(orderItems);

    // Check availability and update servings for menu items
    for (const item of order_items) {
      if (item.menu_item_id) {
        try {
          const menuItem = await Menu.findById(item.menu_item_id);
          if (!menuItem) {
            return res.status(400).json({
              message: `Menu item not found: ${item.item_name}`,
            });
          }

          // Check if sufficient servings are available
          if (!menuItem.hasSufficientServings(item.quantity)) {
            return res.status(400).json({
              message: `Insufficient servings for ${menuItem.name}. Available: ${menuItem.servings}, Required: ${item.quantity}`,
            });
          }

          // Update inventory (ingredients) - for tracking purposes
          await menuItem.updateInventoryOnOrder(item.quantity);

          // Reduce servings using the model method
          await menuItem.deductServings(item.quantity);
        } catch (error) {
          console.error(
            `Failed to update inventory/servings for menu item ${item.menu_item_id}:`,
            error
          );
          return res.status(400).json({
            message: error.message || "Failed to process menu item",
          });
        }
      }
    }

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

// PUT /orders/:id - Update order
router.put("/:id", verifyAuth, async (req, res) => {
  try {
    const { status, payment_status, notes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user can update this order (Admin or Staff)
    if (req.user.role !== "Admin" && req.user.role !== "Staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update fields
    if (status !== undefined) order.status = status;
    if (payment_status !== undefined) order.payment_status = payment_status;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    // Populate the response
    await order.populate("staff_member", "name");
    await order.populate({
      path: "order_items",
      populate: {
        path: "menu_item_id",
        select: "name category",
      },
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /orders/:id/status - Update order status
router.put("/:id/status", verifyAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user can update this order (Admin or Staff)
    if (req.user.role !== "Admin" && req.user.role !== "Staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    // If order is being cancelled, restore servings
    if (status === "cancelled" && order.status !== "cancelled") {
      const orderItems = await OrderItem.find({ order_id: order._id });
      for (const item of orderItems) {
        if (item.menu_item_id) {
          try {
            const menuItem = await Menu.findById(item.menu_item_id);
            if (menuItem) {
              // Restore servings using the model method
              await menuItem.restoreServings(item.quantity);
              console.log(
                `✅ Restored ${item.quantity} servings for ${menuItem.name}`
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

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /orders/:id/payment - Update payment status
router.put("/:id/payment", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { payment_status, payment_method } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (payment_status !== undefined) order.payment_status = payment_status;
    if (payment_method !== undefined) order.payment_method = payment_method;

    await order.save();

    res.json({ message: "Payment status updated successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /orders/:id - Delete order (Admin and Staff)
router.delete("/:id", verifyAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user can delete this order (Admin or Staff who created it)
    if (
      req.user.role !== "Admin" &&
      order.staff_member.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Restore servings for menu items before deleting (only if not completed)
    if (order.status !== "completed") {
      const orderItems = await OrderItem.find({ order_id: order._id });
      for (const item of orderItems) {
        if (item.menu_item_id) {
          try {
            const menuItem = await Menu.findById(item.menu_item_id);
            if (menuItem) {
              // Restore servings using the model method
              await menuItem.restoreServings(item.quantity);
              console.log(
                `✅ Restored ${item.quantity} servings for ${menuItem.name} (Order deleted)`
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
    await OrderItem.deleteMany({ order_id: order._id });

    // Delete the order
    await Order.findByIdAndDelete(req.params.id);

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/stats/summary - Get order statistics (Admin and Staff)
router.get("/stats/summary", verifyAuth, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let filter = {};
    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) {
        filter.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        filter.created_at.$lte = new Date(date_to);
      }
    }

    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "cancelled"] },
                    { $ne: ["$status", "pending"] },
                  ],
                },
                "$total_amount",
                0,
              ],
            },
          },
          average_order_value: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "cancelled"] },
                    { $ne: ["$status", "pending"] },
                  ],
                },
                "$total_amount",
                null,
              ],
            },
          },
          pending_orders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          completed_orders: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]);

    const statusBreakdown = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      summary: stats[0] || {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        pending_orders: 0,
        completed_orders: 0,
      },
      statusBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/tables/status - Get all table statuses
router.get("/tables/status", verifyAuth, async (req, res) => {
  try {
    const tableStatuses = await Order.getAllTableStatuses();
    res.json({ tableStatuses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/tables/:tableNumber/status - Get specific table status
router.get("/tables/:tableNumber/status", verifyAuth, async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const tableStatus = await Order.getTableStatus(tableNumber);

    // Enhance response with reservation details if applicable
    if (!tableStatus.available && tableStatus.type === "reservation") {
      const reservationTime = new Date(
        tableStatus.reservation_date
      ).toLocaleString();
      tableStatus.message = `Table ${tableNumber} is reserved for ${reservationTime}. Customer: ${tableStatus.customer}`;
    }

    res.json(tableStatus);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/stats/staff - Get staff performance statistics (Admin only)
router.get("/stats/staff", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let filter = {};
    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) {
        filter.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        filter.created_at.$lte = new Date(date_to);
      }
    }

    const staffStats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$staff_member",
          total_orders: { $sum: 1 },
          total_revenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "cancelled"] },
                    { $ne: ["$status", "pending"] },
                  ],
                },
                "$total_amount",
                0,
              ],
            },
          },
          average_order_value: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "cancelled"] },
                    { $ne: ["$status", "pending"] },
                  ],
                },
                "$total_amount",
                null,
              ],
            },
          },
          pending_orders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          completed_orders: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled_orders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "staff_info",
        },
      },
      {
        $unwind: "$staff_info",
      },
      {
        $project: {
          staff_id: "$_id",
          staff_name: "$staff_info.name",
          staff_role: "$staff_info.role",
          total_orders: 1,
          total_revenue: 1,
          average_order_value: 1,
          pending_orders: 1,
          completed_orders: 1,
          cancelled_orders: 1,
          completion_rate: {
            $cond: [
              { $gt: ["$total_orders", 0] },
              {
                $multiply: [
                  { $divide: ["$completed_orders", "$total_orders"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { total_orders: -1 } },
    ]);

    res.json({
      staff_performance: staffStats,
      total_staff: staffStats.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/sales/daily - Get daily sales summary (Admin only)
router.get("/sales/daily", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    // Set to start and end of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dailyStats = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: "$total_amount" },
          average_order_value: { $avg: "$total_amount" },
          payment_methods: {
            $push: "$payment_method",
          },
        },
      },
    ]);

    // Get hourly breakdown
    const hourlyStats = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: { $hour: "$created_at" },
          orders: { $sum: 1 },
          revenue: { $sum: "$total_amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get payment method breakdown
    const paymentStats = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: "$payment_method",
          count: { $sum: 1 },
          total_amount: { $sum: "$total_amount" },
        },
      },
    ]);

    res.json({
      date: targetDate.toISOString().split("T")[0],
      summary: dailyStats[0] || {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
      },
      hourly_breakdown: hourlyStats,
      payment_methods: paymentStats,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/sales/weekly - Get weekly sales summary (Admin only)
router.get("/sales/weekly", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { week_start } = req.query;
    let startOfWeek;

    if (week_start) {
      startOfWeek = new Date(week_start);
    } else {
      // Get start of current week (Monday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startOfWeek = new Date(today.setDate(diff));
    }

    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyStats = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfWeek, $lte: endOfWeek },
          status: { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: "$total_amount" },
          average_order_value: { $avg: "$total_amount" },
        },
      },
    ]);

    // Get daily breakdown for the week
    const dailyBreakdown = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfWeek, $lte: endOfWeek },
          status: { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$created_at" },
          orders: { $sum: 1 },
          revenue: { $sum: "$total_amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      week_start: startOfWeek.toISOString().split("T")[0],
      week_end: endOfWeek.toISOString().split("T")[0],
      summary: weeklyStats[0] || {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
      },
      daily_breakdown: dailyBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/sales/monthly - Get monthly sales summary (Admin only)
router.get("/sales/monthly", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { year, month } = req.query;
    let targetDate;

    if (year && month) {
      targetDate = new Date(year, month - 1, 1);
    } else {
      targetDate = new Date();
      targetDate.setDate(1);
    }

    const startOfMonth = new Date(targetDate);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0
    );
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyStats = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: "$total_amount" },
          average_order_value: { $avg: "$total_amount" },
        },
      },
    ]);

    // Get weekly breakdown for the month
    const weeklyBreakdown = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startOfMonth, $lte: endOfMonth },
          status: { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: { $week: "$created_at" },
          orders: { $sum: 1 },
          revenue: { $sum: "$total_amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get top selling items for the month
    const topItems = await OrderItem.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $unwind: "$order",
      },
      {
        $match: {
          "order.created_at": { $gte: startOfMonth, $lte: endOfMonth },
          "order.status": { $in: ["completed", "paid"] },
        },
      },
      {
        $group: {
          _id: "$item_name",
          total_quantity: { $sum: "$quantity" },
          total_revenue: { $sum: "$total_price" },
        },
      },
      { $sort: { total_quantity: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      year: targetDate.getFullYear(),
      month: targetDate.getMonth() + 1,
      month_name: targetDate.toLocaleString("default", { month: "long" }),
      summary: monthlyStats[0] || {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
      },
      weekly_breakdown: weeklyBreakdown,
      top_selling_items: topItems,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /orders/transactions - Get detailed transaction records (Admin only)
router.get("/transactions", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const {
      date_from,
      date_to,
      payment_method,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    let filter = {};

    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) {
        filter.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        filter.created_at.$lte = new Date(date_to);
      }
    }

    if (payment_method) {
      filter.payment_method = payment_method;
    }

    if (status) {
      filter.status = status;
    }

    const transactions = await Order.find(filter)
      .populate("staff_member", "name")
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

    const total = await Order.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
