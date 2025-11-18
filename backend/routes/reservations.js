const express = require("express");
const Reservation = require("../models/Reservation");
const Order = require("../models/Order");
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
      table_number,
      reservation_date,
      status,
    } = req.body;

    // Validate required fields
    if (
      !customer_name ||
      !contact_number ||
      !table_number ||
      !reservation_date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name, contact number, table number, and reservation date are required",
      });
    }

    // Check if table is already reserved for the same date and time
    const existingReservation = await Reservation.findOne({
      table_number,
      reservation_date: new Date(reservation_date),
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: "Table is already reserved for this date and time",
      });
    }

    // Check if there's an active order at this table
    // Only block if reservation is for now or within the next 2 hours
    const reservationDateTime = new Date(reservation_date);
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // If reservation is within the next 2 hours, check for active orders
    if (reservationDateTime <= twoHoursFromNow) {
      const activeOrder = await Order.findOne({
        table_number,
        status: { $in: ["pending", "preparing", "ready"] },
      });

      if (activeOrder) {
        return res.status(400).json({
          success: false,
          message: `Table ${table_number} is currently occupied by an active order (Status: ${activeOrder.status})`,
        });
      }
    }

    const newReservation = new Reservation({
      customer_name,
      contact_number,
      table_number,
      reservation_date: new Date(reservation_date),
      status: status || "pending",
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
      table_number,
      reservation_date,
      status,
    } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    // Check if table is already reserved for the same date and time (excluding current reservation)
    if (table_number && reservation_date) {
      const existingReservation = await Reservation.findOne({
        _id: { $ne: req.params.id },
        table_number,
        reservation_date: new Date(reservation_date),
        status: { $in: ["pending", "confirmed"] },
      });

      if (existingReservation) {
        return res.status(400).json({
          success: false,
          message: "Table is already reserved for this date and time",
        });
      }

      // Check if there's an active order at this table
      // Only block if reservation is for now or within the next 2 hours
      const reservationDateTime = new Date(reservation_date);
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      // If reservation is within the next 2 hours, check for active orders
      if (reservationDateTime <= twoHoursFromNow) {
        const activeOrder = await Order.findOne({
          table_number,
          status: { $in: ["pending", "preparing", "ready"] },
        });

        if (activeOrder) {
          return res.status(400).json({
            success: false,
            message: `Table ${table_number} is currently occupied by an active order (Status: ${activeOrder.status})`,
          });
        }
      }
    }

    // Update fields
    if (customer_name) reservation.customer_name = customer_name;
    if (contact_number) reservation.contact_number = contact_number;
    if (table_number) reservation.table_number = table_number;
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

// GET /reservations/tables/available - Get available tables for a specific date/time
router.get("/tables/available", authenticateToken, async (req, res) => {
  try {
    const { reservation_date } = req.query;

    // Default table numbers (1-20) - adjust based on your restaurant's tables
    const allTables = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
    
    // If reservation_date is provided, check for conflicts at that time
    if (reservation_date) {
      const reservationDateTime = new Date(reservation_date);
      
      // Check for active orders
      const activeOrders = await Order.find({
        status: { $in: ["pending", "preparing", "ready"] },
      });
      const occupiedByOrders = new Set(
        activeOrders.map((order) => order.table_number)
      );

      // Check for reservations at the same date/time
      const conflictingReservations = await Reservation.find({
        reservation_date: reservationDateTime,
        status: { $in: ["pending", "confirmed"] },
      });
      const occupiedByReservations = new Set(
        conflictingReservations.map((res) => res.table_number)
      );

      // Also check if reservation is within 2 hours - check for active orders
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      if (reservationDateTime <= twoHoursFromNow) {
        // Reservation is soon, so consider active orders as conflicts
        const availableTables = allTables.filter(
          (table) =>
            !occupiedByOrders.has(table) && !occupiedByReservations.has(table)
        );
        
        return res.status(200).json({
          success: true,
          data: availableTables,
          total: availableTables.length,
        });
      } else {
        // Reservation is in the future, only check for reservations at that exact time
        const availableTables = allTables.filter(
          (table) => !occupiedByReservations.has(table)
        );
        
        return res.status(200).json({
          success: true,
          data: availableTables,
          total: availableTables.length,
        });
      }
    } else {
      // No reservation_date provided, check for current availability
      const activeOrders = await Order.find({
        status: { $in: ["pending", "preparing", "ready"] },
      });
      const occupiedByOrders = new Set(
        activeOrders.map((order) => order.table_number)
      );

      // Check for reservations within next 2 hours
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      const upcomingReservations = await Reservation.find({
        reservation_date: {
          $gte: now,
          $lte: twoHoursFromNow,
        },
        status: { $in: ["pending", "confirmed"] },
      });
      const occupiedByReservations = new Set(
        upcomingReservations.map((res) => res.table_number)
      );

      const availableTables = allTables.filter(
        (table) =>
          !occupiedByOrders.has(table) && !occupiedByReservations.has(table)
      );

      return res.status(200).json({
        success: true,
        data: availableTables,
        total: availableTables.length,
      });
    }
  } catch (error) {
    console.error("Get available tables error:", error);
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
