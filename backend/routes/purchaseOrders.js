const express = require("express");
const router = express.Router();
const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const RawMaterial = require("../models/RawMaterial");
const UnitConversion = require("../models/UnitConversion");
const User = require("../models/User");

// Middleware to verify admin role using JWT
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
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

// List all purchase orders
router.get("/", async (req, res) => {
  try {
    const { status, supplier, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;
    if (search) {
      filter.$or = [
        { po_number: new RegExp(search, "i") },
        { notes: new RegExp(search, "i") },
      ];
    }

    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate("supplier", "company_name contact_person contact_number")
      .populate("items.raw_material", "name unit category unit_price")
      .populate(
        "items.unit_conversion",
        "base_unit equivalent_unit quantity unit_price srp"
      )
      .populate("created_by", "username email")
      .populate("approved_by", "username email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: purchaseOrders });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get next PO number (for preview) - MUST BE BEFORE /:id route
router.get("/next-po-number", async (req, res) => {
  try {
    const count = await PurchaseOrder.countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");
    const sequence = String(count + 1).padStart(4, "0");
    const nextPONumber = `PO-${year}${month}${day}-${sequence}`;

    res.json({ success: true, data: { next_po_number: nextPONumber } });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get unit conversions for a specific raw material - MUST BE BEFORE /:id route
router.get("/unit-conversions/:materialId", async (req, res) => {
  try {
    const conversions = await UnitConversion.find({
      raw_material_id: req.params.materialId,
    })
      .populate("raw_material_id", "name unit category")
      .sort({ equivalent_unit: 1 });

    res.json({ success: true, data: conversions });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Get single purchase order
router.get("/:id", async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate(
        "supplier",
        "company_name business_address contact_person contact_number other_contact_number"
      )
      .populate(
        "items.raw_material",
        "name unit category unit_price description"
      )
      .populate(
        "items.unit_conversion",
        "base_unit equivalent_unit quantity unit_price srp markup_percent"
      )
      .populate("created_by", "username email")
      .populate("approved_by", "username email");

    if (!purchaseOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
    }

    res.json({ success: true, data: purchaseOrder });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Create purchase order
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { supplier, items, expected_delivery_date, notes } = req.body;
    console.log(
      "Received purchase order data:",
      JSON.stringify(req.body, null, 2)
    );

    if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Supplier and items are required",
      });
    }

    // Validate supplier exists
    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      return res.status(400).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Validate items and calculate totals
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      if (
        !item.raw_material ||
        !item.unit_conversion ||
        item.quantity === undefined ||
        item.quantity === null ||
        item.quantity === "" ||
        item.unit_price === undefined ||
        item.unit_price === null ||
        item.unit_price === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each item must have raw_material, unit_conversion, quantity, and unit_price",
        });
      }

      // Validate raw material exists
      const rawMaterial = await RawMaterial.findById(item.raw_material);
      if (!rawMaterial) {
        return res.status(400).json({
          success: false,
          message: `Raw material with ID ${item.raw_material} not found`,
        });
      }

      let unit;
      let unitConversionId = null;

      // Check if using base unit or unit conversion
      if (item.unit_conversion === "base_unit") {
        // Using base unit of raw material
        unit = rawMaterial.unit;
        unitConversionId = null;
      } else {
        // Validate unit conversion exists
        const unitConversion = await UnitConversion.findById(
          item.unit_conversion
        );
        if (!unitConversion) {
          return res.status(400).json({
            success: false,
            message: `Unit conversion with ID ${item.unit_conversion} not found`,
          });
        }

        // Validate unit conversion belongs to the raw material
        if (unitConversion.raw_material_id.toString() !== item.raw_material) {
          return res.status(400).json({
            success: false,
            message: `Unit conversion does not belong to the selected raw material`,
          });
        }

        unit = unitConversion.equivalent_unit;
        unitConversionId = item.unit_conversion;
      }

      const totalPrice = item.quantity * item.unit_price;
      totalAmount += totalPrice;

      validatedItems.push({
        raw_material: item.raw_material,
        unit_conversion: unitConversionId,
        quantity: item.quantity,
        unit: unit,
        unit_price: item.unit_price,
        total_price: totalPrice,
      });
    }

    const purchaseOrder = new PurchaseOrder({
      supplier,
      items: validatedItems,
      total_amount: totalAmount,
      expected_delivery_date: expected_delivery_date
        ? new Date(expected_delivery_date)
        : undefined,
      notes,
      created_by: req.user._id,
    });

    await purchaseOrder.save();

    // Populate the response
    const populatedPO = await PurchaseOrder.findById(purchaseOrder._id)
      .populate(
        "supplier",
        "company_name business_address contact_person contact_number"
      )
      .populate("items.raw_material", "name unit category unit_price")
      .populate(
        "items.unit_conversion",
        "base_unit equivalent_unit quantity unit_price srp"
      )
      .populate("created_by", "username email");

    res.status(201).json({ success: true, data: populatedPO });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Update purchase order
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
    }

    // Only allow updates if status is Pending
    if (purchaseOrder.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update purchase order that is not in Pending status",
      });
    }

    const { supplier, items, expected_delivery_date, notes, status } = req.body;

    // Update fields
    if (supplier !== undefined) {
      const supplierExists = await Supplier.findById(supplier);
      if (!supplierExists) {
        return res
          .status(400)
          .json({ success: false, message: "Supplier not found" });
      }
      purchaseOrder.supplier = supplier;
    }

    if (items !== undefined && Array.isArray(items) && items.length > 0) {
      // Validate and recalculate items
      let totalAmount = 0;
      const validatedItems = [];

      for (const item of items) {
        if (
          !item.raw_material ||
          !item.unit_conversion ||
          item.quantity === undefined ||
          item.quantity === null ||
          item.quantity === "" ||
          item.unit_price === undefined ||
          item.unit_price === null ||
          item.unit_price === ""
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Each item must have raw_material, unit_conversion, quantity, and unit_price",
          });
        }

        const rawMaterial = await RawMaterial.findById(item.raw_material);
        if (!rawMaterial) {
          return res.status(400).json({
            success: false,
            message: `Raw material with ID ${item.raw_material} not found`,
          });
        }

        let unit;
        let unitConversionId = null;

        // Check if using base unit or unit conversion
        if (item.unit_conversion === "base_unit") {
          // Using base unit of raw material
          unit = rawMaterial.unit;
          unitConversionId = null;
        } else {
          // Validate unit conversion exists
          const unitConversion = await UnitConversion.findById(
            item.unit_conversion
          );
          if (!unitConversion) {
            return res.status(400).json({
              success: false,
              message: `Unit conversion with ID ${item.unit_conversion} not found`,
            });
          }

          // Validate unit conversion belongs to the raw material
          if (unitConversion.raw_material_id.toString() !== item.raw_material) {
            return res.status(400).json({
              success: false,
              message: `Unit conversion does not belong to the selected raw material`,
            });
          }

          unit = unitConversion.equivalent_unit;
          unitConversionId = item.unit_conversion;
        }

        const totalPrice = item.quantity * item.unit_price;
        totalAmount += totalPrice;

        validatedItems.push({
          raw_material: item.raw_material,
          unit_conversion: unitConversionId,
          quantity: item.quantity,
          unit: unit,
          unit_price: item.unit_price,
          total_price: totalPrice,
        });
      }

      purchaseOrder.items = validatedItems;
      purchaseOrder.total_amount = totalAmount;
    }

    if (expected_delivery_date !== undefined) {
      purchaseOrder.expected_delivery_date = expected_delivery_date
        ? new Date(expected_delivery_date)
        : undefined;
    }

    if (notes !== undefined) purchaseOrder.notes = notes;

    if (status !== undefined) {
      purchaseOrder.status = status;
      if (status === "Approved") {
        purchaseOrder.approved_by = req.user._id;
        purchaseOrder.approved_at = new Date();
      }
    }

    await purchaseOrder.save();

    // Populate the response
    const populatedPO = await PurchaseOrder.findById(purchaseOrder._id)
      .populate(
        "supplier",
        "company_name business_address contact_person contact_number"
      )
      .populate("items.raw_material", "name unit category unit_price")
      .populate(
        "items.unit_conversion",
        "base_unit equivalent_unit quantity unit_price srp"
      )
      .populate("created_by", "username email")
      .populate("approved_by", "username email");

    res.json({ success: true, data: populatedPO });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Delete purchase order
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
    }

    // Only allow deletion if status is Pending
    if (purchaseOrder.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete purchase order that is not in Pending status",
      });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Purchase order deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// Receive purchase order
