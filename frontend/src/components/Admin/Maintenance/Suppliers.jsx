import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Save, X, Search } from "lucide-react";

const API_BASE = "http://localhost:5000";

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    company_name: "",
    business_address: "",
    contact_person: "",
    contact_number: "",
    other_contact_number: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getAuthToken = () => localStorage.getItem("token");

  const fetchSuppliers = async () => {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API_BASE}/suppliers${query}`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data = await res.json();
      setSuppliers(data.data || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuppliers(), 400);
    return () => clearTimeout(t);
  }, [search]);

  const resetForm = () => {
    setForm({
      company_name: "",
      business_address: "",
      contact_person: "",
      contact_number: "",
      other_contact_number: "",
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      company_name: item.company_name,
      business_address: item.business_address,
      contact_person: item.contact_person,
      contact_number: item.contact_number,
      other_contact_number: item.other_contact_number || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.company_name.trim() ||
      !form.business_address.trim() ||
      !form.contact_person.trim() ||
      !form.contact_number.trim()
    ) {
      toast.error("All required fields must be filled");
      return;
    }
    setLoading(true);
    try {
      const token = getAuthToken();
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/suppliers/${editingId}`
        : `${API_BASE}/suppliers`;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");
      toast.success(editingId ? "Supplier updated" : "Supplier created");
      await fetchSuppliers();
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (supplier) => {
    setDeleteTarget(supplier);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/suppliers/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      toast.success("Supplier deleted");
      await fetchSuppliers();
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
          <div className="relative bg-[#232323] w-full max-w-2xl rounded-lg border border-[#383838] shadow p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#f5f5f5]">
                {editingId ? "Edit Supplier" : "Add Supplier"}
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
                  Supplier / Company Name
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) =>
                    setForm({ ...form, company_name: e.target.value })
                  }
                  placeholder="e.g., Fresh Produce Co."
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Business Address
                </label>
                <input
                  type="text"
                  value={form.business_address}
                  onChange={(e) =>
                    setForm({ ...form, business_address: e.target.value })
                  }
                  placeholder="e.g., 123 Market St., City"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Contact Person (Full Name)
                </label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) =>
                    setForm({ ...form, contact_person: e.target.value })
                  }
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Contact Number (Cellphone)
                </label>
                <input
                  type="text"
                  value={form.contact_number}
                  onChange={(e) =>
                    setForm({ ...form, contact_number: e.target.value })
                  }
                  placeholder="e.g., 09XXXXXXXXX"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Other Contact Number
                </label>
                <input
                  type="text"
                  value={form.other_contact_number}
                  onChange={(e) =>
                    setForm({ ...form, other_contact_number: e.target.value })
                  }
                  placeholder="Optional alternate number"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                />
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
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Save Changes" : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
                Delete Supplier
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
              <span className="font-bold text-white">
                {" "}
                {deleteTarget.company_name}
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
                disabled={loading}
                onClick={handleDelete}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Suppliers</h2>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bababa] w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, person, address..."
                className="w-full pl-10 pr-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
              />
            </div>
            <button
              onClick={() => {
                setForm({
                  company_name: "",
                  business_address: "",
                  contact_person: "",
                  contact_number: "",
                  other_contact_number: "",
                });
                setEditingId(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-3 py-2 rounded-md font-bold hover:bg-[#262626]"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <div className="text-[#ababab]">No suppliers found.</div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-[#383838]">
                  <thead>
                    <tr>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                        Company Name
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden lg:table-cell">
                        Business Address
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden md:table-cell">
                        Contact Person
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                        Cellphone
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden lg:table-cell">
                        Other Contact
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#383838]">
                    {suppliers.map((s) => (
                      <tr key={s._id}>
                        <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-sm sm:text-base">
                          <div className="flex flex-col sm:block">
                            <span className="font-medium">{s.company_name}</span>
                            <div className="flex flex-col gap-1 md:hidden mt-1 text-xs text-[#bababa]">
                              <span>Contact: {s.contact_person}</span>
                              {s.business_address && (
                                <span>Address: {s.business_address}</span>
                              )}
                              {s.other_contact_number && (
                                <span>Alt: {s.other_contact_number}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] whitespace-pre-wrap max-w-xl hidden lg:table-cell">
                          {s.business_address}
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] hidden md:table-cell">
                          {s.contact_person}
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-[#f5f5f5]">
                          {s.contact_number}
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] hidden lg:table-cell">
                          {s.other_contact_number || ""}
                        </td>
                        <td className="px-2 sm:px-4 py-2">
                          <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                            <button
                              onClick={() => startEdit(s)}
                              className="px-2 sm:px-3 py-1 bg-yellow-600 text-white rounded text-xs sm:text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => confirmDelete(s)}
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

export default Suppliers;
