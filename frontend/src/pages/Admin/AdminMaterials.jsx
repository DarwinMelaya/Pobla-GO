import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Package,
  AlertCircle,
} from "lucide-react";

const AdminMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialToDelete, setMaterialToDelete] = useState(null);

  // API base URL
  const API_BASE = "http://localhost:5000";

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch materials
  const fetchMaterials = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getAuthToken();
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      if (categoryFilter) queryParams.append("category", categoryFilter);
      queryParams.append("type", "raw_material"); // Only show raw materials

      const response = await fetch(`${API_BASE}/materials?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch materials");
      }

      const data = await response.json();
      setMaterials(data.data);
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
      const response = await fetch(`${API_BASE}/materials/categories/list`, {
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

  // Delete material
  const handleDeleteConfirm = async () => {
    if (!materialToDelete) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE}/materials/${materialToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete material");
      }

      setSuccess("Material deleted successfully");
      setShowDeleteModal(false);
      setMaterialToDelete(null);
      fetchMaterials();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchMaterials();
    fetchCategories();
  }, []);

  // Refetch when search or filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMaterials();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoryFilter]);

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get stock status color
  const getStockStatus = (available, quantity) => {
    const percentage = (available / quantity) * 100;
    if (percentage <= 10) return "text-red-500";
    if (percentage <= 30) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide flex items-center gap-3">
              <Package className="text-[#f6b100]" size={32} />
              Raw Materials Inventory
            </h1>
            <p className="text-[#ababab] mt-2">
              Manage your raw materials stock and availability
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Add Material
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-900/50 border border-green-600 text-green-200 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Filter/Search Section */}
        <div className="bg-[#232323] p-6 rounded-xl shadow-lg mb-6 border border-[#383838]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-2 flex items-center gap-2">
                <Search size={16} />
                Search Materials
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-4 py-2 border border-[#383838] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#b5b5b5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#cccccc] mb-2 flex items-center gap-2">
                <Filter size={16} />
                Filter by Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-[#383838] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                }}
                className="w-full bg-[#C05050] hover:bg-[#B04040] text-white px-4 py-2 rounded-lg font-bold transition-colors shadow"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Materials Table */}
        <div className="bg-[#232323] rounded-xl shadow-lg overflow-hidden border border-[#383838]">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#f6b100]"></div>
              <p className="mt-4 text-[#ababab] text-lg">
                Loading materials...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead className="bg-[#292929]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Raw Material
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Stocks
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#232323] divide-y divide-[#383838]">
                  {materials.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-12 text-center text-[#ababab]"
                      >
                        <Package
                          size={48}
                          className="mx-auto mb-4 opacity-50"
                        />
                        <p className="text-lg">No materials found</p>
                        <p className="text-sm mt-2">
                          Add your first raw material to get started
                        </p>
                      </td>
                    </tr>
                  ) : (
                    materials.map((material) => (
                      <tr
                        key={material._id}
                        className="hover:bg-[#282828] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-[#f5f5f5]">
                            {material.name}
                          </div>
                          {material.description && (
                            <div className="text-xs text-[#ababab] mt-1">
                              {material.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#383838] text-[#f6b100]">
                            {material.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">
                          {material.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-[#f5f5f5]">
                            {material.quantity || material.stocks || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`text-sm font-bold ${getStockStatus(
                              material.available,
                              material.quantity
                            )}`}
                          >
                            {material.available || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">
                          {material.supplier_name ||
                            material.supplier?.company_name ||
                            "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f5f5f5]">
                          {material.purchase_price
                            ? `₱${material.purchase_price.toFixed(2)}`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingMaterial(material);
                                setShowAddModal(true);
                              }}
                              className="text-[#f6b100] hover:text-[#dab000] p-2 hover:bg-[#383838] rounded-lg transition-all"
                              title="Edit Material"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setMaterialToDelete(material);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-500 hover:text-red-600 p-2 hover:bg-[#383838] rounded-lg transition-all"
                              title="Delete Material"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Materials Count */}
        <div className="mt-4 text-[#ababab] text-sm">
          Total Materials:{" "}
          <span className="font-bold text-[#f5f5f5]">{materials.length}</span>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#232323] rounded-xl w-full max-w-md border border-[#383838] shadow-2xl">
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#f5f5f5] mb-4">
                  Delete Material
                </h3>
                <p className="text-[#ababab] mb-6">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-[#f6b100]">
                    {materialToDelete?.name}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setMaterialToDelete(null);
                    }}
                    className="flex-1 bg-[#383838] hover:bg-[#484848] text-[#f5f5f5] px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                  >
                    {loading ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMaterials;
