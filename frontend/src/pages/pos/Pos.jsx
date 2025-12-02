import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  XCircle,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Search,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { cities, barangays, provinceByName } from "select-philippines-address";

const PACKAGING_FEE_PER_BOX = 10;
const BUSINESS_COORDINATES = {
  latitude: 13.475246207507663,
  longitude: 121.85945810514359,
};
const DELIVERY_MIN_FEE = 50;
const DELIVERY_RATE_PER_KM = 30;
const DELIVERY_GEO_ENDPOINT = "https://photon.komoot.io/api";

const normalizeDistance = (meters = 0) => Number((meters / 1000).toFixed(2));

const calculateDeliveryFeeFromDistance = (distanceKm = 0) => {
  if (!distanceKm || Number.isNaN(distanceKm)) {
    return DELIVERY_MIN_FEE;
  }
  const computed = Math.round(distanceKm * DELIVERY_RATE_PER_KM * 100) / 100;
  return Math.max(DELIVERY_MIN_FEE, computed);
};

const geocodeDeliveryAddress = async (address) => {
  if (!address?.trim()) {
    return null;
  }

  const response = await fetch(
    `${DELIVERY_GEO_ENDPOINT}?q=${encodeURIComponent(address)}&limit=1&lang=en`
  );

  if (!response.ok) {
    throw new Error("Failed to reach the mapping service");
  }

  const data = await response.json();
  const feature = data?.features?.[0];
  const coordinates = feature?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = coordinates;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};

const calculateLeafletDistance = (coords) => {
  if (!coords) return 0;
  const businessPoint = L.latLng(
    BUSINESS_COORDINATES.latitude,
    BUSINESS_COORDINATES.longitude
  );
  const clientPoint = L.latLng(coords.latitude, coords.longitude);
  const meters = businessPoint.distanceTo(clientPoint);
  return normalizeDistance(meters);
};

