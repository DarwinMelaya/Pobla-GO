import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";

const API_BASE = "http://localhost:5000";

const UnitMeasurements = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ unit: "", symbol: "", equivalent_units: [] });
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getAuthToken = () => localStorage.getItem("token");

  const fetchUnits = async () => {
    try {
      const response = await fetch(`${API_BASE}/units`);
      if (!response.ok) throw new Error("Failed to fetch units");
      const data = await response.json();
      setUnits(data.data || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const equivalentUnitOptions = useMemo(() => {
    const seen = new Set();
    return units
      .map((item) => (typeof item?.unit === "string" ? item.unit.trim() : ""))
      .filter((value) => {
        if (!value || value.toLowerCase() === form.unit.trim().toLowerCase()) return false;
        const lower = value.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [units, form.unit]);

  const resetForm = () => {
    setForm({ unit: "", symbol: "", equivalent_units: [] });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const toggleEquivalentUnit = (value) => {
    if (!value) return;
    setForm((prev) => {
      const exists = prev.equivalent_units.includes(value);
      return {
        ...prev,
        equivalent_units: exists
          ? prev.equivalent_units.filter((item) => item !== value)
          : [...prev.equivalent_units, value],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.unit.trim() || !form.symbol.trim()) {
      toast.error("Unit and Symbol are required");
      return;
    }
    setLoading(true);
    try {
      const token = getAuthToken();
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/units/${editingId}`
        : `${API_BASE}/units`;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          unit: form.unit,
          symbol: form.symbol,
          equivalent_units: form.equivalent_units,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");
      toast.success(editingId ? "Unit updated" : "Unit created");
      await fetchUnits();
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      unit: item.unit,
      symbol: item.symbol,
      equivalent_units: Array.isArray(item.equivalent_units) ? item.equivalent_units : [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/units/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      toast.success("Unit deleted");
      await fetchUnits();
      if (editingId === id) resetForm();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/50" onClick={resetForm} />
          <div className="relative bg-[#232323] w-full max-w-lg rounded-lg border border-[#383838] shadow p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#f5f5f5]">
                {editingId ? "Edit Unit" : "Add Unit"}
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
              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g., Gram"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="e.g., g"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Equivalent Units (optional)
                </label>
                {equivalentUnitOptions.length ? (
                  <div className="max-h-48 overflow-y-auto border border-[#383838] rounded-md bg-[#181818] p-3 space-y-2">
                    {equivalentUnitOptions.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm text-[#f5f5f5]"
                      >
                        <input
                          type="checkbox"
                          checked={form.equivalent_units.includes(option)}
                          onChange={() => toggleEquivalentUnit(option)}
                          className="w-4 h-4 text-[#f6b100] bg-[#1a1a1a] border-[#4a4a4a] rounded focus:ring-[#f6b100]"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#8d8d8d] border border-dashed border-[#444] rounded-md p-3">
                    Add more units first to make them available as equivalents.
                  </p>
                )}
                {form.equivalent_units.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.equivalent_units.map((value) => (
                      <span
                        key={value}
                        className="px-2 py-0.5 rounded-full bg-[#323232] text-[#f5f5f5] text-xs"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#8d8d8d] mt-2">
                  Choose from the existing units defined in the Units list. These selections will be offered as allowed equivalent units when converting from this base unit.
                </p>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-4 py-2 rounded-md font-bold hover:bg-[#262626]"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Save Changes" : "Add Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
              <h3 className="text-lg font-bold text-[#f5f5f5]">Delete Unit</h3>
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
              <span className="font-bold text-white"> {deleteTarget.unit}</span>
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
                disabled={loading}
                onClick={() => handleDelete(deleteTarget._id)}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Card */}
      <div className="bg-[#232323] p-6 rounded-lg shadow border border-[#383838]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Units</h2>
          <button
            onClick={() => {
              setForm({ unit: "", symbol: "", equivalent_units: [] });
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-3 py-2 rounded-md font-bold hover:bg-[#262626]"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        {units.length === 0 ? (
          <div className="text-[#ababab]">No units yet.</div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-[#383838]">
                  <thead>
                    <tr>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                        Equivalent Units
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#383838]">
                    {units.map((u) => (
                      <tr key={u._id}>
                        <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-sm sm:text-base">
                          {u.unit}
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-sm sm:text-base">
                          {u.symbol}
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-[#dcdcdc] text-xs sm:text-sm">
                          {u.equivalent_units?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {u.equivalent_units.map((eq) => (
                                <span
                                  key={eq}
                                  className="px-2 py-0.5 rounded-full bg-[#323232] text-[#f5f5f5]"
                                >
                                  {eq}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#666]">—</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                            <button
                              onClick={() => startEdit(u)}
                              className="px-2 sm:px-3 py-1 bg-yellow-600 text-white rounded text-xs sm:text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget(u);
                                setIsDeleteOpen(true);
                              }}
                              className="px-2 sm:px-3 py-1 bg-red-700 text-white rounded text-xs sm:text-sm font-bold hover:bg-red-800 transition-colors flex items-center justify-center"
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
      </div>
    </div>
  );
};

export default UnitMeasurements;
