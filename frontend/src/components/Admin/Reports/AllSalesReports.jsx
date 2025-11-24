import { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Receipt,
  TrendingUp,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

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

// API Base URL
const API_BASE_URL = "http://localhost:5000";

const AllSalesReports = () => {
  // State for sub-view (daily, monthly, or annual)
  const [activeSubView, setActiveSubView] = useState("daily");
  const [loading, setLoading] = useState(false);

  // State for daily sales
  const [dailyData, setDailyData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // State for monthly sales
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  // State for annual sales
  const [annualData, setAnnualData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

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

  // Fetch daily sales data
  const fetchDailySales = async (date) => {
    setLoading(true);
    try {
      const data = await makeRequest(`/orders/sales/daily?date=${date}`);
      setDailyData(data);
    } catch (error) {
      toast.error("Failed to fetch daily sales data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly sales data
  const fetchMonthlySales = async (monthString) => {
    setLoading(true);
    try {
      const [year, month] = monthString.split("-");
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

  // Fetch annual sales data
  const fetchAnnualSales = async (year) => {
    setLoading(true);
    try {
      const data = await makeRequest(`/orders/sales/annual?year=${year}`);
      setAnnualData(data);
    } catch (error) {
      toast.error("Failed to fetch annual sales data");
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    if (activeSubView === "daily") {
      fetchDailySales(selectedDate);
    } else if (activeSubView === "monthly") {
      if (selectedMonth) {
        fetchMonthlySales(selectedMonth);
      }
    } else if (activeSubView === "annual") {
      if (selectedYear) {
        fetchAnnualSales(selectedYear);
      }
    }
  }, [activeSubView, selectedDate, selectedMonth, selectedYear]);

  // Chart data preparation functions
  const prepareHourlyChartData = (hourlyData) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const ordersData = new Array(24).fill(0);
    const revenueData = new Array(24).fill(0);

    hourlyData.forEach((item) => {
      ordersData[item._id] = item.orders;
      revenueData[item._id] = item.revenue;
    });

    return {
      labels: hours.map((h) => `${h}:00`),
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

  const preparePaymentMethodChartData = (paymentData) => {
    return {
      labels: paymentData.map(
        (item) => item._id.charAt(0).toUpperCase() + item._id.slice(1)
      ),
      datasets: [
        {
          data: paymentData.map((item) => item.total_amount),
          backgroundColor: [
            "rgba(239, 68, 68, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(16, 185, 129, 0.8)",
          ],
          borderColor: [
            "rgba(239, 68, 68, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(16, 185, 129, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareMonthlyBreakdownChartData = (monthlyData) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const ordersData = new Array(12).fill(0);
    const revenueData = new Array(12).fill(0);

    monthlyData.forEach((item) => {
      const monthIndex = item._id - 1; // MongoDB month starts from 1
      ordersData[monthIndex] = item.orders;
      revenueData[monthIndex] = item.revenue;
    });

    return {
      labels: months,
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

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
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

  const exportDailyReport = () => {
    if (!dailyData) return;
    const reportData = [
      ["Date", "Total Orders", "Total Revenue", "Average Order Value"],
      [
        dailyData.date,
        dailyData.summary.total_orders || 0,
        dailyData.summary.total_revenue || 0,
        dailyData.summary.average_order_value || 0,
      ],
    ];
    exportToCSV(reportData, `daily-sales-${dailyData.date}.csv`);
  };

  const exportMonthlyReport = () => {
    if (!monthlyData) return;
    const reportData = [
      ["Year", "Month", "Total Orders", "Total Revenue", "Average Order Value"],
      [
        monthlyData.year,
        monthlyData.month_name,
        monthlyData.summary.total_orders || 0,
        monthlyData.summary.total_revenue || 0,
        monthlyData.summary.average_order_value || 0,
      ],
    ];
    exportToCSV(
      reportData,
      `monthly-sales-${monthlyData.year}-${monthlyData.month}.csv`
    );
  };

  const exportAnnualReport = () => {
    if (!annualData) return;
    const reportData = [
      ["Year", "Total Orders", "Total Revenue", "Average Order Value"],
      [
        annualData.year,
        annualData.summary.total_orders || 0,
        annualData.summary.total_revenue || 0,
        annualData.summary.average_order_value || 0,
      ],
    ];
    exportToCSV(reportData, `annual-sales-${annualData.year}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs for Daily/Monthly/Annual */}
      <div className="bg-[#232323] rounded-lg p-1 inline-flex border border-gray-700">
        <nav className="flex space-x-1">
          {[
            { id: "daily", label: "Daily Sales", icon: Calendar },
            { id: "monthly", label: "Monthly Sales", icon: BarChart3 },
            { id: "annual", label: "Annual Sales", icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubView(tab.id)}
                className={`flex items-center space-x-2 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                  activeSubView === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Daily Sales View */}
      {activeSubView === "daily" && (
        <>
          {/* Filter card */}
          <div className="bg-[#232323] rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Filter Daily Sales
              </h3>
              <button
                onClick={exportDailyReport}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Daily Report</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1f1f1f] text-white"
                />
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : dailyData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Receipt className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Total Orders
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {dailyData.summary.total_orders || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₱
                        {dailyData.summary.total_revenue
                          ? dailyData.summary.total_revenue.toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Average Order Value
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₱
                        {dailyData.summary.average_order_value
                          ? dailyData.summary.average_order_value.toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#232323] rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Hourly Sales Breakdown
                  </h3>
                  {dailyData.hourly_breakdown &&
                  dailyData.hourly_breakdown.length > 0 ? (
                    <Bar
                      data={prepareHourlyChartData(dailyData.hourly_breakdown)}
                      options={chartOptions}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        No hourly data available for the selected date
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-[#232323] rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Payment Methods
                  </h3>
                  {dailyData.payment_methods &&
                  dailyData.payment_methods.length > 0 ? (
                    <Pie
                      data={preparePaymentMethodChartData(
                        dailyData.payment_methods
                      )}
                      options={pieChartOptions}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        No payment method data available for the selected date
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No data available for the selected date
              </p>
            </div>
          )}
        </>
      )}

      {/* Monthly Sales View */}
      {activeSubView === "monthly" && (
        <div className="space-y-6">
          <div className="bg-[#232323] rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Filter Monthly Sales
              </h3>
              <button
                onClick={exportMonthlyReport}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Monthly Report</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-300">
                Select Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1f1f1f] text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : monthlyData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Receipt className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Total Orders
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {monthlyData.summary.total_orders || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₱
                        {monthlyData.summary.total_revenue
                          ? monthlyData.summary.total_revenue.toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Average Order Value
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₱
                        {monthlyData.summary.average_order_value
                          ? monthlyData.summary.average_order_value.toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Weekly Breakdown
                </h3>
                {monthlyData.weekly_breakdown &&
                monthlyData.weekly_breakdown.length > 0 ? (
                  <Bar
                    data={{
                      labels: monthlyData.weekly_breakdown.map(
                        (item) => `Week ${item._id}`
                      ),
                      datasets: [
                        {
                          label: "Orders",
                          data: monthlyData.weekly_breakdown.map(
                            (item) => item.orders
                          ),
                          backgroundColor: "rgba(59, 130, 246, 0.5)",
                          borderColor: "rgba(59, 130, 246, 1)",
                          borderWidth: 1,
                        },
                        {
                          label: "Revenue (₱)",
                          data: monthlyData.weekly_breakdown.map(
                            (item) => item.revenue
                          ),
                          backgroundColor: "rgba(16, 185, 129, 0.5)",
                          borderColor: "rgba(16, 185, 129, 1)",
                          borderWidth: 1,
                          yAxisID: "y1",
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      No weekly breakdown data available
                    </p>
                  </div>
                )}
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

      {/* Annual Sales View */}
      {activeSubView === "annual" && (
        <div className="space-y-6">
          <div className="bg-[#232323] rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Filter Annual Sales
              </h3>
              <button
                onClick={exportAnnualReport}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Annual Report</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-300">
                Select Year:
              </label>
              <input
                type="number"
                min="2020"
                max={new Date().getFullYear()}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1f1f1f] text-white w-32"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : annualData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Receipt className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Total Orders
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {annualData.summary.total_orders || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₱
                        {annualData.summary.total_revenue
                          ? annualData.summary.total_revenue.toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-300">
                        Average Order Value
                      </p>
                      <p className="text-2xl font-bold text-white">
                        ₱
                        {annualData.summary.average_order_value
                          ? annualData.summary.average_order_value.toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#232323] p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Monthly Breakdown
                </h3>
                {annualData.monthly_breakdown &&
                annualData.monthly_breakdown.length > 0 ? (
                  <Bar
                    data={prepareMonthlyBreakdownChartData(
                      annualData.monthly_breakdown
                    )}
                    options={chartOptions}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      No monthly breakdown data available
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No data available for the selected year
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllSalesReports;
