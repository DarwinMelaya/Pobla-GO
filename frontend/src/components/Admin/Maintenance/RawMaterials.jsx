import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Save, X, Edit, Trash2, ArrowRight } from "lucide-react";
import UnitConversion from "./Unitconversion/UnitConversion";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const RawMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnitConversion, setShowUnitConversion] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const [form, setForm] = useState({
    name: "",
    supplier: "",
    unit: "",
    unit_price: "",
    markup_percent: "",
    category: "",
    critical_level: "",
    description: "",
    image: null,
  });

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchLookups = async () => {
      try {
        const [uRes, sRes] = await Promise.all([
          fetch(`${API_BASE}/units`),
          fetch(`${API_BASE}/suppliers`),
        ]);
        const [uJson, sJson] = await Promise.all([uRes.json(), sRes.json()]);
        if (!isMounted) return;
        setUnits(Array.isArray(uJson?.data) ? uJson.data : []);
        setSuppliers(Array.isArray(sJson?.data) ? sJson.data : []);
      } catch (e) {}
    };
    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API_BASE}/raw-materials${query}`);
      if (!res.ok) throw new Error("Failed to fetch raw materials");
      const data = await res.json();
      setMaterials(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchMaterials();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const resetForm = () => {
    setForm({
      name: "",
      supplier: "",
      unit: "",
      unit_price: "",
      markup_percent: "",
      category: "",
      critical_level: "",
      description: "",
      image: null,
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      supplier: item.supplier || "",
      unit: item.unit || "",
      unit_price:
        typeof item.unit_price === "number" ? String(item.unit_price) : "",
      markup_percent:
        typeof item.markup_percent === "number"
          ? String(item.markup_percent)
          : "",
      category: item.category || "",
      critical_level:
        typeof item.critical_level === "number"
          ? String(item.critical_level)
          : "",
      description: item.description || "",
      image: null,
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setIsDeleteOpen(true);
  };

  const handleEquivalent = (item) => {
    setSelectedMaterial(item);
    setShowUnitConversion(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/raw-materials/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Delete failed");
      }
      toast.success("Raw material deleted");
      await fetchMaterials();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      setForm((prev) => ({
        ...prev,
        image: files && files[0] ? files[0] : null,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
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
    if (!form.name.trim() || !form.unit.trim() || !form.category.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        supplier: form.supplier,
        unit: form.unit,
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        category: form.category,
        description: form.description,
        markup_percent: form.markup_percent
          ? Number(form.markup_percent)
          : undefined,
        critical_level: form.critical_level
          ? Number(form.critical_level)
          : undefined,
        image: form.image ? await toBase64(form.image) : undefined,
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/raw-materials/${editingId}`
        : `${API_BASE}/raw-materials`;

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
        throw new Error(data?.message || "Failed to add material");
      }
      toast.success(editingId ? "Raw material updated" : "Raw material added");
      await fetchMaterials();
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showUnitConversion && selectedMaterial) {
    return (
      <UnitConversion
        material={selectedMaterial}
        onBack={() => {
          setShowUnitConversion(false);
          setSelectedMaterial(null);
        }}
      />
    );
  }

  return (
    <div className="bg-[#232323] p-6 rounded-lg shadow border border-[#383838]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-[#f5f5f5]">Raw Materials</h2>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, supplier, category..."
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
      ) : materials.length === 0 ? (
        <div className="text-[#ababab]">No raw materials found.</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead>
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden lg:table-cell">
                      Supplier
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden md:table-cell">
                      Unit Price
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden lg:table-cell">
                      Markup %
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden md:table-cell">
                      Category
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden lg:table-cell">
                      Critical
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {materials.map((m) => (
                    <tr key={m._id}>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-sm sm:text-base">
                        <div className="flex flex-col sm:block">
                          <span className="font-medium">{m.name}</span>
                          <div className="flex flex-col gap-1 md:hidden mt-1 text-xs text-[#bababa]">
                            {m.supplier && <span>Supplier: {m.supplier}</span>}
                            <span>Price: {typeof m.unit_price === "number" ? m.unit_price.toFixed(2) : "0.00"}</span>
                            <span>Category: {m.category}</span>
                            {m.markup_percent && (
                              <span>Markup: {typeof m.markup_percent === "number" ? m.markup_percent.toFixed(2) : "0.00"}%</span>
                            )}
                            <span>Critical: {m.critical_level ?? 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] hidden lg:table-cell">
                        {m.supplier || ""}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5]">{m.unit}</td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-right hidden md:table-cell">
                        {typeof m.unit_price === "number"
                          ? m.unit_price.toFixed(2)
                          : "0.00"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-right hidden lg:table-cell">
                        {typeof m.markup_percent === "number"
                          ? m.markup_percent.toFixed(2)
                          : "0.00"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] hidden md:table-cell">
                        {m.category}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-right hidden lg:table-cell">
                        {m.critical_level ?? 0}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                          <button
                            onClick={() => handleEquivalent(m)}
                            className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm font-bold hover:bg-blue-500 transition-colors flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3" /> <span className="hidden sm:inline">Equivalent</span>
                          </button>
                          <button
                            onClick={() => startEdit(m)}
                            className="px-2 sm:px-3 py-1 bg-yellow-600 text-white rounded text-xs sm:text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => confirmDelete(m)}
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
                {editingId ? "Edit Raw Material" : "Add Raw Material"}
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
                  Material
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g., All-purpose Flour"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Supplier
                </label>
                <select
                  name="supplier"
                  value={form.supplier}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                >
                  <option value="">Select supplier (optional)</option>
                  {suppliers.map((s) => (
                    <option
                      key={s._id || s.company_name}
                      value={s.company_name}
                    >
                      {s.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Purchase Units
                </label>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                >
                  <option value="">Select unit</option>
                  {units.map((u) => (
                    <option key={u._id || u.unit} value={u.unit}>
                      {u.unit}
                      {u.symbol ? ` (${u.symbol})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Unit Price
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Markup (%)
                </label>
                <input
                  type="number"
                  name="markup_percent"
                  value={form.markup_percent}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="Enter markup if for sale"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="e.g., Baking"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Critical Level
                </label>
                <input
                  type="number"
                  name="critical_level"
                  value={form.critical_level}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="When to alert on low stock"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Notes or details"
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
                {form.image ? (
                  <p className="text-xs text-[#b5b5b5] mt-1">
                    {form.image.name}
                  </p>
                ) : null}
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
                    : "Add Material"}
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
                Delete Raw Material
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

export default RawMaterials;
