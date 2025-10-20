import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  ArrowLeft,
  ChefHat,
  Utensils,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const Recipe = ({ menuItem, onBack }) => {
  const [rawMaterials, setRawMaterials] = useState([]);
  const [recipeItems, setRecipeItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    raw_material_id: "",
    quantity: "",
    unit: "",
    notes: "",
  });

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [materialsRes, recipeRes] = await Promise.all([
          fetch(`${API_BASE}/raw-materials`, {
            headers: { ...authHeaders },
          }),
          fetch(`${API_BASE}/menu-recipes/menu/${menuItem._id}`, {
            headers: { ...authHeaders },
          }),
        ]);

        const [materialsData, recipeData] = await Promise.all([
          materialsRes.json(),
          recipeRes.json(),
        ]);

        if (materialsData?.success) {
          setRawMaterials(
            Array.isArray(materialsData.data) ? materialsData.data : []
          );
        }

        if (recipeData?.success) {
          setRecipeItems(Array.isArray(recipeData.data) ? recipeData.data : []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    if (menuItem?._id) {
      fetchData();
    }
  }, [menuItem?._id, authHeaders]);

  const resetForm = () => {
    setForm({
      raw_material_id: "",
      quantity: "",
      unit: "",
      notes: "",
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      raw_material_id: item.raw_material_id || "",
      quantity: String(item.quantity || ""),
      unit: item.unit || "",
      notes: item.notes || "",
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/menu-recipes/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Delete failed");
      }
      toast.success("Recipe item deleted");
      await fetchRecipeItems();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchRecipeItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/menu-recipes/menu/${menuItem._id}`, {
        headers: { ...authHeaders },
      });
      const data = await res.json();
      if (data?.success) {
        setRecipeItems(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      toast.error("Failed to fetch recipe items");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.raw_material_id || !form.quantity || !form.unit) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        menu_id: menuItem._id,
        raw_material_id: form.raw_material_id,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        notes: form.notes,
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/menu-recipes/${editingId}`
        : `${API_BASE}/menu-recipes`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to save recipe item");
      }

      toast.success(
        editingId ? "Recipe item updated" : "Recipe item added successfully"
      );
      await fetchRecipeItems();
      resetForm();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedMaterial = () => {
    return rawMaterials.find(
      (material) => material._id === form.raw_material_id
    );
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#232323] p-6 rounded-lg shadow border border-[#383838]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#b5b5b5] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <div className="flex items-center gap-3">
                <ChefHat className="w-6 h-6 text-[#f6b100]" />
                <h2 className="text-xl font-bold text-[#f5f5f5]">
                  Recipe Management
                </h2>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
          </div>

          <div className="mb-4 p-4 bg-[#181818] rounded-lg border border-[#383838]">
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">
              Menu Item Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#cccccc]">Name:</span>
                <span className="text-[#f5f5f5] ml-2">{menuItem?.name}</span>
              </div>
              <div>
                <span className="text-[#cccccc]">Category:</span>
                <span className="text-[#f5f5f5] ml-2">
                  {menuItem?.category}
                </span>
              </div>
              <div>
                <span className="text-[#cccccc]">Critical Level:</span>
                <span className="text-[#f5f5f5] ml-2">
                  {menuItem?.critical_level}
                </span>
              </div>
              <div>
                <span className="text-[#cccccc]">Description:</span>
                <span className="text-[#f5f5f5] ml-2">
                  {menuItem?.description || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-[#ababab]">Loading...</div>
          ) : recipeItems.length === 0 ? (
            <div className="text-[#ababab]">No recipe ingredients found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Ingredient
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {recipeItems.map((item) => {
                    const material = rawMaterials.find(
                      (m) => m._id === item.raw_material_id
                    );
                    return (
                      <tr key={item._id}>
                        <td className="px-4 py-2 text-[#f5f5f5]">
                          {material?.name || "Unknown Material"}
                        </td>
                        <td className="px-4 py-2 text-[#f5f5f5] text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-[#f5f5f5]">
                          {item.unit}
                        </td>
                        <td className="px-4 py-2 text-[#f5f5f5]">
                          {item.notes || "-"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => confirmDelete(item)}
                              className="px-3 py-1 bg-red-700 text-white rounded text-sm font-bold hover:bg-red-800 transition-colors flex items-center justify-center"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add/Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={resetForm}
              />
              <div className="relative bg-[#232323] w-full max-w-2xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#f5f5f5]">
                    {editingId
                      ? "Edit Recipe Ingredient"
                      : "Add Recipe Ingredient"}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-[#b5b5b5] hover:text-white"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        Raw Material <span className="text-red-400">*</span>
                      </label>
                      <select
                        name="raw_material_id"
                        value={form.raw_material_id}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                        required
                      >
                        <option value="">Select raw material</option>
                        {rawMaterials.map((material) => (
                          <option key={material._id} value={material._id}>
                            {material.name} ({material.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        Quantity <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={form.quantity}
                        onChange={handleChange}
                        min="0.01"
                        step="0.01"
                        placeholder="e.g., 1.5"
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        Unit <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="unit"
                        value={form.unit}
                        onChange={handleChange}
                        placeholder="e.g., kg, cups, pieces"
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Additional notes or instructions"
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-4 py-2 rounded-md font-bold hover:bg-[#262626]"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold disabled:opacity-70"
                    >
                      <Save className="w-4 h-4" />
                      {isSubmitting ? "Saving..." : "Save Ingredient"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {isDeleteOpen && deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeleteTarget(null);
                }}
              />
              <div className="relative bg-[#232323] w-full max-w-md mx-4 my-8 rounded-lg border border-[#383838] shadow p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-[#f5f5f5]">
                    Delete Recipe Ingredient
                  </h3>
                  <button
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setDeleteTarget(null);
                    }}
                    className="text-[#b5b5b5] hover:text-white"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[#cccccc] mb-4">
                  Are you sure you want to delete this recipe ingredient? This
                  action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteOpen(false);
                      setDeleteTarget(null);
                    }}
                    className="px-4 py-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] rounded-md font-bold hover:bg-[#262626]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recipe;
