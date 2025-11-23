import { useState, useEffect, useMemo } from "react";
import {
  User,
  Package,
  MapPin,
  Heart,
  Plus,
  Minus,
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
import {
  cities,
  barangays,
  provinceByName,
} from "select-philippines-address";

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

  // Address form state (matching Checkout.jsx structure)
  const [regionCode, setRegionCode] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [barangayCode, setBarangayCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isParsingAddress, setIsParsingAddress] = useState(false);

  // Order editing state
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState({
    order_type: "delivery",
    order_items: [],
    delivery_address: "",
    customer_phone: "",
    payment_method: "cash",
    notes: "",
  });
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

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

  // Load Marinduque province data on mount
  useEffect(() => {
    const loadMarinduqueData = async () => {
      try {
        setIsLoadingAddress(true);
        const marinduqueProvince = await provinceByName("Marinduque");
        if (marinduqueProvince) {
          const provinceCodeValue = marinduqueProvince.province_code;
          setProvinceCode(provinceCodeValue);
          const regionCodeValue = marinduqueProvince.region_code || "17";
          setRegionCode(regionCodeValue);
          const citiesData = await cities(provinceCodeValue);
          setCityList(citiesData || []);
        }
      } catch (error) {
        console.error("Failed to load address data:", error);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadMarinduqueData();
  }, []);

  // Load barangays when city is selected
  useEffect(() => {
    const loadBarangays = async () => {
      if (!cityCode) {
        setBarangayList([]);
        setBarangayCode("");
        return;
      }

      try {
        setIsLoadingAddress(true);
        const selectedCity = cityList.find(
          (c) => (c.code || c.city_code || c.municipality_code) === cityCode
        );
        const codeToUse = selectedCity?.code || 
                         selectedCity?.city_code || 
                         selectedCity?.municipality_code || 
                         cityCode;
        
        let barangaysData;
        try {
          barangaysData = await barangays(codeToUse);
        } catch (firstError) {
          if (selectedCity && provinceCode) {
            const combinedCode = provinceCode + codeToUse;
            try {
              barangaysData = await barangays(combinedCode);
            } catch (secondError) {
              const altCode = selectedCity.city_code || selectedCity.municipality_code || selectedCity.code;
              barangaysData = await barangays(altCode);
            }
          } else {
            throw firstError;
          }
        }
        
        let formattedBarangays = [];
        if (Array.isArray(barangaysData)) {
          formattedBarangays = barangaysData;
        } else if (barangaysData && typeof barangaysData === 'object') {
          formattedBarangays = barangaysData.data || barangaysData.barangays || Object.values(barangaysData).filter(Array.isArray)[0] || [];
        }
        
        setBarangayList(formattedBarangays);
      } catch (error) {
        setBarangayList([]);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadBarangays();
  }, [cityCode, cityList, provinceCode]);

  // Update address string when address components change
  useEffect(() => {
    if (isParsingAddress) {
      return;
    }

    const addressParts = [];
    if (streetAddress) addressParts.push(streetAddress);
    if (barangayCode && barangayList.length > 0) {
      const barangay = barangayList.find(
        (b) => b.code === barangayCode || b.barangay_code === barangayCode
      );
      if (barangay) {
        addressParts.push(barangay.name || barangay.barangay_name);
      }
    }
    if (cityCode && cityList.length > 0) {
      const city = cityList.find(
        (c) => c.code === cityCode || c.city_code === cityCode
      );
      if (city) {
        addressParts.push(city.name || city.city_name || city.municipality_name);
      }
    }
    if (provinceCode) {
      addressParts.push("Marinduque");
    }
    if (regionCode) {
      addressParts.push("MIMAROPA");
    }

    const newAddress = addressParts.join(", ");
    if (newAddress && newAddress !== addressForm.address) {
      setAddressForm((prev) => ({ ...prev, address: newAddress }));
    }
  }, [streetAddress, barangayCode, cityCode, provinceCode, regionCode, cityList, barangayList, isParsingAddress, addressForm.address]);

  // Parse address when editing
  const parseAddressForEdit = async (addressString) => {
    if (!addressString || !cityList.length) return;

    setIsParsingAddress(true);
    try {
      const addressParts = addressString.split(",").map(part => part.trim());
      const filteredParts = addressParts.filter(
        part => part.toLowerCase() !== "marinduque" && part.toLowerCase() !== "mimaropa"
      );
      
      if (filteredParts.length >= 3) {
        setStreetAddress(filteredParts[0]);
        
        const barangayName = filteredParts[1];
        const cityName = filteredParts[2];

        const matchedCity = cityList.find(
          (c) => {
            const cityNameLower = cityName.toLowerCase();
            const cName = (c.name || c.city_name || c.municipality_name || "").toLowerCase();
            return cName === cityNameLower || cName.includes(cityNameLower) || cityNameLower.includes(cName);
          }
        );

        if (matchedCity) {
          const cityCodeValue = matchedCity.code || matchedCity.city_code || matchedCity.municipality_code;
          setCityCode(cityCodeValue);
          
          // Wait for barangays to load, then find matching barangay
          setTimeout(async () => {
            try {
              const selectedCity = cityList.find(
                (c) => (c.code || c.city_code || c.municipality_code) === cityCodeValue
              );
              
              const codeToUse = selectedCity?.code || 
                               selectedCity?.city_code || 
                               selectedCity?.municipality_code || 
                               cityCodeValue;
              
              let barangaysData;
              try {
                barangaysData = await barangays(codeToUse);
              } catch (firstError) {
                if (selectedCity && provinceCode) {
                  const combinedCode = provinceCode + codeToUse;
                  try {
                    barangaysData = await barangays(combinedCode);
                  } catch (secondError) {
                    const altCode = selectedCity.city_code || selectedCity.municipality_code || selectedCity.code;
                    barangaysData = await barangays(altCode);
                  }
                } else {
                  throw firstError;
                }
              }
              
              let formattedBarangays = [];
              if (Array.isArray(barangaysData)) {
                formattedBarangays = barangaysData;
              } else if (barangaysData && typeof barangaysData === 'object') {
                formattedBarangays = barangaysData.data || barangaysData.barangays || Object.values(barangaysData).filter(Array.isArray)[0] || [];
              }
              
              if (formattedBarangays.length > 0 && barangayName) {
                const matchedBarangay = formattedBarangays.find(
                  (b) => {
                    const barangayNameLower = barangayName.toLowerCase();
                    const bName = (b.name || b.barangay_name || b.brgy_name || "").toLowerCase();
                    return bName === barangayNameLower || bName.includes(barangayNameLower) || barangayNameLower.includes(bName);
                  }
                );
                
                if (matchedBarangay) {
                  const barangayCodeValue = matchedBarangay.code || matchedBarangay.barangay_code || matchedBarangay.brgy_code;
                  setBarangayCode(barangayCodeValue);
                }
              }
            } catch (error) {
              console.error("Error loading barangays:", error);
            }
          }, 800);
        }
      }
    } catch (error) {
      console.error("Error parsing address:", error);
    } finally {
      setIsParsingAddress(false);
    }
  };

  // Handle add/edit address
  const handleSaveAddress = async () => {
    if (!addressForm.label || !streetAddress || !cityCode || !barangayCode) {
      toast.error("Please fill in all address fields (Label, Street Address, City/Municipality, and Barangay)");
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
  const handleEditAddress = async (address) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      address: address.address,
      isDefault: address.isDefault,
    });
    
    // Reset address fields
    setStreetAddress("");
    setCityCode("");
    setBarangayCode("");
    setBarangayList([]);
    
    // Parse the address
    await parseAddressForEdit(address.address);
    setShowAddressModal(true);
  };

  // Handle city change
  const handleCityChange = (e) => {
    const selectedCityCode = e.target.value;
    setCityCode(selectedCityCode);
    setBarangayCode("");
  };

  // Handle barangay change
  const handleBarangayChange = (e) => {
    setBarangayCode(e.target.value);
  };

  // Fetch menu items for order editing
  const fetchMenuItems = async () => {
    setLoadingMenuItems(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/menu?available_only=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }

      const data = await response.json();
      const items = data.success && Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
      setMenuItems(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to load menu items");
      setMenuItems([]);
    } finally {
      setLoadingMenuItems(false);
    }
  };

  // Fetch saved addresses for order editing
  const fetchSavedAddresses = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data.user?.addresses || []);
      }
    } catch (error) {
      console.error("Error fetching saved addresses:", error);
    }
  };

  // Handle edit order
  const handleEditOrder = async (order) => {
    if (order.status !== "Pending") {
      toast.error("Only pending orders can be edited");
      return;
    }

    setEditingOrder(order);
    
    // Fetch menu items and addresses
    await Promise.all([fetchMenuItems(), fetchSavedAddresses()]);

    // Set form data from order
    const orderItems = order.order_items?.map((item) => ({
      _id: item._id || item.menu_item_id?._id || item.menu_item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      price: item.price,
      menu_item_id: item.menu_item_id?._id || item.menu_item_id,
      total_price: item.total_price,
    })) || [];

    setEditOrderForm({
      order_type: order.order_type || "delivery",
      order_items: orderItems,
      delivery_address: order.delivery_address || "",
      customer_phone: order.customer_phone || user?.phone || "",
      payment_method: order.payment_method || "cash",
      notes: order.notes || "",
    });

    // Set selected address if it matches
    if (order.delivery_address && savedAddresses.length > 0) {
      const matchingAddress = savedAddresses.find(
        (addr) => addr.address === order.delivery_address
      );
      if (matchingAddress) {
        setSelectedAddressId(matchingAddress._id);
      }
    }

    setShowEditOrderModal(true);
  };

  // Update order item quantity
  const updateOrderItemQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeOrderItem(itemId);
      return;
    }

    setEditOrderForm((prev) => ({
      ...prev,
      order_items: prev.order_items.map((item) =>
        item._id === itemId || item.menu_item_id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              total_price: item.price * newQuantity,
            }
          : item
      ),
    }));
  };

  // Remove order item
  const removeOrderItem = (itemId) => {
    setEditOrderForm((prev) => ({
      ...prev,
      order_items: prev.order_items.filter(
        (item) => item._id !== itemId && item.menu_item_id !== itemId
      ),
    }));
  };

  // Add menu item to order
  const addMenuItemToOrder = (menuItem) => {
    const existingItem = editOrderForm.order_items.find(
      (item) => item.menu_item_id === menuItem._id
    );

    if (existingItem) {
      // Increase quantity if item already exists
      updateOrderItemQuantity(
        existingItem._id || existingItem.menu_item_id,
        existingItem.quantity + 1
      );
    } else {
      // Add new item
      const newItem = {
        _id: `temp-${Date.now()}`,
        item_name: menuItem.name,
        quantity: 1,
        price: menuItem.price,
        menu_item_id: menuItem._id,
        total_price: menuItem.price,
      };

      setEditOrderForm((prev) => ({
        ...prev,
        order_items: [...prev.order_items, newItem],
      }));
    }
  };

  // Calculate order totals
  const calculateOrderTotals = () => {
    const subtotal = editOrderForm.order_items.reduce(
      (sum, item) => sum + item.total_price,
      0
    );
    const deliveryFee = editOrderForm.order_type === "delivery" ? 50 : 0;
    const total = subtotal + deliveryFee;
    return { subtotal, deliveryFee, total };
  };

  // Save edited order
  const handleSaveEditedOrder = async () => {
    if (editOrderForm.order_items.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    if (editOrderForm.order_type === "delivery" && !editOrderForm.delivery_address.trim()) {
      toast.error("Delivery address is required for delivery orders");
      return;
    }

    if (!editOrderForm.customer_phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    try {
      const token = getAuthToken();
      const orderItems = editOrderForm.order_items.map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        menu_item_id: item.menu_item_id,
        special_instructions: "",
      }));

      const response = await fetch(
        `${API_BASE_URL}/online-orders/${editingOrder._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_type: editOrderForm.order_type,
            order_items: orderItems,
            delivery_address: editOrderForm.delivery_address,
            customer_phone: editOrderForm.customer_phone,
            payment_method: editOrderForm.payment_method,
            notes: editOrderForm.notes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update order");
      }

      const data = await response.json();
      toast.success("Order updated successfully");
      setShowEditOrderModal(false);
      setEditingOrder(null);
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(error.message || "Failed to update order");
    }
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

                      {/* Edit Button - Only show for Pending orders */}
                      {order.status === "Pending" && (
                        <div className="border-t border-[#2f2f2f] pt-4 mt-4">
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="w-full px-4 py-2 rounded-lg bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Order
                          </button>
                        </div>
                      )}
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
                  setStreetAddress("");
                  setCityCode("");
                  setBarangayCode("");
                  setBarangayList([]);
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

      {/* Edit Order Modal */}
      {showEditOrderModal && editingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#232323] border border-[#383838] rounded-2xl p-6 max-w-4xl w-full space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Edit Order #{editingOrder._id.slice(-6).toUpperCase()}
              </h2>
              <button
                onClick={() => {
                  setShowEditOrderModal(false);
                  setEditingOrder(null);
                  setEditOrderForm({
                    order_type: "delivery",
                    order_items: [],
                    delivery_address: "",
                    customer_phone: "",
                    payment_method: "cash",
                    notes: "",
                  });
                }}
                className="text-[#ababab] hover:text-white transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() =>
                      setEditOrderForm({ ...editOrderForm, order_type: "delivery" })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editOrderForm.order_type === "delivery"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Truck
                        className={`w-6 h-6 ${
                          editOrderForm.order_type === "delivery"
                            ? "text-[#C05050]"
                            : "text-[#ababab]"
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          editOrderForm.order_type === "delivery"
                            ? "text-white"
                            : "text-[#ababab]"
                        }`}
                      >
                        Delivery
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setEditOrderForm({ ...editOrderForm, order_type: "pickup" })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editOrderForm.order_type === "pickup"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Store
                        className={`w-6 h-6 ${
                          editOrderForm.order_type === "pickup"
                            ? "text-[#C05050]"
                            : "text-[#ababab]"
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          editOrderForm.order_type === "pickup"
                            ? "text-white"
                            : "text-[#ababab]"
                        }`}
                      >
                        Pickup
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Delivery Address */}
              {editOrderForm.order_type === "delivery" && (
                <div>
                  <label className="block text-sm font-medium text-[#ababab] mb-2">
                    Delivery Address
                  </label>
                  {savedAddresses.length > 0 && (
                    <select
                      value={selectedAddressId}
                      onChange={(e) => {
                        const addressId = e.target.value;
                        setSelectedAddressId(addressId);
                        const selectedAddress = savedAddresses.find(
                          (addr) => addr._id === addressId
                        );
                        if (selectedAddress) {
                          setEditOrderForm({
                            ...editOrderForm,
                            delivery_address: selectedAddress.address,
                          });
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white mb-2 focus:outline-none focus:border-[#C05050]"
                    >
                      <option value="">Select saved address</option>
                      {savedAddresses.map((addr) => (
                        <option key={addr._id} value={addr._id}>
                          {addr.label} - {addr.address}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={editOrderForm.delivery_address}
                    onChange={(e) =>
                      setEditOrderForm({
                        ...editOrderForm,
                        delivery_address: e.target.value,
                      })
                    }
                    placeholder="Enter delivery address"
                    className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050]"
                  />
                </div>
              )}

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editOrderForm.customer_phone}
                  onChange={(e) =>
                    setEditOrderForm({
                      ...editOrderForm,
                      customer_phone: e.target.value,
                    })
                  }
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050]"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() =>
                      setEditOrderForm({ ...editOrderForm, payment_method: "cash" })
                    }
                    className={`p-3 rounded-xl border-2 transition-all ${
                      editOrderForm.payment_method === "cash"
                        ? "border-[#C05050] bg-[#C05050]/10 text-white"
                        : "border-[#383838] bg-[#1f1f1f] text-[#ababab] hover:border-[#2f2f2f]"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() =>
                      setEditOrderForm({ ...editOrderForm, payment_method: "gcash" })
                    }
                    className={`p-3 rounded-xl border-2 transition-all ${
                      editOrderForm.payment_method === "gcash"
                        ? "border-[#C05050] bg-[#C05050]/10 text-white"
                        : "border-[#383838] bg-[#1f1f1f] text-[#ababab] hover:border-[#2f2f2f]"
                    }`}
                  >
                    GCash
                  </button>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Order Items
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {editOrderForm.order_items.map((item) => {
                    const menuItem = menuItems.find(m => m._id === item.menu_item_id);
                    const availableServings = menuItem?.servings || 0;
                    return (
                      <div
                        key={item._id || item.menu_item_id}
                        className="bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-white font-semibold">{item.item_name}</p>
                          <p className="text-sm text-[#ababab]">
                            {currencyFormatter.format(item.price)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              updateOrderItemQuantity(
                                item._id || item.menu_item_id,
                                item.quantity - 1
                              )
                            }
                            className="w-8 h-8 rounded-lg bg-[#2f2f2f] flex items-center justify-center hover:bg-[#383838] transition text-white"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-semibold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateOrderItemQuantity(
                                item._id || item.menu_item_id,
                                item.quantity + 1
                              )
                            }
                            disabled={item.quantity >= availableServings}
                            className="w-8 h-8 rounded-lg bg-[#2f2f2f] flex items-center justify-center hover:bg-[#383838] transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="text-white font-semibold w-24 text-right">
                            {currencyFormatter.format(item.total_price)}
                          </span>
                          <button
                            onClick={() =>
                              removeOrderItem(item._id || item.menu_item_id)
                            }
                            className="ml-2 p-2 rounded-lg hover:bg-[#2f2f2f] transition text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Menu Items */}
              <div className="border-t border-[#2f2f2f] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-white">
                    Add More Items to Order
                  </label>
                  <span className="text-xs text-[#ababab]">
                    {menuItems.filter(
                      (item) => item.is_available && (item.servings || 0) > 0
                    ).length}{" "}
                    items available
                  </span>
                </div>
                {loadingMenuItems ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]"></div>
                    <span className="ml-3 text-[#ababab]">Loading menu items...</span>
                  </div>
                ) : (
                  <>
                    {menuItems.filter(
                      (item) => item.is_available && (item.servings || 0) > 0
                    ).length === 0 ? (
                      <div className="text-center py-6 bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl">
                        <p className="text-[#ababab] text-sm">
                          No items available to add
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {menuItems
                          .filter(
                            (item) => item.is_available && (item.servings || 0) > 0
                          )
                          .map((item) => {
                            const orderItem = editOrderForm.order_items.find(
                              (oi) => oi.menu_item_id === item._id
                            );
                            const isInOrder = !!orderItem;
                            const availableServings = item.servings || 0;
                            const canAddMore = !isInOrder || orderItem.quantity < availableServings;
                            
                            return (
                              <button
                                key={item._id}
                                onClick={() => {
                                  if (isInOrder) {
                                    if (canAddMore) {
                                      updateOrderItemQuantity(
                                        orderItem._id || orderItem.menu_item_id,
                                        orderItem.quantity + 1
                                      );
                                      toast.success(`Increased ${item.name} quantity`);
                                    } else {
                                      toast.error(`Maximum ${availableServings} servings available`);
                                    }
                                  } else {
                                    addMenuItemToOrder(item);
                                    toast.success(`${item.name} added to order`);
                                  }
                                }}
                                disabled={!canAddMore}
                                className={`p-3 rounded-lg border text-left transition group ${
                                  isInOrder
                                    ? "bg-[#1f1f1f]/50 border-[#2f2f2f] hover:bg-[#2f2f2f] hover:border-[#C05050]/50"
                                    : "bg-[#1f1f1f] border-[#2f2f2f] hover:bg-[#2f2f2f] hover:border-[#C05050]/50"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex-1">
                                    <p className={`text-sm font-semibold group-hover:text-[#C05050] transition ${
                                      isInOrder ? "text-white" : "text-white"
                                    }`}>
                                      {item.name}
                                    </p>
                                    {isInOrder && (
                                      <p className="text-xs text-[#C05050] mt-0.5">
                                        In order: {orderItem.quantity}
                                      </p>
                                    )}
                                  </div>
                                  <Plus className="w-4 h-4 text-[#C05050] opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2" />
                                </div>
                                <p className="text-xs text-[#ababab] mb-1">
                                  {currencyFormatter.format(item.price)} each
                                </p>
                                {isInOrder ? (
                                  canAddMore ? (
                                    <p className="text-xs text-green-400">
                                      +{availableServings - orderItem.quantity} more available
                                    </p>
                                  ) : (
                                    <p className="text-xs text-yellow-400">
                                      Max quantity reached
                                    </p>
                                  )
                                ) : (
                                  <p className="text-xs text-green-400">
                                    {availableServings} available
                                  </p>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Order Summary */}
              {(() => {
                const { subtotal, deliveryFee, total } = calculateOrderTotals();
                return (
                  <div className="bg-[#1f1f1f] border border-[#2f2f2f] rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-[#ababab]">
                      <span>Subtotal</span>
                      <span>{currencyFormatter.format(subtotal)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-[#ababab]">
                        <span>Delivery Fee</span>
                        <span>{currencyFormatter.format(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#2f2f2f] flex justify-between text-lg font-semibold text-white">
                      <span>Total</span>
                      <span className="text-[#C05050]">
                        {currencyFormatter.format(total)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowEditOrderModal(false);
                  setEditingOrder(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white font-semibold hover:bg-[#2f2f2f] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedOrder}
                className="flex-1 px-4 py-3 rounded-xl bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#232323] border border-[#383838] rounded-2xl p-6 max-w-2xl w-full space-y-4 my-8">
            <h2 className="text-xl font-semibold text-white">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </h2>
            <div className="space-y-4">
              {/* Label */}
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
                  className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200"
                />
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs text-[#ababab] mb-1">
                  Street Address / House Number
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Enter street address or house number"
                  className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#383838] rounded-xl text-white placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200"
                />
              </div>

              {/* City/Municipality */}
              <div>
                <label className="block text-xs text-[#ababab] mb-1">
                  City / Municipality
                </label>
                <select
                  value={cityCode}
                  onChange={handleCityChange}
                  disabled={isLoadingAddress || cityList.length === 0}
                  className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#383838] rounded-xl text-white focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="" className="bg-[#1f1f1f]">Select City/Municipality</option>
                  {cityList.map((city) => {
                    const cityCodeValue = city.code || city.city_code || city.municipality_code;
                    const cityName = city.name || city.city_name || city.municipality_name;
                    return (
                      <option key={cityCodeValue} value={cityCodeValue} className="bg-[#1f1f1f]">
                        {cityName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Barangay */}
              <div>
                <label className="block text-xs text-[#ababab] mb-1">
                  Barangay
                </label>
                <select
                  value={barangayCode}
                  onChange={handleBarangayChange}
                  disabled={isLoadingAddress || !cityCode}
                  className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#383838] rounded-xl text-white focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="" className="bg-[#1f1f1f]">
                    {isLoadingAddress 
                      ? "Loading barangays..." 
                      : !cityCode 
                      ? "Select city first" 
                      : barangayList.length === 0 
                      ? "No barangays available" 
                      : "Select Barangay"}
                  </option>
                  {barangayList.map((barangay, index) => {
                    const barangayCodeValue = barangay.code || barangay.barangay_code || barangay.brgy_code || index;
                    const barangayName = barangay.name || barangay.barangay_name || barangay.brgy_name || `Barangay ${index + 1}`;
                    return (
                      <option key={barangayCodeValue || index} value={barangayCodeValue} className="bg-[#1f1f1f]">
                        {barangayName}
                      </option>
                    );
                  })}
                </select>
                {cityCode && barangayList.length === 0 && !isLoadingAddress && (
                  <p className="text-xs text-yellow-400 mt-1">
                    No barangays found for this city. Please check the city selection.
                  </p>
                )}
              </div>

              {/* Province (Read-only) */}
              <div>
                <label className="block text-xs text-[#ababab] mb-1">
                  Province
                </label>
                <input
                  type="text"
                  value="Marinduque"
                  disabled
                  className="w-full px-4 py-3 bg-[#1f1f1f]/50 border border-[#383838]/50 rounded-xl text-white/70 cursor-not-allowed"
                />
              </div>

              {/* Default Address Checkbox */}
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
                  setStreetAddress("");
                  setCityCode("");
                  setBarangayCode("");
                  setBarangayList([]);
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
