import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import AddInventoryModal from "../../components/Modals/Admin/AddInventoryModal";
import DeleteInventoryModal from "../../components/Modals/Admin/DeleteInventoryModal";

const ManageInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch inventory items
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      if (categoryFilter) queryParams.append("category", categoryFilter);

      const response = await fetch(`${API_BASE}/inventory?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();
      setInventory(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/inventory/categories/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  // Create or update inventory item
  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = getAuthToken();
      const url = editingItem
        ? `${API_BASE}/inventory/${editingItem._id}`
        : `${API_BASE}/inventory`;

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
        throw new Error(errorData.message || "Failed to save inventory item");
      }

      const data = await response.json();
      setSuccess(data.message);
      setShowForm(false);
      setEditingItem(null);
      fetchInventory();
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

  // Confirm delete inventory item
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE}/inventory/${itemToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete inventory item");
      }

      setSuccess("Inventory item deleted successfully");
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchInventory();
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

  // Edit inventory item
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

  // Load data on component mount
  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, []);

  // Refetch when search or filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchInventory();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoryFilter]);

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#f5f5f5]">Manage Inventory</h1>
          <button className="bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-xl font-bold shadow">Add New Item</button>
        </div>

        {/* Success/Error: alert cards now dark accent, white/yellow/red text */}
        {success && (
          <div className="bg-green-900 border border-green-600 text-green-200 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filter/search card */}
        <div className="bg-[#232323] p-4 rounded-lg shadow mb-6 border border-[#383838]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">
                Search Items
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#b5b5b5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-1">Filter by Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSearchTerm(""); setCategoryFilter(""); }}
                className="w-full bg-[#C05050] hover:bg-[#B04040] text-white px-4 py-2 rounded-md font-bold transition-colors"
              >Clear Filters</button>
            </div>
          </div>
        </div>

        <div className="bg-[#232323] rounded-lg shadow overflow-hidden border border-[#383838]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]"></div>
              <p className="mt-2 text-[#ababab]">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead className="bg-[#292929]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#232323]">
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-[#ababab]">No inventory items found</td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr key={item._id} className="hover:bg-[#282828]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-[#f5f5f5]">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-[#cccccc]">{item.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f5f5f5]">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">{item.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">{new Date(item.expiry_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">{item.supplier || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleEdit(item)} className="text-[#f6b100] hover:text-[#dab000] mr-4 font-bold">Edit</button>
                          <button onClick={() => handleDeleteClick(item)} className="text-red-500 hover:text-red-600 font-bold">Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Inventory Modal */}
        <AddInventoryModal
          isOpen={showForm}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          loading={loading}
          editingItem={editingItem}
          initialData={
            editingItem
              ? {
                  name: editingItem.name,
                  category: editingItem.category,
                  quantity: editingItem.quantity.toString(),
                  unit: editingItem.unit,
                  expiry_date: new Date(editingItem.expiry_date)
                    .toISOString()
                    .split("T")[0],
                  description: editingItem.description || "",
                  supplier: editingItem.supplier || "",
                  purchase_price: editingItem.purchase_price
                    ? editingItem.purchase_price.toString()
                    : "",
                }
              : {}
          }
        />

        {/* Delete Confirmation Modal */}
        <DeleteInventoryModal
          isOpen={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onConfirm={handleDeleteConfirm}
          loading={loading}
          itemName={itemToDelete?.name}
        />
      </div>
    </Layout>
  );
};

export default ManageInventory;
