import Layout from "../../components/Layout/Layout";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  BarChart3,
  PieChart,
} from "lucide-react";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// API Base URL
const API_BASE_URL = "http://localhost:5000";

// API Service Functions
const apiService = {
  // Get authentication token from localStorage
  getAuthToken: () => {
    return localStorage.getItem("token");
  },

  // Make authenticated API request
  makeRequest: async (url, options = {}) => {
    const token = apiService.getAuthToken();
    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          throw new Error("Authentication failed");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  },

  // Get orders statistics
  getOrdersStats: async () => {
    return apiService.makeRequest("/orders/stats/summary");
  },

  // Get recent orders
  getRecentOrders: async (limit = 5) => {
    return apiService.makeRequest(`/orders?limit=${limit}&page=1`);
  },

  // Get all reservations
  getReservations: async () => {
    return apiService.makeRequest("/reservations");
  },

  // Get all inventory items
  getInventory: async () => {
    return apiService.makeRequest("/inventory");
  },

  // Get expiring inventory items
  getExpiringInventory: async () => {
    return apiService.makeRequest("/inventory/expiring/soon");
  },

  // Get staff performance stats
  getStaffStats: async () => {
    return apiService.makeRequest("/orders/stats/staff");
  },
};

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    orders: {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    },
    reservations: {
      total: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
    },
    inventory: {
      totalItems: 0,
      lowStock: 0,
      expired: 0,
    },
    staff: {
      totalStaff: 0,
      activeStaff: 0,
    },
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    tablePerformanceData: null,
    ordersPieData: null,
    reservationsData: null,
  });

  // Fetch real data from backend APIs
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [
          ordersStatsResponse,
          recentOrdersResponse,
          reservationsResponse,
          inventoryResponse,
          expiringInventoryResponse,
          staffStatsResponse,
        ] = await Promise.allSettled([
          apiService.getOrdersStats(),
          apiService.getRecentOrders(5),
          apiService.getReservations(),
          apiService.getInventory(),
          apiService.getExpiringInventory(),
          apiService.getStaffStats(),
        ]);

        // Process orders statistics
        let ordersData = {
          total: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
        };

        if (ordersStatsResponse.status === "fulfilled") {
          const ordersStats = ordersStatsResponse.value;
          ordersData = {
            total: ordersStats.summary?.total_orders || 0,
            pending: ordersStats.summary?.pending_orders || 0,
            completed: ordersStats.summary?.completed_orders || 0,
            cancelled: ordersStats.summary?.cancelled_orders || 0,
            totalRevenue: ordersStats.summary?.total_revenue || 0,
            averageOrderValue: ordersStats.summary?.average_order_value || 0,
          };
        }

        // Process recent orders
        let recentOrdersData = [];
        if (recentOrdersResponse.status === "fulfilled") {
          recentOrdersData = recentOrdersResponse.value.orders || [];
        }

        // Process reservations
        let reservationsData = {
          total: 0,
          pending: 0,
          confirmed: 0,
          cancelled: 0,
        };

        if (reservationsResponse.status === "fulfilled") {
          const reservations = reservationsResponse.value.data || [];
          reservationsData = {
            total: reservations.length,
            pending: reservations.filter((r) => r.status === "pending").length,
            confirmed: reservations.filter((r) => r.status === "confirmed")
              .length,
            cancelled: reservations.filter((r) => r.status === "cancelled")
              .length,
          };
        }

        // Process inventory
        let inventoryData = {
          totalItems: 0,
          lowStock: 0,
          expired: 0,
        };

        let lowStockItemsData = [];

        if (inventoryResponse.status === "fulfilled") {
          const inventory = inventoryResponse.value.data || [];
          const lowStockThreshold = 10; // Consider items with quantity < 10 as low stock

          inventoryData = {
            totalItems: inventory.length,
            lowStock: inventory.filter(
              (item) => item.quantity < lowStockThreshold
            ).length,
            expired: 0, // Will be calculated from expiring items
          };

          lowStockItemsData = inventory
            .filter((item) => item.quantity < lowStockThreshold)
            .map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category,
            }));
        }

        // Process expiring inventory
        if (expiringInventoryResponse.status === "fulfilled") {
          const expiringItems = expiringInventoryResponse.value.data || [];
          inventoryData.expired = expiringItems.length;

          // Add expiring items to low stock alerts
          const expiringLowStock = expiringItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            expiring: true,
            expiry_date: item.expiry_date,
          }));

          lowStockItemsData = [...lowStockItemsData, ...expiringLowStock];
        }

        // Process staff data
        let staffData = {
          totalStaff: 0,
          activeStaff: 0,
        };

        if (staffStatsResponse.status === "fulfilled") {
          const staffStats = staffStatsResponse.value;
          staffData = {
            totalStaff: staffStats.total_staff || 0,
            activeStaff: staffStats.staff_performance?.length || 0,
          };
        }

        // Update state with real data
        setDashboardData({
          orders: ordersData,
          reservations: reservationsData,
          inventory: inventoryData,
          staff: staffData,
        });

        setRecentOrders(recentOrdersData);
        setLowStockItems(lowStockItemsData);

        // Process chart data
        const chartDataProcessed = {
          // Table Performance Chart
          tablePerformanceData: {
            labels: [
              "Table 1",
              "Table 2",
              "Table 3",
              "Table 4",
              "Table 5",
              "Table 6",
              "Table 7",
              "Table 8",
            ],
            datasets: [
              {
                label: "Orders Count",
                data: [12, 8, 15, 10, 18, 14, 9, 11],
                backgroundColor: "rgba(192, 80, 80, 0.8)",
                borderColor: "rgba(192, 80, 80, 1)",
                borderWidth: 2,
                borderRadius: 4,
              },
            ],
          },
          ordersPieData: {
            labels: ["Completed", "Pending", "Preparing", "Cancelled"],
            datasets: [
              {
                data: [
                  ordersData.completed,
                  ordersData.pending,
                  ordersData.total -
                    ordersData.completed -
                    ordersData.pending -
                    ordersData.cancelled, // Preparing
                  ordersData.cancelled,
                ],
                backgroundColor: [
                  "rgba(34, 197, 94, 0.8)", // Green for completed
                  "rgba(251, 191, 36, 0.8)", // Yellow for pending
                  "rgba(59, 130, 246, 0.8)", // Blue for preparing
                  "rgba(239, 68, 68, 0.8)", // Red for cancelled
                ],
                borderColor: [
                  "rgba(34, 197, 94, 1)",
                  "rgba(251, 191, 36, 1)",
                  "rgba(59, 130, 246, 1)",
                  "rgba(239, 68, 68, 1)",
                ],
                borderWidth: 2,
              },
            ],
          },
          reservationsData: {
            labels: ["Pending", "Confirmed", "Cancelled"],
            datasets: [
              {
                data: [
                  reservationsData.pending,
                  reservationsData.confirmed,
                  reservationsData.cancelled,
                ],
                backgroundColor: [
                  "rgba(251, 191, 36, 0.8)", // Yellow for pending
                  "rgba(34, 197, 94, 0.8)", // Green for confirmed
                  "rgba(239, 68, 68, 0.8)", // Red for cancelled
                ],
                borderColor: [
                  "rgba(251, 191, 36, 1)",
                  "rgba(34, 197, 94, 1)",
                  "rgba(239, 68, 68, 1)",
                ],
                borderWidth: 2,
              },
            ],
          },
        };

        setChartData(chartDataProcessed);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError(
          "Failed to load dashboard data. Please check your connection and try again."
        );
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "preparing":
        return "text-blue-600 bg-blue-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "preparing":
        return <Clock className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: "Inter, sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(192, 80, 80, 1)",
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
            family: "Inter, sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(192, 80, 80, 1)",
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C05050]"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center text-red-600 py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen rounded-r-2xl p-8">
        {/* Header section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide">Dashboard</h1>
            <p className="text-[#ababab]">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="text-sm text-[#ababab]">Last updated: {new Date().toLocaleString()}</div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">Total Revenue</p>
            <div className="text-2xl font-bold text-[#f6b100] my-2">₱{dashboardData.orders.totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-green-500 flex items-center">+12.5% from last month</div>
          </div>
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">Total Orders</p>
            <div className="text-2xl font-bold text-[#f5f5f5] my-2">{dashboardData.orders.total}</div>
            <div className="text-xs text-blue-400 flex items-center">{dashboardData.orders.pending} pending</div>
          </div>
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">Reservations</p>
            <div className="text-2xl font-bold text-[#e3bfff] my-2">{dashboardData.reservations.total}</div>
            <div className="text-xs text-purple-300 flex items-center">{dashboardData.reservations.pending} pending</div>
          </div>
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">Low Stock Items</p>
            <div className="text-2xl font-bold text-[#ffbd4f] my-2">{dashboardData.inventory.lowStock}</div>
            <div className="text-xs text-orange-400 flex items-center">Needs attention</div>
          </div>
        </div>

        {/* Chart cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">Orders Status</h3>
              <PieChart className="w-5 h-5 text-[#ababab]" />
            </div>
            <div className="h-64">
              {chartData.ordersPieData ? (
                <Pie data={chartData.ordersPieData} options={pieChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center bg-[#262626] rounded-lg">
                  <PieChart className="w-12 h-12 text-[#383838] mx-auto mb-2" />
                  <p className="text-[#ababab]">Loading chart data...</p>
                </div>
              )}
            </div>
          </div>
          {/* Add more chart cards as in your original UI, but keep bg and styles consistent */}
        </div>

        {/* Table Performance & Status Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table Performance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Table Performance
              </h3>
              <Users className="w-5 h-5 text-gray-500" />
            </div>
            <div className="h-64">
              {chartData.tablePerformanceData ? (
                <Bar
                  data={chartData.tablePerformanceData}
                  options={chartOptions}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading chart data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reservations Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Reservations Status
              </h3>
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            <div className="h-64">
              {chartData.reservationsData ? (
                <Pie
                  data={chartData.reservationsData}
                  options={pieChartOptions}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading chart data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders and Low Stock Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Orders
              </h3>
              <ShoppingCart className="w-5 h-5 text-gray-500" />
            </div>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.customer_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Table {order.table_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₱{order.total_amount}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Low Stock Alert
              </h3>
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="space-y-3">
              {lowStockItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.expiring
                      ? "bg-red-50 border-red-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        item.expiring ? "text-red-500" : "text-orange-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.category}</p>
                      {item.expiring && (
                        <p className="text-xs text-red-500">
                          Expires:{" "}
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        item.expiring ? "text-red-600" : "text-orange-600"
                      }`}
                    >
                      {item.quantity} {item.unit}
                    </p>
                    <p
                      className={`text-xs ${
                        item.expiring ? "text-red-500" : "text-orange-500"
                      }`}
                    >
                      {item.expiring ? "Expiring Soon" : "Low Stock"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Performance Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Staff Performance
            </h3>
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData.staff.totalStaff}
              </p>
              <p className="text-sm text-gray-600">Total Staff</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {dashboardData.staff.activeStaff}
              </p>
              <p className="text-sm text-gray-600">Active Today</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                ₱{dashboardData.orders.averageOrderValue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Avg Order Value</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
