import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout/Layout";
import toast from "react-hot-toast";
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Utensils,
  User,
  Receipt,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

const StaffDashboard = () => {
  const [recentOrders, setRecentOrders] = useState([]);
  const [ongoingOrders, setOngoingOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const getAuthToken = () => localStorage.getItem("token");

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusChip = (status) => {
    const base =
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case "pending":
        return {
          icon: <Clock size={14} />,
          className: `${base} bg-yellow-700/80 text-yellow-50`,
          label: "Pending",
        };
      case "preparing":
        return {
          icon: <RefreshCw size={14} className="animate-spin-slow" />,
          className: `${base} bg-blue-700/80 text-blue-50`,
          label: "Preparing",
        };
      case "ready":
        return {
          icon: <CheckCircle size={14} />,
          className: `${base} bg-emerald-700/80 text-emerald-50`,
          label: "Ready",
        };
      case "completed":
        return {
          icon: <CheckCircle size={14} />,
          className: `${base} bg-gray-700/80 text-gray-50`,
          label: "Completed",
        };
      case "cancelled":
        return {
          icon: <XCircle size={14} />,
          className: `${base} bg-red-700/80 text-red-50`,
          label: "Cancelled",
        };
      default:
        return {
          icon: <Clock size={14} />,
          className: `${base} bg-[#383838] text-[#f5f5f5]`,
          label: status || "Unknown",
        };
    }
  };

  const fetchDashboardOrders = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
      });

      const response = await fetch(`${API_BASE}/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      const orders = Array.isArray(data.orders) ? data.orders : [];

      // Recent = latest 8 orders regardless of status
      setRecentOrders(orders.slice(0, 8));

      // Ongoing = pending/preparing/ready
      const ongoing = orders.filter((o) =>
        ["pending", "preparing", "ready"].includes(o.status)
      );
      setOngoingOrders(ongoing.slice(0, 8));
    } catch (error) {
      console.error("Error loading staff dashboard orders:", error);
      toast.error("Failed to load orders for dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardOrders();
  }, []);

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen rounded-r-2xl p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#f5f5f5] tracking-wide flex items-center gap-3">
              <Utensils className="w-7 h-7 text-[#f6b100]" />
              Staff Dashboard
            </h1>
            <p className="text-sm text-[#b5b5b5] mt-1">
              Overview of your recent and ongoing orders
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDashboardOrders}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#383838] bg-[#262626] px-4 py-2 text-sm font-semibold text-[#f5f5f5] hover:bg-[#2e2e2e] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : undefined}
            />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <section className="bg-[#232323] border border-[#383838] rounded-2xl shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#f6b100]" />
                <h2 className="text-sm md:text-base font-semibold text-[#f5f5f5]">
                  Recent Orders
                </h2>
              </div>
              <span className="text-xs text-[#909090]">
                Last {recentOrders.length || 0} orders
              </span>
            </header>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-[#b5b5b5] gap-2">
                <RefreshCw size={18} className="animate-spin text-[#f6b100]" />
                <span>Loading orders...</span>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-10 text-center text-[#9d9d9d] text-sm">
                No recent orders found.
              </div>
            ) : (
              <ul className="divide-y divide-[#383838]">
                {recentOrders.map((order) => {
                  const statusChip = getStatusChip(order.status);
                  return (
                    <li
                      key={order._id}
                      className="px-5 py-3 hover:bg-[#262626] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-[#808080] mb-0.5">
                            <span className="font-mono">
                              #{order._id.slice(-8)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-[#555]" />
                            <span className="capitalize">
                              {order.order_type?.replace("_", " ") || "dine in"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#b5b5b5]" />
                            <span className="text-sm font-medium text-[#f5f5f5] truncate">
                              {order.customer_name || "Walk-in Customer"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[#a0a0a0]">
                            {formatDateTime(order.created_at)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-[#f6b100]">
                            {formatCurrency(order.total_amount)}
                          </span>
                          <span className={statusChip.className}>
                            {statusChip.icon}
                            <span>{statusChip.label}</span>
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Ongoing Orders */}
          <section className="bg-[#232323] border border-[#383838] rounded-2xl shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-[#383838] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#4ec57a]" />
                <h2 className="text-sm md:text-base font-semibold text-[#f5f5f5]">
                  Ongoing Orders
                </h2>
              </div>
              <span className="text-xs text-[#909090]">
                {ongoingOrders.length || 0} in progress
              </span>
            </header>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-[#b5b5b5] gap-2">
                <RefreshCw size={18} className="animate-spin text-[#4ec57a]" />
                <span>Loading ongoing orders...</span>
              </div>
            ) : ongoingOrders.length === 0 ? (
              <div className="py-10 text-center text-[#9d9d9d] text-sm">
                No ongoing orders right now.
              </div>
            ) : (
              <ul className="divide-y divide-[#383838]">
                {ongoingOrders.map((order) => {
                  const statusChip = getStatusChip(order.status);
                  return (
                    <li
                      key={order._id}
                      className="px-5 py-3 hover:bg-[#262626] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-[#808080] mb-0.5">
                            <span className="font-mono">
                              #{order._id.slice(-8)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-[#555]" />
                            <span className="capitalize">
                              {order.order_type?.replace("_", " ") || "dine in"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#b5b5b5]" />
                            <span className="text-sm font-medium text-[#f5f5f5] truncate">
                              {order.customer_name || "Walk-in Customer"}
                            </span>
                          </div>
                          {order.delivery_address && (
                            <div className="mt-1 text-xs text-[#a0a0a0] line-clamp-1">
                              {order.delivery_address}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-[#a0a0a0]">
                            {formatDateTime(order.created_at)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-[#f6b100]">
                            {formatCurrency(order.total_amount)}
                          </span>
                          <span className={statusChip.className}>
                            {statusChip.icon}
                            <span>{statusChip.label}</span>
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default StaffDashboard;
