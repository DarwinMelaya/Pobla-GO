import { useState, useMemo } from "react";
import {
  Package,
  Edit2,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Store,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:5000";

const Orders = ({
  orders,
  currencyFormatter,
  getAuthToken,
  fetchOrders,
  user,
}) => {
  // Order editing state
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState({
    order_type: "delivery",
    order_items: [],
    delivery_address: "",
    customer_phone: "",
    payment_method: "cash",
    notes: "",
  });
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  // Cancel confirmation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: {
        label: "Pending",
        bg: "bg-yellow-400/10 border-yellow-400/30 text-yellow-400",
        icon: Clock,
      },
      Cancelled: {
        label: "Cancelled",
        bg: "bg-red-400/10 border-red-400/30 text-red-400",
        icon: XCircle,
      },
      Ready: {
        label: "Ready",
        bg: "bg-purple-400/10 border-purple-400/30 text-purple-400",
        icon: CheckCircle,
      },
      OnTheWay: {
        label: "On the Way",
        bg: "bg-blue-400/10 border-blue-400/30 text-blue-400",
        icon: Truck,
      },
      Completed: {
        label: "Completed",
        bg: "bg-green-400/10 border-green-400/30 text-green-400",
        icon: CheckCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.Pending;
    const Icon = config.icon;

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${config.bg}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch menu items for order editing
  const fetchMenuItems = async () => {
    setLoadingMenuItems(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/menu?available_only=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }

      const data = await response.json();
      const items =
        data.success && Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
      setMenuItems(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to load menu items");
      setMenuItems([]);
    } finally {
      setLoadingMenuItems(false);
    }
  };

  // Fetch saved addresses for order editing
  const fetchSavedAddresses = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data.user?.addresses || []);
      }
    } catch (error) {
      console.error("Error fetching saved addresses:", error);
    }
  };

  // Handle edit order
  const handleEditOrder = async (order) => {
    if (order.status !== "Pending") {
      toast.error("Only pending orders can be edited");
      return;
    }

    setEditingOrder(order);

    // Fetch menu items and addresses
    await Promise.all([fetchMenuItems(), fetchSavedAddresses()]);

    // Set form data from order
    const orderItems =
      order.order_items?.map((item) => ({
        _id: item._id || item.menu_item_id?._id || item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        menu_item_id: item.menu_item_id?._id || item.menu_item_id,
        total_price: item.total_price,
      })) || [];

    setEditOrderForm({
      order_type: order.order_type || "delivery",
      order_items: orderItems,
      delivery_address: order.delivery_address || "",
      customer_phone: order.customer_phone || user?.phone || "",
      payment_method: order.payment_method || "cash",
      notes: order.notes || "",
    });

    // Set selected address if it matches
    if (order.delivery_address && savedAddresses.length > 0) {
      const matchingAddress = savedAddresses.find(
        (addr) => addr.address === order.delivery_address
      );
      if (matchingAddress) {
        setSelectedAddressId(matchingAddress._id);
      }
    }

    setShowEditOrderModal(true);
  };

  // Update order item quantity
  const updateOrderItemQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeOrderItem(itemId);
      return;
    }

    setEditOrderForm((prev) => ({
      ...prev,
      order_items: prev.order_items.map((item) =>
        item._id === itemId || item.menu_item_id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              total_price: item.price * newQuantity,
            }
          : item
      ),
    }));
  };

  // Remove order item
  const removeOrderItem = (itemId) => {
    setEditOrderForm((prev) => ({
      ...prev,
      order_items: prev.order_items.filter(
        (item) => item._id !== itemId && item.menu_item_id !== itemId
      ),
    }));
  };

  // Add menu item to order
  const addMenuItemToOrder = (menuItem) => {
    const existingItem = editOrderForm.order_items.find(
      (item) => item.menu_item_id === menuItem._id
    );

    if (existingItem) {
      // Increase quantity if item already exists
      updateOrderItemQuantity(
        existingItem._id || existingItem.menu_item_id,
        existingItem.quantity + 1
      );
    } else {
      // Add new item
      const newItem = {
        _id: `temp-${Date.now()}`,
        item_name: menuItem.name,
        quantity: 1,
        price: menuItem.price,
        menu_item_id: menuItem._id,
        total_price: menuItem.price,
      };

      setEditOrderForm((prev) => ({
        ...prev,
        order_items: [...prev.order_items, newItem],
      }));
    }
  };

  // Calculate order totals
  const calculateOrderTotals = () => {
    const subtotal = editOrderForm.order_items.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    const deliveryFee = editOrderForm.order_type === "delivery" ? 50 : 0;
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  };

  // Handle cancel order button click
  const handleCancelOrderClick = (order) => {
    if (order.status !== "Pending") {
      toast.error("Only pending orders can be cancelled");
      return;
    }
    setOrderToCancel(order);
    setShowCancelModal(true);
  };

  // Confirm and cancel order
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/online-orders/${orderToCancel._id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel order");
      }

      toast.success("Order cancelled successfully");
      setShowCancelModal(false);
      setOrderToCancel(null);
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(error.message || "Failed to cancel order");
    }
  };

  // Mark item as received
  const handleMarkItemAsReceived = async (orderId, itemId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/online-orders/${orderId}/items/${itemId}/received`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to mark item as received");
      }

      toast.success("Item marked as received");
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error("Error marking item as received:", error);
      toast.error(error.message || "Failed to mark item as received");
    }
  };

  // Save edited order
  const handleSaveEditedOrder = async () => {
    if (editOrderForm.order_items.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    if (
      editOrderForm.order_type === "delivery" &&
      !editOrderForm.delivery_address.trim()
    ) {
      toast.error("Delivery address is required for delivery orders");
      return;
    }

    if (!editOrderForm.customer_phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    try {
      const token = getAuthToken();
      const orderItems = editOrderForm.order_items.map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        menu_item_id: item.menu_item_id,
        special_instructions: "",
      }));

      const response = await fetch(
        `${API_BASE_URL}/online-orders/${editingOrder._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_type: editOrderForm.order_type,
            order_items: orderItems,
            delivery_address: editOrderForm.delivery_address,
            customer_phone: editOrderForm.customer_phone,
            payment_method: editOrderForm.payment_method,
            notes: editOrderForm.notes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order");
      }

      const data = await response.json();
      toast.success("Order updated successfully");
      setShowEditOrderModal(false);
      setEditingOrder(null);
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(error.message || "Failed to update order");
    }
  };

  return (
    <>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <section className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-12 text-center gap-4">
            <div className="w-24 h-24 rounded-full bg-[#2f2f2f] flex items-center justify-center mb-4">
              <Package className="w-12 h-12 text-[#383838]" />
            </div>
            <h2 className="text-2xl font-semibold text-white">No orders yet</h2>
            <p className="text-[#ababab] max-w-md">
              You haven't placed any orders yet. Start ordering delicious food
              from our menu!
            </p>
          </section>
        ) : (
          orders.map((order) => (
            <div
              key={order._id}
              className="bg-[#232323] border border-[#383838] rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      Order #{order._id.slice(-6).toUpperCase()}
                    </h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-[#ababab]">
                    {formatDate(order.created_at)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {order.order_type === "delivery" ? (
                      <>
                        <Truck className="w-4 h-4 text-[#ababab]" />
                        <span className="text-sm text-[#ababab]">Delivery</span>
                      </>
                    ) : (
                      <>
                        <Store className="w-4 h-4 text-[#ababab]" />
                        <span className="text-sm text-[#ababab]">Pickup</span>
                      </>
                    )}
                  </div>
                  {order.delivery_address && (
                    <p className="text-sm text-[#ababab] mt-1">
                      {order.delivery_address}
                    </p>
                  )}
                  {order.order_type === "delivery" && (
                    <p className="text-xs text-[#92d5ff] mt-1">
                      Distance:{" "}
                      {order.delivery_distance_km
                        ? `${Number(order.delivery_distance_km).toFixed(2)} km`
                        : "N/A"}{" "}
                      • Delivery Fee:{" "}
                      {currencyFormatter.format(order.delivery_fee || 0)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-[#C05050]">
                    {currencyFormatter.format(order.total_amount)}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#2f2f2f] pt-4">
                <h4 className="text-sm font-semibold text-white mb-2">
                  Order Items:
                </h4>
                <div className="space-y-2">
                  {order.order_items?.map((item, index) => {
                    const isReceived = item.item_status === "received";
                    const canMarkReceived =
                      (order.status === "Completed" ||
                        order.status === "OnTheWay") &&
                      !isReceived;

                    return (
                      <div
                        key={item._id || index}
                        className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#1f1f1f] border border-[#2f2f2f]"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[#ababab]">
                            {item.item_name} x {item.quantity}
                          </span>
                          {isReceived && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-400/10 border border-green-400/30 text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Received
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white">
                            {currencyFormatter.format(item.total_price)}
                          </span>
                          {canMarkReceived && (
                            <button
                              onClick={() =>
                                handleMarkItemAsReceived(order._id, item._id)
                              }
                              className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark as Received
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Edit and Cancel Buttons - Only show for Pending orders */}
              {order.status === "Pending" && (
                <div className="border-t border-[#2f2f2f] pt-4 mt-4 flex gap-3">
                  <button
                    onClick={() => handleEditOrder(order)}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Order
                  </button>
                  <button
                    onClick={() => handleCancelOrderClick(order)}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#2f2f2f] border border-red-400/30 text-red-400 font-semibold hover:bg-red-400/10 transition flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Order Modal */}
      {showEditOrderModal && editingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#232323] border border-[#383838] rounded-2xl p-6 max-w-4xl w-full space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Edit Order #{editingOrder._id.slice(-6).toUpperCase()}
              </h2>
              <button
                onClick={() => {
                  setShowEditOrderModal(false);
                  setEditingOrder(null);
                  setEditOrderForm({
                    order_type: "delivery",
                    order_items: [],
                    delivery_address: "",
                    customer_phone: "",
                    payment_method: "cash",
                    notes: "",
                  });
                }}
                className="text-[#ababab] hover:text-white transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() =>
                      setEditOrderForm({
                        ...editOrderForm,
                        order_type: "delivery",
                      })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editOrderForm.order_type === "delivery"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Truck
                        className={`w-6 h-6 ${
                          editOrderForm.order_type === "delivery"
                            ? "text-[#C05050]"
                            : "text-[#ababab]"
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          editOrderForm.order_type === "delivery"
                            ? "text-white"
                            : "text-[#ababab]"
                        }`}
                      >
                        Delivery
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setEditOrderForm({
                        ...editOrderForm,
                        order_type: "pickup",
                      })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editOrderForm.order_type === "pickup"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Store
                        className={`w-6 h-6 ${
                          editOrderForm.order_type === "pickup"
                            ? "text-[#C05050]"
                            : "text-[#ababab]"
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          editOrderForm.order_type === "pickup"
                            ? "text-white"
                            : "text-[#ababab]"
                        }`}
                      >
                        Pickup
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Delivery Address */}
              {editOrderForm.order_type === "delivery" && (
                <div>
                  <label className="block text-sm font-medium text-[#ababab] mb-2">
                    Delivery Address
                  </label>
                  {savedAddresses.length > 0 && (
                    <select
                      value={selectedAddressId}
                      onChange={(e) => {
                        const addressId = e.target.value;
                        setSelectedAddressId(addressId);
                        const selectedAddress = savedAddresses.find(
                          (addr) => addr._id === addressId
                        );
                        if (selectedAddress) {
                          setEditOrderForm({
                            ...editOrderForm,
                            delivery_address: selectedAddress.address,
                          });
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white mb-2 focus:outline-none focus:border-[#C05050]"
                    >
                      <option value="">Select saved address</option>
                      {savedAddresses.map((addr) => (
                        <option key={addr._id} value={addr._id}>
                          {addr.label} - {addr.address}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={editOrderForm.delivery_address}
                    onChange={(e) =>
                      setEditOrderForm({
                        ...editOrderForm,
                        delivery_address: e.target.value,
                      })
                    }
                    placeholder="Enter delivery address"
                    className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050]"
                  />
                </div>
              )}

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editOrderForm.customer_phone}
                  onChange={(e) =>
                    setEditOrderForm({
                      ...editOrderForm,
                      customer_phone: e.target.value,
                    })
                  }
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050]"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() =>
                      setEditOrderForm({
                        ...editOrderForm,
                        payment_method: "cash",
                      })
                    }
                    className={`p-3 rounded-xl border-2 transition-all ${
                      editOrderForm.payment_method === "cash"
                        ? "border-[#C05050] bg-[#C05050]/10 text-white"
                        : "border-[#383838] bg-[#1f1f1f] text-[#ababab] hover:border-[#2f2f2f]"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() =>
                      setEditOrderForm({
                        ...editOrderForm,
                        payment_method: "gcash",
                      })
                    }
                    className={`p-3 rounded-xl border-2 transition-all ${
                      editOrderForm.payment_method === "gcash"
                        ? "border-[#C05050] bg-[#C05050]/10 text-white"
                        : "border-[#383838] bg-[#1f1f1f] text-[#ababab] hover:border-[#2f2f2f]"
                    }`}
                  >
                    GCash
                  </button>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Order Items
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {editOrderForm.order_items.map((item) => {
                    const menuItem = menuItems.find(
                      (m) => m._id === item.menu_item_id
                    );
                    const availableServings = menuItem?.servings || 0;
                    return (
                      <div
                        key={item._id || item.menu_item_id}
                        className="bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-white font-semibold">
                            {item.item_name}
                          </p>
                          <p className="text-sm text-[#ababab]">
                            {currencyFormatter.format(item.price)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              updateOrderItemQuantity(
                                item._id || item.menu_item_id,
                                item.quantity - 1
                              )
                            }
                            className="w-8 h-8 rounded-lg bg-[#2f2f2f] flex items-center justify-center hover:bg-[#383838] transition text-white"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-semibold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateOrderItemQuantity(
                                item._id || item.menu_item_id,
                                item.quantity + 1
                              )
                            }
                            disabled={item.quantity >= availableServings}
                            className="w-8 h-8 rounded-lg bg-[#2f2f2f] flex items-center justify-center hover:bg-[#383838] transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="text-white font-semibold w-24 text-right">
                            {currencyFormatter.format(item.total_price)}
                          </span>
                          <button
                            onClick={() =>
                              removeOrderItem(item._id || item.menu_item_id)
                            }
                            className="ml-2 p-2 rounded-lg hover:bg-[#2f2f2f] transition text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Menu Items */}
              <div className="border-t border-[#2f2f2f] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-white">
                    Add More Items to Order
                  </label>
                  <span className="text-xs text-[#ababab]">
                    {
                      menuItems.filter(
                        (item) => item.is_available && (item.servings || 0) > 0
                      ).length
                    }{" "}
                    items available
                  </span>
                </div>
                {loadingMenuItems ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]"></div>
                    <span className="ml-3 text-[#ababab]">
                      Loading menu items...
                    </span>
                  </div>
                ) : (
                  <>
                    {menuItems.filter(
                      (item) => item.is_available && (item.servings || 0) > 0
                    ).length === 0 ? (
                      <div className="text-center py-6 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl">
                        <p className="text-[#ababab] text-sm">
                          No items available to add
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {menuItems
                          .filter(
                            (item) =>
                              item.is_available && (item.servings || 0) > 0
                          )
                          .map((item) => {
                            const orderItem = editOrderForm.order_items.find(
                              (oi) => oi.menu_item_id === item._id
                            );
                            const isInOrder = !!orderItem;
                            const availableServings = item.servings || 0;
                            const canAddMore =
                              !isInOrder ||
                              orderItem.quantity < availableServings;

                            return (
                              <button
                                key={item._id}
                                onClick={() => {
                                  if (isInOrder) {
                                    if (canAddMore) {
                                      updateOrderItemQuantity(
                                        orderItem._id || orderItem.menu_item_id,
                                        orderItem.quantity + 1
                                      );
                                      toast.success(
                                        `Increased ${item.name} quantity`
                                      );
                                    } else {
                                      toast.error(
                                        `Maximum ${availableServings} servings available`
                                      );
                                    }
                                  } else {
                                    addMenuItemToOrder(item);
                                    toast.success(
                                      `${item.name} added to order`
                                    );
                                  }
                                }}
                                disabled={!canAddMore}
                                className={`p-3 rounded-lg border text-left transition group ${
                                  isInOrder
                                    ? "bg-[#1f1f1f]/50 border-[#2f2f2f] hover:bg-[#2f2f2f] hover:border-[#C05050]/50"
                                    : "bg-[#1f1f1f] border-[#2f2f2f] hover:bg-[#2f2f2f] hover:border-[#C05050]/50"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex-1">
                                    <p
                                      className={`text-sm font-semibold group-hover:text-[#C05050] transition ${
                                        isInOrder ? "text-white" : "text-white"
                                      }`}
                                    >
                                      {item.name}
                                    </p>
                                    {isInOrder && (
                                      <p className="text-xs text-[#C05050] mt-0.5">
                                        In order: {orderItem.quantity}
                                      </p>
                                    )}
                                  </div>
                                  <Plus className="w-4 h-4 text-[#C05050] opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2" />
                                </div>
                                <p className="text-xs text-[#ababab] mb-1">
                                  {currencyFormatter.format(item.price)} each
                                </p>
                                {isInOrder ? (
                                  canAddMore ? (
                                    <p className="text-xs text-green-400">
                                      +{availableServings - orderItem.quantity}{" "}
                                      more available
                                    </p>
                                  ) : (
                                    <p className="text-xs text-yellow-400">
                                      Max quantity reached
                                    </p>
                                  )
                                ) : (
                                  <p className="text-xs text-green-400">
                                    {availableServings} available
                                  </p>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Order Summary */}
              {(() => {
                const { subtotal, deliveryFee, total } = calculateOrderTotals();
                return (
                  <div className="bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-[#ababab]">
                      <span>Subtotal</span>
                      <span>{currencyFormatter.format(subtotal)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-[#ababab]">
                        <span>Delivery Fee</span>
                        <span>{currencyFormatter.format(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#2f2f2f] flex justify-between text-lg font-semibold text-white">
                      <span>Total</span>
                      <span className="text-[#C05050]">
                        {currencyFormatter.format(total)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowEditOrderModal(false);
                  setEditingOrder(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white font-semibold hover:bg-[#2f2f2f] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedOrder}
                className="flex-1 px-4 py-3 rounded-xl bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && orderToCancel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#232323] border border-[#383838] rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Cancel Order
              </h2>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setOrderToCancel(null);
                }}
                className="text-[#ababab] hover:text-white transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl">
                <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">
                    Order #{orderToCancel._id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-sm text-[#ababab]">
                    {currencyFormatter.format(orderToCancel.total_amount)}
                  </p>
                </div>
              </div>

              <p className="text-[#ababab] text-center">
                Are you sure you want to cancel this order? This action cannot
                be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setOrderToCancel(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white font-semibold hover:bg-[#2f2f2f] transition"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
