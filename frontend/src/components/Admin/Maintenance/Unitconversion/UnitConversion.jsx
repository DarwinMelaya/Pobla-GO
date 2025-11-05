import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Save,
  X,
  Calculator,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const UnitConversion = ({ material, onBack }) => {
  const [units, setUnits] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    base_unit: material?.unit || "",
    equivalent_unit: "",
    quantity: "",
    unit_price: material?.unit_price || "",
    markup_percent: material?.markup_percent || "",
    srp: "",
    is_default_retail: false,
  });

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [unitsRes, conversionsRes] = await Promise.all([
          fetch(`${API_BASE}/units`),
          fetch(`${API_BASE}/unit-conversions/material/${material._id}`),
        ]);

        const [unitsData, conversionsData] = await Promise.all([
          unitsRes.json(),
          conversionsRes.json(),
        ]);

        if (unitsData?.success) {
          setUnits(Array.isArray(unitsData.data) ? unitsData.data : []);
        }

        if (conversionsData?.success) {
          setConversions(
            Array.isArray(conversionsData.data) ? conversionsData.data : []
          );
        }
      } catch (error) {
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    if (material?._id) {
      fetchData();
    }
  }, [material?._id]);

  // Auto-calculate SRP when form values change (only for initial load)
  useEffect(() => {
    const unitPrice = parseFloat(form.unit_price) || 0;
    const markupPercent = parseFloat(form.markup_percent) || 0;

    // Only auto-calculate if we have values and SRP is empty or 0
    if (unitPrice > 0 && (!form.srp || parseFloat(form.srp) === 0)) {
      const markupDecimal = markupPercent / 100;
      let srpPerUnit = unitPrice * (1 + markupDecimal);
      
      // Ensure SRP is always greater than unit_price (backend requirement)
      // Add a minimum 0.01% markup if SRP equals or is less than unit_price
      if (srpPerUnit <= unitPrice) {
        srpPerUnit = unitPrice * 1.0001; // Add 0.01% minimum markup
      }
      
      setForm((prev) => ({
        ...prev,
        srp: srpPerUnit.toFixed(2),
      }));
    }
  }, [form.unit_price, form.markup_percent]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const newForm = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // Auto-calculate SRP when unit_price or markup_percent changes
      if (name === "unit_price" || name === "markup_percent") {
        const unitPrice =
          parseFloat(name === "unit_price" ? value : newForm.unit_price) || 0;
        const markupPercent =
          parseFloat(
            name === "markup_percent" ? value : newForm.markup_percent
          ) || 0;

        // Always calculate SRP, even if unitPrice is 0
        const markupDecimal = markupPercent / 100;
        let srpPerUnit = unitPrice * (1 + markupDecimal);
        
        // Ensure SRP is always greater than unit_price (backend requirement)
        // Add a minimum 0.01% markup if SRP equals or is less than unit_price
        if (unitPrice > 0 && srpPerUnit <= unitPrice) {
          srpPerUnit = unitPrice * 1.0001; // Add 0.01% minimum markup
        }
        
        newForm.srp = srpPerUnit.toFixed(2);
      }

      return newForm;
    });
  };

  const calculateSRP = () => {
    const unitPrice = parseFloat(form.unit_price) || 0;
    const markupPercent = parseFloat(form.markup_percent) || 0;

    // Philippine SRP Formula: SRP = Unit Price × (1 + Mark Up)
    // Convert markup percentage to decimal (e.g., 25% = 0.25)
    const markupDecimal = markupPercent / 100;

    // Calculate SRP per unit only: Unit Price × (1 + Mark Up)
    const srpPerUnit = unitPrice * (1 + markupDecimal);

    return srpPerUnit.toFixed(2);
  };

  const resetForm = () => {
    setForm({
      base_unit: material?.unit || "",
      equivalent_unit: "",
      quantity: "",
      unit_price: material?.unit_price || "",
      markup_percent: material?.markup_percent || "",
      srp: "",
      is_default_retail: false,
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const startEdit = (conversion) => {
    setEditingId(conversion._id);
    const unitPrice = parseFloat(conversion.unit_price) || 0;
    const markupPercent = parseFloat(conversion.markup_percent) || 0;

    // Calculate SRP using Philippine formula
    const markupDecimal = markupPercent / 100;
    let calculatedSRP = unitPrice * (1 + markupDecimal);
    
    // Ensure SRP is always greater than unit_price (backend requirement)
    // Use existing SRP if available, otherwise calculate
    if (conversion.srp && parseFloat(conversion.srp) > unitPrice) {
      calculatedSRP = parseFloat(conversion.srp);
    } else if (calculatedSRP <= unitPrice) {
      calculatedSRP = unitPrice * 1.0001; // Add 0.01% minimum markup
    }

    setForm({
      base_unit: conversion.base_unit || "",
      equivalent_unit: conversion.equivalent_unit || "",
      quantity: String(conversion.quantity || ""),
      unit_price: String(conversion.unit_price || ""),
      markup_percent: String(conversion.markup_percent || ""),
      srp: String(calculatedSRP.toFixed(2)),
      is_default_retail: Boolean(conversion.is_default_retail),
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (conversion) => {
    setDeleteTarget(conversion);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setIsDeleting(true);
      const res = await fetch(
        `${API_BASE}/unit-conversions/${deleteTarget._id}`,
        {
          method: "DELETE",
          headers: { ...authHeaders },
        }
      );
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Delete failed");
      }
      toast.success("Unit conversion deleted");
      await fetchConversions();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchConversions = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/unit-conversions/material/${material._id}`
      );
      const data = await res.json();
      if (data?.success) {
        setConversions(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      toast.error("Failed to fetch conversions");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!material?._id) {
      toast.error("Material information is missing");
      return;
    }

    if (!form.base_unit || !form.equivalent_unit || !form.quantity || !form.unit_price) {
      toast.error("Please fill all required fields");
      return;
    }

    // Parse and validate numeric values
    const quantity = parseFloat(form.quantity);
    const unitPrice = parseFloat(form.unit_price);
    const markupPercent = parseFloat(form.markup_percent) || 0;
    const srp = parseFloat(form.srp);

    // Check for NaN or invalid values
    if (isNaN(quantity) || isNaN(unitPrice) || isNaN(srp)) {
      toast.error("Please enter valid numeric values");
      return;
    }

    // Validate positive values
    if (quantity <= 0 || unitPrice <= 0 || srp <= 0) {
      toast.error("Quantity, unit price, and SRP must be greater than 0");
      return;
    }

    // Ensure SRP is greater than unit_price (backend requirement)
    if (srp <= unitPrice) {
      toast.error("SRP must be greater than unit price");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        raw_material_id: material._id,
        base_unit: form.base_unit,
        equivalent_unit: form.equivalent_unit,
        quantity: quantity,
        unit_price: unitPrice,
        markup_percent: markupPercent,
        srp: srp,
        is_default_retail: form.is_default_retail,
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/unit-conversions/${editingId}`
        : `${API_BASE}/unit-conversions`;

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
        throw new Error(data?.message || "Failed to save unit conversion");
      }

      toast.success(
        editingId
          ? "Unit conversion updated"
          : "Unit conversion saved successfully"
      );
      await fetchConversions();
      resetForm();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
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
                <Calculator className="w-6 h-6 text-[#f6b100]" />
                <h2 className="text-xl font-bold text-[#f5f5f5]">
                  Unit Conversions
                </h2>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold"
            >
              <Plus className="w-4 h-4" />
              Add Conversion
            </button>
          </div>

          <div className="mb-4 p-4 bg-[#181818] rounded-lg border border-[#383838]">
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">
              Material Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#cccccc]">Name:</span>
                <span className="text-[#f5f5f5] ml-2">{material?.name}</span>
              </div>
              <div>
                <span className="text-[#cccccc]">Category:</span>
                <span className="text-[#f5f5f5] ml-2">
                  {material?.category}
                </span>
              </div>
              <div>
                <span className="text-[#cccccc]">Current Unit:</span>
                <span className="text-[#f5f5f5] ml-2">{material?.unit}</span>
              </div>
              <div>
                <span className="text-[#cccccc]">Current Price:</span>
                <span className="text-[#f5f5f5] ml-2">
                  ₱{material?.unit_price?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-[#ababab]">Loading...</div>
          ) : conversions.length === 0 ? (
            <div className="text-[#ababab]">No unit conversions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      SRP (Suggested Retail Price)
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Default Retail
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {conversions.map((conversion) => (
                    <tr key={conversion._id}>
                      <td className="px-4 py-2 text-[#f5f5f5]">
                        {conversion.quantity} {conversion.equivalent_unit} /{" "}
                        {conversion.base_unit}
                      </td>
                      <td className="px-4 py-2 text-[#f5f5f5] text-right">
                        ₱{conversion.unit_price?.toFixed(2) || "0.00"} /{" "}
                        {conversion.equivalent_unit}
                      </td>
                      <td className="px-4 py-2 text-[#f5f5f5] text-right">
                        ₱{conversion.srp?.toFixed(2) || "0.00"} /{" "}
                        {conversion.equivalent_unit}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {conversion.is_default_retail ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="text-[#666]">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(conversion)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => confirmDelete(conversion)}
                            className="px-3 py-1 bg-red-700 text-white rounded text-sm font-bold hover:bg-red-800 transition-colors flex items-center justify-center"
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
          )}

          {/* Add/Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={resetForm}
              />
              <div className="relative bg-[#232323] w-full max-w-4xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#f5f5f5]">
                    {editingId ? "Edit Unit Conversion" : "Add Unit Conversion"}
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
                        Base Unit <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="base_unit"
                        value={form.base_unit}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        Equivalent Unit <span className="text-red-400">*</span>
                      </label>
                      <select
                        name="equivalent_unit"
                        value={form.equivalent_unit}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                        required
                      >
                        <option value="">Select equivalent unit</option>
                        {units.map((unit) => (
                          <option key={unit._id} value={unit.unit}>
                            {unit.unit} {unit.symbol ? `(${unit.symbol})` : ""}
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
                        Unit Price <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="unit_price"
                        value={form.unit_price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        Markup (%)
                      </label>
                      <input
                        type="number"
                        name="markup_percent"
                        value={form.markup_percent}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="Enter markup percentage"
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#cccccc] mb-2">
                        SRP (Suggested Retail Price){" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="srp"
                        value={form.srp}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                        required
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-[#181818] rounded-lg border border-[#383838]">
                    <input
                      type="checkbox"
                      name="is_default_retail"
                      checked={form.is_default_retail}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#f6b100] bg-[#181818] border-[#383838] rounded focus:ring-[#f6b100] focus:ring-2"
                    />
                    <label className="text-sm text-[#cccccc]">
                      Set as default retail unit for this material
                    </label>
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
                      {isSubmitting ? "Saving..." : "Save Conversion"}
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
                    Delete Unit Conversion
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
                  Are you sure you want to delete the conversion from{" "}
                  <span className="font-bold text-white">
                    {deleteTarget.base_unit}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-white">
                    {deleteTarget.equivalent_unit}
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

export default UnitConversion;
