import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  XCircle,
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Utensils,
} from "lucide-react";

const TableStatusModal = ({ isOpen, onClose }) => {
  const [tableStatuses, setTableStatuses] = useState({});
  const [loading, setLoading] = useState(false);

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch table statuses
  const fetchTableStatuses = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/orders/tables/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch table statuses");
      }

      const data = await response.json();
      setTableStatuses(data.tableStatuses);
    } catch (error) {
      console.error("Error fetching table statuses:", error);
      toast.error("Failed to fetch table statuses");
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-700 text-white border-yellow-800";
      case "preparing":
        return "bg-blue-700 text-white border-blue-800";
      case "ready":
        return "bg-green-700 text-white border-green-800";
      default:
        return "bg-[#383838] text-[#f5f5f5] border-[#4a4a4a]";
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
      default:
        return <AlertCircle size={16} />;
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

  // Get available tables (tables not in the statuses object)
  const getAvailableTables = () => {
    const occupiedTables = Object.keys(tableStatuses);
    const allTables = Array.from({ length: 20 }, (_, i) => (i + 1).toString()); // Assuming tables 1-20
    return allTables.filter((table) => !occupiedTables.includes(table));
  };

  useEffect(() => {
    if (isOpen) {
      fetchTableStatuses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-[#181818] rounded-xl md:rounded-2xl w-full max-w-[95vw] md:max-w-4xl max-h-[92vh] border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#1f1f1f]">
          <h2 className="text-lg md:text-xl font-bold text-[#f5f5f5]">
            Table Status
          </h2>
          <button
            onClick={onClose}
            className="text-[#bdbdbd] hover:text-[#f6b100] p-2 hover:bg-[#2a2a2a] rounded-lg"
            type="button"
          >
            X
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 bg-[#171717] text-[#e6e6e6]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw
                size={22}
                className="animate-spin text-[#C05050] md:size-6"
              />
              <span className="ml-2 text-[#b5b5b5] text-sm md:text-base">
                Loading table statuses...
              </span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Occupied Tables */}
              <div>
                <h4 className="text-base md:text-lg font-semibold text-[#f5f5f5] mb-3 flex items-center">
                  <Users size={16} className="mr-2 text-[#b5b5b5] md:hidden" />
                  <Users
                    size={18}
                    className="mr-2 text-[#b5b5b5] hidden md:block"
                  />
                  Occupied Tables{" "}
                  <span className="ml-2 text-[#cfcfcf]">
                    ({Object.keys(tableStatuses).length})
                  </span>
                </h4>
                {Object.keys(tableStatuses).length === 0 ? (
                  <div className="text-center py-8 text-[#b5b5b5] text-sm md:text-base">
                    No tables are currently occupied
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {Object.entries(tableStatuses).map(
                      ([tableNumber, status]) => (
                        <div
                          key={tableNumber}
                          className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-3 md:p-4 shadow-sm hover:border-[#3a3a3a] hover:shadow-md transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#1c1c1c] border border-[#2a2a2a]">
                                <Utensils
                                  size={14}
                                  className="text-[#f6b100]"
                                />
                              </div>
                              <h5 className="font-semibold text-[#f5f5f5] text-sm md:text-base">
                                Table{" "}
                                <span className="text-[#f6b100]">
                                  {tableNumber}
                                </span>
                              </h5>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border ${getStatusColor(
                                status.status
                              )}`}
                            >
                              {getStatusIcon(status.status)}
                              <span className="ml-1 capitalize">
                                {status.status}
                              </span>
                            </span>
                          </div>

                          <div className="divide-y divide-[#1e1e1e] rounded-md overflow-hidden bg-[#141414] border border-[#1f1f1f]">
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <Users size={14} className="text-blue-300" />
                              <span className="text-[#cfcfcf] text-xs md:text-sm">
                                Customer
                              </span>
                              <span className="ml-auto text-[#f5f5f5] text-xs md:text-sm font-medium">
                                {status.customer}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <Users size={14} className="text-purple-300" />
                              <span className="text-[#cfcfcf] text-xs md:text-sm">
                                Staff
                              </span>
                              <span className="ml-auto text-[#f5f5f5] text-xs md:text-sm font-medium">
                                {status.staff}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <AlertCircle
                                size={14}
                                className="text-amber-300"
                              />
                              <span className="text-[#cfcfcf] text-xs md:text-sm">
                                Order ID
                              </span>
                              <span className="ml-auto text-[#f5f5f5] text-xs md:text-sm font-mono">
                                #{status.order._id.slice(-8)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <Clock size={14} className="text-yellow-300" />
                              <span className="text-[#cfcfcf] text-xs md:text-sm">
                                Started
                              </span>
                              <span className="ml-auto text-[#f5f5f5] text-xs md:text-sm">
                                {formatDate(status.order.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <DollarSign
                                size={14}
                                className="text-emerald-300"
                              />
                              <span className="text-[#cfcfcf] text-xs md:text-sm">
                                Total
                              </span>
                              <span className="ml-auto text-[#f5f5f5] text-xs md:text-sm font-semibold">
                                ₱{status.order.total_amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Available Tables */}
              <div>
                <h4 className="text-base md:text-lg font-semibold text-[#f5f5f5] mb-3 flex items-center">
                  <CheckCircle
                    size={16}
                    className="mr-2 text-emerald-400 md:hidden"
                  />
                  <CheckCircle
                    size={18}
                    className="mr-2 text-emerald-400 hidden md:block"
                  />
                  Available Tables{" "}
                  <span className="ml-2 text-[#cfcfcf]">
                    ({getAvailableTables().length})
                  </span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-3">
                  {getAvailableTables().map((tableNumber) => (
                    <div
                      key={tableNumber}
                      className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-2.5 md:p-3 text-center hover:border-[#3a3a3a] hover:bg-[#141414] transition-colors"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Utensils size={14} className="text-emerald-400" />
                        <div className="text-xs md:text-sm font-bold text-[#f5f5f5]">
                          Table{" "}
                          <span className="text-emerald-400">
                            {tableNumber}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] md:text-xs text-[#c0c0c0] mt-1">
                        Available now
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableStatusModal;
