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
    return apiService.makeRequest("/materials");
  },

  // Get expiring inventory items
  getExpiringInventory: async () => {
    return apiService.makeRequest("/materials/expiring/soon");
  },

  // Get staff performance stats
  getStaffStats: async () => {
    return apiService.makeRequest("/orders/stats/staff");
  },

  // Get daily sales data
  getDailySales: async (date) => {
    const targetDate = date || new Date().toISOString().split("T")[0];
    return apiService.makeRequest(`/orders/sales/daily?date=${targetDate}`);
  },

  // Get weekly sales data
  getWeeklySales: async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split("T")[0];
    return apiService.makeRequest(`/orders/sales/weekly?week_start=${weekStartDate}`);
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
    salesTrendData: null,
    ordersPieData: null,
    reservationsData: null,
    weeklySalesData: null,
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
          dailySalesResponse,
          weeklySalesResponse,
        ] = await Promise.allSettled([
          apiService.getOrdersStats(),
          apiService.getRecentOrders(5),
          apiService.getReservations(),
          apiService.getInventory(),
          apiService.getExpiringInventory(),
          apiService.getStaffStats(),
          apiService.getDailySales(),
          apiService.getWeeklySales(),
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

        // Process sales data for charts
        let salesTrendData = null;
        let weeklySalesData = null;

        // Process daily sales (last 7 days) - using hourly breakdown from today
        if (dailySalesResponse.status === "fulfilled") {
          const dailySales = dailySalesResponse.value;
          // Use hourly breakdown to show sales throughout the day
          if (dailySales.hourly_breakdown && dailySales.hourly_breakdown.length > 0) {
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const revenueData = new Array(24).fill(0);
            dailySales.hourly_breakdown.forEach((item) => {
              revenueData[item._id] = item.revenue || 0;
            });
            salesTrendData = {
              labels: hours.map((h) => `${h}:00`),
              datasets: [
                {
                  label: "Hourly Revenue (₱)",
                  data: revenueData,
                  backgroundColor: "rgba(246, 177, 0, 0.2)",
                  borderColor: "rgba(246, 177, 0, 1)",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                },
              ],
            };
          } else {
            // Fallback: show last 7 days structure
            const last7Days = [];
            const last7DaysRevenue = [];
            for (let i = 6; i >= 0; i--) {
              const date = new Date();
              date.setDate(date.getDate() - i);
              last7Days.push(date.toLocaleDateString("en-US", { weekday: "short" }));
              last7DaysRevenue.push(dailySales.summary?.total_revenue || 0);
            }
            salesTrendData = {
              labels: last7Days,
              datasets: [
                {
                  label: "Daily Revenue (₱)",
                  data: last7DaysRevenue,
                  backgroundColor: "rgba(246, 177, 0, 0.2)",
                  borderColor: "rgba(246, 177, 0, 1)",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                },
              ],
            };
          }
        }

        // Process weekly sales breakdown
        if (weeklySalesResponse.status === "fulfilled") {
          const weeklySales = weeklySalesResponse.value;
          if (weeklySales.daily_breakdown && weeklySales.daily_breakdown.length > 0) {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const revenueData = new Array(7).fill(0);
            weeklySales.daily_breakdown.forEach((item) => {
              const dayIndex = item._id === 1 ? 0 : item._id - 1;
              revenueData[dayIndex] = item.revenue || 0;
            });
            weeklySalesData = {
              labels: days,
              datasets: [
                {
                  label: "Revenue (₱)",
                  data: revenueData,
                  backgroundColor: "rgba(192, 80, 80, 0.8)",
                  borderColor: "rgba(192, 80, 80, 1)",
                  borderWidth: 2,
                  borderRadius: 4,
                },
              ],
            };
          }
        }

        // Process chart data
        const chartDataProcessed = {
          // Sales Trend Chart (Today's Hourly or Last 7 Days)
          salesTrendData: salesTrendData || {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [
              {
                label: "Hourly Revenue (₱)",
                data: Array(24).fill(0),
                backgroundColor: "rgba(246, 177, 0, 0.2)",
                borderColor: "rgba(246, 177, 0, 1)",
                borderWidth: 2,
                fill: true,
                tension: 0.4,
              },
            ],
          },
          // Weekly Sales Breakdown
          weeklySalesData: weeklySalesData || {
            labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            datasets: [
              {
                label: "Revenue (₱)",
                data: [0, 0, 0, 0, 0, 0, 0],
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
                  "rgba(147, 51, 234, 0.8)", // Purple for preparing
                  "rgba(239, 68, 68, 0.8)", // Red for cancelled
                ],
                borderColor: [
                  "rgba(34, 197, 94, 1)",
                  "rgba(251, 191, 36, 1)",
                  "rgba(147, 51, 234, 1)",
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
        return "text-green-400 bg-green-400/10 border border-green-400/30";
      case "pending":
        return "text-yellow-400 bg-yellow-400/10 border border-yellow-400/30";
      case "preparing":
        return "text-purple-400 bg-purple-400/10 border border-purple-400/30";
      case "cancelled":
        return "text-red-400 bg-red-400/10 border border-red-400/30";
      default:
        return "text-[#ababab] bg-[#1f1f1f] border border-[#383838]";
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
          color: "#f5f5f5",
        },
      },
      tooltip: {
        backgroundColor: "rgba(35, 35, 35, 0.95)",
        titleColor: "#f5f5f5",
        bodyColor: "#f5f5f5",
        borderColor: "rgba(192, 80, 80, 1)",
        borderWidth: 1,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "#ababab",
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
          color: "#ababab",
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
          color: "#f5f5f5",
        },
      },
      tooltip: {
        backgroundColor: "rgba(35, 35, 35, 0.95)",
        titleColor: "#f5f5f5",
        bodyColor: "#f5f5f5",
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
            <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide">
              Dashboard
            </h1>
            <p className="text-[#ababab]">
              Welcome back! Here's what's happening today.
            </p>
          </div>
          <div className="text-sm text-[#ababab]">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">
              Total Revenue
            </p>
            <div className="text-2xl font-bold text-[#f6b100] my-2">
              ₱{dashboardData.orders.totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-green-500 flex items-center">
              +12.5% from last month
            </div>
          </div>
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">Total Orders</p>
            <div className="text-2xl font-bold text-[#f5f5f5] my-2">
              {dashboardData.orders.total}
            </div>
            <div className="text-xs text-blue-400 flex items-center">
              {dashboardData.orders.pending} pending
            </div>
          </div>
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">Reservations</p>
            <div className="text-2xl font-bold text-[#e3bfff] my-2">
              {dashboardData.reservations.total}
            </div>
            <div className="text-xs text-purple-300 flex items-center">
              {dashboardData.reservations.pending} pending
            </div>
          </div>
          <div className="rounded-xl shadow-lg bg-[#232323] border border-[#383838] p-6">
            <p className="text-md text-[#ababab] font-semibold">
              Low Stock Items
            </p>
            <div className="text-2xl font-bold text-[#ffbd4f] my-2">
              {dashboardData.inventory.lowStock}
            </div>
            <div className="text-xs text-orange-400 flex items-center">
              Needs attention
            </div>
          </div>
        </div>

        {/* Chart cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">
                Orders Status
              </h3>
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

        {/* Sales Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend (Today's Hourly Sales) */}
          <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">
                Today's Sales Trend (Hourly)
              </h3>
              <TrendingUp className="w-5 h-5 text-[#f6b100]" />
            </div>
            <div className="h-64">
              {chartData.salesTrendData ? (
                <Line
                  data={chartData.salesTrendData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        ...chartOptions.plugins.legend,
                        labels: {
                          ...chartOptions.plugins.legend.labels,
                          color: "#f5f5f5",
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-[#1f1f1f] rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-[#383838] mx-auto mb-2" />
                    <p className="text-[#ababab]">Loading chart data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Sales Breakdown */}
          <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">
                Weekly Sales Breakdown
              </h3>
              <BarChart3 className="w-5 h-5 text-[#C05050]" />
            </div>
            <div className="h-64">
              {chartData.weeklySalesData ? (
                <Bar
                  data={chartData.weeklySalesData}
                  options={chartOptions}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-[#1f1f1f] rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-[#383838] mx-auto mb-2" />
                    <p className="text-[#ababab]">Loading chart data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reservations Status */}
          <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">
                Reservations Status
              </h3>
              <Calendar className="w-5 h-5 text-[#ababab]" />
            </div>
            <div className="h-64">
              {chartData.reservationsData ? (
                <Pie
                  data={chartData.reservationsData}
                  options={pieChartOptions}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-[#1f1f1f] rounded-lg">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-[#383838] mx-auto mb-2" />
                    <p className="text-[#ababab]">Loading chart data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders and Low Stock Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">
                Recent Orders
              </h3>
              <ShoppingCart className="w-5 h-5 text-[#ababab]" />
            </div>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-[#1f1f1f] border border-[#383838] rounded-lg"
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
                      <p className="font-medium text-[#f5f5f5]">
                        {order.customer_name}
                      </p>
                      <p className="text-sm text-[#ababab]">
                        Table {order.table_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#f6b100]">
                      ₱{order.total_amount}
                    </p>
                    <p className="text-xs text-[#ababab]">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#f5f5f5]">
                Low Stock Alert
              </h3>
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div className="space-y-3">
              {lowStockItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.expiring
                      ? "bg-red-400/10 border-red-400/30"
                      : "bg-orange-400/10 border-orange-400/30"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        item.expiring ? "text-red-400" : "text-orange-400"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-[#f5f5f5]">{item.name}</p>
                      <p className="text-sm text-[#ababab]">{item.category}</p>
                      {item.expiring && (
                        <p className="text-xs text-red-400">
                          Expires:{" "}
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        item.expiring ? "text-red-400" : "text-orange-400"
                      }`}
                    >
                      {item.quantity} {item.unit}
                    </p>
                    <p
                      className={`text-xs ${
                        item.expiring ? "text-red-400" : "text-orange-400"
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
        <div className="bg-[#232323] rounded-xl shadow-lg border border-[#383838] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#f5f5f5]">
              Staff Performance
            </h3>
            <Users className="w-5 h-5 text-[#ababab]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-400/10 border border-blue-400/30 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">
                {dashboardData.staff.totalStaff}
              </p>
              <p className="text-sm text-[#ababab]">Total Staff</p>
            </div>
            <div className="text-center p-4 bg-green-400/10 border border-green-400/30 rounded-lg">
              <p className="text-2xl font-bold text-green-400">
                {dashboardData.staff.activeStaff}
              </p>
              <p className="text-sm text-[#ababab]">Active Today</p>
            </div>
            <div className="text-center p-4 bg-purple-400/10 border border-purple-400/30 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">
                ₱{dashboardData.orders.averageOrderValue.toFixed(2)}
              </p>
              <p className="text-sm text-[#ababab]">Avg Order Value</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
