import { useState, useEffect, useMemo } from "react";
import { User, Package, MapPin, Heart } from "lucide-react";
import CustomerLayout from "../../components/Layout/CustomerLayout";
import Orders from "../../components/Customer/Accounts/Orders";
import Address from "../../components/Customer/Accounts/Address";
import Favorites from "../../components/Customer/Accounts/Favorites";

const API_BASE_URL = "http://localhost:5000";

const Accounts = () => {
  const [activeTab, setActiveTab] = useState("orders"); // "orders", "addresses", "favorites"
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }),
    []
  );

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch user profile
  const fetchProfile = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  // Fetch customer orders
  const fetchOrders = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/auth/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // Fetch favorites
  const fetchFavorites = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/auth/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch favorites");
      }

      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchOrders(), fetchFavorites()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Reload data when tab changes
  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    } else if (activeTab === "favorites") {
      fetchFavorites();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="bg-[#1f1f1f] min-h-screen px-4 py-8 md:px-8 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C05050] mx-auto mb-4"></div>
            <p className="text-[#ababab]">Loading...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-[#1f1f1f] min-h-screen px-4 py-8 md:px-8 text-white">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Header */}
          <section className="relative overflow-hidden rounded-3xl border border-[#383838] bg-gradient-to-br from-[#232323] via-[#1f1f1f] to-[#2b2b2b] p-6 md:p-8">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(192,80,80,0.4),_transparent_60%)]" />
            <div className="relative flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[#C05050] flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {user?.name || "User"}
                </h1>
                <p className="text-[#ababab] text-sm">{user?.email}</p>
                <p className="text-[#ababab] text-sm">{user?.phone}</p>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <section className="bg-[#232323] border border-[#383838] rounded-2xl p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "orders"
                    ? "bg-[#C05050] text-white"
                    : "text-[#ababab] hover:bg-[#2f2f2f]"
                }`}
              >
                <Package className="w-5 h-5" />
                Orders
              </button>
              <button
                onClick={() => setActiveTab("addresses")}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "addresses"
                    ? "bg-[#C05050] text-white"
                    : "text-[#ababab] hover:bg-[#2f2f2f]"
                }`}
              >
                <MapPin className="w-5 h-5" />
                Addresses
              </button>
              <button
                onClick={() => setActiveTab("favorites")}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "favorites"
                    ? "bg-[#C05050] text-white"
                    : "text-[#ababab] hover:bg-[#2f2f2f]"
                }`}
              >
                <Heart className="w-5 h-5" />
                Favorites
              </button>
            </div>
          </section>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === "orders" && (
              <Orders
                orders={orders}
                currencyFormatter={currencyFormatter}
                getAuthToken={getAuthToken}
                fetchOrders={fetchOrders}
                user={user}
              />
            )}

            {activeTab === "addresses" && (
              <Address
                user={user}
                getAuthToken={getAuthToken}
                fetchProfile={fetchProfile}
              />
            )}

            {activeTab === "favorites" && (
              <Favorites
                favorites={favorites}
                currencyFormatter={currencyFormatter}
                getAuthToken={getAuthToken}
                fetchFavorites={fetchFavorites}
              />
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default Accounts;
