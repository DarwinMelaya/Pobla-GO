import { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout/Layout";
import toast from "react-hot-toast";
import {
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  Calendar,
  Package,
  ChefHat,
  TrendingUp,
  Eye,
  Check,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const AdminProductions = () => {
  const [productions, setProductions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [costingDetails, setCostingDetails] = useState(null);
  const [unitConversions, setUnitConversions] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [isApprovingId, setIsApprovingId] = useState(null);

  const [formData, setFormData] = useState({
    category: "",
    menu_id: "",
    quantity: "",
    production_date: "",
    status: "Planned",
    actual_cost: "",
    notes: "",
  });

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const statusOptions = ["Planned", "In Progress", "Completed", "Cancelled"];

  const statusColors = {
    Planned: "bg-blue-600 text-white",
    "In Progress": "bg-yellow-600 text-white",
    Completed: "bg-green-600 text-white",
    Cancelled: "bg-red-600 text-white",
  };

  useEffect(() => {
    fetchProductions();
    fetchCategories();
  }, [filterStatus]);

  const fetchProductions = async () => {
    try {
      setLoading(true);
      const query = filterStatus
        ? `?status=${encodeURIComponent(filterStatus)}`
        : "";
      const response = await fetch(`${API_BASE}/productions${query}`, {
        headers: { ...authHeaders },
      });

      if (response.ok) {
        const data = await response.json();
        setProductions(Array.isArray(data?.data) ? data.data : []);
      } else {
        toast.error("Failed to fetch productions");
      }
    } catch (error) {
      console.error("Error fetching productions:", error);
      toast.error("Error fetching productions");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/categories`, {
        headers: { ...authHeaders },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(
          Array.isArray(data?.data)
            ? data.data.filter((cat) => cat.is_active !== false)
            : []
        );
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchMenuItemsByCategory = async (category) => {
    try {
      const response = await fetch(
        `${API_BASE}/menu-maintenance?category=${encodeURIComponent(category)}`,
        {
          headers: { ...authHeaders },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // menuMaintenance backend returns data directly, not wrapped in { success, data }
        const items = Array.isArray(data) ? data : [];
        setMenuItems(items);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Error fetching menu items");
    }
  };

  const fetchProductionDetails = async (production) => {
    try {
      setSelectedProduction(production);

      // Fetch recipe details
      const recipeRes = await fetch(
        `${API_BASE}/menu-recipes/menu/${production.menu_id._id}`,
        { headers: { ...authHeaders } }
      );

      // Fetch costing details
      const costingRes = await fetch(
        `${API_BASE}/menu-costing/menu/${production.menu_id._id}`,
        { headers: { ...authHeaders } }
      );

      // Fetch menu expenses
      const expensesRes = await fetch(
        `${API_BASE}/menu-expenses/menu/${production.menu_id._id}`,
        { headers: { ...authHeaders } }
      );

      const recipeData = await recipeRes.json();
      const costingData = await costingRes.json();
      const expensesData = await expensesRes.json();

      let ingredients = [];

      if (recipeData?.success) {
        ingredients = Array.isArray(recipeData.data) ? recipeData.data : [];
        setRecipeDetails({
          ingredients,
          expenses:
            expensesData?.success && Array.isArray(expensesData.data)
              ? expensesData.data
              : [],
        });
      }

      if (costingData?.success) {
        setCostingDetails(costingData.data);
      }

      // Fetch unit conversions for all materials used in this recipe,
      // to match costing logic in Maintenance → Recipe screen.
      try {
        const materialIds = Array.from(
          new Set(
            ingredients
              .map((item) => item.raw_material_id?._id || item.raw_material_id)
              .filter(Boolean)
          )
        );

        const conversionPromises = materialIds.map((materialId) =>
          fetch(`${API_BASE}/unit-conversions/material/${materialId}`, {
            headers: { ...authHeaders },
          }).then((res) => res.json())
        );

        const conversionResults = await Promise.all(conversionPromises);
        const allConversions = conversionResults
          .filter((result) => result.success)
          .flatMap((result) => (Array.isArray(result.data) ? result.data : []));

        setUnitConversions(allConversions);
      } catch (convError) {
        console.error(
          "Error fetching unit conversions for production view:",
          convError
        );
      }

      setIsViewModalOpen(true);
    } catch (error) {
      console.error("Error fetching production details:", error);
      toast.error("Error fetching production details");
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      menu_id: "",
      quantity: "",
      production_date: "",
      status: "Planned",
      actual_cost: "",
      notes: "",
    });
    setEditingId(null);
    setIsModalOpen(false);
    setMenuItems([]);
  };

  const startEdit = (production) => {
    setEditingId(production._id);
    setFormData({
      category: production.menu_id?.category || "",
      menu_id: production.menu_id?._id || "",
      quantity: String(production.quantity || ""),
      production_date: production.production_date
        ? new Date(production.production_date).toISOString().split("T")[0]
        : "",
      status: production.status || "Planned",
      actual_cost: String(production.actual_cost || ""),
      notes: production.notes || "",
    });

    if (production.menu_id?.category) {
      fetchMenuItemsByCategory(production.menu_id.category);
    }

    setIsModalOpen(true);
  };

  const confirmDelete = (production) => {
    setDeleteTarget(production);
    setIsDeleteOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newForm = { ...prev, [name]: value };

      // If category changes, fetch menu items and reset menu_id
      if (name === "category" && value) {
        fetchMenuItemsByCategory(value);
        newForm.menu_id = "";
      }

      return newForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.menu_id || !formData.quantity || !formData.production_date) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        menu_id: formData.menu_id,
        quantity: parseInt(formData.quantity),
        production_date: formData.production_date,
        status: formData.status,
        actual_cost: formData.actual_cost
          ? parseFloat(formData.actual_cost)
          : 0,
        notes: formData.notes,
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/productions/${editingId}`
        : `${API_BASE}/productions`;

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
        throw new Error(data?.message || "Failed to save production");
      }

      // Show success message with inventory deduction details if available
      if (
        !editingId &&
        data.inventoryDeductions &&
        data.inventoryDeductions.length > 0
      ) {
        const deductionSummary = data.inventoryDeductions
          .map((d) => `${d.materialName}: -${d.deducted.toFixed(2)} ${d.unit}`)
          .join(", ");
        toast.success(
          `Production created successfully! Materials deducted: ${deductionSummary}`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          editingId ? "Production updated" : "Production added successfully"
        );
      }

      await fetchProductions();
      resetForm();
    } catch (error) {
      console.error("Error saving production:", error);
      toast.error(error.message || "Error saving production");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setIsDeleting(true);
      const response = await fetch(
        `${API_BASE}/productions/${deleteTarget._id}`,
        {
          method: "DELETE",
          headers: { ...authHeaders },
        }
      );
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Delete failed");
      }
      toast.success("Production deleted");
      await fetchProductions();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting production:", error);
      toast.error(error.message || "Error deleting production");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusUpdate = async (productionId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/productions/${productionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update status");
      }

      toast.success("Status updated successfully");
      await fetchProductions();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Error updating status");
    }
  };

  const handleApprovalDecision = async (productionId, decision) => {
    try {
      setIsApprovingId(productionId);
      const response = await fetch(
        `${API_BASE}/productions/${productionId}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ decision }),
        }
      );

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to process approval");
      }

      toast.success(
        decision === "Approved"
          ? "Production request approved"
          : "Production request rejected"
      );
      await fetchProductions();
    } catch (error) {
      console.error("Error processing approval:", error);
      toast.error(error.message || "Error processing approval");
    } finally {
      setIsApprovingId(null);
    }
  };

  const calculateTotalIngredientsCost = () => {
    if (!recipeDetails?.ingredients) return 0;

    // Match costing logic used in Maintenance → Recipe component:
    // respect unit conversions per raw material.
    return recipeDetails.ingredients.reduce((total, item) => {
      const material = item.raw_material_id;
      if (!material) return total;

      const materialId = material._id || material;
      const materialIdStr = String(materialId);

      // Check if the unit matches the material's base unit
      const isBaseUnit = material.unit === item.unit;

      // Find unit conversion for this item's unit AND material
      const unitConversion = unitConversions.find((conversion) => {
        const convMaterialId =
          conversion.raw_material_id?._id ||
          conversion.raw_material_id ||
          conversion.raw_material;
        return (
          conversion.equivalent_unit === item.unit &&
          String(convMaterialId) === materialIdStr
        );
      });

      // Use unit conversion price if available and not base unit,
      // otherwise use material's base price
      const unitPrice =
        !isBaseUnit && unitConversion?.unit_price
          ? unitConversion.unit_price
          : material.unit_price || 0;

      return total + unitPrice * item.quantity;
    }, 0);
  };

  const calculateTotalExpensesCost = () => {
    if (!recipeDetails?.expenses) return 0;
    return recipeDetails.expenses.reduce(
      (total, expense) => total + (expense.amount || 0),
      0
    );
  };

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide flex items-center gap-3">
              <Package className="w-8 h-8 text-[#f6b100]" />
              Production Management
            </h1>
            <p className="text-[#b5b5b5] mt-2">
              Plan and track menu item productions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-[#383838] rounded-md bg-[#181818] text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#f6b100]"
            >
              <option value="">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Production
            </button>
          </div>
        </div>

        {/* Productions Table */}
        {loading ? (
          <div className="text-[#ababab] p-8 text-center">Loading...</div>
        ) : productions.length === 0 ? (
          <div className="bg-[#232323] p-12 rounded-lg border border-[#383838] text-center">
            <Package className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <p className="text-[#ababab] text-lg">
              No productions found. Start by creating a new production.
            </p>
          </div>
        ) : (
          <div className="bg-[#232323] rounded-lg shadow border border-[#383838] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead className="bg-[#181818]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Menu Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      SRP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Approval
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {productions.map((production) => (
                    <tr
                      key={production._id}
                      className="hover:bg-[#2a2a2a] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-[#f5f5f5]">
                        {new Date(
                          production.production_date
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-[#f5f5f5]">
                        <div className="flex items-center gap-3">
                          {production.menu_id?.image && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#181818] flex-shrink-0">
                              <img
                                src={production.menu_id.image}
                                alt={production.menu_id.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <span className="font-medium">
                            {production.menu_id?.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#f5f5f5]">
                        {production.menu_id?.category || "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-[#f5f5f5] font-medium">
                        {production.quantity}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={production.status}
                          onChange={(e) =>
                            handleQuickStatusUpdate(
                              production._id,
                              e.target.value
                            )
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium border-none outline-none cursor-pointer ${
                            statusColors[production.status] ||
                            "bg-gray-600 text-white"
                          }`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right text-[#f6b100] font-medium">
                        ₱{production.srp?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            production.approval_status === "Pending"
                              ? "bg-yellow-600 text-white"
                              : production.approval_status === "Rejected"
                              ? "bg-red-700 text-white"
                              : "bg-green-700 text-white"
                          }`}
                        >
                          {production.approval_status || "Approved"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => fetchProductionDetails(production)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-500 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => startEdit(production)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => confirmDelete(production)}
                            className="px-3 py-1 bg-red-700 text-white rounded text-sm font-bold hover:bg-red-800 transition-colors flex items-center justify-center"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          {production.approval_status === "Pending" &&
                            production.requested_by && (
                              <>
                                <button
                                  onClick={() =>
                                    handleApprovalDecision(
                                      production._id,
                                      "Approved"
                                    )
                                  }
                                  disabled={isApprovingId === production._id}
                                  className="px-3 py-1 bg-green-700 text-white rounded text-sm font-bold hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-70"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() =>
                                    handleApprovalDecision(
                                      production._id,
                                      "Rejected"
                                    )
                                  }
                                  disabled={isApprovingId === production._id}
                                  className="px-3 py-1 bg-gray-700 text-white rounded text-sm font-bold hover:bg-gray-600 transition-colors flex items-center gap-1 disabled:opacity-70"
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div className="absolute inset-0 bg-black/50" onClick={resetForm} />
            <div className="relative bg-[#232323] w-full max-w-2xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-[#f6b100]" />
                  {editingId ? "Edit Production" : "New Production"}
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
                  <div>
                    <label className="block text-sm font-medium text-[#cccccc] mb-2">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                      required
                      disabled={editingId}
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#cccccc] mb-2">
                      Menu Item <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="menu_id"
                      value={formData.menu_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                      required
                      disabled={!formData.category || editingId}
                    >
                      <option value="">
                        {formData.category
                          ? "Select Menu Item"
                          : "Select category first"}
                      </option>
                      {menuItems.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#cccccc] mb-2">
                      Quantity (pieces) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      min="1"
                      step="1"
                      placeholder="e.g., 50"
                      className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#cccccc] mb-2">
                      Production Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="production_date"
                      value={formData.production_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#cccccc] mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editingId && (
                    <div>
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        Actual Cost
                      </label>
                      <input
                        type="number"
                        name="actual_cost"
                        value={formData.actual_cost}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#cccccc] mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Additional notes or instructions"
                      className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#383838]">
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
                      ? "Saving..."
                      : editingId
                      ? "Update Production"
                      : "Create Production"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {isViewModalOpen && selectedProduction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setIsViewModalOpen(false);
                setSelectedProduction(null);
                setRecipeDetails(null);
                setCostingDetails(null);
                setUnitConversions([]);
              }}
            />
            <div className="relative bg-[#232323] w-full max-w-5xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#f6b100]" />
                  Production Details
                </h2>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedProduction(null);
                    setRecipeDetails(null);
                    setCostingDetails(null);
                    setUnitConversions([]);
                  }}
                  className="text-[#b5b5b5] hover:text-white"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Production Info */}
              <div className="mb-6 p-4 bg-[#181818] rounded-lg border border-[#383838]">
                <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">
                  Production Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[#cccccc] mb-1">Menu Item</p>
                    <p className="text-[#f5f5f5] font-medium">
                      {selectedProduction.menu_id?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#cccccc] mb-1">Category</p>
                    <p className="text-[#f5f5f5] font-medium">
                      {selectedProduction.menu_id?.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#cccccc] mb-1">Quantity</p>
                    <p className="text-[#f5f5f5] font-medium">
                      {selectedProduction.quantity} pieces
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#cccccc] mb-1">
                      Production Date
                    </p>
                    <p className="text-[#f5f5f5] font-medium">
                      {new Date(
                        selectedProduction.production_date
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#cccccc] mb-1">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[selectedProduction.status] ||
                        "bg-gray-600 text-white"
                      }`}
                    >
                      {selectedProduction.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#cccccc] mb-1">SRP per Piece</p>
                    <p className="text-[#f6b100] font-bold">
                      ₱{selectedProduction.srp?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#cccccc] mb-1">
                      Total Expected Cost
                    </p>
                    <p className="text-[#f6b100] font-bold">
                      ₱{selectedProduction.expected_cost?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
                {selectedProduction.notes && (
                  <div className="mt-4">
                    <p className="text-xs text-[#cccccc] mb-1">Notes</p>
                    <p className="text-[#f5f5f5]">{selectedProduction.notes}</p>
                  </div>
                )}
              </div>

              {/* Recipe Ingredients */}
              {recipeDetails?.ingredients && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">
                    Recipe Ingredients
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#383838]">
                      <thead className="bg-[#181818]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase">
                            Category
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase">
                            Material
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase">
                            Unit
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Qty/Piece
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Total Qty
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Unit Price
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Total Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#383838]">
                        {recipeDetails.ingredients.map((item, index) => {
                          const material = item.raw_material_id;
                          const materialId = material?._id || material;
                          const materialIdStr = String(materialId);

                          // Find unit conversion for this item's unit AND material
                          const unitConversion = unitConversions.find(
                            (conversion) => {
                              const convMaterialId =
                                conversion.raw_material_id?._id ||
                                conversion.raw_material_id ||
                                conversion.raw_material;
                              return (
                                conversion.equivalent_unit === item.unit &&
                                String(convMaterialId) === materialIdStr
                              );
                            }
                          );

                          // Check if the unit matches the material's base unit
                          const isBaseUnit = material?.unit === item.unit;

                          // Use unit conversion price if available and not base unit,
                          // otherwise use material's base price
                          const baseUnitPrice = material?.unit_price || 0;
                          const unitPrice =
                            !isBaseUnit && unitConversion?.unit_price
                              ? unitConversion.unit_price
                              : baseUnitPrice;

                          const qtyPerPiece = item.quantity;
                          const totalQty =
                            qtyPerPiece * selectedProduction.quantity;
                          const totalCost = unitPrice * totalQty;

                          return (
                            <tr key={index}>
                              <td className="px-4 py-2 text-[#f5f5f5]">
                                {material?.category || "-"}
                              </td>
                              <td className="px-4 py-2 text-[#f5f5f5]">
                                {material?.name || "Unknown"}
                              </td>
                              <td className="px-4 py-2 text-[#f5f5f5]">
                                {item.unit}
                              </td>
                              <td className="px-4 py-2 text-right text-[#f5f5f5]">
                                {qtyPerPiece}
                              </td>
                              <td className="px-4 py-2 text-right text-[#f5f5f5] font-medium">
                                {totalQty.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right text-[#f5f5f5]">
                                ₱{unitPrice.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right text-[#f6b100] font-medium">
                                ₱{totalCost.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-[#181818]">
                        <tr>
                          <td
                            colSpan="6"
                            className="px-4 py-3 text-right text-[#cccccc] font-medium"
                          >
                            Total Ingredients Cost:
                          </td>
                          <td className="px-4 py-3 text-right text-[#f6b100] font-bold">
                            ₱
                            {(
                              calculateTotalIngredientsCost() *
                              selectedProduction.quantity
                            ).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Other Expenses */}
              {recipeDetails?.expenses && recipeDetails.expenses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">
                    Other Expenses
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#383838]">
                      <thead className="bg-[#181818]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase">
                            Expense
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase">
                            Description
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Amount/Piece
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Total Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#383838]">
                        {recipeDetails.expenses.map((expense, index) => {
                          const totalAmount =
                            expense.amount * selectedProduction.quantity;
                          return (
                            <tr key={index}>
                              <td className="px-4 py-2 text-[#f5f5f5]">
                                {expense.expense}
                              </td>
                              <td className="px-4 py-2 text-[#f5f5f5]">
                                {expense.description || "-"}
                              </td>
                              <td className="px-4 py-2 text-right text-[#f5f5f5]">
                                ₱{expense.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right text-[#f6b100] font-medium">
                                ₱{totalAmount.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-[#181818]">
                        <tr>
                          <td
                            colSpan="3"
                            className="px-4 py-3 text-right text-[#cccccc] font-medium"
                          >
                            Total Expenses:
                          </td>
                          <td className="px-4 py-3 text-right text-[#f6b100] font-bold">
                            ₱
                            {(
                              calculateTotalExpensesCost() *
                              selectedProduction.quantity
                            ).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Costing Summary */}
              {costingDetails && (
                <div className="p-4 bg-[#181818] rounded-lg border border-[#383838]">
                  <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">
                    Costing Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#cccccc] mb-1">
                        Cost per Piece
                      </p>
                      <p className="text-[#f6b100] font-bold text-lg">
                        ₱
                        {costingDetails.production_cost_per_piece?.toFixed(2) ||
                          "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#cccccc] mb-1">SRP</p>
                      <p className="text-[#f6b100] font-bold text-lg">
                        ₱{costingDetails.srp?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#cccccc] mb-1">
                        Net Profit per Piece
                      </p>
                      <p className="text-green-500 font-bold text-lg">
                        ₱{costingDetails.net_profit?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#cccccc] mb-1">
                        Total Production Cost ({selectedProduction.quantity}{" "}
                        pcs)
                      </p>
                      <p className="text-[#f6b100] font-bold text-lg">
                        ₱
                        {(
                          (costingDetails.production_cost_per_piece || 0) *
                          selectedProduction.quantity
                        ).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#cccccc] mb-1">
                        Expected Gross Sales
                      </p>
                      <p className="text-[#f6b100] font-bold text-lg">
                        ₱
                        {(
                          (costingDetails.srp || 0) *
                          selectedProduction.quantity
                        ).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#cccccc] mb-1">
                        Expected Net Income
                      </p>
                      <p className="text-green-500 font-bold text-lg">
                        ₱
                        {(
                          (costingDetails.net_profit || 0) *
                          selectedProduction.quantity
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                  Delete Production
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
                Are you sure you want to delete this production record for
                <span className="font-bold text-white">
                  {" "}
                  {deleteTarget.menu_id?.name}
                </span>
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
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md font-bold disabled:opacity-70"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminProductions;