const Pos = () => {
  const navigate = useNavigate();
  const [orderForm, setOrderForm] = useState({
    customer_name: "",
    customer_phone: "",
    delivery_address: "",
    notes: "",
    payment_method: "cash",
    discount_type: "none",
    discount_id_number: "",
    order_items: [],
    order_type: "dine_in",
    packaging_boxes: 0,
    delivery_distance_km: 0,
    delivery_fee: 0,
    delivery_coordinates: null,
  });
  const [cashAmount, setCashAmount] = useState("");
  const [showCashPayment, setShowCashPayment] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [deliveryFeeStatus, setDeliveryFeeStatus] = useState({
    loading: false,
    error: "",
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [menuItems, setMenuItems] = useState([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryStreetAddress, setDeliveryStreetAddress] = useState("");
  const [deliveryCityCode, setDeliveryCityCode] = useState("");
  const [deliveryBarangayCode, setDeliveryBarangayCode] = useState("");
  const [deliveryProvinceCode, setDeliveryProvinceCode] = useState("");
  const [deliveryRegionCode, setDeliveryRegionCode] = useState("");
  const [deliveryCityList, setDeliveryCityList] = useState([]);
  const [deliveryBarangayList, setDeliveryBarangayList] = useState([]);
  const [deliveryAddressLoading, setDeliveryAddressLoading] = useState(false);
  const [showConfirmOrderModal, setShowConfirmOrderModal] = useState(false);
  const discountOptions = [
    { label: "No Discount", value: "none", helper: "Regular price" },
    { label: "PWD", value: "pwd", helper: "Requires valid ID" },
    { label: "Senior", value: "senior", helper: "Requires valid ID" },
  ];
  const packagingBoxes = Number(orderForm.packaging_boxes) || 0;
  const handlePackagingBoxesChange = (value) => {
    if (value === "") {
      setOrderForm((prev) => ({ ...prev, packaging_boxes: "" }));
      return;
    }
    const numeric = Math.max(0, parseInt(value, 10) || 0);
    setOrderForm((prev) => ({ ...prev, packaging_boxes: numeric }));
  };

  const isDeliveryOrder = orderForm.order_type === "delivery";
  const deliveryDistanceKm = isDeliveryOrder
    ? Number(orderForm.delivery_distance_km) || 0
    : 0;
  const deliveryFee = isDeliveryOrder ? Number(orderForm.delivery_fee) || 0 : 0;
  const hasDeliveryAddress = Boolean(orderForm.delivery_address?.trim());
  const hasDeliveryPhone = Boolean(orderForm.customer_phone?.trim());
  const hasDeliveryQuote = Boolean(deliveryDistanceKm && deliveryFee);
  const isDeliveryAddressComplete = Boolean(
    deliveryStreetAddress.trim() && deliveryCityCode && deliveryBarangayCode
  );
  const deliveryAddressPreview =
    orderForm.delivery_address?.trim() ||
    (deliveryStreetAddress || deliveryCityCode || deliveryBarangayCode
      ? "Incomplete address"
      : "No address yet");
  const isDeliveryInfoComplete =
    !isDeliveryOrder ||
    (hasDeliveryAddress && hasDeliveryPhone && hasDeliveryQuote);
  const hasCustomerName = Boolean(orderForm.customer_name?.trim());
  const hasOrderItems = orderForm.order_items.length > 0;
  const canOpenPaymentModal =
    hasCustomerName && hasOrderItems && isDeliveryInfoComplete;

  const resetDeliveryAddressFields = () => {
    setDeliveryStreetAddress("");
    setDeliveryCityCode("");
    setDeliveryBarangayCode("");
    setDeliveryBarangayList([]);
  };

  useEffect(() => {
    const loadMarinduqueData = async () => {
      try {
        setDeliveryAddressLoading(true);
        const marinduqueProvince = await provinceByName("Marinduque");
        if (marinduqueProvince) {
          const provinceCodeValue = marinduqueProvince.province_code;
          const regionCodeValue = marinduqueProvince.region_code || "17";
          setDeliveryProvinceCode(provinceCodeValue);
          setDeliveryRegionCode(regionCodeValue);
          const citiesData = await cities(provinceCodeValue);
          setDeliveryCityList(citiesData || []);
        } else {
          toast.error("Marinduque province not found");
        }
      } catch (error) {
        console.error("Failed to load delivery address data:", error);
        toast.error("Failed to load delivery address options");
      } finally {
        setDeliveryAddressLoading(false);
      }
    };

    loadMarinduqueData();
  }, []);

  useEffect(() => {
    const loadBarangays = async () => {
      if (!deliveryCityCode) {
        setDeliveryBarangayList([]);
        setDeliveryBarangayCode("");
        return;
      }

      try {
        setDeliveryAddressLoading(true);
        const selectedCity = deliveryCityList.find(
          (c) =>
            c.code === deliveryCityCode ||
            c.city_code === deliveryCityCode ||
            c.municipality_code === deliveryCityCode ||
            String(c.code) === String(deliveryCityCode) ||
            String(c.city_code) === String(deliveryCityCode) ||
            String(c.municipality_code) === String(deliveryCityCode)
        );

        const baseCode =
          selectedCity?.code ||
          selectedCity?.city_code ||
          selectedCity?.municipality_code ||
          deliveryCityCode;

        let barangaysData;
        try {
          barangaysData = await barangays(baseCode);
        } catch (firstError) {
          if (selectedCity && deliveryProvinceCode) {
            const combinedCode = `${deliveryProvinceCode}${baseCode}`;
            try {
              barangaysData = await barangays(combinedCode);
            } catch (secondError) {
              const alternateCode =
                selectedCity.city_code ||
                selectedCity.municipality_code ||
                selectedCity.code;
              barangaysData = await barangays(alternateCode);
            }
          } else {
            throw firstError;
          }
        }

        let formattedBarangays = [];
        if (Array.isArray(barangaysData)) {
          formattedBarangays = barangaysData;
        } else if (barangaysData && typeof barangaysData === "object") {
          formattedBarangays =
            barangaysData.data ||
            barangaysData.barangays ||
            Object.values(barangaysData).find(Array.isArray) ||
            [];
        }

        setDeliveryBarangayList(formattedBarangays);
      } catch (error) {
        console.error("Failed to load barangays:", error);
        setDeliveryBarangayList([]);
      } finally {
        setDeliveryAddressLoading(false);
      }
    };

    loadBarangays();
  }, [deliveryCityCode, deliveryCityList, deliveryProvinceCode]);

  useEffect(() => {
    if (!isDeliveryOrder) {
      return;
    }

    const trimmedStreet = deliveryStreetAddress.trim();
    const barangay =
      deliveryBarangayCode &&
      deliveryBarangayList.find(
        (b) =>
          b.code === deliveryBarangayCode ||
          b.barangay_code === deliveryBarangayCode ||
          b.brgy_code === deliveryBarangayCode ||
          String(b.code) === String(deliveryBarangayCode) ||
          String(b.barangay_code) === String(deliveryBarangayCode) ||
          String(b.brgy_code) === String(deliveryBarangayCode)
      );
    const city =
      deliveryCityCode &&
      deliveryCityList.find(
        (c) =>
          c.code === deliveryCityCode ||
          c.city_code === deliveryCityCode ||
          c.municipality_code === deliveryCityCode ||
          String(c.code) === String(deliveryCityCode) ||
          String(c.city_code) === String(deliveryCityCode) ||
          String(c.municipality_code) === String(deliveryCityCode)
      );

    const parts = [];
    if (trimmedStreet) {
      parts.push(trimmedStreet);
    }
    if (barangay) {
      parts.push(
        barangay.name ||
          barangay.barangay_name ||
          barangay.brgy_name ||
          "Barangay"
      );
    }
    if (city) {
      parts.push(city.name || city.city_name || city.municipality_name);
    }
    if (deliveryProvinceCode) {
      parts.push("Marinduque");
    }
    if (deliveryRegionCode) {
      parts.push("MIMAROPA");
    }

    const canBuild = Boolean(trimmedStreet && barangay && city);
    const newAddress = canBuild ? parts.join(", ") : "";

    let addressChanged = false;
    setOrderForm((prev) => {
      if (prev.delivery_address === newAddress) {
        return prev;
      }
      addressChanged = true;
      return {
        ...prev,
        delivery_address: newAddress,
        delivery_distance_km: 0,
        delivery_fee: 0,
        delivery_coordinates: null,
      };
    });

    if (addressChanged) {
      setDeliveryFeeStatus((prev) => ({ ...prev, error: "" }));
    }
  }, [
    deliveryStreetAddress,
    deliveryBarangayCode,
    deliveryCityCode,
    deliveryProvinceCode,
    deliveryRegionCode,
    deliveryCityList,
    deliveryBarangayList,
    isDeliveryOrder,
  ]);

  const handleOrderTypeChange = (value) => {
    setOrderForm((prev) => ({
      ...prev,
      order_type: value,
      packaging_boxes: value === "pickup" ? prev.packaging_boxes || 0 : 0,
      delivery_address: value === "delivery" ? prev.delivery_address : "",
      customer_phone: value === "delivery" ? prev.customer_phone : "",
      delivery_distance_km:
        value === "delivery" ? prev.delivery_distance_km : 0,
      delivery_fee: value === "delivery" ? prev.delivery_fee : 0,
      delivery_coordinates:
        value === "delivery" ? prev.delivery_coordinates : null,
    }));

    if (value !== "delivery") {
      setDeliveryFeeStatus({ loading: false, error: "" });
      setShowDeliveryModal(false);
      resetDeliveryAddressFields();
    } else {
      setShowDeliveryModal(true);
    }
  };

  const handleDeliveryCityChange = (value) => {
    setDeliveryCityCode(value);
    setDeliveryBarangayCode("");
  };

  const handleDeliveryBarangayChange = (value) => {
    setDeliveryBarangayCode(value);
  };

  const ensureDeliveryDetails = () => {
    if (!isDeliveryOrder) return true;
    if (!hasDeliveryAddress) {
      toast.error("Please provide a delivery address");
      return false;
    }
    if (!hasDeliveryPhone) {
      toast.error("Please provide the customer's phone number");
      return false;
    }
    if (!hasDeliveryQuote) {
      toast.error("Please calculate the delivery fee before proceeding");
      return false;
    }
    return true;
  };

  const handleDeliveryFeeCalculation = async () => {
    if (!isDeliveryOrder) return;
    if (!isDeliveryAddressComplete) {
      toast.error("Please complete the delivery address first");
      return;
    }
    if (!orderForm.delivery_address?.trim()) {
      toast.error("Please complete the delivery address first");
      return;
    }

    setDeliveryFeeStatus({ loading: true, error: "" });
    try {
      const coordinates = await geocodeDeliveryAddress(
        orderForm.delivery_address
      );
      if (!coordinates) {
        throw new Error(
          "We couldn't locate that address. Please refine it or add landmarks."
        );
      }

      const distanceKm = calculateLeafletDistance(coordinates);
      if (!distanceKm) {
        throw new Error("Unable to compute distance for this address");
      }

      const fee = calculateDeliveryFeeFromDistance(distanceKm);
      setOrderForm((prev) => ({
        ...prev,
        delivery_distance_km: distanceKm,
        delivery_fee: fee,
        delivery_coordinates: coordinates,
      }));
      toast.success(`Delivery distance: ${distanceKm.toFixed(2)} km`);
      setDeliveryFeeStatus({ loading: false, error: "" });
    } catch (error) {
      console.error("Delivery fee calculation failed:", error);
      setDeliveryFeeStatus({
        loading: false,
        error:
          error.message ||
          "Unable to compute the delivery distance. Please try again.",
      });
    }
  };

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Map available servings to a visual status used across the card
  const getStockStatus = (availableServings = 0) => {
    if (availableServings <= 0) {
      return {
        level: "none",
        label: "OUT OF STOCK",
        textClass: "text-red-400",
        cardClass:
          "bg-[#353535] border-[#383838] text-[#ababab] opacity-50 cursor-not-allowed",
        badgeClass: "bg-[#313131] text-red-400",
      };
    }
    if (availableServings <= 2) {
      return {
        level: "critical",
        label: "CRITICAL STOCK",
        textClass: "text-red-400",
        cardClass: "bg-[#3b1f1f] border-red-600 hover:border-red-500",
        badgeClass: "bg-[#3b1f1f] text-red-300",
      };
    }
    if (availableServings <= 5) {
      return {
        level: "low",
        label: "LOW STOCK",
        textClass: "text-yellow-300",
        cardClass: "bg-[#38301b] border-yellow-600 hover:border-yellow-500",
        badgeClass: "bg-[#50440a] text-[#f6b100]",
      };
    }
    return {
      level: "healthy",
      label: "",
      textClass: "text-green-400",
      cardClass:
        "bg-[#262626] border-[#383838] hover:border-[#f6b100] hover:shadow-xl",
      badgeClass: "",
    };
  };

  // Fetch menu items
  const fetchMenuItems = async () => {
    setMenuItemsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/menu/available`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }

      const data = await response.json();
      setMenuItems(data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to fetch menu items");
    } finally {
      setMenuItemsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const calculatePackagingFee = () => {
    if (orderForm.order_type !== "pickup") return 0;
    return packagingBoxes * PACKAGING_FEE_PER_BOX;
  };

  // Add item to order
  const addItemToOrder = (menuItem) => {
    const availableServings =
      menuItem.availableServings || menuItem.servings || 0;
    const existingItem = orderForm.order_items.find(
      (item) => item.menu_item_id === menuItem._id
    );

    if (existingItem) {
      // Check if we can add more of this item
      if (existingItem.quantity >= availableServings) {
        toast.error(
          `Only ${availableServings} servings available for ${menuItem.name}`
        );
        return;
      }

      // Update quantity if item already exists
      setOrderForm((prev) => ({
        ...prev,
        order_items: prev.order_items.map((item) =>
          item.menu_item_id === menuItem._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.price,
              }
            : item
        ),
      }));
    } else {
      // Check if item has available servings
      if (availableServings <= 0) {
        toast.error(`No servings available for ${menuItem.name}`);
        return;
      }

      // Add new item
      const newItem = {
        item_name: menuItem.name,
        quantity: 1,
        price: menuItem.price,
        total_price: menuItem.price,
        menu_item_id: menuItem._id,
        special_instructions: "",
      };

      setOrderForm((prev) => ({
        ...prev,
        order_items: [...prev.order_items, newItem],
      }));
    }
  };

  // Update item quantity
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(index);
      return;
    }

    // Find the menu item to check available servings
    const orderItem = orderForm.order_items[index];
    if (orderItem && orderItem.menu_item_id) {
      const menuItem = menuItems.find(
        (item) => item._id === orderItem.menu_item_id
      );
      if (menuItem) {
        const availableServings =
          menuItem.availableServings || menuItem.servings || 0;
        if (newQuantity > availableServings) {
          toast.error(
            `Only ${availableServings} servings available for ${menuItem.name}`
          );
          return;
        }
      }
    }

    setOrderForm((prev) => ({
      ...prev,
      order_items: prev.order_items.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: newQuantity,
              total_price: newQuantity * item.price,
            }
          : item
      ),
    }));
  };

  // Remove item from order
  const removeItemFromOrder = (index) => {
    setOrderForm((prev) => ({
      ...prev,
      order_items: prev.order_items.filter((_, i) => i !== index),
    }));
  };

  // Calculate totals and discounts
  const calculateSubtotal = () => {
    return orderForm.order_items.reduce(
      (total, item) => total + item.total_price,
      0
    );
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();

    // Apply PWD/Senior discount using VAT-removal formula: Total Amount / 1.12
    // Discount = subtotal - (subtotal / 1.12)
    if (
      subtotal > 0 &&
      (orderForm.discount_type === "pwd" ||
        orderForm.discount_type === "senior")
    ) {
      const discountedTotal = subtotal / 1.12;
      return subtotal - discountedTotal;
    }

    return 0;
  };

  const getDiscountLabel = () => {
    if (orderForm.discount_type === "pwd") {
      return "PWD";
    }
    if (orderForm.discount_type === "senior") {
      return "Senior";
    }
    return "";
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscountAmount();
    const totalAfterDiscount = Math.max(0, subtotal - discount);
    return (
      totalAfterDiscount +
      calculatePackagingFee() +
      (isDeliveryOrder ? deliveryFee : 0)
    );
  };

  // Calculate change for cash payment
  const calculateChange = () => {
    const total = calculateTotal();
    const cash = parseFloat(cashAmount) || 0;
    return cash - total;
  };

  // Handle cash amount input
  const handleCashAmountChange = (value) => {
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, "");
    setCashAmount(cleanValue);
  };

  // Check if cash payment is valid
  const isCashPaymentValid = () => {
    const total = calculateTotal();
    const cash = parseFloat(cashAmount) || 0;
    return cash >= total && total > 0;
  };

  // Check if discount is valid (ID number required for PWD/Senior)
  const isDiscountValid = () => {
    if (orderForm.discount_type === "none") return true;
    if (
      (orderForm.discount_type === "pwd" ||
        orderForm.discount_type === "senior") &&
      !orderForm.discount_id_number?.trim()
    ) {
      return false;
    }
    return true;
  };

  // Memoized unique categories
  const categories = useMemo(() => {
    if (!menuItems.length) return ["All"];
    const allCats = menuItems.map((item) => item.category || "Misc");
    return ["All", ...Array.from(new Set(allCats))];
  }, [menuItems]);

  // Modified getFilteredMenuItems to also filter by selectedCategory
  const getFilteredMenuItems = () => {
    let filtered = menuItems;
    if (selectedCategory && selectedCategory !== "All") {
      filtered = filtered.filter(
        (item) => (item.category || "Misc") === selectedCategory
      );
    }
    if (!menuSearchTerm.trim()) {
      return filtered;
    }
    return filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(menuSearchTerm.toLowerCase()))
    );
  };

  // Create new order
  const createOrder = async () => {
    try {
      if (!orderForm.customer_name || orderForm.order_items.length === 0) {
        toast.error(
          "Please provide customer details and add at least one item"
        );
        return false;
      }

      // Validate discount ID number if discount is selected
      if (
        (orderForm.discount_type === "pwd" ||
          orderForm.discount_type === "senior") &&
        !orderForm.discount_id_number?.trim()
      ) {
        toast.error("Please enter ID number for discount");
        return false;
      }

      // Validate cash payment if payment method is cash
      if (orderForm.payment_method === "cash" && !isCashPaymentValid()) {
        toast.error(
          "Cash amount must be greater than or equal to total amount"
        );
        return false;
      }

      if (!ensureDeliveryDetails()) {
        return false;
      }

      setIsCreatingOrder(true);
      const token = getAuthToken();
      const payload = {
        ...orderForm,
        packaging_boxes: packagingBoxes,
        delivery_fee: isDeliveryOrder ? deliveryFee : 0,
        delivery_distance_km: isDeliveryOrder ? deliveryDistanceKm : 0,
        delivery_coordinates: isDeliveryOrder
          ? orderForm.delivery_coordinates
          : null,
      };
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (
          errorData.message &&
          (errorData.message.includes("currently occupied") ||
            errorData.message.includes("reserved"))
        ) {
          toast.error(errorData.message);
          // Update table status if provided
          if (errorData.tableStatus) {
            setTableStatus(errorData.tableStatus);
          }
          if (errorData.reservation) {
            setTableStatus({
              available: false,
              type: "reservation",
              ...errorData.reservation,
            });
          }
          return false;
        }
        throw new Error("Failed to create order");
      }

      toast.success("Order created successfully");
      handleReset();
      fetchMenuItems(); // Refresh menu items after order creation
      return true;
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
      return false;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Handle reset form
  const handleReset = () => {
    setOrderForm({
      customer_name: "",
      customer_phone: "",
      delivery_address: "",
      notes: "",
      payment_method: "cash",
      discount_type: "none",
      discount_id_number: "",
      order_type: "dine_in",
      packaging_boxes: 0,
      order_items: [],
      delivery_distance_km: 0,
      delivery_fee: 0,
      delivery_coordinates: null,
    });
    setCashAmount("");
    setShowCashPayment(false);
    setDeliveryFeeStatus({ loading: false, error: "" });
    resetDeliveryAddressFields();
    setShowDeliveryModal(false);
  };

  // Print receipt function
  const printReceipt = async () => {
    if (orderForm.order_items.length === 0) {
      toast.error("No items to print");
      return;
    }

    setIsPrintingReceipt(true);

    try {
      const subtotal = calculateSubtotal();
      const discountAmount = calculateDiscountAmount();
      const totalAmount = calculateTotal();
      const discountLabel = getDiscountLabel();
      const packagingFee = calculatePackagingFee();
      const packagingBoxCount = packagingBoxes;
      const deliveryFeeAmount = deliveryFee;
      const deliveryDistance = deliveryDistanceKm;
      const printWindow = window.open("", "_blank");
      const currentDate = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Order #${Date.now().toString().slice(-6)}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
            background: white;
            color: black;
          }
          .receipt {
            max-width: 300px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .business-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .business-details {
            font-size: 10px;
            margin-bottom: 5px;
          }
          .order-info {
            margin: 10px 0;
            font-size: 11px;
          }
          .order-info div {
            margin: 2px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          .items-table th,
          .items-table td {
            padding: 2px 4px;
            text-align: left;
            border-bottom: 1px dotted #000;
          }
          .items-table th {
            font-weight: bold;
            text-align: center;
          }
          .items-table .qty { text-align: center; width: 20px; }
          .items-table .price { text-align: right; width: 50px; }
          .items-table .amount { text-align: right; width: 50px; }
          .total-section {
            border-top: 2px solid #000;
            margin-top: 10px;
            padding-top: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-amount {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
          }
          .payment-info {
            margin: 10px 0;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .payment-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="business-name">POBLACION PARES FAST FOOD CHAIN</div>
            <div class="business-details">Cleofas, Jamie James Ramos-Prop</div>
            <div class="business-details">Villa Mendez (Pob.)</div>
            <div class="business-details">Mogpog, Marinduque</div>
            <div class="divider"></div>
            <div>Order #${Date.now().toString().slice(-6)}</div>
            <div>Date: ${currentDate}</div>
          </div>

          <div class="order-info">
            <div><strong>Customer:</strong> ${
              orderForm.customer_name || "Walk-in"
            }</div>
            <div><strong>Service:</strong> ${
              orderForm.order_type === "pickup"
                ? "Take-out"
                : orderForm.order_type === "delivery"
                ? "Delivery"
                : "Dine-in"
            }</div>
            ${
              isDeliveryOrder
                ? `
            <div><strong>Address:</strong> ${orderForm.delivery_address}</div>
            <div><strong>Contact:</strong> ${orderForm.customer_phone}</div>
            `
                : ""
            }
            <div><strong>Payment:</strong> ${orderForm.payment_method.toUpperCase()}</div>
            ${
              orderForm.notes
                ? `<div><strong>Notes:</strong> ${orderForm.notes}</div>`
                : ""
            }
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="qty">Qty</th>
                <th class="price">Price</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${orderForm.order_items
                .map(
                  (item) => `
                <tr>
                  <td>${item.item_name}</td>
                  <td class="qty">${item.quantity}</td>
                  <td class="price">${formatCurrency(item.price)}</td>
                  <td class="amount">${formatCurrency(item.total_price)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-line">
              <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
            </div>
          ${
            discountAmount > 0
              ? `
            <div class="total-line">
              <span>Discount (${discountLabel}):</span>
              <span>- ${formatCurrency(discountAmount)}</span>
            </div>
          `
              : ""
          }
          ${
            orderForm.order_type === "pickup"
              ? `
            <div class="total-line">
              <span>Packaging (${packagingBoxCount} x ₱${PACKAGING_FEE_PER_BOX}):</span>
              <span>${formatCurrency(packagingFee)}</span>
            </div>
          `
              : ""
          }
          ${
            isDeliveryOrder
              ? `
            <div class="total-line">
              <span>Delivery (${deliveryDistance.toFixed(2)} km):</span>
              <span>${formatCurrency(deliveryFeeAmount)}</span>
            </div>
          `
              : ""
          }
            <div class="total-line">
              <span>Tax (0%):</span>
              <span>${formatCurrency(0)}</span>
            </div>
            <div class="total-amount">
              <span>TOTAL:</span>
            <span>${formatCurrency(totalAmount)}</span>
            </div>
          </div>

          ${
            orderForm.payment_method === "cash"
              ? `
            <div class="payment-info">
              <div class="payment-line">
                <span>Cash Received:</span>
                <span>${formatCurrency(parseFloat(cashAmount) || 0)}</span>
              </div>
              <div class="payment-line">
                <span>Change:</span>
                <span>${formatCurrency(Math.max(0, calculateChange()))}</span>
              </div>
            </div>
          `
              : ""
          }

          <div class="footer">
            <div>Thank you for your order!</div>
            <div>Please come again</div>
            <div class="divider"></div>
            <div>Receipt printed on: ${currentDate}</div>
          </div>
        </div>
      </body>
      </html>
    `;

      printWindow.document.write(receiptContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    } catch (error) {
      console.error("Error printing receipt:", error);
      toast.error("Failed to print receipt");
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  // Initialize cash payment state
  useEffect(() => {
    setShowCashPayment(orderForm.payment_method === "cash");
  }, [orderForm.payment_method]);

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  return (
    <div className="bg-[#1f1f1f] min-h-screen dark touch-manipulation overflow-x-hidden flex flex-col">
      {/* Top Bar - Quick Order Info (Always Visible) */}
      <div className="bg-[#262626] border-b-2 border-[#383838] px-3 sm:px-4 md:px-6 py-3 md:py-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-3 lg:gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
              className="text-[#ababab] hover:text-[#f6b100] p-2 md:p-3 hover:bg-[#353535] rounded-lg transition-all touch-manipulation flex-shrink-0"
              title="Close Window"
            >
              <XCircle size={24} />
            </button>

            {/* Refresh Button - Mobile */}
            <button
              onClick={fetchMenuItems}
              className="lg:hidden px-4 py-2 bg-[#f6b100] text-[#1f1f1f] rounded-lg hover:bg-[#dab000] transition-colors font-bold text-sm shadow-lg touch-manipulation"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Customer Name - Large Touch Input */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-[#ababab] mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={orderForm.customer_name}
              onChange={(e) =>
                setOrderForm((prev) => ({
                  ...prev,
                  customer_name: e.target.value,
                }))
              }
              className="w-full px-3 md:px-4 py-2 md:py-3 bg-[#181818] border-2 border-[#353535] rounded-lg text-base md:text-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] touch-manipulation"
              placeholder="Enter customer name"
            />
          </div>

          {/* Order Type */}
          <div className="w-full lg:w-40 flex-shrink-0">
            <label className="block text-xs font-semibold text-[#ababab] mb-1">
              Order Type
            </label>
            <select
              value={orderForm.order_type}
              onChange={(e) => handleOrderTypeChange(e.target.value)}
              className="w-full px-3 md:px-4 py-2 md:py-3 bg-[#181818] border-2 border-[#353535] rounded-lg text-base md:text-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] touch-manipulation"
            >
              <option value="dine_in">Dine-in</option>
              <option value="pickup">Take-out</option>
              <option value="delivery">Delivery</option>
            </select>
            {orderForm.order_type === "pickup" && (
              <p className="text-xs text-[#ababab] mt-1">
                ₱{PACKAGING_FEE_PER_BOX} per box for packaging
              </p>
            )}
          </div>

          {/* Packaging Boxes */}
          {orderForm.order_type === "pickup" && (
            <div className="w-full lg:w-44 flex-shrink-0">
              <label className="block text-xs font-semibold text-[#ababab] mb-1">
                Packaging Boxes
              </label>
              <input
                type="number"
                min="0"
                value={
                  orderForm.packaging_boxes === ""
                    ? ""
                    : orderForm.packaging_boxes
                }
                onChange={(e) => handlePackagingBoxesChange(e.target.value)}
                className="w-full px-3 md:px-4 py-2 md:py-3 bg-[#181818] border-2 border-[#353535] rounded-lg text-base md:text-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] touch-manipulation"
                placeholder="0"
              />
              <p className="text-xs text-[#ababab] mt-1">
                Total packaging fee: {formatCurrency(calculatePackagingFee())}
              </p>
            </div>
          )}

          {isDeliveryOrder && (
            <div className="w-full sm:w-auto flex-shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowDeliveryModal(true)}
                className="px-4 py-2 bg-[#4ec57a] hover:bg-[#46ac6b] text-[#0b210f] rounded-lg font-semibold text-sm shadow-md touch-manipulation w-full sm:w-auto"
              >
                Delivery Details
              </button>
            </div>
          )}

          {/* Payment Method - Large Touch Select */}
          <div className="w-full sm:w-auto lg:min-w-[200px] flex-shrink-0">
            <label className="block text-xs font-semibold text-[#ababab] mb-1">
              Payment Method
            </label>
            <select
              value={orderForm.payment_method}
              onChange={(e) => {
                setOrderForm((prev) => ({
                  ...prev,
                  payment_method: e.target.value,
                }));
                if (e.target.value === "cash") setShowCashPayment(true);
                else {
                  setShowCashPayment(false);
                  setCashAmount("");
                }
              }}
              className="w-full px-3 md:px-4 py-2 md:py-3 bg-[#181818] border-2 border-[#353535] rounded-lg text-base md:text-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] touch-manipulation"
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
            </select>
          </div>

          {/* Refresh Button - Desktop */}
          <button
            onClick={fetchMenuItems}
            className="hidden lg:flex px-5 py-3 bg-[#f6b100] text-[#1f1f1f] rounded-lg hover:bg-[#dab000] transition-colors font-bold text-sm shadow-lg touch-manipulation flex-shrink-0"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Main POS Layout - Jollibee Style */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left Side - Menu Items */}
        <div className="w-full lg:w-[60%] border-r-0 lg:border-r-2 border-b-2 lg:border-b-0 border-[#383838] flex flex-col bg-[#181818] overflow-hidden">
          {/* Category & Search Bar */}
          <div className="p-2 sm:p-3 md:p-4 flex-shrink-0 bg-[#181818] border-b-2 border-[#383838] overflow-x-auto">
            {/* Category Pills - Large Touch Buttons */}
            <div className="flex flex-wrap gap-2 mb-3 min-w-max sm:min-w-0">
              {categories.map((cat, i) => (
                <button
                  key={cat + i}
                  className={`px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl font-bold transition-all duration-200 text-sm sm:text-base shadow-lg border-2 focus:outline-none touch-manipulation min-h-[44px] sm:min-h-[48px] whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-[#f6b100] text-[#1f1f1f] border-[#f6b100]"
                      : "bg-[#232323] text-[#ababab] border-[#353535] active:bg-[#353535] active:text-[#f6b100]"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input - Large Touch */}
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#ababab]"
              />
              <input
                type="text"
                placeholder="Search menu items..."
                value={menuSearchTerm}
                onChange={(e) => setMenuSearchTerm(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-[#232323] border-2 border-[#353535] rounded-xl text-base sm:text-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] shadow touch-manipulation"
              />
            </div>
          </div>

          {/* Scrollable Menu Grid - Large Touch Buttons */}
          <div className="flex-1 p-2 sm:p-3 md:p-4 overflow-y-auto overflow-x-hidden">
            {menuItemsLoading ? (
              <div className="flex justify-center items-center py-16">
                <RefreshCw size={32} className="animate-spin text-[#f6b100]" />
                <span className="ml-3 text-lg sm:text-xl text-[#f5f5f5]">
                  Loading menu items...
                </span>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#ababab] mb-4 text-base sm:text-lg">
                  No available menu items found
                </p>
                <button
                  onClick={fetchMenuItems}
                  className="px-6 py-3 bg-[#f6b100] text-[#1f1f1f] rounded-xl font-bold hover:bg-[#dab000] transition-colors shadow-lg touch-manipulation"
                >
                  <RefreshCw size={20} className="inline mr-2" />
                  Refresh Menu
                </button>
              </div>
            ) : getFilteredMenuItems().length === 0 ? (
              <div className="text-center py-16">
                <Search size={64} className="mx-auto text-[#383838] mb-4" />
                <p className="text-[#ababab] mb-2 text-base sm:text-lg">
                  No menu items found
                </p>
                {menuSearchTerm && (
                  <button
                    onClick={() => setMenuSearchTerm("")}
                    className="mt-4 px-4 py-2 text-base text-[#f6b100] hover:underline touch-manipulation"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {getFilteredMenuItems().map((item, index) => {
                  const itemQuantity =
                    orderForm.order_items.find(
                      (orderItem) => orderItem.menu_item_id === item._id
                    )?.quantity || 0;
                  const availableServings =
                    item.availableServings || item.servings || 0;
                  const stockStatus = getStockStatus(availableServings);
                  const isOutOfStock = stockStatus.level === "none";

                  return (
                    <button
                      key={item._id || index}
                      disabled={isOutOfStock}
                      className={`relative rounded-xl overflow-hidden shadow-lg transition-all flex flex-col border-2 touch-manipulation active:scale-95 w-full ${stockStatus.cardClass}`}
                      onClick={() => !isOutOfStock && addItemToOrder(item)}
                    >
                      {/* Image Section */}
                      <div className="relative h-32 sm:h-40 md:h-48 w-full overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-[#2f2f2f] flex flex-col items-center justify-center text-[#ababab] gap-2">
                            <Utensils className="w-8 h-8 text-[#383838]" />
                            <span className="text-xs">No image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1f1f1f] via-transparent to-transparent pointer-events-none" />

                        {/* Category Badge */}
                        <div className="absolute top-2 left-2 bg-[#1f1f1f]/70 backdrop-blur-md rounded-full px-2 sm:px-3 py-1 text-xs font-medium text-white uppercase tracking-wide">
                          {item.category || "Misc"}
                        </div>

                        {/* Price Badge */}
                        <div className="absolute top-2 right-2 text-white text-sm sm:text-base font-semibold bg-[#C05050]/80 rounded-full px-2 sm:px-3 py-1">
                          {formatCurrency(item.price || 0)}
                        </div>

                        {/* Quantity badge */}
                        {itemQuantity > 0 && (
                          <div className="absolute bottom-2 right-2 bg-[#f6b100] text-[#232323] rounded-full w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center text-sm sm:text-base md:text-lg font-bold shadow-lg border-2 border-[#383838] z-10">
                            {itemQuantity}
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                        <div className="text-center w-full">
                          <h5 className="font-bold text-base sm:text-lg text-[#f5f5f5] mb-1 sm:mb-2 line-clamp-2">
                            {item.name || "No name"}
                          </h5>
                          <div className="mt-1 sm:mt-2">
                            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                              <span className="text-xs sm:text-sm text-[#ababab]">
                                Stock:
                              </span>
                              <span
                                className={`font-bold text-sm sm:text-base ${stockStatus.textClass}`}
                              >
                                {availableServings}
                              </span>
                            </div>
                            {stockStatus.label && (
                              <span
                                className={`inline-block px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold rounded-lg ${stockStatus.badgeClass}`}
                              >
                                {stockStatus.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Order Summary & Payment */}
        <div className="w-full lg:w-[40%] flex flex-col bg-[#232323] overflow-hidden h-[50vh] lg:h-auto">
          {/* Order Items List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 min-h-0">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#f5f5f5] mb-1 sm:mb-2">
                Current Order
              </h2>
              <div className="text-xs sm:text-sm text-[#ababab]">
                {orderForm.order_items.length} item(s)
              </div>
              {orderForm.order_type === "pickup" && (
                <div className="text-xs sm:text-sm text-[#92ecb3] mt-1">
                  Take-out boxes: {packagingBoxes} x ₱{PACKAGING_FEE_PER_BOX} ={" "}
                  {formatCurrency(calculatePackagingFee())}
                </div>
              )}
              {isDeliveryOrder && (
                <div className="text-xs sm:text-sm text-[#92d5ff] mt-1">
                  Delivery:{" "}
                  {hasDeliveryQuote
                    ? `${deliveryDistanceKm.toFixed(2)} km • ${formatCurrency(
                        deliveryFee
                      )}`
                    : "Pending address / fee"}
                </div>
              )}
            </div>

            {orderForm.order_items.length === 0 ? (
              <div className="text-center text-[#ababab] py-8 sm:py-12 md:py-16">
                <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">
                  🛒
                </div>
                <p className="text-lg sm:text-xl">No items in order</p>
                <p className="text-xs sm:text-sm mt-2">Tap menu items to add</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {orderForm.order_items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-[#262626] text-[#f5f5f5] p-3 sm:p-4 rounded-xl border-2 border-[#383838] shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs sm:text-sm font-bold text-[#ababab] flex-shrink-0">
                            #{index + 1}
                          </span>
                          <h3 className="font-bold text-base sm:text-lg text-[#f5f5f5] line-clamp-2">
                            {item.item_name}
                          </h3>
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-[#f6b100]">
                          {formatCurrency(item.total_price)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItemFromOrder(index)}
                        className="p-2 bg-[#353535] hover:bg-[#ff4747] text-white rounded-lg transition-colors touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center flex-shrink-0 ml-2"
                        title="Remove item"
                      >
                        <Trash2 size={18} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    {/* Large Quantity Controls */}
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <button
                        onClick={() =>
                          updateItemQuantity(index, item.quantity - 1)
                        }
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-[#353535] hover:bg-[#ff4747] text-white rounded-xl transition-colors font-bold text-lg sm:text-xl touch-manipulation min-h-[44px] sm:min-h-[52px] flex items-center justify-center"
                        title="Decrease quantity"
                      >
                        <Minus size={20} className="sm:w-6 sm:h-6" />
                      </button>
                      <div className="px-4 sm:px-6 py-2 sm:py-3 bg-[#181818] rounded-xl min-w-[60px] sm:min-w-[80px] text-center">
                        <span className="text-2xl sm:text-3xl font-bold text-[#f5f5f5]">
                          {item.quantity}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          updateItemQuantity(index, item.quantity + 1)
                        }
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-[#353535] hover:bg-[#4ec57a] text-white rounded-xl transition-colors font-bold text-lg sm:text-xl touch-manipulation min-h-[44px] sm:min-h-[52px] flex items-center justify-center"
                        title="Increase quantity"
                      >
                        <Plus size={20} className="sm:w-6 sm:h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fixed Bottom - Actions */}
          <div className="border-t-2 border-[#383838] bg-[#181818] p-3 sm:p-4 flex-shrink-0">
            {/* Clear All Button */}
            {orderForm.order_items.length > 0 && (
              <button
                onClick={() =>
                  setOrderForm((prev) => ({ ...prev, order_items: [] }))
                }
                className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-[#ff4747] text-white rounded-xl font-bold text-base sm:text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-[#c0392b] transition-colors mb-3 sm:mb-4 touch-manipulation min-h-[44px] sm:min-h-[52px]"
              >
                <Trash2 size={18} className="sm:w-5 sm:h-5" />
                <span>Clear All Items</span>
              </button>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => {
                  if (!hasCustomerName || !hasOrderItems) {
                    toast.error("Please fill in customer name and add items");
                    return;
                  }
                  if (!ensureDeliveryDetails()) {
                    return;
                  }
                  setShowPaymentModal(true);
                }}
                disabled={!canOpenPaymentModal}
                className={`w-full px-4 sm:px-6 py-3 sm:py-4 md:py-5 rounded-xl font-bold flex items-center justify-center text-lg sm:text-xl md:text-2xl shadow-lg transition-all duration-200 touch-manipulation min-h-[56px] sm:min-h-[64px] md:min-h-[72px] ${
                  !canOpenPaymentModal
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-[#f6b100] text-[#1f1f1f] hover:bg-[#dab000] active:scale-95"
                }`}
              >
                <span className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl">
                  PAY & COMPLETE ORDER
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Details Modal */}
      {isDeliveryOrder && showDeliveryModal && (
        <div className="fixed inset-0 z-40 p-4 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onClick={() => setShowDeliveryModal(false)}
          ></div>
          <div className="relative bg-[#232323] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-[#383838]">
            <div className="bg-[#1f1f1f] p-4 sm:p-6 border-b-2 border-[#383838] flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#f5f5f5]">
                Delivery Details
              </h2>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-[#ababab] hover:text-[#f6b100] p-2 hover:bg-[#353535] rounded-lg transition-all touch-manipulation"
              >
                <XCircle size={28} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#ababab] mb-2">
                  Customer Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={orderForm.customer_phone}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      customer_phone: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-[#181818] border-2 border-[#353535] rounded-xl text-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] touch-manipulation"
                  placeholder="09XX XXX XXXX"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-[#ababab]">
                  Delivery Address (Marinduque Province){" "}
                  <span className="text-red-400">*</span>
                </label>
                <div>
                  <label className="block text-xs text-[#ababab] mb-1">
                    Street / Lot / House No.
                  </label>
                  <input
                    type="text"
                    value={deliveryStreetAddress}
                    onChange={(e) => setDeliveryStreetAddress(e.target.value)}
                    placeholder="e.g. 123 Main St."
                    className="w-full px-4 py-3 bg-[#181818] border-2 border-[#353535] rounded-xl text-base text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#ababab] mb-1">
                    City / Municipality
                  </label>
                  <select
                    value={deliveryCityCode}
                    onChange={(e) => handleDeliveryCityChange(e.target.value)}
                    disabled={
                      deliveryAddressLoading || deliveryCityList.length === 0
                    }
                    className="w-full px-4 py-3 bg-[#181818] border-2 border-[#353535] rounded-xl text-base text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select City / Municipality</option>
                    {deliveryCityList.map((city) => {
                      const cityCodeValue =
                        city.code || city.city_code || city.municipality_code;
                      const cityName =
                        city.name ||
                        city.city_name ||
                        city.municipality_name ||
                        "City";
                      return (
                        <option
                          key={cityCodeValue || cityName}
                          value={cityCodeValue}
                          className="bg-[#1f1f1f]"
                        >
                          {cityName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#ababab] mb-1">
                    Barangay
                  </label>
                  <select
                    value={deliveryBarangayCode}
                    onChange={(e) =>
                      handleDeliveryBarangayChange(e.target.value)
                    }
                    disabled={deliveryAddressLoading || !deliveryCityCode}
                    className="w-full px-4 py-3 bg-[#181818] border-2 border-[#353535] rounded-xl text-base text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!deliveryCityCode
                        ? "Select city first"
                        : deliveryAddressLoading
                        ? "Loading barangays..."
                        : deliveryBarangayList.length === 0
                        ? "No barangays available"
                        : "Select Barangay"}
                    </option>
                    {deliveryBarangayList.map((barangay, index) => {
                      const barangayCodeValue =
                        barangay.code ||
                        barangay.barangay_code ||
                        barangay.brgy_code ||
                        `brgy_${index}`;
                      const barangayName =
                        barangay.name ||
                        barangay.barangay_name ||
                        barangay.brgy_name ||
                        `Barangay ${index + 1}`;
                      return (
                        <option
                          key={barangayCodeValue || `brgy_${index}`}
                          value={barangayCodeValue}
                          className="bg-[#1f1f1f]"
                        >
                          {barangayName}
                        </option>
                      );
                    })}
                  </select>
                  {deliveryCityCode &&
                    deliveryBarangayList.length === 0 &&
                    !deliveryAddressLoading && (
                      <p className="text-xs text-yellow-400 mt-1">
                        No barangays found for this city. Please double-check
                        the selection.
                      </p>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#ababab] mb-1">
                      Province
                    </label>
                    <input
                      type="text"
                      value="Marinduque"
                      disabled
                      className="w-full px-4 py-3 bg-[#181818]/60 border-2 border-[#353535] rounded-xl text-base text-[#f5f5f5]/70 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#ababab] mb-1">
                      Region
                    </label>
                    <input
                      type="text"
                      value="MIMAROPA"
                      disabled
                      className="w-full px-4 py-3 bg-[#181818]/60 border-2 border-[#353535] rounded-xl text-base text-[#f5f5f5]/70 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#ababab] mb-1">
                    Address Preview
                  </label>
                  <div className="w-full px-4 py-3 bg-[#1b1b1b] border-2 border-[#353535] rounded-xl text-sm text-[#f5f5f5] min-h-[52px] flex items-center">
                    {deliveryAddressPreview}
                  </div>
                  {!isDeliveryAddressComplete && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Fill in street, city, and barangay to complete the
                      address.
                    </p>
                  )}
                </div>
                {deliveryAddressLoading && (
                  <p className="text-xs text-[#ababab]">
                    Loading address data…
                  </p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeliveryFeeCalculation}
                    disabled={
                      deliveryFeeStatus.loading || !isDeliveryAddressComplete
                    }
                    className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-lg flex items-center justify-center gap-2 touch-manipulation ${
                      deliveryFeeStatus.loading || !isDeliveryAddressComplete
                        ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                        : "bg-[#4ec57a] text-[#1f1f1f] hover:bg-[#46ac6b]"
                    }`}
                  >
                    {deliveryFeeStatus.loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      "Calculate Delivery Fee"
                    )}
                  </button>
                  <div className="text-xs text-[#92ecb3]">
                    {hasDeliveryQuote
                      ? `Distance: ${deliveryDistanceKm.toFixed(
                          2
                        )} km • Fee: ${formatCurrency(deliveryFee)}`
                      : "Distance not calculated yet"}
                  </div>
                </div>
                {deliveryFeeStatus.error && (
                  <p className="text-xs text-red-400 mt-2">
                    {deliveryFeeStatus.error}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    if (!orderForm.customer_phone?.trim()) {
                      toast.error("Please enter the customer's phone number");
                      return;
                    }
                    if (!isDeliveryAddressComplete) {
                      toast.error(
                        "Please complete the delivery address fields"
                      );
                      return;
                    }
                    setShowDeliveryModal(false);
                  }}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-lg shadow-lg touch-manipulation bg-[#f6b100] text-[#1f1f1f] hover:bg-[#dab000]"
                >
                  Save & Close
                </button>
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-lg shadow-lg touch-manipulation bg-[#353535] text-[#f5f5f5] hover:bg-[#454545] border-2 border-[#383838]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
          {/* Blurred Background Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          ></div>
          {/* Modal Content */}
          <div className="relative bg-[#232323] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-[#383838]">
            {/* Modal Header */}
            <div className="bg-[#1f1f1f] p-4 sm:p-6 border-b-2 border-[#383838] flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#f5f5f5]">
                Payment
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setCashAmount("");
                }}
                className="text-[#ababab] hover:text-[#f6b100] p-2 hover:bg-[#353535] rounded-lg transition-all touch-manipulation"
              >
                <XCircle size={28} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Order Summary */}
              <div className="bg-[#181818] rounded-xl p-4 border-2 border-[#383838]">
                <h3 className="text-lg font-bold text-[#f5f5f5] mb-3">
                  Order Summary
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {orderForm.order_items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-[#ababab]">
                        {item.quantity}x {item.item_name}
                      </span>
                      <span className="text-[#f5f5f5] font-semibold">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-[#ababab]">
                    <span>Subtotal</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateSubtotal())}
                    </span>
                  </div>
                  {calculateDiscountAmount() > 0 && (
                    <div className="flex items-center justify-between text-[#f6b100]">
                      <span>Discount ({getDiscountLabel()})</span>
                      <span className="font-semibold">
                        - {formatCurrency(calculateDiscountAmount())}
                      </span>
                    </div>
                  )}
                  {orderForm.order_type === "pickup" && (
                    <div className="flex items-center justify-between text-[#92ecb3]">
                      <span>
                        Packaging ({packagingBoxes} x ₱{PACKAGING_FEE_PER_BOX})
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(calculatePackagingFee())}
                      </span>
                    </div>
                  )}
                  {isDeliveryOrder && (
                    <div className="flex items-center justify-between text-[#92d5ff]">
                      <span>
                        Delivery (
                        {hasDeliveryQuote
                          ? `${deliveryDistanceKm.toFixed(2)} km`
                          : "pending"}
                        )
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(deliveryFee)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t-2 border-[#383838] mt-4 pt-4 flex justify-between items-center">
                  <span className="text-xl font-bold text-[#ababab]">
                    Total:
                  </span>
                  <span className="text-3xl font-bold text-[#f6b100]">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-[#ababab] mb-2">
                  Payment Method
                </label>
                <select
                  value={orderForm.payment_method}
                  onChange={(e) => {
                    setOrderForm((prev) => ({
                      ...prev,
                      payment_method: e.target.value,
                    }));
                    if (e.target.value === "cash") {
                      setShowCashPayment(true);
                    } else {
                      setShowCashPayment(false);
                      setCashAmount("");
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#181818] border-2 border-[#353535] rounded-xl text-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] touch-manipulation"
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                </select>
              </div>

              {/* Discount Selection */}
              <div>
                <label className="block text-sm font-semibold text-[#ababab] mb-2">
                  Discount (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {discountOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setOrderForm((prev) => ({
                          ...prev,
                          discount_type: option.value,
                          discount_id_number:
                            option.value === "none"
                              ? ""
                              : prev.discount_id_number,
                        }))
                      }
                      className={`p-3 rounded-xl border-2 text-left transition-all duration-200 touch-manipulation ${
                        orderForm.discount_type === option.value
                          ? "bg-[#f6b100] text-[#1f1f1f] border-[#f6b100]"
                          : "bg-[#181818] text-[#f5f5f5] border-[#353535] hover:border-[#f6b100]"
                      }`}
                    >
                      <div className="font-bold text-base">{option.label}</div>
                      <div className="text-xs text-[#ababab]">
                        {option.helper}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#ababab] mt-2">
                  Apply discount for qualified PWD or Senior customers upon
                  presenting a valid ID.
                </p>

                {/* ID Number Input - Show when PWD or Senior discount is selected */}
                {(orderForm.discount_type === "pwd" ||
                  orderForm.discount_type === "senior") && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-[#ababab] mb-2">
                      ID Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={orderForm.discount_id_number}
                      onChange={(e) =>
                        setOrderForm((prev) => ({
                          ...prev,
                          discount_id_number: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-[#181818] border-2 border-[#353535] rounded-xl text-base text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] touch-manipulation"
                      placeholder={`Enter ${
                        orderForm.discount_type === "pwd" ? "PWD" : "Senior"
                      } ID number`}
                      required
                    />
                    <p className="text-xs text-[#ababab] mt-1">
                      Please enter the{" "}
                      {orderForm.discount_type === "pwd" ? "PWD" : "Senior"} ID
                      number
                    </p>
                  </div>
                )}
              </div>

              {/* Cash Payment Inputs */}
              {orderForm.payment_method === "cash" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#ababab] mb-2">
                      Cash Received:
                    </label>
                    <input
                      type="text"
                      value={cashAmount}
                      onChange={(e) => handleCashAmountChange(e.target.value)}
                      className="w-full px-4 py-4 bg-[#181818] border-2 border-[#353535] rounded-xl text-2xl text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] touch-manipulation font-semibold text-center"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#ababab] mb-2">
                      Change:
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(Math.max(0, calculateChange()))}
                      readOnly
                      className={`w-full px-4 py-4 border-2 rounded-xl font-bold text-2xl touch-manipulation text-center ${
                        calculateChange() >= 0
                          ? "bg-[#222d23] border-[#2d6222] text-[#92ecb3]"
                          : "bg-[#2e2020] border-[#a12c2c] text-[#ffb1b1]"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-semibold text-[#ababab] mb-2">
                  Notes (Optional):
                </label>
                <input
                  type="text"
                  value={orderForm.notes}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-[#181818] border-2 border-[#353535] rounded-xl text-base text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] touch-manipulation"
                  placeholder="Special instructions..."
                />
              </div>

              {/* Modal Actions */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={async () => {
                    if (
                      orderForm.payment_method === "cash" &&
                      !isCashPaymentValid()
                    ) {
                      toast.error(
                        "Cash amount must be greater than or equal to total amount"
                      );
                      return;
                    }
                    if (!isDiscountValid()) {
                      toast.error(
                        "Please enter a valid ID number for discount"
                      );
                      return;
                    }
                    if (!isDeliveryInfoComplete) {
                      toast.error("Please complete delivery details first");
                      return;
                    }
                    setShowConfirmOrderModal(true);
                  }}
                  disabled={
                    isCreatingOrder ||
                    (orderForm.payment_method === "cash" &&
                      !isCashPaymentValid()) ||
                    !isDiscountValid() ||
                    !isDeliveryInfoComplete
                  }
                  className={`w-full px-6 py-5 rounded-xl font-bold flex items-center justify-center text-2xl shadow-lg transition-all duration-200 touch-manipulation min-h-[72px] ${
                    isCreatingOrder ||
                    (orderForm.payment_method === "cash" &&
                      !isCashPaymentValid()) ||
                    !isDiscountValid() ||
                    !isDeliveryInfoComplete
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-[#f6b100] text-[#1f1f1f] hover:bg-[#dab000] active:scale-95"
                  }`}
                >
                  {isCreatingOrder ? (
                    <>
                      <RefreshCw size={28} className="animate-spin mr-3" />
                      Processing...
                    </>
                  ) : orderForm.payment_method === "cash" &&
                    !isCashPaymentValid() ? (
                    "Insufficient Cash"
                  ) : !isDiscountValid() ? (
                    "Enter ID Number"
                  ) : !isDeliveryInfoComplete ? (
                    "Complete Delivery Details"
                  ) : (
                    "CONFIRM PAYMENT"
                  )}
                </button>
                <button
                  onClick={printReceipt}
                  disabled={
                    isPrintingReceipt || orderForm.order_items.length === 0
                  }
                  className={`w-full px-6 py-4 rounded-xl font-bold flex items-center justify-center text-lg shadow-lg transition-all touch-manipulation min-h-[60px] ${
                    isPrintingReceipt || orderForm.order_items.length === 0
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-[#232323] text-[#f5f5f5] hover:bg-[#333333] active:scale-95 border-2 border-[#383838]"
                  }`}
                >
                  {isPrintingReceipt ? (
                    <>
                      <RefreshCw
                        size={18}
                        className="sm:w-5 sm:h-5 animate-spin mr-2"
                      />
                      <span className="text-sm sm:text-base">Printing...</span>
                    </>
                  ) : (
                    <span className="text-sm sm:text-base md:text-lg">
                      Print Receipt
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setCashAmount("");
                  }}
                  className="w-full px-6 py-4 rounded-xl font-bold flex items-center justify-center text-lg shadow-lg transition-all touch-manipulation min-h-[60px] bg-[#353535] text-[#f5f5f5] hover:bg-[#454545] active:scale-95 border-2 border-[#383838]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place Order Confirmation Modal */}
      {showPaymentModal && showConfirmOrderModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl bg-[#232323] border-2 border-[#383838] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-2">
              Confirm Order
            </h2>
            <p className="text-sm text-[#ababab] mb-4">
              Are you sure you want to place this order for{" "}
              <span className="font-semibold text-[#f6b100]">
                {formatCurrency(calculateTotal())}
              </span>
              ?
            </p>
            <p className="text-xs text-[#777] mb-6">
              Please make sure all items, discounts, payment, and delivery
              details are correct before continuing.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmOrderModal(false)}
                className="px-4 py-2 rounded-md border border-[#383838] text-[#b5b5b5] hover:text-white hover:border-[#f5f5f5] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const success = await createOrder();
                  if (success) {
                    setShowConfirmOrderModal(false);
                    setShowPaymentModal(false);
                    setCashAmount("");
                  }
                }}
                disabled={isCreatingOrder}
                className="px-4 py-2 rounded-md bg-[#f6b100] text-[#1f1f1f] hover:bg-[#dab000] transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreatingOrder ? "Placing..." : "Yes, Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pos;
