import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import AddOrders from "../../components/Modals/Admin/AddOrders";
import StaffPerformanceModal from "../../components/Modals/Admin/StaffPerformanceModal";
import TableStatusModal from "../../components/Modals/Admin/TableStatusModal";
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
  BarChart3,
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
  const [showStaffPerformanceModal, setShowStaffPerformanceModal] =
    useState(false);
  const [showTableStatusModal, setShowTableStatusModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
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

      // Fetch available menu items with servings
      const response = await fetch(`${API_BASE}/menu?available_only=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Menu API error response:", errorText);
        throw new Error(`Failed to fetch menu items: ${response.status}`);
      }

      const data = await response.json();

      // Handle response format from new /menu endpoint
      let menuItemsArray = [];
      if (data.success && Array.isArray(data.items)) {
        menuItemsArray = data.items;
      } else if (Array.isArray(data)) {
        menuItemsArray = data;
      } else {
        console.error("Unexpected data format:", data);
        menuItemsArray = [];
      }

      // Items are already filtered by availability from backend
      // Each item has: _id, name, price, servings, availableServings, is_available, stock_status
      console.log(`✅ Loaded ${menuItemsArray.length} available menu items`);
      
      setMenuItems(menuItemsArray);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error(`Failed to fetch menu items: ${error.message}`);
      setMenuItems([]);
    } finally {
      setMenuItemsLoading(false);
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

  // Open delete confirmation modal
  const openDeleteConfirmModal = (order) => {
    setOrderToDelete(order);
    setShowDeleteConfirmModal(true);
  };

  // Delete order
  const deleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/orders/${orderToDelete._id}`, {
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
      setShowDeleteConfirmModal(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setOrderToDelete(null);
  };

  // Get status color (dark theme chips)
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-700 text-white";
      case "preparing":
        return "bg-blue-700 text-white";
      case "ready":
        return "bg-green-700 text-white";
      case "completed":
        return "bg-gray-700 text-white";
      case "cancelled":
        return "bg-red-700 text-white";
      default:
        return "bg-[#383838] text-[#f5f5f5]";
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
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
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

  // Open add order modal (now opens POS in new tab)
  const openAddOrderModal = () => {
    window.open('/pos', '_blank');
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
    // menuItems state changed
  }, [menuItems]);

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen rounded-r-2xl p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide">
              Manage Orders
            </h1>
            <p className="text-[#cccccc]">
              View and manage all customer orders
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTableStatusModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Table size={20} />
              <span>Table Status</span>
            </button>
            <button
              onClick={() => setShowStaffPerformanceModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BarChart3 size={20} />
              <span>Staff Performance</span>
            </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#232323] p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#cccccc]">Total Orders</p>
                <p className="text-2xl font-bold text-[#f5f5f5]">
                  {stats.total_orders}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar size={20} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#232323] p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#cccccc]">Total Revenue</p>
                <p className="text-2xl font-bold text-[#f5f5f5]">
                  {formatCurrency(stats.total_revenue)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign size={20} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#232323] p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#cccccc]">Avg Order Value</p>
                <p className="text-2xl font-bold text-[#f5f5f5]">
                  {formatCurrency(stats.average_order_value)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign size={20} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#232323] p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#cccccc]">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending_orders}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#232323] p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#cccccc]">Completed Orders</p>
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
        <div className="bg-[#232323] p-4 rounded-xl shadow-sm border border-[#383838] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
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
                  className="w-full pl-10 pr-3 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
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
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Table Number
              </label>
              <input
                type="text"
                placeholder="Table #"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-[#cccccc] border border-[#383838] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#232323] rounded-xl shadow-sm border border-[#383838] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#383838]">
            <h3 className="text-lg font-bold text-[#f5f5f5]">
              Orders ({totalOrders})
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw size={24} className="animate-spin text-[#f6b100]" />
              <span className="ml-2 text-[#b5b5b5]">Loading orders...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#292929]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Staff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#232323]">
                  {orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-4 text-center text-[#ababab]"
                      >
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order._id} className="hover:bg-[#262626]">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#f5f5f5]">
                          #{order._id.slice(-8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f5f5f5]">
                          {order.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">
                          {order.table_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              order.status === "pending"
                                ? "bg-yellow-700 text-white"
                                : order.status === "preparing"
                                ? "bg-blue-700 text-white"
                                : order.status === "ready"
                                ? "bg-green-700 text-white"
                                : order.status === "completed"
                                ? "bg-gray-700 text-white"
                                : order.status === "cancelled"
                                ? "bg-red-700 text-white"
                                : "bg-[#383838] text-[#f5f5f5]"
                            }`}
                          >
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">
                              {order.status}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f6b100] font-bold">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#cccccc]">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#cccccc]">
                          {order.staff_member?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => viewOrderDetails(order._id)}
                              className="text-[#f6b100] hover:text-[#dab000] font-bold transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <select
                              value={order.status}
                              onChange={(e) =>
                                updateOrderStatus(order._id, e.target.value)
                              }
                              className="text-xs border border-[#383838] rounded px-2 py-1 focus:ring-2 focus:ring-[#f6b100] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
                            >
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                              onClick={() => openDeleteConfirmModal(order)}
                              className="text-red-500 hover:text-red-700 font-bold transition-colors"
                              title="Delete Order"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-[#cccccc]">
                Showing page {currentPage} of {totalPages} ({totalOrders} total
                orders)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-[#383838] rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-[#383838] rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#181818] rounded-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto border border-[#2a2a2a] shadow-2xl">
              <div className="px-6 py-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#1f1f1f]">
                <h3 className="text-lg font-bold text-[#f5f5f5]">
                  Order Details
                </h3>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-[#bdbdbd] hover:text-[#f6b100] p-2 hover:bg-[#2a2a2a] rounded-lg"
                >
                  <XCircle size={22} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 bg-[#171717]">
                {/* Order Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Order ID
                    </label>
                    <p className="text-sm font-mono text-[#f5f5f5]">
                      #{selectedOrder._id.slice(-8)}
                    </p>
                  </div>
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Status
                    </label>
                    <span
                      className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(
                        selectedOrder.status
                      )}`}
                    >
                      {getStatusIcon(selectedOrder.status)}
                      <span className="ml-1 capitalize">
                        {selectedOrder.status}
                      </span>
                    </span>
                  </div>
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Customer
                    </label>
                    <p className="text-sm text-[#f5f5f5]">
                      {selectedOrder.customer_name}
                    </p>
                  </div>
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Table
                    </label>
                    <p className="text-sm text-[#f5f5f5]">
                      {selectedOrder.table_number}
                    </p>
                  </div>
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Total Amount
                    </label>
                    <p className="text-sm text-[#f6b100] font-bold">
                      {formatCurrency(selectedOrder.total_amount)}
                    </p>
                  </div>
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Payment Status
                    </label>
                    <p className="text-sm text-[#f5f5f5] capitalize">
                      {selectedOrder.payment_status}
                    </p>
                  </div>
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Staff Member
                    </label>
                    <p className="text-sm text-[#f5f5f5]">
                      {selectedOrder.staff_member?.name || "Unknown"}
                    </p>
                  </div>
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Order Date
                    </label>
                    <p className="text-sm text-[#f5f5f5]">
                      {formatDate(selectedOrder.created_at)}
                    </p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4">
                    <label className="block text-xs font-medium text-[#cfcfcf]">
                      Notes
                    </label>
                    <p className="text-sm text-[#f5f5f5]">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <label className="block text-sm font-medium text-[#cfcfcf] mb-2">
                    Order Items
                  </label>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-[#141414] border border-[#1f1f1f] rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#f5f5f5]">
                            {item.item_name}
                          </p>
                          <p className="text-xs text-[#cfcfcf]">
                            Qty: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                          {item.special_instructions && (
                            <p className="text-xs text-[#cfcfcf]">
                              Note: {item.special_instructions}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[#f5f5f5]">
                          {formatCurrency(item.total_price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#1b1b1b] flex justify-end">
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="px-4 py-2 text-[#d0d0d0] border border-[#2a2a2a] rounded-lg hover:bg-[#1f1f1f] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Order Modal */}
        <AddOrders
          isOpen={showAddOrderModal}
          onClose={() => setShowAddOrderModal(false)}
          onOrderCreated={() => {
            fetchOrders();
            fetchStats();
          }}
          menuItems={menuItems}
          menuItemsLoading={menuItemsLoading}
          onFetchMenuItems={fetchMenuItems}
        />

        {/* Staff Performance Modal */}
        <StaffPerformanceModal
          isOpen={showStaffPerformanceModal}
          onClose={() => setShowStaffPerformanceModal(false)}
        />

        {/* Table Status Modal */}
        <TableStatusModal
          isOpen={showTableStatusModal}
          onClose={() => setShowTableStatusModal(false)}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && orderToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-lg w-full max-w-md border border-gray-200/50 shadow-2xl">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#f5f5f5]">
                    Delete Order
                  </h3>
                  <p className="text-sm text-[#cccccc]">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <p className="text-[#cccccc]">
                    Are you sure you want to delete this order?
                  </p>

                  {/* Order Details */}
                  <div className="bg-[#181818] rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#cccccc]">Order ID:</span>
                      <span className="text-sm font-medium text-[#f5f5f5]">
                        #{orderToDelete._id.slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#cccccc]">Customer:</span>
                      <span className="text-sm font-medium text-[#f5f5f5]">
                        {orderToDelete.customer_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#cccccc]">Table:</span>
                      <span className="text-sm font-medium text-[#f5f5f5]">
                        {orderToDelete.table_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#cccccc]">Total:</span>
                      <span className="text-sm font-medium text-[#f5f5f5]">
                        {formatCurrency(orderToDelete.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#cccccc]">Status:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          orderToDelete.status
                        )}`}
                      >
                        {getStatusIcon(orderToDelete.status)}
                        <span className="ml-1 capitalize">
                          {orderToDelete.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-[#cccccc] border border-[#383838] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteOrder}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Delete Order</span>
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
