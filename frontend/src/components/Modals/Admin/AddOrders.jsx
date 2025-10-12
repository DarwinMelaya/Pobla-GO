import React, { useState, useEffect } from "react";
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

  // Filter menu items based on search term
  const getFilteredMenuItems = () => {
    if (!menuSearchTerm.trim()) {
      return menuItems;
    }

    return menuItems.filter(
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-lg w-full max-w-7xl h-[90vh] border border-gray-200/50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900">Add New Order</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Main POS Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Menu Items */}
          <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Menu Items
            </h4>

            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={menuSearchTerm}
                  onChange={(e) => setMenuSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-sm"
                />
              </div>
              {menuSearchTerm && (
                <div className="mt-2 text-xs text-gray-500">
                  {getFilteredMenuItems().length} of {menuItems.length} items
                  found
                </div>
              )}
            </div>

            {menuItemsLoading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw size={24} className="animate-spin text-[#C05050]" />
                <span className="ml-2 text-gray-600">
                  Loading menu items...
                </span>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No available menu items found
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={onFetchMenuItems}
                    className="px-3 py-2 bg-[#C05050] text-white rounded-lg hover:bg-[#B04040] transition-colors text-sm"
                  >
                    Retry
                  </button>
                  <button
                    onClick={onCreateTestMenuData}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Create Test Data
                  </button>
                  <button
                    onClick={onDebugDatabase}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Debug DB
                  </button>
                  <button
                    onClick={onForceTestData}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Force Test
                  </button>
                </div>
              </div>
            ) : getFilteredMenuItems().length === 0 ? (
              <div className="text-center py-8">
                <Search size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">No menu items found</p>
                <p className="text-sm text-gray-400">
                  Try adjusting your search terms
                </p>
                {menuSearchTerm && (
                  <button
                    onClick={() => setMenuSearchTerm("")}
                    className="mt-2 px-3 py-1 text-sm text-[#C05050] hover:text-[#B04040] transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
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
                      className={`relative rounded-lg p-4 cursor-pointer transition-colors min-h-[100px] flex flex-col justify-between ${
                        isOutOfStock
                          ? "bg-gray-400 cursor-not-allowed opacity-60"
                          : isLowStock
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "bg-[#C05050] hover:bg-[#B04040]"
                      }`}
                      onClick={() => !isOutOfStock && addItemToOrder(item)}
                    >
                      {/* Quantity Badge */}
                      {itemQuantity > 0 && (
                        <div className="absolute top-2 right-2 bg-white text-[#C05050] rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold border-2 border-white">
                          {itemQuantity}
                        </div>
                      )}

                      {/* Item Info */}
                      <div className="text-center text-white">
                        <h5 className="font-medium text-sm mb-1 truncate">
                          {item.name || "No name"}
                        </h5>
                        <p className="text-xs opacity-90">
                          {formatCurrency(item.price || 0)}
                        </p>
                        {/* Show available servings with status indicator */}
                        <div className="text-xs opacity-75 mt-1">
                          <p>Servings: {availableServings}</p>
                          {isOutOfStock && (
                            <p className="text-red-200 font-bold">
                              OUT OF STOCK
                            </p>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <p className="text-yellow-200 font-bold">
                              LOW STOCK
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Middle Column - Order Summary */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-700">
                <div>ID</div>
                <div>Item</div>
                <div>Qty</div>
                <div>Price</div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {orderForm.order_items.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No items in order
                </div>
              ) : (
                <div className="space-y-2">
                  {orderForm.order_items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-2 text-sm bg-white p-2 rounded border"
                    >
                      <div className="text-gray-600">#{index + 1}</div>
                      <div className="font-medium truncate">
                        {item.item_name}
                      </div>
                      <div className="text-center">{item.quantity}</div>
                      <div className="text-right font-medium">
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() =>
                  setOrderForm((prev) => ({ ...prev, order_items: [] }))
                }
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                disabled={orderForm.order_items.length === 0}
              >
                Delete All
              </button>
            </div>
          </div>

          {/* Right Column - Receipt Preview & Payment */}
          <div className="w-1/3 p-4 overflow-y-auto">
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              {/* Receipt Header */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Poblacion Pares Fast Food Chain
                </h3>
                <p className="text-sm text-gray-600">
                  Cleofas, Jamie James Ramos-Prop
                </p>
                <p className="text-sm text-gray-600">Villa Mendez (Pob.)</p>
                <p className="text-sm text-gray-600">Mogpog, Marinduque</p>
                <div className="border-t border-gray-300 my-2"></div>
              </div>

              {/* Receipt Table */}
              <div className="mb-4">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-700 border-b border-gray-300 pb-1">
                  <div>Item</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Unit Price</div>
                  <div className="text-right">Amount</div>
                </div>

                {orderForm.order_items.length === 0 ? (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    No items
                  </div>
                ) : (
                  <div className="space-y-1 mt-2">
                    {orderForm.order_items.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-4 gap-2 text-xs"
                      >
                        <div className="truncate">{item.item_name}</div>
                        <div className="text-center">{item.quantity}</div>
                        <div className="text-right">
                          {formatCurrency(item.price)}
                        </div>
                        <div className="text-right font-medium">
                          {formatCurrency(item.total_price)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-300 mt-2 pt-2">
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Total amount:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total:
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(calculateTotal())}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash:
                  </label>
                  <input
                    type="text"
                    value={cashAmount}
                    onChange={(e) => handleCashAmountChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balance:
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(Math.max(0, calculateChange()))}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-lg ${
                      calculateChange() >= 0
                        ? "bg-green-100 border-green-300 text-green-700"
                        : "bg-red-100 border-red-300 text-red-700"
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
                  className={`w-full px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center ${
                    isCreatingOrder ||
                    (orderForm.payment_method === "cash" &&
                      !isCashPaymentValid())
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
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
                  className={`w-full px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center ${
                    isPrintingReceipt || orderForm.order_items.length === 0
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
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
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
            <button
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showOrderDetails ? "▼" : "▶"} Order Details
            </button>
          </div>

          {showOrderDetails && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                          // Clear table status when table number changes
                          setTableStatus(null);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                        placeholder="Enter table number"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          checkTableAvailability(orderForm.table_number)
                        }
                        disabled={!orderForm.table_number || checkingTable}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {checkingTable ? "Checking..." : "Check"}
                      </button>
                    </div>
                    {/* Table Status Indicator */}
                    {tableStatus && (
                      <div
                        className={`mt-2 p-2 rounded-lg text-sm ${
                          tableStatus.available
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {tableStatus.available ? (
                          <span>
                            ✅ Table {orderForm.table_number} is available
                          </span>
                        ) : (
                          <div>
                            <span>
                              ❌ Table {orderForm.table_number} is occupied
                            </span>
                            <div className="text-xs mt-1">
                              Customer: {tableStatus.customer} | Status:{" "}
                              {tableStatus.status} | Staff: {tableStatus.staff}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="digital">Digital</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
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
