import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { XCircle, Plus, Minus, Trash2, RefreshCw } from "lucide-react";

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

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Add item to order
  const addItemToOrder = (menuItem) => {
    const existingItem = orderForm.order_items.find(
      (item) => item.menu_item_id === menuItem._id
    );

    if (existingItem) {
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
        throw new Error("Failed to create order");
      }

      toast.success("Order created successfully");
      handleClose();
      onOrderCreated && onOrderCreated();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
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

  // Initialize cash payment state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowCashPayment(orderForm.payment_method === "cash");
    }
  }, [isOpen, orderForm.payment_method]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Create New Order
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
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
              <input
                type="text"
                value={orderForm.table_number}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    table_number: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                placeholder="Enter table number"
              />
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

          {/* Cash Payment Section */}
          {showCashPayment && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Cash Payment
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                    {formatCurrency(calculateTotal())}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Received
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
                    Change
                  </label>
                  <div
                    className={`px-3 py-2 border rounded-lg font-medium ${
                      calculateChange() >= 0
                        ? "bg-green-100 border-green-300 text-green-700"
                        : "bg-red-100 border-red-300 text-red-700"
                    }`}
                  >
                    {formatCurrency(Math.max(0, calculateChange()))}
                  </div>
                </div>
              </div>
              {calculateChange() < 0 && (
                <div className="mt-2 text-sm text-red-600">
                  ⚠️ Insufficient cash amount
                </div>
              )}
            </div>
          )}

          {/* Menu Items Selection */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Select Menu Items
            </h4>

            {menuItemsLoading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw size={24} className="animate-spin text-[#C05050]" />
                <span className="ml-2 text-gray-600">
                  Loading menu items...
                </span>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No available menu items found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Either no menu items exist or none are marked as available
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Check the Menu section to add items or enable availability
                </p>
                <div className="flex justify-center space-x-2 mt-4">
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {menuItems.map((item, index) => {
                  return (
                    <div
                      key={item._id || index}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {item.name || "No name"}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {item.category || "No category"}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(item.price || 0)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 mb-2">
                          {item.description}
                        </p>
                      )}
                      <button
                        onClick={() => addItemToOrder(item)}
                        className="w-full px-3 py-1 text-xs bg-[#C05050] text-white rounded hover:bg-[#B04040] transition-colors"
                      >
                        Add to Order
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Items */}
          {orderForm.order_items.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Order Items
              </h4>
              <div className="space-y-2">
                {orderForm.order_items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.item_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          updateItemQuantity(index, item.quantity - 1)
                        }
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateItemQuantity(index, item.quantity + 1)
                        }
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <Plus size={16} />
                      </button>
                      <span className="w-20 text-right font-medium">
                        {formatCurrency(item.total_price)}
                      </span>
                      <button
                        onClick={() => removeItemFromOrder(index)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 p-3 bg-[#C05050] text-white rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={createOrder}
            disabled={
              orderForm.payment_method === "cash" && !isCashPaymentValid()
            }
            className={`px-4 py-2 rounded-lg transition-colors ${
              orderForm.payment_method === "cash" && !isCashPaymentValid()
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-[#C05050] text-white hover:bg-[#B04040]"
            }`}
          >
            {orderForm.payment_method === "cash" && !isCashPaymentValid()
              ? "Insufficient Cash Amount"
              : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOrders;
