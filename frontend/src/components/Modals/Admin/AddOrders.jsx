import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { XCircle, Plus, Minus, Trash2, RefreshCw, Search } from "lucide-react";

const AddOrders = ({
  isOpen,
  onClose,
  onOrderCreated,
  menuItems = [],
  menuItemsLoading = false,
  onFetchMenuItems,
  onCreateTestMenuData,
  onDebugDatabase,
  onForceTestData,
}) => {
  const [orderForm, setOrderForm] = useState({
    customer_name: "",
    table_number: "",
    notes: "",
    payment_method: "cash",
    order_items: [],
  });
  const [cashAmount, setCashAmount] = useState("");
  const [showCashPayment, setShowCashPayment] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const [tableStatus, setTableStatus] = useState(null);
  const [checkingTable, setCheckingTable] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Check table availability
  const checkTableAvailability = async (tableNumber) => {
    if (!tableNumber) return;

    setCheckingTable(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE}/orders/tables/${tableNumber}/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const status = await response.json();
        setTableStatus(status);

        if (!status.available) {
          toast.error(
            `Table ${tableNumber} is occupied by ${status.customer} (Status: ${status.status})`
          );
        }
      }
    } catch (error) {
      console.error("Error checking table status:", error);
    } finally {
      setCheckingTable(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
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

  // Calculate total amount
  const calculateTotal = () => {
    return orderForm.order_items.reduce(
      (total, item) => total + item.total_price,
      0
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
      if (
        !orderForm.customer_name ||
        !orderForm.table_number ||
        orderForm.order_items.length === 0
      ) {
        toast.error(
          "Please fill in all required fields and add at least one item"
        );
        return;
      }

      // Validate cash payment if payment method is cash
      if (orderForm.payment_method === "cash" && !isCashPaymentValid()) {
        toast.error(
          "Cash amount must be greater than or equal to total amount"
        );
        return;
      }

      setIsCreatingOrder(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (
          errorData.message &&
          errorData.message.includes("currently occupied")
        ) {
          toast.error(errorData.message);
          // Update table status if provided
          if (errorData.tableStatus) {
            setTableStatus(errorData.tableStatus);
          }
          return;
        }
        throw new Error("Failed to create order");
      }

      toast.success("Order created successfully");
      handleClose();
      onOrderCreated && onOrderCreated();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Handle close modal
  const handleClose = () => {
    setOrderForm({
      customer_name: "",
      table_number: "",
      notes: "",
      payment_method: "cash",
      order_items: [],
    });
    setCashAmount("");
    setShowCashPayment(false);
    onClose();
  };

  // Print receipt function
  const printReceipt = async () => {
    if (orderForm.order_items.length === 0) {
      toast.error("No items to print");
      return;
    }

    setIsPrintingReceipt(true);

    try {
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
            <div><strong>Table:</strong> ${
              orderForm.table_number || "N/A"
            }</div>
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
              <span>${formatCurrency(calculateTotal())}</span>
            </div>
            <div class="total-line">
              <span>Tax (0%):</span>
              <span>${formatCurrency(0)}</span>
            </div>
            <div class="total-amount">
              <span>TOTAL:</span>
              <span>${formatCurrency(calculateTotal())}</span>
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

  // Initialize cash payment state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowCashPayment(orderForm.payment_method === "cash");
    }
  }, [isOpen, orderForm.payment_method]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 dark">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-5xl h-[90vh] border border-[#383838] shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="px-10 py-5 border-b border-[#383838] flex justify-between items-center bg-[#262626] rounded-t-2xl">
          <h3 className="text-2xl font-bold text-[#f5f5f5] tracking-wide">
            Place Order
          </h3>
          <button
            onClick={handleClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg transition-all"
          >
            <XCircle size={28} />
          </button>
        </div>

        {/* Main POS Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left - Menu Items */}
          <div className="w-1/3 border-r border-[#383838] p-6 overflow-y-auto bg-[#181818]">
            <h4 className="text-xl font-semibold text-[#f5f5f5] mb-4">
              Menu Items
            </h4>
            {/* Category selection UI */}
            <div className="flex flex-wrap gap-3 mb-6">
              {categories.map((cat, i) => (
                <button
                  key={cat + i}
                  className={`px-5 py-2 rounded-full font-bold transition-all duration-200 text-sm shadow-lg border-2 focus:outline-none ${
                    selectedCategory === cat
                      ? "bg-[#f6b100] text-[#1f1f1f] border-[#f6b100]"
                      : "bg-[#232323] text-[#ababab] border-[#353535] hover:bg-[#353535] hover:text-[#f6b100]"
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="mb-6 relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ababab]"
              />
              <input
                type="text"
                placeholder="Search menu items..."
                value={menuSearchTerm}
                onChange={(e) => setMenuSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-[#232323] border border-[#353535] rounded-lg text-sm text-[#f5f5f5] ring-0 focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab] shadow"
              />
              {menuSearchTerm && (
                <div className="mt-2 text-xs text-[#ababab]">
                  {getFilteredMenuItems().length} of {menuItems.length} items
                  found
                </div>
              )}
            </div>

            {menuItemsLoading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw size={26} className="animate-spin text-[#f6b100]" />
                <span className="ml-2 text-[#f5f5f5]">
                  Loading menu items...
                </span>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#ababab] mb-4">
                  No available menu items found
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={onFetchMenuItems}
                    className="px-4 py-2 bg-[#f6b100] text-[#1f1f1f] rounded-lg font-semibold hover:bg-[#dab000] transition-colors text-sm shadow-lg"
                  >
                    Retry
                  </button>
                  <button
                    onClick={onCreateTestMenuData}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm shadow-lg"
                  >
                    Create Test Data
                  </button>
                  <button
                    onClick={onDebugDatabase}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm shadow-lg"
                  >
                    Debug DB
                  </button>
                  <button
                    onClick={onForceTestData}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm shadow-lg"
                  >
                    Force Test
                  </button>
                </div>
              </div>
            ) : getFilteredMenuItems().length === 0 ? (
              <div className="text-center py-8">
                <Search size={48} className="mx-auto text-[#383838] mb-4" />
                <p className="text-[#ababab] mb-2">No menu items found</p>
                <p className="text-sm text-[#383838]">
                  Try adjusting your search terms
                </p>
                {menuSearchTerm && (
                  <button
                    onClick={() => setMenuSearchTerm("")}
                    className="mt-2 px-3 py-1 text-sm text-[#f6b100] hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {getFilteredMenuItems().map((item, index) => {
                  const itemQuantity =
                    orderForm.order_items.find(
                      (orderItem) => orderItem.menu_item_id === item._id
                    )?.quantity || 0;
                  const availableServings =
                    item.availableServings || item.servings || 0;
                  const isOutOfStock = availableServings <= 0;
                  const isLowStock =
                    availableServings <= 2 && availableServings > 0;

                  return (
                    <div
                      key={item._id || index}
                      className={`relative rounded-lg p-4 min-h-[100px] shadow cursor-pointer transition-colors flex flex-col justify-between border-2 ${
                        isOutOfStock
                          ? "bg-[#353535] border-[#383838] text-[#ababab] opacity-50 cursor-not-allowed"
                          : isLowStock
                          ? "bg-[#38301b] border-yellow-600"
                          : "bg-[#262626] border-[#383838] hover:border-[#f6b100]"
                      }`}
                      onClick={() => !isOutOfStock && addItemToOrder(item)}
                    >
                      {/* Quantity badge */}
                      {itemQuantity > 0 && (
                        <div className="absolute top-2 right-2 bg-[#f6b100] text-[#232323] rounded-full w-7 h-7 flex items-center justify-center text-base font-bold shadow border-2 border-[#383838]">
                          {itemQuantity}
                        </div>
                      )}
                      <div className="text-center">
                        <h5 className="font-medium text-base text-[#f5f5f5] mb-1 truncate">
                          {item.name || "No name"}
                        </h5>
                        <p className="text-sm text-[#f6b100] font-semibold">
                          {formatCurrency(item.price || 0)}
                        </p>
                        <div className="mt-1 text-xs">
                          <p>Servings: {availableServings}</p>
                          {isOutOfStock && (
                            <span className="inline-block mt-1 px-2 py-1 bg-[#313131] text-red-400 text-xs font-bold rounded">
                              OUT OF STOCK
                            </span>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <span className="inline-block mt-1 px-2 py-1 bg-[#50440a] text-[#f6b100] text-xs font-bold rounded">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Middle - Order Summary */}
          <div className="w-1/3 border-r border-[#383838] flex flex-col bg-[#232323]">
            <div className="bg-[#181818] px-6 py-4 border-b border-[#383838]">
              <div className="grid grid-cols-4 gap-2 text-base font-bold text-[#ababab]">
                <div>ID</div>
                <div>Item</div>
                <div>Qty</div>
                <div>Price</div>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {orderForm.order_items.length === 0 ? (
                <div className="text-center text-[#ababab] py-8">
                  No items in order
                </div>
              ) : (
                <div className="space-y-3">
                  {orderForm.order_items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-2 text-base bg-[#262626] text-[#f5f5f5] p-3 rounded-lg border border-[#383838] shadow"
                    >
                      <div>#{index + 1}</div>
                      <div className="font-medium truncate">
                        {item.item_name}
                      </div>
                      <div className="text-center">{item.quantity}</div>
                      <div className="text-right font-semibold text-[#f6b100]">
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[#383838]">
              <button
                onClick={() =>
                  setOrderForm((prev) => ({ ...prev, order_items: [] }))
                }
                className="w-full px-5 py-3 bg-[#ff4747] text-white rounded-lg font-semibold hover:bg-[#c0392b] transition shadow-sm"
                disabled={orderForm.order_items.length === 0}
              >
                Delete All
              </button>
            </div>
          </div>

          {/* Right - Receipt Preview & Payment */}
          <div className="w-1/3 p-6 bg-[#1f1f1f] overflow-y-auto">
            <div className="bg-[#232323] border border-[#383838] rounded-xl p-6 shadow-lg">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#f5f5f5]">
                  POBLACION PARES
                </h3>
                <p className="text-xs text-[#ababab]">
                  Cleofas, Jamie James Ramos-Prop
                </p>
                <p className="text-xs text-[#ababab]">
                  Villa Mendez (Pob.), Mogpog, Marinduque
                </p>
                <div className="border-t border-[#353535] my-2"></div>
              </div>
              {/* Receipt Table */}
              <div className="mb-4">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-[#ababab] border-b border-[#353535] pb-1">
                  <div>Item</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Unit Price</div>
                  <div className="text-right">Amount</div>
                </div>
                {orderForm.order_items.length === 0 ? (
                  <div className="text-center text-[#ababab] py-4 text-sm">
                    No items
                  </div>
                ) : (
                  <div className="space-y-1 mt-3">
                    {orderForm.order_items.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-4 gap-2 text-xs text-[#f5f5f5]"
                      >
                        <div className="truncate">{item.item_name}</div>
                        <div className="text-center">{item.quantity}</div>
                        <div className="text-right">
                          {formatCurrency(item.price)}
                        </div>
                        <div className="text-right font-bold">
                          {formatCurrency(item.total_price)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-[#383838] mt-3 pt-3">
                  <div className="flex justify-between items-center font-bold text-base">
                    <span>Total:</span>
                    <span className="text-[#f6b100]">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
              {/* Payment Section */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-medium text-[#ababab] mb-1">
                    Total:
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(calculateTotal())}
                    readOnly
                    className="w-full px-3 py-2 bg-[#181818] border border-[#353535] rounded-lg text-[#f5f5f5] font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#ababab] mb-1">
                    Cash:
                  </label>
                  <input
                    type="text"
                    value={cashAmount}
                    onChange={(e) => handleCashAmountChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#181818] border border-[#353535] rounded-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#ababab] mb-1">
                    Balance:
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(Math.max(0, calculateChange()))}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-lg font-semibold ${
                      calculateChange() >= 0
                        ? "bg-[#222d23] border-[#2d6222] text-[#92ecb3]"
                        : "bg-[#2e2020] border-[#a12c2c] text-[#ffb1b1]"
                    }`}
                  />
                </div>
              </div>
              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={createOrder}
                  disabled={
                    isCreatingOrder ||
                    (orderForm.payment_method === "cash" &&
                      !isCashPaymentValid())
                  }
                  className={`w-full px-6 py-3 rounded-lg font-bold flex items-center justify-center text-lg shadow transition-all duration-200 ${
                    isCreatingOrder ||
                    (orderForm.payment_method === "cash" &&
                      !isCashPaymentValid())
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-[#f6b100] text-[#1f1f1f] hover:bg-[#dab000]"
                  }`}
                >
                  {isCreatingOrder ? (
                    <>
                      <RefreshCw size={20} className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : orderForm.payment_method === "cash" &&
                    !isCashPaymentValid() ? (
                    "Insufficient Cash Amount"
                  ) : (
                    "Pay"
                  )}
                </button>
                <button
                  onClick={printReceipt}
                  disabled={
                    isPrintingReceipt || orderForm.order_items.length === 0
                  }
                  className={`w-full px-6 py-3 rounded-lg font-bold flex items-center justify-center text-lg shadow transition-all ${
                    isPrintingReceipt || orderForm.order_items.length === 0
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-[#232323] text-[#f5f5f5] hover:bg-[#333333]"
                  }`}
                >
                  {isPrintingReceipt ? (
                    <>
                      <RefreshCw size={20} className="animate-spin mr-2" />
                      Printing...
                    </>
                  ) : (
                    "Print Receipt"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Order Details (Collapsible) */}
        <div className="border-t border-[#383838] bg-[#232323]">
          <div className="px-6 py-3 bg-[#181818] border-b border-[#383838]">
            <button
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              className="text-base font-bold text-[#f6b100] hover:underline"
            >
              {showOrderDetails ? "▼" : "▶"} Order Details
            </button>
          </div>
          {showOrderDetails && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#f6b100] mb-1">
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
                      className="w-full px-3 py-2 bg-[#181818] border border-[#353535] rounded-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab]"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#f6b100] mb-1">
                      Table Number *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={orderForm.table_number}
                        onChange={(e) => {
                          setOrderForm((prev) => ({
                            ...prev,
                            table_number: e.target.value,
                          }));
                          setTableStatus(null);
                        }}
                        className="flex-1 px-3 py-2 bg-[#181818] border border-[#353535] rounded-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab]"
                        placeholder="Enter table number"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          checkTableAvailability(orderForm.table_number)
                        }
                        disabled={!orderForm.table_number || checkingTable}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow"
                      >
                        {checkingTable ? "Checking..." : "Check"}
                      </button>
                    </div>
                    {/* Table Status Indicator */}
                    {tableStatus && (
                      <div
                        className={`mt-3 p-3 rounded-xl text-sm font-bold ${
                          tableStatus.available
                            ? "bg-[#222d23] text-[#4ec57a] border border-[#4ec57a]"
                            : "bg-[#2e2020] text-[#ffb1b1] border border-[#a12c2c]"
                        }`}
                      >
                        {tableStatus.available ? (
                          <span>
                            ✅ Table {orderForm.table_number} is available
                          </span>
                        ) : (
                          <span>
                            ❌ Table {orderForm.table_number} is occupied
                            <br />
                            <span className="text-xs font-normal block mt-1">
                              Customer: {tableStatus.customer} | Status:{" "}
                              {tableStatus.status} | Staff: {tableStatus.staff}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#f6b100] mb-1">
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
                      className="w-full px-3 py-2 bg-[#181818] border border-[#353535] rounded-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100]"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="digital">Digital</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#f6b100] mb-1">
                      Notes
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
                      className="w-full px-3 py-2 bg-[#181818] border border-[#353535] rounded-lg text-[#f5f5f5] focus:ring-2 focus:ring-[#f6b100] focus:border-[#f6b100] placeholder-[#ababab]"
                      placeholder="Special instructions or notes"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddOrders;