router.post("/:id/receive", verifyAdmin, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
    }

    // Only allow receiving if status is Approved
    if (
      purchaseOrder.status !== "Approved" &&
      purchaseOrder.status !== "Pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Can only receive purchase orders that are Approved or Pending",
      });
    }

    const { items, date_received } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items with received quantities are required",
      });
    }

    if (!date_received) {
      return res.status(400).json({
        success: false,
        message: "Date received is required",
      });
    }

    // Update received quantities for each item
    for (let i = 0; i < items.length; i++) {
      if (
        items[i].received_quantity === undefined ||
        items[i].received_quantity === null
      ) {
        return res.status(400).json({
          success: false,
          message: "All items must have received_quantity",
        });
      }

      if (purchaseOrder.items[i]) {
        purchaseOrder.items[i].received_quantity = items[i].received_quantity;
      }
    }

    // Update status and metadata
    purchaseOrder.status = "Delivered";
    purchaseOrder.date_received = new Date(date_received);
    purchaseOrder.received_by = req.user._id;

    await purchaseOrder.save();

    // Populate the response
    const populatedPO = await PurchaseOrder.findById(purchaseOrder._id)
      .populate(
        "supplier",
        "company_name business_address contact_person contact_number"
      )
      .populate("items.raw_material", "name unit category unit_price")
      .populate(
        "items.unit_conversion",
        "base_unit equivalent_unit quantity unit_price srp"
      )
      .populate("created_by", "username email")
      .populate("approved_by", "username email")
      .populate("received_by", "username email");

    res.json({
      success: true,
      data: populatedPO,
      message: "Purchase order received successfully",
    });
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
