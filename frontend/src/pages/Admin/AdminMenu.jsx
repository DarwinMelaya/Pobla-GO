import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import AddMenuModal from "../../components/Modals/Admin/AddMenuModal";
import DeleteMenuModal from "../../components/Modals/Admin/DeleteMenuModal";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  X,
} from "lucide-react";

const AdminMenu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
      setError(err.message);
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
    setError("");
    setSuccess("");

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
      setSuccess(
        editingItem
          ? "Menu item updated successfully"
          : "Menu item created successfully"
      );
      setShowForm(false);
      setEditingItem(null);
      fetchMenuItems();
    } catch (err) {
      setError(err.message);
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

      setSuccess("Menu item deleted successfully");
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchMenuItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
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
    setError("");
    setSuccess("");
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
      setSuccess(data.message);
      fetchMenuItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show item details
  const handleShowDetails = async (item) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/menu/${item._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedItem(data);
        setShowDetailsModal(true);
      }
    } catch (err) {
      setError("Failed to fetch item details");
    }
  };

  // Close details modal
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedItem(null);
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
      <div className="bg-[#EECCCC] min-h-screen p-6 rounded-r-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Manage Menu</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#C05050] hover:bg-[#B04040] text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Menu Item
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-[#DCDCDC]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Menu Items
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-3 py-2 border border-[#DCDCDC] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C05050]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCDCDC] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C05050]"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Availability
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCDCDC] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C05050]"
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
                className="w-full bg-[#C05050] hover:bg-[#B04040] text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]"></div>
                <p className="mt-2 text-gray-600">Loading menu items...</p>
              </div>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No menu items found</p>
            </div>
          ) : (
            menuItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg shadow-md border border-[#DCDCDC] overflow-hidden hover:shadow-lg transition-shadow"
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
                    <h3 className="text-lg font-semibold text-gray-800">
                      {item.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.is_available
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {item.description || "No description available"}
                  </p>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-500">
                      {item.category}
                    </span>
                    <span className="text-lg font-bold text-[#C05050]">
                      ₱{item.price}
                    </span>
                  </div>

                  {item.preparation_time && (
                    <p className="text-xs text-gray-500 mb-2">
                      Prep time: {item.preparation_time} minutes
                    </p>
                  )}

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-500">Available:</span>
                    <span
                      className={`text-sm font-medium ${
                        item.availableQuantity > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {item.availableQuantity || 0} servings
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShowDetails(item)}
                      className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      {item.is_available ? (
                        <ToggleRight className="w-3 h-3" />
                      ) : (
                        <ToggleLeft className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors flex items-center justify-center"
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

        {/* Item Details Modal */}
        {showDetailsModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedItem.name}
                  </h2>
                  <button
                    onClick={handleCloseDetailsModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {selectedItem.image && (
                  <div className="mb-4">
                    <img
                      src={selectedItem.image}
                      alt={selectedItem.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Description</h3>
                    <p className="text-gray-600">
                      {selectedItem.description || "No description available"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">Category</h3>
                      <p className="text-gray-600">{selectedItem.category}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Price</h3>
                      <p className="text-gray-600">₱{selectedItem.price}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Available Quantity
                    </h3>
                    <p
                      className={`text-lg font-medium ${
                        selectedItem.availableQuantity > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {selectedItem.availableQuantity || 0} servings can be made
                    </p>
                  </div>

                  {selectedItem.preparation_time && (
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Preparation Time
                      </h3>
                      <p className="text-gray-600">
                        {selectedItem.preparation_time} minutes
                      </p>
                    </div>
                  )}

                  {selectedItem.serving_size && (
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Serving Size
                      </h3>
                      <p className="text-gray-600">
                        {selectedItem.serving_size}
                      </p>
                    </div>
                  )}

                  {selectedItem.ingredients &&
                    selectedItem.ingredients.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          Ingredients
                        </h3>
                        <ul className="list-disc list-inside text-gray-600">
                          {selectedItem.ingredients.map((ingredient, index) => (
                            <li key={index}>
                              {ingredient.inventoryItem?.name || "Unknown"} -{" "}
                              {ingredient.quantity} {ingredient.unit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMenu;
