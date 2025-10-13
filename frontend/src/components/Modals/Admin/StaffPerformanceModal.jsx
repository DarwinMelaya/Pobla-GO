import React, { useState, useEffect } from "react";
import {
  X,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const StaffPerformanceModal = ({ isOpen, onClose }) => {
  const [staffStats, setStaffStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const API_BASE = "http://localhost:5000";

  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  const fetchStaffStats = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const queryParams = new URLSearchParams();

      if (dateFrom) queryParams.append("date_from", dateFrom);
      if (dateTo) queryParams.append("date_to", dateTo);

      const response = await fetch(
        `${API_BASE}/orders/stats/staff?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch staff statistics");
      }

      const data = await response.json();
      setStaffStats(data.staff_performance);
    } catch (error) {
      console.error("Error fetching staff statistics:", error);
      toast.error("Failed to fetch staff statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaffStats();
    }
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (dateFrom || dateTo) {
        fetchStaffStats();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [dateFrom, dateTo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-xl max-h-[90vh] border border-[#383838] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-[#383838] flex justify-between items-center bg-[#262626] rounded-t-2xl">
          <h2 className="text-2xl font-bold text-[#f5f5f5]">
            Staff Performance
          </h2>
          <button
            onClick={onClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg"
            type="button"
          >
            X
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-[#232323]">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Staff Performance Report
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]"></div>
                <span className="ml-2 text-gray-600">
                  Loading staff performance...
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {staffStats.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No staff performance data found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your date range or check if there are any
                      orders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffStats.map((staff, index) => (
                      <div
                        key={staff.staff_id}
                        className="bg-gray-50 rounded-lg p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {staff.staff_name}
                            </h4>
                            <p className="text-sm text-gray-500 capitalize">
                              {staff.staff_role}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-[#C05050]">
                              #{index + 1}
                            </p>
                            <p className="text-sm text-gray-500">Ranking</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white p-4 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Users size={20} className="text-blue-600" />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-600">
                                  Total Orders
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                  {staff.total_orders}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign
                                  size={20}
                                  className="text-green-600"
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-600">
                                  Total Revenue
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                  {formatCurrency(staff.total_revenue)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp
                                  size={20}
                                  className="text-purple-600"
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-600">
                                  Avg Order Value
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                  {formatCurrency(staff.average_order_value)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg">
                            <div className="flex items-center">
                              <div className="p-2 bg-yellow-100 rounded-lg">
                                <CheckCircle
                                  size={20}
                                  className="text-yellow-600"
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-600">
                                  Completion Rate
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                  {formatPercentage(staff.completion_rate)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <Clock
                                size={16}
                                className="text-yellow-600 mr-2"
                              />
                              <span className="text-sm text-gray-600">
                                Pending
                              </span>
                            </div>
                            <p className="text-lg font-bold text-yellow-600">
                              {staff.pending_orders}
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <CheckCircle
                                size={16}
                                className="text-green-600 mr-2"
                              />
                              <span className="text-sm text-gray-600">
                                Completed
                              </span>
                            </div>
                            <p className="text-lg font-bold text-green-600">
                              {staff.completed_orders}
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <XCircle
                                size={16}
                                className="text-red-600 mr-2"
                              />
                              <span className="text-sm text-gray-600">
                                Cancelled
                              </span>
                            </div>
                            <p className="text-lg font-bold text-red-600">
                              {staff.cancelled_orders}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPerformanceModal;
