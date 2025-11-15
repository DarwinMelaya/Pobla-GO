import Layout from "../../components/Layout/Layout";
import { useState, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Box,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
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
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const API_BASE_URL = "http://localhost:5000";

const AdminInventoryReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportsData, setReportsData] = useState(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/materials/reports?lowStockThreshold=${lowStockThreshold}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          throw new Error("Authentication failed");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setReportsData(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch reports");
      }
    } catch (err) {
      console.error("Fetch reports error:", err);
      setError(err.message || "Failed to load inventory reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [lowStockThreshold]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilExpiryColor = (days) => {
    if (days <= 7) return "text-red-600 bg-red-100";
    if (days <= 30) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  // Chart data
  const categoryChartData = reportsData?.categoryStats
    ? {
        labels: reportsData.categoryStats.map((cat) => cat.category),
        datasets: [
          {
            label: "Items Count",
            data: reportsData.categoryStats.map((cat) => cat.count),
            backgroundColor: "rgba(192, 80, 80, 0.8)",
            borderColor: "rgba(192, 80, 80, 1)",
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
      }
    : null;

  const typeChartData = reportsData?.typeStats
    ? {
        labels: reportsData.typeStats.map((type) =>
          type.type.replace("_", " ").toUpperCase()
        ),
        datasets: [
          {
            data: reportsData.typeStats.map((type) => type.count),
            backgroundColor: [
              "rgba(192, 80, 80, 0.8)",
              "rgba(59, 130, 246, 0.8)",
              "rgba(34, 197, 94, 0.8)",
            ],
            borderColor: [
              "rgba(192, 80, 80, 1)",
              "rgba(59, 130, 246, 1)",
              "rgba(34, 197, 94, 1)",
            ],
            borderWidth: 2,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: "Inter, sans-serif",
          },
          color: "#f5f5f5",
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
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#f5f5f5",
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
          color: "#f5f5f5",
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
        <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-[#c05050] animate-spin mx-auto mb-4" />
            <p className="text-[#f5f5f5]">Loading inventory reports...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchReports}
              className="mt-4 px-4 py-2 bg-[#c05050] text-white rounded hover:bg-[#a04040] transition"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!reportsData) {
    return (
      <Layout>
        <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
          <p className="text-[#f5f5f5]">No data available</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide mb-2">
              Inventory Reports
            </h1>
            <p className="text-[#a0a0a0]">
              Comprehensive inventory analytics and insights
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-[#f5f5f5] text-sm">
                Low Stock Threshold:
              </label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-20 px-3 py-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded text-[#f5f5f5] focus:outline-none focus:border-[#c05050]"
                min="0"
              />
            </div>
            <button
              onClick={fetchReports}
              className="px-4 py-2 bg-[#c05050] text-white rounded hover:bg-[#a04040] transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-[#c05050]" />
              <span className="text-2xl font-bold text-[#f5f5f5]">
                {reportsData.summary.totalItems}
              </span>
            </div>
            <p className="text-[#a0a0a0] text-sm">Total Items</p>
            <p className="text-[#f5f5f5] text-xs mt-1">
              {reportsData.summary.totalQuantity.toLocaleString()} total
              quantity
            </p>
          </div>

          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-[#f5f5f5]">
                {formatCurrency(reportsData.summary.totalValue)}
              </span>
            </div>
            <p className="text-[#a0a0a0] text-sm">Total Inventory Value</p>
            <p className="text-[#f5f5f5] text-xs mt-1">
              {reportsData.summary.totalAvailable.toLocaleString()} available
            </p>
          </div>

          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <span className="text-2xl font-bold text-[#f5f5f5]">
                {reportsData.alerts.lowStockCount}
              </span>
            </div>
            <p className="text-[#a0a0a0] text-sm">Low Stock Items</p>
            <p className="text-[#f5f5f5] text-xs mt-1">
              {reportsData.alerts.outOfStockCount} out of stock
            </p>
          </div>

          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold text-[#f5f5f5]">
                {reportsData.alerts.expiringCount}
              </span>
            </div>
            <p className="text-[#a0a0a0] text-sm">Expiring Soon (30 days)</p>
            <p className="text-[#f5f5f5] text-xs mt-1">
              {reportsData.alerts.urgentExpiringCount} urgent (&lt;7 days)
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Inventory by Category
            </h3>
            {categoryChartData && (
              <div className="h-64">
                <Bar data={categoryChartData} options={chartOptions} />
              </div>
            )}
          </div>

          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Inventory by Type
            </h3>
            {typeChartData && (
              <div className="h-64">
                <Pie data={typeChartData} options={pieChartOptions} />
              </div>
            )}
          </div>
        </div>

        {/* Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Low Stock Items */}
          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-yellow-500" />
              Low Stock Items ({reportsData.lowStockItems.length})
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {reportsData.lowStockItems.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#3a3a3a]">
                      <th className="text-left py-2 text-[#a0a0a0]">Item</th>
                      <th className="text-right py-2 text-[#a0a0a0]">
                        Quantity
                      </th>
                      <th className="text-right py-2 text-[#a0a0a0]">
                        Available
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsData.lowStockItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[#3a3a3a] hover:bg-[#333333]"
                      >
                        <td className="py-2 text-[#f5f5f5]">{item.name}</td>
                        <td className="py-2 text-right text-[#f5f5f5]">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 text-right text-[#f5f5f5]">
                          {item.available} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[#a0a0a0]">No low stock items</p>
              )}
            </div>
          </div>

          {/* Expiring Items */}
          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              Expiring Items ({reportsData.expiringItems.length})
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {reportsData.expiringItems.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#3a3a3a]">
                      <th className="text-left py-2 text-[#a0a0a0]">Item</th>
                      <th className="text-right py-2 text-[#a0a0a0]">
                        Quantity
                      </th>
                      <th className="text-right py-2 text-[#a0a0a0]">
                        Expires
                      </th>
                      <th className="text-right py-2 text-[#a0a0a0]">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsData.expiringItems.slice(0, 10).map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[#3a3a3a] hover:bg-[#333333]"
                      >
                        <td className="py-2 text-[#f5f5f5]">{item.name}</td>
                        <td className="py-2 text-right text-[#f5f5f5]">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 text-right text-[#a0a0a0]">
                          {formatDate(item.expiry_date)}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getDaysUntilExpiryColor(
                              item.daysUntilExpiry
                            )}`}
                          >
                            {item.daysUntilExpiry} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[#a0a0a0]">No expiring items</p>
              )}
            </div>
          </div>
        </div>

        {/* Category Statistics */}
        <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a] mb-6">
          <h3 className="text-xl font-bold text-[#f5f5f5] mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Category Statistics
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#3a3a3a]">
                  <th className="text-left py-3 text-[#a0a0a0]">Category</th>
                  <th className="text-right py-3 text-[#a0a0a0]">Items</th>
                  <th className="text-right py-3 text-[#a0a0a0]">
                    Total Quantity
                  </th>
                  <th className="text-right py-3 text-[#a0a0a0]">
                    Total Value
                  </th>
                  <th className="text-right py-3 text-[#a0a0a0]">Low Stock</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.categoryStats.map((cat, index) => (
                  <tr
                    key={index}
                    className="border-b border-[#3a3a3a] hover:bg-[#333333]"
                  >
                    <td className="py-3 text-[#f5f5f5] font-medium">
                      {cat.category}
                    </td>
                    <td className="py-3 text-right text-[#f5f5f5]">
                      {cat.count}
                    </td>
                    <td className="py-3 text-right text-[#f5f5f5]">
                      {cat.totalQuantity.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-[#f5f5f5]">
                      {formatCurrency(cat.totalValue)}
                    </td>
                    <td className="py-3 text-right">
                      {cat.lowStockCount > 0 ? (
                        <span className="px-2 py-1 rounded text-xs text-yellow-600 bg-yellow-100">
                          {cat.lowStockCount}
                        </span>
                      ) : (
                        <span className="text-[#a0a0a0]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Items by Value */}
        <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a] mb-6">
          <h3 className="text-xl font-bold text-[#f5f5f5] mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Top Items by Value
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#3a3a3a]">
                  <th className="text-left py-3 text-[#a0a0a0]">Item</th>
                  <th className="text-left py-3 text-[#a0a0a0]">Category</th>
                  <th className="text-right py-3 text-[#a0a0a0]">Quantity</th>
                  <th className="text-right py-3 text-[#a0a0a0]">Unit Price</th>
                  <th className="text-right py-3 text-[#a0a0a0]">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportsData.topItemsByValue.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#3a3a3a] hover:bg-[#333333]"
                  >
                    <td className="py-3 text-[#f5f5f5] font-medium">
                      {item.name}
                    </td>
                    <td className="py-3 text-[#a0a0a0]">{item.category}</td>
                    <td className="py-3 text-right text-[#f5f5f5]">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 text-right text-[#f5f5f5]">
                      {formatCurrency(item.purchase_price || 0)}
                    </td>
                    <td className="py-3 text-right text-[#f5f5f5] font-medium">
                      {formatCurrency(item.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Statistics */}
        {reportsData.supplierStats && reportsData.supplierStats.length > 0 && (
          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-[#3a3a3a]">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Supplier Statistics
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#3a3a3a]">
                    <th className="text-left py-3 text-[#a0a0a0]">Supplier</th>
                    <th className="text-right py-3 text-[#a0a0a0]">Items</th>
                    <th className="text-right py-3 text-[#a0a0a0]">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData.supplierStats.map((supplier, index) => (
                    <tr
                      key={index}
                      className="border-b border-[#3a3a3a] hover:bg-[#333333]"
                    >
                      <td className="py-3 text-[#f5f5f5] font-medium">
                        {supplier.supplier}
                      </td>
                      <td className="py-3 text-right text-[#f5f5f5]">
                        {supplier.count}
                      </td>
                      <td className="py-3 text-right text-[#f5f5f5]">
                        {formatCurrency(supplier.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminInventoryReports;
