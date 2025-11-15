import Layout from "../../components/Layout/Layout";
import { useState, useEffect } from "react";
import { TrendingUp, Receipt, Download, BarChart3 } from "lucide-react";
import toast from "react-hot-toast";
import AllSalesReports from "../../components/Admin/Reports/AllSalesReports";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// API Base URL
const API_BASE_URL = "http://localhost:5000";

const AdminViewSales = () => {
  // State for different views
  const [activeView, setActiveView] = useState("allSales");
  const [loading, setLoading] = useState(false);

  // State for monthly sales
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // State for transaction records
  const [transactions, setTransactions] = useState([]);
  const [transactionFilters, setTransactionFilters] = useState({
    date_from: "",
    date_to: "",
    payment_method: "",
    status: "",
    page: 1,
    limit: 20,
  });
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Get authentication token
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Make authenticated API request
  const makeRequest = async (url, options = {}) => {
    const token = getAuthToken();
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
  };

  // Fetch monthly sales data
  const fetchMonthlySales = async (year, month) => {
    setLoading(true);
    try {
      const data = await makeRequest(
        `/orders/sales/monthly?year=${year}&month=${month}`
      );
      setMonthlyData(data);
    } catch (error) {
      toast.error("Failed to fetch monthly sales data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction records
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(transactionFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const data = await makeRequest(`/orders/transactions?${queryParams}`);
      setTransactions(data.transactions);
      setTotalTransactions(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error("Failed to fetch transaction records");
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    if (activeView === "monthly") {
      fetchMonthlySales(selectedYear, selectedMonth);
    } else if (activeView === "transactions") {
      fetchTransactions();
    }
  }, [activeView, selectedYear, selectedMonth, transactionFilters]);

  // Chart data preparation functions
  const prepareDailyBreakdownChartData = (dailyData) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const ordersData = new Array(7).fill(0);
    const revenueData = new Array(7).fill(0);

    dailyData.forEach((item) => {
      const dayIndex = item._id === 1 ? 0 : item._id - 1; // MongoDB dayOfWeek starts from Sunday (1)
      ordersData[dayIndex] = item.orders;
      revenueData[dayIndex] = item.revenue;
    });

    return {
      labels: days,
      datasets: [
        {
          label: "Orders",
          data: ordersData,
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
        {
          label: "Revenue (₱)",
          data: revenueData,
          backgroundColor: "rgba(16, 185, 129, 0.5)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
          yAxisID: "y1",
        },
      ],
    };
  };

  const prepareTopItemsChartData = (topItems) => {
    return {
      labels: topItems.map((item) => item._id),
      datasets: [
        {
          label: "Quantity Sold",
          data: topItems.map((item) => item.total_quantity),
          backgroundColor: "rgba(168, 85, 247, 0.5)",
          borderColor: "rgba(168, 85, 247, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Sales Performance",
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Export functions
  const exportToCSV = (data, filename) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      data.map((row) => Object.values(row).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTransactionReport = () => {
    const reportData = [
      [
        "Order ID",
        "Customer",
        "Table",
        "Total Amount",
        "Payment Method",
        "Status",
        "Date",
        "Staff Member",
      ],
      ...transactions.map((t) => [
        t._id,
        t.customer_name,
        t.table_number,
        t.total_amount,
        t.payment_method,
        t.status,
        new Date(t.created_at).toLocaleString(),
        t.staff_member?.name || "N/A",
      ]),
    ];
    exportToCSV(
      reportData,
      `transactions-${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header row */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5]">
              Sales Recording & Analytics
            </h1>
            <p className="text-[#ababab] mt-1">
              Track and analyze sales performance
            </p>
          </div>
          {/* Page actions: updated POS button style */}
          <div className="flex space-x-2">
            {activeView === "transactions" && (
              <button
                onClick={exportTransactionReport}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Transactions</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs: dark, bold white, POS accent on selected, as in modals */}
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "allSales", label: "All Sales Reports", icon: BarChart3 },
              { id: "monthly", label: "Monthly Sales", icon: TrendingUp },
              {
                id: "transactions",
                label: "Transaction Records",
                icon: Receipt,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                    activeView === tab.id
                      ? "border-blue-500 text-blue-500"
                      : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* All Sales Reports View */}
        {activeView === "allSales" && <AllSalesReports />}

        {/* Monthly Sales View */}
        {activeView === "monthly" && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Select Month:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : monthlyData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Receipt className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                          Total Orders
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {monthlyData.summary.total_orders}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₱{monthlyData.summary.total_revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                          Average Order Value
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₱{monthlyData.summary.average_order_value.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Weekly Breakdown
                    </h3>
                    <Bar
                      data={prepareDailyBreakdownChartData(
                        monthlyData.weekly_breakdown
                      )}
                      options={chartOptions}
                    />
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Top Selling Items
                    </h3>
                    <Bar
                      data={prepareTopItemsChartData(
                        monthlyData.top_selling_items
                      )}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No data available for the selected month
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transaction Records View */}
        {activeView === "transactions" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-[#232323] rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Filter Transactions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={transactionFilters.date_from}
                    onChange={(e) =>
                      setTransactionFilters({
                        ...transactionFilters,
                        date_from: e.target.value,
                        page: 1,
                      })
                    }
                    className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1f1f1f] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={transactionFilters.date_to}
                    onChange={(e) =>
                      setTransactionFilters({
                        ...transactionFilters,
                        date_to: e.target.value,
                        page: 1,
                      })
                    }
                    className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1f1f1f] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={transactionFilters.payment_method}
                    onChange={(e) =>
                      setTransactionFilters({
                        ...transactionFilters,
                        payment_method: e.target.value,
                        page: 1,
                      })
                    }
                    className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1f1f1f] text-white"
                  >
                    <option value="">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="digital">Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={transactionFilters.status}
                    onChange={(e) =>
                      setTransactionFilters({
                        ...transactionFilters,
                        status: e.target.value,
                        page: 1,
                      })
                    }
                    className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1f1f1f] text-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transaction Table */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="bg-[#232323] rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-white">
                    Transaction Records ({totalTransactions} total)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
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
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Staff
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction._id.slice(-8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.customer_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.table_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {transaction.order_items?.length || 0} items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₱{transaction.total_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.payment_method === "cash"
                                  ? "bg-green-100 text-green-800"
                                  : transaction.payment_method === "card"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {transaction.payment_method
                                ?.charAt(0)
                                .toUpperCase() +
                                transaction.payment_method?.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : transaction.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : transaction.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {transaction.status?.charAt(0).toUpperCase() +
                                transaction.status?.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.staff_member?.name || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page {transactionFilters.page} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          setTransactionFilters({
                            ...transactionFilters,
                            page: Math.max(1, transactionFilters.page - 1),
                          })
                        }
                        disabled={transactionFilters.page === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setTransactionFilters({
                            ...transactionFilters,
                            page: Math.min(
                              totalPages,
                              transactionFilters.page + 1
                            ),
                          })
                        }
                        disabled={transactionFilters.page === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminViewSales;
