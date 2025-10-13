import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import AddMenuModal from "../../components/Modals/Admin/AddMenuModal";
import DeleteMenuModal from "../../components/Modals/Admin/DeleteMenuModal";
import ViewMenuModal from "../../components/Modals/Admin/ViewMenuModal";
import toast from "react-hot-toast";
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  Eye,
} from "lucide-react";

const AdminMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [itemToView, setItemToView] = useState(null);

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
      if (searchTerm) queryParams.append("search", searchTerm);
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
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available inventory for ingredients
  const fetchAvailableInventory = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/menu/inventory/available`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableInventory(data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/menu/categories/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  // Create or update menu item
  const handleSubmit = async (formData) => {
    setLoading(true);

    try {
      const token = getAuthToken();
      const url = editingItem
        ? `${API_BASE}/menu/${editingItem._id}`
        : `${API_BASE}/menu`;

      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save menu item");
      }

      const data = await response.json();
      toast.success(
        editingItem
          ? "Menu item updated successfully"
          : "Menu item created successfully"
      );
      setShowForm(false);
      setEditingItem(null);
      fetchMenuItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show delete confirmation modal
  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  // Confirm delete menu item
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/menu/${itemToDelete._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete menu item");
      }

      toast.success("Menu item deleted successfully");
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchMenuItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
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

  // Edit menu item
  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  // Close form
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  // Toggle availability
  const handleToggleAvailability = async (item) => {
    setLoading(true);
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
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchMenuItems();
    fetchAvailableInventory();
    fetchCategories();
  }, []);

  // Refetch when search or filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMenuItems();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoryFilter, availabilityFilter]);

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide">
            Manage Menu
          </h1>
          <button className="bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-xl font-bold shadow">
            Add New Menu Item
          </button>
        </div>

        {/* Filters/Search: card */}
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
                  placeholder="Search by name..."
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]" />
                <p className="mt-2 text-[#ababab]">Loading menu items...</p>
              </div>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-[#ababab] text-lg">No menu items found</p>
            </div>
          ) : (
            menuItems.map((item) => (
              <div
                key={item._id}
                className="bg-[#232323] rounded-lg shadow-md border border-[#383838] overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Image */}
                {item.image && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {/* Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-[#f5f5f5]">
                      {item.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        item.is_available
                          ? "bg-green-700 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <p className="text-[#b5b5b5] text-sm mb-2 line-clamp-2">
                    {item.description || "No description available"}
                  </p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-[#cccccc]">
                      {item.category}
                    </span>
                    <span className="text-lg font-bold text-[#f6b100]">
                      ₱{item.price}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#cccccc]">Servings:</span>
                    <span className="text-sm font-bold text-[#f5f5f5]">
                      {item.servings || 1}
                    </span>
                  </div>
                  {item.preparation_time && (
                    <p className="text-xs text-[#cccccc] mb-2">
                      Prep time: {item.preparation_time} minutes
                    </p>
                  )}
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewClick(item)}
                      className="px-3 py-1 bg-blue-700 text-white rounded text-sm font-bold hover:bg-blue-800 transition-colors flex items-center justify-center"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 px-3 py-1 bg-yellow-600 text-white rounded text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className="px-3 py-1 bg-[#181818] text-[#b5b5b5] border border-[#383838] rounded text-sm font-bold hover:bg-[#262626] transition-colors flex items-center justify-center"
                    >
                      {item.is_available ? (
                        <ToggleRight className="w-3 h-3" />
                      ) : (
                        <ToggleLeft className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item)}
                      className="px-3 py-1 bg-red-700 text-white rounded text-sm font-bold hover:bg-red-800 transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Menu Modal */}
        <AddMenuModal
          isOpen={showForm}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          loading={loading}
          editingItem={editingItem}
          initialData={
            editingItem
              ? {
                  name: editingItem.name,
                  description: editingItem.description,
                  category: editingItem.category,
                  price: editingItem.price,
                  image: editingItem.image,
                  ingredients:
                    editingItem.ingredients?.map((ing) => ({
                      ...ing,
                      inventoryName: ing.inventoryItem?.name || "",
                    })) || [],
                  preparation_time: editingItem.preparation_time,
                  serving_size: editingItem.serving_size,
                  servings: editingItem.servings,
                  is_available: editingItem.is_available,
                }
              : {}
          }
          availableInventory={availableInventory}
        />

        {/* Delete Confirmation Modal */}
        <DeleteMenuModal
          isOpen={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={handleDeleteConfirm}
          loading={loading}
          itemName={itemToDelete?.name}
        />

        {/* View Menu Modal */}
        <ViewMenuModal
          isOpen={showViewModal}
          onClose={handleCloseViewModal}
          menuItem={itemToView}
        />
      </div>
    </Layout>
  );
};

export default AdminMenu;
