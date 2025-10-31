import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import toast from "react-hot-toast";
import {
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  Eye,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
} from "lucide-react";

const AdminMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [itemToView, setItemToView] = useState(null);
  const [stats, setStats] = useState(null);

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch menu items
  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const queryParams = new URLSearchParams();
      if (categoryFilter) queryParams.append("category", categoryFilter);
      if (availabilityFilter)
        queryParams.append("available", availabilityFilter);

      const response = await fetch(`${API_BASE}/menu?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }

      const data = await response.json();
      setMenuItems(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      setCategories(uniqueCategories);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch menu statistics
  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/menu/stats/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  // Show view modal
  const handleViewClick = (item) => {
    setItemToView(item);
    setShowViewModal(true);
  };

  // Close view modal
  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setItemToView(null);
  };

  // Toggle availability
  const handleToggleAvailability = async (item) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE}/menu/${item._id}/toggle-availability`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle availability");
      }

      const data = await response.json();
      toast.success(data.message);
      fetchMenuItems();
      fetchStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Filter menu items by search term
  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load data on component mount
  useEffect(() => {
    fetchMenuItems();
    fetchStats();
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMenuItems();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [categoryFilter, availabilityFilter]);

  const getStockStatusBadge = (stockStatus) => {
    switch (stockStatus) {
      case "in_stock":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
            <CheckCircle className="w-3 h-3" /> In Stock
          </span>
        );
      case "low_stock":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-600 text-white">
            <AlertTriangle className="w-3 h-3" /> Low Stock
          </span>
        );
      case "out_of_stock":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
            <XCircle className="w-3 h-3" /> Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide flex items-center gap-3">
                <Package className="w-8 h-8 text-[#f6b100]" />
                Menu Management
          </h1>
              <p className="text-[#b5b5b5] mt-2">
                View and manage production-based menu items. To add new items, go to{" "}
                <a href="/admin/productions" className="text-[#f6b100] hover:underline font-medium">
                  Productions
                </a>.
              </p>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#232323] p-4 rounded-lg border border-[#383838]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#cccccc] text-sm">Total Items</p>
                    <p className="text-2xl font-bold text-[#f5f5f5]">{stats.total}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-[#232323] p-4 rounded-lg border border-[#383838]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#cccccc] text-sm">Available</p>
                    <p className="text-2xl font-bold text-green-500">{stats.available}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-[#232323] p-4 rounded-lg border border-[#383838]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#cccccc] text-sm">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-500">{stats.lowStock}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-[#232323] p-4 rounded-lg border border-[#383838]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#cccccc] text-sm">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-500">{stats.outOfStock}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters/Search */}
        <div className="bg-[#232323] p-6 rounded-lg shadow mb-6 border border-[#383838]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Search Menu Items
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#bababa] w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or category..."
                  className="w-full pl-10 pr-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Filter by Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Filter by Availability
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
              >
                <option value="">All Items</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                  setAvailabilityFilter("");
                }}
                className="w-full bg-[#C05050] hover:bg-[#B04040] text-white px-4 py-2 rounded-md font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Menu items grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#f6b100]" />
                <p className="mt-2 text-[#ababab]">Loading menu items...</p>
              </div>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-[#232323] rounded-lg border border-[#383838]">
              <Package className="w-16 h-16 text-[#666] mx-auto mb-4" />
              <p className="text-[#ababab] text-lg mb-2">No menu items found</p>
              <p className="text-[#888] text-sm">
                Create a production with "Completed" status to add menu items.
              </p>
            </div>
          ) : (
            filteredMenuItems.map((item) => (
              <div
                key={item._id}
                className="bg-[#232323] rounded-lg shadow-md border border-[#383838] overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                {item.image ? (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-[#181818] flex items-center justify-center">
                    <Package className="w-16 h-16 text-[#666]" />
                  </div>
                )}
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#f5f5f5] line-clamp-1">
                      {item.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ml-2 ${
                        item.is_available
                          ? "bg-green-700 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  
                  <p className="text-[#b5b5b5] text-sm mb-3 line-clamp-2">
                    {item.description || "No description available"}
                  </p>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#cccccc]">Category</span>
                      <span className="text-sm font-medium text-[#f5f5f5]">{item.category}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#cccccc]">Price</span>
                    <span className="text-lg font-bold text-[#f6b100]">
                        ₱{item.price?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#cccccc]">Servings</span>
                    <span className="text-sm font-bold text-[#f5f5f5]">
                        {item.servings || 0}
                    </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#cccccc]">Stock Status</span>
                      <div>{getStockStatusBadge(item.stockStatus)}</div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-[#383838]">
                    <button
                      onClick={() => handleViewClick(item)}
                      className="flex-1 px-3 py-2 bg-blue-700 text-white rounded text-sm font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-1"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className="px-3 py-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] rounded text-sm font-bold hover:bg-[#262626] transition-colors flex items-center justify-center"
                      title={item.is_available ? "Mark as Unavailable" : "Mark as Available"}
                    >
                      {item.is_available ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* View Modal */}
        {showViewModal && itemToView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={handleCloseViewModal}
            />
            <div className="relative bg-[#232323] w-full max-w-3xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#f6b100]" />
                  Menu Item Details
                </h2>
                <button
                  onClick={handleCloseViewModal}
                  className="text-[#b5b5b5] hover:text-white"
                  aria-label="Close"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image */}
                <div>
                  {itemToView.image ? (
                    <img
                      src={itemToView.image}
                      alt={itemToView.name}
                      className="w-full h-64 object-cover rounded-lg border border-[#383838]"
                    />
                  ) : (
                    <div className="w-full h-64 bg-[#181818] rounded-lg border border-[#383838] flex items-center justify-center">
                      <Package className="w-16 h-16 text-[#666]" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#cccccc] uppercase">Name</label>
                    <p className="text-[#f5f5f5] font-medium text-lg">{itemToView.name}</p>
                  </div>

                  <div>
                    <label className="text-xs text-[#cccccc] uppercase">Category</label>
                    <p className="text-[#f5f5f5]">{itemToView.category}</p>
                  </div>

                  <div>
                    <label className="text-xs text-[#cccccc] uppercase">Price</label>
                    <p className="text-[#f6b100] font-bold text-2xl">
                      ₱{itemToView.price?.toFixed(2) || "0.00"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#cccccc] uppercase">Servings Available</label>
                      <p className="text-[#f5f5f5] font-semibold text-xl">{itemToView.servings || 0}</p>
                    </div>

                    <div>
                      <label className="text-xs text-[#cccccc] uppercase">Stock Status</label>
                      <div className="mt-1">{getStockStatusBadge(itemToView.stockStatus)}</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#cccccc] uppercase">Availability</label>
                    <p className="text-[#f5f5f5] flex items-center gap-2 mt-1">
                      {itemToView.is_available ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-500 font-medium">Available for Order</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-red-500 font-medium">Not Available</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {itemToView.description && (
                  <div className="md:col-span-2">
                    <label className="text-xs text-[#cccccc] uppercase">Description</label>
                    <p className="text-[#f5f5f5] mt-1">{itemToView.description}</p>
                  </div>
                )}

                {/* Production History */}
                {itemToView.production_history && itemToView.production_history.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="text-xs text-[#cccccc] uppercase mb-2 block">
                      Production History
                    </label>
                    <div className="bg-[#181818] rounded-lg p-4 border border-[#383838]">
                      <div className="space-y-2">
                        {itemToView.production_history.map((prod, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center text-sm py-2 border-b border-[#383838] last:border-0"
                          >
                            <span className="text-[#f5f5f5] flex items-center gap-2">
                              <Package className="w-4 h-4 text-[#f6b100]" />
                              +{prod.quantity_added} servings added
                            </span>
                            <span className="text-[#888]">
                              {new Date(prod.date_added).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#383838]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#cccccc] font-medium">Total Productions:</span>
                          <span className="text-[#f6b100] font-bold">
                            {itemToView.production_history.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#383838] flex justify-end">
                <button
                  onClick={handleCloseViewModal}
                  className="px-4 py-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] rounded-md font-bold hover:bg-[#262626]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMenu;
