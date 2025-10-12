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
