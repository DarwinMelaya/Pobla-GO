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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-[#181818] rounded-xl md:rounded-2xl w-full max-w-[95vw] md:max-w-4xl max-h-[92vh] border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#1f1f1f]">
          <h2 className="text-lg md:text-xl font-bold text-[#f5f5f5]">
            Staff Performance
          </h2>
          <button
            onClick={onClose}
            className="text-[#bdbdbd] hover:text-[#f6b100] p-2 hover:bg-[#2a2a2a] rounded-lg"
            type="button"
          >
            X
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 bg-[#171717]">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[#2a2a2a] flex justify-between items-center">
            <h3 className="text-base md:text-lg font-medium text-[#f5f5f5]">
              Staff Performance Report
            </h3>
            <span className="text-xs md:text-sm text-[#9e9e9e]">
              Filtered insights
            </span>
          </div>

          <div className="px-4 md:px-6 py-4 space-y-6">
            {/* Date Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-[#2a2a2a] rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent bg-[#121212] text-[#f5f5f5] placeholder:text-[#8a8a8a]"
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
                  className="w-full px-3 py-2 border border-[#2a2a2a] rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent bg-[#121212] text-[#f5f5f5] placeholder:text-[#8a8a8a]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="w-full px-4 py-2 text-[#d0d0d0] border border-[#2a2a2a] rounded-lg hover:bg-[#1f1f1f] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 md:h-8 md:w-8 border-b-2 border-[#C05050]"></div>
                <span className="ml-2 text-[#b5b5b5] text-sm md:text-base">
                  Loading staff performance...
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {staffStats.length === 0 ? (
                  <div className="text-center py-12">
                    <Users
                      size={40}
                      className="mx-auto text-[#b5b5b5] md:hidden"
                    />
                    <Users
                      size={48}
                      className="mx-auto text-[#b5b5b5] hidden md:block"
                    />
                    <h3 className="mt-2 text-sm md:text-base font-medium text-[#f5f5f5]">
                      No staff performance data found
                    </h3>
                    <p className="mt-1 text-xs md:text-sm text-[#b5b5b5]">
                      Try adjusting your date range or check if there are any
                      orders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffStats.map((staff, index) => (
                      <div
                        key={staff.staff_id}
                        className="bg-[#121212] rounded-lg p-4 md:p-6 border border-[#2a2a2a]"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-base md:text-lg font-medium text-[#f5f5f5]">
                              {staff.staff_name}
                            </h4>
                            <p className="text-xs md:text-sm text-[#b5b5b5] capitalize">
                              {staff.staff_role}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl md:text-2xl font-bold text-[#C05050]">
                              #{index + 1}
                            </p>
                            <p className="text-xs md:text-sm text-[#b5b5b5]">
                              Ranking
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          <div className="bg-[#181818] p-3 md:p-4 rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Users size={18} className="text-blue-300" />
                              </div>
                              <div className="ml-3">
                                <p className="text-xs md:text-sm text-[#b5b5b5]">
                                  Total Orders
                                </p>
                                <p className="text-lg md:text-xl font-bold text-[#f5f5f5]">
                                  {staff.total_orders}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#181818] p-3 md:p-4 rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-center">
                              <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <DollarSign
                                  size={18}
                                  className="text-emerald-300"
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-xs md:text-sm text-[#b5b5b5]">
                                  Total Revenue
                                </p>
                                <p className="text-lg md:text-xl font-bold text-[#f5f5f5]">
                                  {formatCurrency(staff.total_revenue)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#181818] p-3 md:p-4 rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-center">
                              <div className="p-2 bg-purple-500/10 rounded-lg">
                                <TrendingUp
                                  size={18}
                                  className="text-purple-300"
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-xs md:text-sm text-[#b5b5b5]">
                                  Avg Order Value
                                </p>
                                <p className="text-lg md:text-xl font-bold text-[#f5f5f5]">
                                  {formatCurrency(staff.average_order_value)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#181818] p-3 md:p-4 rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-center">
                              <div className="p-2 bg-amber-500/10 rounded-lg">
                                <CheckCircle
                                  size={18}
                                  className="text-amber-300"
                                />
                              </div>
                              <div className="ml-3">
                                <p className="text-xs md:text-sm text-[#b5b5b5]">
                                  Completion Rate
                                </p>
                                <p className="text-lg md:text-xl font-bold text-[#f5f5f5]">
                                  {formatPercentage(staff.completion_rate)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 md:gap-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <Clock
                                size={16}
                                className="text-amber-400 mr-2"
                              />
                              <span className="text-xs md:text-sm text-[#b5b5b5]">
                                Pending
                              </span>
                            </div>
                            <p className="text-base md:text-lg font-bold text-amber-400">
                              {staff.pending_orders}
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <CheckCircle
                                size={16}
                                className="text-green-400 mr-2"
                              />
                              <span className="text-xs md:text-sm text-[#b5b5b5]">
                                Completed
                              </span>
                            </div>
                            <p className="text-base md:text-lg font-bold text-green-400">
                              {staff.completed_orders}
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center mb-2">
                              <XCircle
                                size={16}
                                className="text-red-400 mr-2"
                              />
                              <span className="text-xs md:text-sm text-[#b5b5b5]">
                                Cancelled
                              </span>
                            </div>
                            <p className="text-base md:text-lg font-bold text-red-400">
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

            <div className="px-4 md:px-6 py-3 md:py-4 border-t border-[#2a2a2a] flex justify-end space-x-2 md:space-x-3">
              <button
                onClick={onClose}
                className="px-3 md:px-4 py-2 text-[#d0d0d0] border border-[#2a2a2a] rounded-lg hover:bg-[#1f1f1f] transition-colors"
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
