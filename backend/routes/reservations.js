const express = require("express");
const Reservation = require("../models/Reservation");
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access token required" });
  }

  const jwt = require("jsonwebtoken");
  jwt.verify(token, process.env.JWT_SECRET || "yourSecretKey", (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Get all reservations
router.get("/", authenticateToken, async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ created_at: -1 });
    res.status(200).json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    console.error("Get reservations error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Get reservation by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }
    res.status(200).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error("Get reservation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Create new reservation
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      customer_name,
      contact_number,
      reservation_date,
      status,
      food_items,
    } = req.body;

    // Validate required fields
    if (
      !customer_name ||
      !contact_number ||
      !reservation_date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name, contact number, and reservation date are required",
      });
    }

    // Validate and process food items if provided
    let processedFoodItems = [];
    let totalAmount = 0;

    if (food_items && Array.isArray(food_items) && food_items.length > 0) {
      for (const item of food_items) {
        if (
          !item.item_name ||
          !item.quantity ||
          !item.price ||
          item.quantity < 1 ||
          item.price < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Each food item must have item_name, quantity (>=1), and price (>=0)",
          });
        }

        const itemTotal = item.quantity * item.price;
        totalAmount += itemTotal;

        processedFoodItems.push({
          item_name: item.item_name.trim(),
          quantity: item.quantity,
          price: item.price,
          total_price: itemTotal,
          menu_item_id: item.menu_item_id || null,
          special_instructions: item.special_instructions || "",
        });
      }
    }

    const newReservation = new Reservation({
      customer_name,
      contact_number,
      reservation_date: new Date(reservation_date),
      status: status || "pending",
      food_items: processedFoodItems,
      total_amount: totalAmount,
    });

    await newReservation.save();

    res.status(201).json({
      success: true,
      message: "Reservation created successfully",
      data: newReservation,
    });
  } catch (error) {
    console.error("Create reservation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Update reservation
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const {
      customer_name,
      contact_number,
      reservation_date,
      status,
      food_items,
    } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    // Validate and process food items if provided
    if (food_items !== undefined) {
      if (Array.isArray(food_items)) {
        let processedFoodItems = [];
        let totalAmount = 0;

        if (food_items.length > 0) {
          for (const item of food_items) {
            if (
              !item.item_name ||
              !item.quantity ||
              !item.price ||
              item.quantity < 1 ||
              item.price < 0
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Each food item must have item_name, quantity (>=1), and price (>=0)",
              });
            }

            const itemTotal = item.quantity * item.price;
            totalAmount += itemTotal;

            processedFoodItems.push({
              item_name: item.item_name.trim(),
              quantity: item.quantity,
              price: item.price,
              total_price: itemTotal,
              menu_item_id: item.menu_item_id || null,
              special_instructions: item.special_instructions || "",
            });
          }
        }

        reservation.food_items = processedFoodItems;
        reservation.total_amount = totalAmount;
      } else {
        return res.status(400).json({
          success: false,
          message: "food_items must be an array",
        });
      }
    }

    // Update fields
    if (customer_name) reservation.customer_name = customer_name;
    if (contact_number) reservation.contact_number = contact_number;
    if (reservation_date)
      reservation.reservation_date = new Date(reservation_date);
    if (status) reservation.status = status;

    await reservation.save();

    res.status(200).json({
      success: true,
      message: "Reservation updated successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("Update reservation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Delete reservation
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    await Reservation.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Reservation deleted successfully",
    });
  } catch (error) {
    console.error("Delete reservation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Update reservation status
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (
      !status ||
      !["pending", "confirmed", "cancelled", "completed"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid status is required (pending, confirmed, cancelled, completed)",
      });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    reservation.status = status;
    await reservation.save();

    res.status(200).json({
      success: true,
      message: "Reservation status updated successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("Update reservation status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
