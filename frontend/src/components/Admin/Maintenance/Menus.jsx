import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Plus, Save, X, Edit, Trash2, ChefHat } from "lucide-react";
import Recipe from "./Menus/Recipe";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const Menus = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    critical_level: null,
    description: "",
    image: null,
    currentImage: null,
  });
  const [imagePreview, setImagePreview] = useState(null);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const criticalLevels = [
    { value: 1, label: "Low" },
    { value: 2, label: "Medium" },
    { value: 3, label: "High" },
    { value: 4, label: "Critical" },
  ];

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch(`${API_BASE}/categories`, {
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data?.data) ? data.data : []);
      } else {
        toast.error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Error fetching categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const response = await fetch(`${API_BASE}/menu-maintenance${query}`, {
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMenuItems(Array.isArray(data?.data) ? data.data : data);
      } else {
        toast.error("Failed to fetch menu items");
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Error fetching menu items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchMenuItems();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      critical_level: null,
      description: "",
      image: null,
      currentImage: null,
    });
    setImagePreview(null);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      name: item.name || "",
      category: item.category || "",
      critical_level: item.critical_level || null,
      description: item.description || "",
      image: null,
      currentImage: item.image || null,
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setIsDeleteOpen(true);
  };

  const handleRecipe = (item) => {
    setSelectedMenuItem(item);
    setShowRecipe(true);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files && files[0] ? files[0] : null;
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));

      // Create preview for new image
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
      return;
    }

    // Convert critical_level to number
    if (name === "critical_level") {
      setFormData((prev) => ({
        ...prev,
        [name]: value ? Number(value) : null,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.category.trim() ||
      !formData.critical_level
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        critical_level: Number(formData.critical_level),
        description: formData.description,
        image: formData.image ? await toBase64(formData.image) : undefined,
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/menu-maintenance/${editingId}`
        : `${API_BASE}/menu-maintenance`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to save menu item");
      }

      toast.success(editingId ? "Menu item updated" : "Menu item added");
      await fetchMenuItems();
      resetForm();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error(error.message || "Error saving menu item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setIsDeleting(true);
      const response = await fetch(
        `${API_BASE}/menu-maintenance/${deleteTarget._id}`,
        {
          method: "DELETE",
          headers: { ...authHeaders },
        }
      );
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Delete failed");
      }
      toast.success("Menu item deleted");
      await fetchMenuItems();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error(error.message || "Error deleting menu item");
    } finally {
      setIsDeleting(false);
    }
  };

  const getCriticalLevelColor = (level) => {
    switch (level) {
      case 1:
        return "bg-green-600 text-white";
      case 2:
        return "bg-yellow-600 text-white";
      case 3:
        return "bg-orange-600 text-white";
      case 4:
        return "bg-red-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getCriticalLevelLabel = (level) => {
    const levelObj = criticalLevels.find((l) => l.value === level);
    return levelObj ? levelObj.label : "Unknown";
  };

  if (showRecipe && selectedMenuItem) {
    return (
      <Recipe
        menuItem={selectedMenuItem}
        onBack={() => {
          setShowRecipe(false);
          setSelectedMenuItem(null);
        }}
      />
    );
  }

  return (
    <div className="bg-[#232323] p-6 rounded-lg shadow border border-[#383838]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-[#f5f5f5]">Menu Maintenance</h2>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, category..."
            className="flex-1 md:w-80 px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-3 py-2 rounded-md font-bold hover:bg-[#262626]"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-[#ababab]">Loading...</div>
      ) : menuItems.length === 0 ? (
        <div className="text-[#ababab]">No menu items found.</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead>
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden md:table-cell">
                      Category
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden lg:table-cell">
                      Critical Level
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden lg:table-cell">
                      Description
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {menuItems.map((item) => (
                    <tr key={item._id}>
                      <td className="px-2 sm:px-4 py-2">
                        {item.image ? (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-[#181818] flex items-center justify-center">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#181818] flex items-center justify-center">
                            <span className="text-[#666] text-xs">No Image</span>
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-sm sm:text-base">
                        <div className="flex flex-col sm:block">
                          <span className="font-medium">{item.name}</span>
                          <div className="flex flex-col gap-1 md:hidden mt-1">
                            <span className="text-xs text-[#bababa]">Cat: {item.category}</span>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${getCriticalLevelColor(
                              item.critical_level
                            )}`}>
                              Level: {item.critical_level}
                            </span>
                            {item.description && (
                              <span className="text-xs text-[#bababa]">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] hidden md:table-cell">
                        {item.category}
                      </td>
                      <td className="px-2 sm:px-4 py-2 hidden lg:table-cell">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getCriticalLevelColor(
                            item.critical_level
                          )}`}
                        >
                          {item.critical_level}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] hidden lg:table-cell">
                        {item.description || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                          <button
                            onClick={() => handleRecipe(item)}
                            className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm font-bold hover:bg-blue-500 transition-colors flex items-center gap-1"
                          >
                            <ChefHat className="w-3 h-3" /> <span className="hidden sm:inline">Recipe</span>
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            className="px-2 sm:px-3 py-1 bg-yellow-600 text-white rounded text-xs sm:text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => confirmDelete(item)}
                            className="px-2 sm:px-3 py-1 bg-red-700 text-white rounded text-xs sm:text-sm font-bold hover:bg-red-800 transition-colors flex items-center justify-center"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/50" onClick={resetForm} />
          <div className="relative bg-[#232323] w-full max-w-2xl rounded-lg border border-[#383838] shadow p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#f5f5f5]">
                {editingId ? "Edit Menu Item" : "Add Menu Item"}
              </h2>
              <button
                onClick={resetForm}
                className="text-[#b5b5b5] hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Grilled Chicken"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                  required
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "Select Category"}
                  </option>
                  {categories
                    .filter((category) => category.is_active !== false)
                    .map((category) => (
                      <option key={category._id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Critical Level *
                </label>
                <select
                  name="critical_level"
                  value={
                    formData.critical_level
                      ? String(formData.critical_level)
                      : ""
                  }
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                  required
                >
                  <option value="">Select Critical Level</option>
                  {criticalLevels.map((level) => (
                    <option key={level.value} value={String(level.value)}>
                      {level.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Menu item description"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Image
                </label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  className="w-full text-[#f5f5f5]"
                />

                {/* Current Image Display */}
                {editingId && formData.currentImage && !imagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-[#b5b5b5] mb-2">
                      Current Image:
                    </p>
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-[#181818] flex items-center justify-center">
                      <img
                        src={formData.currentImage}
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* New Image Preview */}
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-[#b5b5b5] mb-2">
                      New Image Preview:
                    </p>
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-[#181818] flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {formData.image && (
                  <p className="text-xs text-[#b5b5b5] mt-1">
                    Selected: {formData.image.name}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-1">
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
                  {isSubmitting
                    ? editingId
                      ? "Saving..."
                      : "Adding..."
                    : editingId
                    ? "Save Changes"
                    : "Add Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setIsDeleteOpen(false);
              setDeleteTarget(null);
            }}
          />
          <div className="relative bg-[#232323] w-full max-w-md rounded-lg border border-[#383838] shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-[#f5f5f5]">
                Delete Menu Item
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
              Are you sure you want to delete
              <span className="font-bold text-white"> {deleteTarget.name}</span>
              ? This action cannot be undone.
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
  );
};

export default Menus;
