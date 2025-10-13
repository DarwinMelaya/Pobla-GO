import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  XCircle,
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
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
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "preparing":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "ready":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-xl max-h-[90vh] border border-[#383838] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-[#383838] flex justify-between items-center bg-[#262626] rounded-t-2xl">
          <h2 className="text-2xl font-bold text-[#f5f5f5]">Table Status</h2>
          <button
            onClick={onClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg"
            type="button"
          >
            X
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-[#232323]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw size={24} className="animate-spin text-[#C05050]" />
              <span className="ml-2 text-gray-600">
                Loading table statuses...
              </span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Occupied Tables */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users size={20} className="mr-2" />
                  Occupied Tables ({Object.keys(tableStatuses).length})
                </h4>
                {Object.keys(tableStatuses).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tables are currently occupied
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(tableStatuses).map(
                      ([tableNumber, status]) => (
                        <div
                          key={tableNumber}
                          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-gray-900">
                              Table {tableNumber}
                            </h5>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                status.status
                              )}`}
                            >
                              {getStatusIcon(status.status)}
                              <span className="ml-1 capitalize">
                                {status.status}
                              </span>
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">
                                Customer:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {status.customer}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Staff:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {status.staff}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Order ID:
                              </span>
                              <span className="ml-2 text-gray-900">
                                #{status.order._id.slice(-8)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Started:
                              </span>
                              <span className="ml-2 text-gray-900">
                                {formatDate(status.order.created_at)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">
                                Total:
                              </span>
                              <span className="ml-2 text-gray-900">
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
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle size={20} className="mr-2" />
                  Available Tables ({getAvailableTables().length})
                </h4>
                <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-15 gap-3">
                  {getAvailableTables().map((tableNumber) => (
                    <div
                      key={tableNumber}
                      className="bg-green-100 border border-green-300 rounded-lg p-3 text-center"
                    >
                      <div className="text-sm font-medium text-green-800">
                        Table {tableNumber}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Available
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
