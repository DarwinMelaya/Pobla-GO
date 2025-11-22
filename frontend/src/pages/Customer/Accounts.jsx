import { useState, useEffect, useMemo } from "react";
import {
  User,
  Package,
  MapPin,
  Heart,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Store,
  Utensils,
} from "lucide-react";
import toast from "react-hot-toast";
import CustomerLayout from "../../components/Layout/CustomerLayout";

const API_BASE_URL = "http://localhost:5000";

const Accounts = () => {
  const [activeTab, setActiveTab] = useState("orders"); // "orders", "addresses", "favorites"
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    address: "",
    isDefault: false,
  });

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
      toast.error("Failed to load profile");
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
      toast.error("Failed to load orders");
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
      toast.error("Failed to load favorites");
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

  // Handle add/edit address
  const handleSaveAddress = async () => {
    if (!addressForm.label || !addressForm.address) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const token = getAuthToken();
      const url = editingAddress
        ? `${API_BASE_URL}/auth/addresses/${editingAddress._id}`
        : `${API_BASE_URL}/auth/addresses`;

      const method = editingAddress ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addressForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save address");
      }

      const data = await response.json();
      setUser({ ...user, addresses: data.addresses });
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressForm({ label: "", address: "", isDefault: false });
      toast.success(
        editingAddress ? "Address updated successfully" : "Address added successfully"
      );
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

  // Handle delete address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/auth/addresses/${addressId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      const data = await response.json();
      setUser({ ...user, addresses: data.addresses });
      toast.success("Address deleted successfully");
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    }
  };

  // Handle edit address
  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      address: address.address,
      isDefault: address.isDefault,
    });
    setShowAddressModal(true);
  };

  // Handle remove from favorites
  const handleRemoveFavorite = async (menuId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/auth/favorites/${menuId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove favorite");
      }

      fetchFavorites();
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove favorite");
    }
  };

  // Get status badge (matching OnlineOrder model enum: Pending, Cancelled, Ready, OnTheWay, Completed)
  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: {
        label: "Pending",
        bg: "bg-yellow-400/10 border-yellow-400/30 text-yellow-400",
        icon: Clock,
      },
      Cancelled: {
        label: "Cancelled",
        bg: "bg-red-400/10 border-red-400/30 text-red-400",
        icon: XCircle,
      },
      Ready: {
        label: "Ready",
        bg: "bg-purple-400/10 border-purple-400/30 text-purple-400",
        icon: CheckCircle,
      },
      OnTheWay: {
        label: "On the Way",
        bg: "bg-blue-400/10 border-blue-400/30 text-blue-400",
        icon: Truck,
      },
      Completed: {
        label: "Completed",
        bg: "bg-green-400/10 border-green-400/30 text-green-400",
        icon: CheckCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.Pending;
    const Icon = config.icon;

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${config.bg}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <section className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-12 text-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-[#2f2f2f] flex items-center justify-center mb-4">
                      <Package className="w-12 h-12 text-[#383838]" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      No orders yet
                    </h2>
                    <p className="text-[#ababab] max-w-md">
                      You haven't placed any orders yet. Start ordering delicious
                      food from our menu!
                    </p>
                  </section>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-[#232323] border border-[#383838] rounded-2xl p-6 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">
                              Order #{order._id.slice(-6).toUpperCase()}
                            </h3>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-sm text-[#ababab]">
                            {formatDate(order.created_at)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {order.order_type === "delivery" ? (
                              <>
                                <Truck className="w-4 h-4 text-[#ababab]" />
                                <span className="text-sm text-[#ababab]">
                                  Delivery
                                </span>
                              </>
                            ) : (
                              <>
                                <Store className="w-4 h-4 text-[#ababab]" />
                                <span className="text-sm text-[#ababab]">
                                  Pickup
                                </span>
                              </>
                            )}
                          </div>
                          {order.delivery_address && (
                            <p className="text-sm text-[#ababab] mt-1">
                              {order.delivery_address}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-[#C05050]">
                            {currencyFormatter.format(order.total_amount)}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-[#2f2f2f] pt-4">
                        <h4 className="text-sm font-semibold text-white mb-2">
                          Order Items:
                        </h4>
                        <div className="space-y-2">
                          {order.order_items?.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-[#ababab]">
                                {item.item_name} x {item.quantity}
                              </span>
                              <span className="text-white">
                                {currencyFormatter.format(item.total_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">
                    Saved Addresses
                  </h2>
                  <button
                    onClick={() => {
                      setEditingAddress(null);
                      setAddressForm({ label: "", address: "", isDefault: false });
                      setShowAddressModal(true);
                    }}
                    className="px-4 py-2 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Address
                  </button>
                </div>

                {user?.addresses?.length === 0 ? (
                  <section className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-12 text-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-[#2f2f2f] flex items-center justify-center mb-4">
                      <MapPin className="w-12 h-12 text-[#383838]" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      No addresses saved
                    </h2>
                    <p className="text-[#ababab] max-w-md">
                      Add your first address to make ordering easier!
                    </p>
                  </section>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user?.addresses?.map((address) => (
                      <div
                        key={address._id}
                        className="bg-[#232323] border border-[#383838] rounded-2xl p-6 relative"
                      >
                        {address.isDefault && (
                          <span className="absolute top-4 right-4 px-2 py-1 rounded-full bg-[#C05050]/20 text-[#C05050] text-xs font-semibold">
                            Default
                          </span>
                        )}
                        <div className="flex items-start gap-3 mb-3">
                          <MapPin className="w-5 h-5 text-[#C05050] flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {address.label}
                            </h3>
                            <p className="text-[#ababab] text-sm">
                              {address.address}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-[#2f2f2f]">
                          <button
                            onClick={() => handleEditAddress(address)}
                            className="flex-1 px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#2f2f2f] text-white hover:bg-[#2f2f2f] transition flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address._id)}
                            className="px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#2f2f2f] text-red-400 hover:bg-[#2f2f2f] transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === "favorites" && (
              <div className="space-y-4">
                {favorites.length === 0 ? (
                  <section className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-12 text-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-[#2f2f2f] flex items-center justify-center mb-4">
                      <Heart className="w-12 h-12 text-[#383838]" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      No favorites yet
                    </h2>
                    <p className="text-[#ababab] max-w-md">
                      Start adding your favorite items to this list!
                    </p>
                  </section>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((item) => (
                      <div
                        key={item._id}
                        className="bg-[#232323] border border-[#383838] rounded-2xl overflow-hidden"
                      >
                        <div className="relative h-48 bg-[#2f2f2f]">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Utensils className="w-12 h-12 text-[#383838]" />
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveFavorite(item._id)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-[#1f1f1f]/80 backdrop-blur-sm hover:bg-[#2f2f2f] transition"
                          >
                            <Heart className="w-5 h-5 text-[#C05050] fill-[#C05050]" />
                          </button>
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {item.name}
                          </h3>
                          <p className="text-sm text-[#ababab] mb-2 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-[#C05050]">
                              {currencyFormatter.format(item.price)}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-[#1f1f1f] border border-[#2f2f2f] text-xs text-[#ababab]">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#232323] border border-[#383838] rounded-2xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-xl font-semibold text-white">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Label (e.g., Home, Work, Office)
                </label>
                <input
                  type="text"
                  value={addressForm.label}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, label: e.target.value })
                  }
                  placeholder="Home"
                  className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Address
                </label>
                <textarea
                  value={addressForm.address}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, address: e.target.value })
                  }
                  placeholder="Enter your complete address"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050] resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) =>
                    setAddressForm({
                      ...addressForm,
                      isDefault: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded bg-[#1f1f1f] border-[#2f2f2f] text-[#C05050] focus:ring-[#C05050]"
                />
                <label
                  htmlFor="isDefault"
                  className="text-sm text-[#ababab] cursor-pointer"
                >
                  Set as default address
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setEditingAddress(null);
                  setAddressForm({ label: "", address: "", isDefault: false });
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white font-semibold hover:bg-[#2f2f2f] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                className="flex-1 px-4 py-3 rounded-xl bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition"
              >
                {editingAddress ? "Update" : "Add"} Address
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default Accounts;
