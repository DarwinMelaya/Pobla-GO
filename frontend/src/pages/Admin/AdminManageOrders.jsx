import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  User,
  Table,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Minus,
} from "lucide-react";

const AdminManageOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customer_name: "",
    table_number: "",
    notes: "",
    payment_method: "cash",
    order_items: [],
  });
  const [cashAmount, setCashAmount] = useState("");
  const [showCashPayment, setShowCashPayment] = useState(false);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_revenue: 0,
    average_order_value: 0,
    pending_orders: 0,
    completed_orders: 0,
  });

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const queryParams = new URLSearchParams();

      if (searchTerm) queryParams.append("search", searchTerm);
      if (statusFilter) queryParams.append("status", statusFilter);
      if (tableFilter) queryParams.append("table_number", tableFilter);
      if (dateFrom) queryParams.append("date_from", dateFrom);
      if (dateTo) queryParams.append("date_to", dateTo);
      queryParams.append("page", currentPage);
      queryParams.append("limit", "10");

      const response = await fetch(`${API_BASE}/orders?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders);
      setTotalPages(data.totalPages);
      setTotalOrders(data.total);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Fetch order statistics
  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      const queryParams = new URLSearchParams();

      if (dateFrom) queryParams.append("date_from", dateFrom);
      if (dateTo) queryParams.append("date_to", dateTo);

      const response = await fetch(
        `${API_BASE}/orders/stats/summary?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }

      const data = await response.json();
      setStats(data.summary);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  // Fetch menu items for order creation
  const fetchMenuItems = async () => {
    setMenuItemsLoading(true);
    try {
      const token = getAuthToken();
      console.log(
        "Fetching menu items with token:",
        token ? "Token exists" : "No token"
      );

      // First try to get all menu items to see what's available
      let response;
      try {
        response = await fetch(`${API_BASE}/menu`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (authError) {
        console.log("Auth request failed, trying without auth:", authError);
        response = await fetch(`${API_BASE}/menu`, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      console.log("Menu API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Menu API error response:", errorText);
        throw new Error(`Failed to fetch menu items: ${response.status}`);
      }

      const data = await response.json();
      console.log("All menu items fetched:", data.length, "items");
      console.log("All menu items:", data);
      console.log("Data type:", typeof data);
      console.log("Is array:", Array.isArray(data));

      // Handle different response formats
      let menuItemsArray = [];
      if (Array.isArray(data)) {
        menuItemsArray = data;
      } else if (data && Array.isArray(data.items)) {
        menuItemsArray = data.items;
      } else if (data && Array.isArray(data.menuItems)) {
        menuItemsArray = data.menuItems;
      } else {
        console.error("Unexpected data format:", data);
        menuItemsArray = [];
      }

      console.log("Processed menu items array:", menuItemsArray);

      // Filter for available items
      const availableItems = menuItemsArray.filter(
        (item) => item.is_available === true
      );
      console.log("Available menu items:", availableItems.length, "items");
      console.log("Available items:", availableItems);

      // Test if items have the expected structure
      if (availableItems.length > 0) {
        console.log("First item structure:", {
          _id: availableItems[0]._id,
          name: availableItems[0].name,
          price: availableItems[0].price,
          category: availableItems[0].category,
          is_available: availableItems[0].is_available,
        });
      }

      console.log("Setting menuItems state to:", availableItems);

      // Force set some test data if no items found
      if (availableItems.length === 0 && menuItemsArray.length > 0) {
        console.log("No available items found, using all items");
        setMenuItems(menuItemsArray);
      } else {
        setMenuItems(availableItems);
      }

      console.log("MenuItems state updated");
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error(`Failed to fetch menu items: ${error.message}`);
    } finally {
      setMenuItemsLoading(false);
    }
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
      setShowAddOrderModal(false);
      setOrderForm({
        customer_name: "",
        table_number: "",
        notes: "",
        payment_method: "cash",
        order_items: [],
      });
      setCashAmount("");
      setShowCashPayment(false);
      fetchOrders();
      fetchStats();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      toast.success("Order status updated successfully");
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  // Delete order
  const deleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      toast.success("Order deleted successfully");
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock size={16} />;
      case "preparing":
        return <RefreshCw size={16} />;
      case "ready":
        return <CheckCircle size={16} />;
      case "completed":
        return <CheckCircle size={16} />;
      case "cancelled":
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders();
    fetchStats();
  };

  // Handle filter change
  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchOrders();
    fetchStats();
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setTableFilter("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  // View order details
  const viewOrderDetails = async (orderId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }

      const order = await response.json();
      setSelectedOrder(order);
      setShowOrderDetails(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to fetch order details");
    }
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

  // Open add order modal
  const openAddOrderModal = () => {
    setShowAddOrderModal(true);
    setShowCashPayment(orderForm.payment_method === "cash");
    fetchMenuItems();
  };

  // Create test menu data
  const createTestMenuData = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/menu/test-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create test data");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchMenuItems();
    } catch (error) {
      console.error("Error creating test data:", error);
      toast.error("Failed to create test data");
    }
  };

  // Debug database connection
  const debugDatabase = async () => {
    try {
      const response = await fetch(`${API_BASE}/menu/debug`);
      const data = await response.json();
      console.log("Debug data:", data);
      toast.success(
        `Debug: ${data.totalItems} total, ${data.availableItems} available`
      );
    } catch (error) {
      console.error("Debug error:", error);
      toast.error("Debug failed");
    }
  };

  // Force test data for debugging
  const forceTestData = () => {
    const testItems = [
      {
        _id: "test1",
        name: "Test Burger",
        category: "Main Course",
        price: 12.99,
        description: "A test burger",
        is_available: true,
      },
      {
        _id: "test2",
        name: "Test Pizza",
        category: "Main Course",
        price: 15.99,
        description: "A test pizza",
        is_available: true,
      },
    ];
    console.log("Setting hardcoded test data:", testItems);
    setMenuItems(testItems);
    toast.success("Hardcoded test data set");
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm || statusFilter || tableFilter || dateFrom || dateTo) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, tableFilter, dateFrom, dateTo]);

  // Debug useEffect for menuItems
  useEffect(() => {
    console.log("MenuItems state changed:", menuItems);
    console.log("MenuItems length:", menuItems.length);
  }, [menuItems]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Orders</h1>
            <p className="text-gray-600">View and manage all customer orders</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={openAddOrderModal}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={20} />
              <span>Add Order</span>
            </button>
            <button
              onClick={() => {
                fetchOrders();
                fetchStats();
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-[#C05050] text-white rounded-lg hover:bg-[#B04040] transition-colors"
            >
              <RefreshCw size={20} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_orders}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar size={20} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.total_revenue)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign size={20} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.average_order_value)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign size={20} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending_orders}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Orders</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed_orders}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Number
              </label>
              <input
                type="text"
                placeholder="Table #"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Orders ({totalOrders})
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw size={24} className="animate-spin text-[#C05050]" />
              <span className="ml-2 text-gray-600">Loading orders...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order._id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.table_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">
                            {order.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.staff_member?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewOrderDetails(order._id)}
                            className="text-[#C05050] hover:text-[#B04040] transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>

                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order._id, e.target.value)
                            }
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                          >
                            <option value="pending">Pending</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          <button
                            onClick={() => deleteOrder(order._id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <Calendar size={48} className="mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No orders found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} ({totalOrders} total
                orders)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Order Details
                </h3>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Order ID
                    </label>
                    <p className="text-sm text-gray-900">
                      #{selectedOrder._id.slice(-8)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        selectedOrder.status
                      )}`}
                    >
                      {getStatusIcon(selectedOrder.status)}
                      <span className="ml-1 capitalize">
                        {selectedOrder.status}
                      </span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.customer_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Table
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.table_number}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Total Amount
                    </label>
                    <p className="text-sm text-gray-900 font-medium">
                      {formatCurrency(selectedOrder.total_amount)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Status
                    </label>
                    <p className="text-sm text-gray-900 capitalize">
                      {selectedOrder.payment_status}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Staff Member
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.staff_member?.name || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Order Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedOrder.created_at)}
                    </p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Items
                  </label>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.item_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                          {item.special_instructions && (
                            <p className="text-xs text-gray-500">
                              Note: {item.special_instructions}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.total_price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Order Modal */}
        {showAddOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Create New Order
                </h3>
                <button
                  onClick={() => setShowAddOrderModal(false)}
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
                          onChange={(e) =>
                            handleCashAmountChange(e.target.value)
                          }
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

                  {/* Debug info */}
                  <div className="mb-2 text-xs text-gray-500">
                    Debug: Loading: {menuItemsLoading ? "true" : "false"},
                    Items: {menuItems.length}, State:{" "}
                    {JSON.stringify(
                      menuItems.map((item) => ({
                        id: item._id,
                        name: item.name,
                        available: item.is_available,
                      }))
                    )}
                  </div>

                  {menuItemsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-[#C05050]"
                      />
                      <span className="ml-2 text-gray-600">
                        Loading menu items...
                      </span>
                    </div>
                  ) : menuItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        No available menu items found
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Either no menu items exist or none are marked as
                        available
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Check the Menu section to add items or enable
                        availability
                      </p>
                      <div className="flex justify-center space-x-2 mt-4">
                        <button
                          onClick={fetchMenuItems}
                          className="px-3 py-2 bg-[#C05050] text-white rounded-lg hover:bg-[#B04040] transition-colors text-sm"
                        >
                          Retry
                        </button>
                        <button
                          onClick={createTestMenuData}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Create Test Data
                        </button>
                        <button
                          onClick={debugDatabase}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Debug DB
                        </button>
                        <button
                          onClick={forceTestData}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          Force Test
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {/* Force render test */}
                      {menuItems.length === 0 && (
                        <div className="col-span-full text-center py-4 text-red-500">
                          DEBUG: No items in menuItems array
                        </div>
                      )}
                      {menuItems.map((item, index) => {
                        console.log(`Rendering item ${index}:`, item);
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
                            <span className="w-8 text-center">
                              {item.quantity}
                            </span>
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
                        <span className="text-lg font-medium">
                          Total Amount:
                        </span>
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
                  onClick={() => setShowAddOrderModal(false)}
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
        )}
      </div>
    </Layout>
  );
};

export default AdminManageOrders;
