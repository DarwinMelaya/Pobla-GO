import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Save, X, Edit, Trash2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const Expenditure = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    expense: "",
    description: "",
  });

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`${API_BASE}/expenses${query}`);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data = await res.json();
      setExpenses(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchExpenses();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const resetForm = () => {
    setForm({
      expense: "",
      description: "",
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      expense: item.expense || "",
      description: item.description || "",
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
      const res = await fetch(`${API_BASE}/expenses/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Delete failed");
      }
      toast.success("Expense deleted");
      await fetchExpenses();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.expense.trim()) {
      toast.error("Please fill in the expense name");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        expense: form.expense,
        description: form.description,
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE}/expenses/${editingId}`
        : `${API_BASE}/expenses`;

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
        throw new Error(data?.message || "Failed to save expense");
      }
      toast.success(editingId ? "Expense updated" : "Expense added");
      await fetchExpenses();
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#232323] p-6 rounded-lg shadow border border-[#383838]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-[#f5f5f5]">
          Expenditure Management
        </h2>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expense, description..."
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
      ) : expenses.length === 0 ? (
        <div className="text-[#ababab]">No expenses found.</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead>
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Expense
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider hidden sm:table-cell">
                      Description
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {expenses.map((expense) => (
                    <tr key={expense._id}>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] text-sm sm:text-base">
                        <div className="flex flex-col sm:block">
                          <span className="font-medium">{expense.expense}</span>
                          {expense.description && (
                            <span className="text-xs text-[#bababa] sm:hidden mt-1">
                              {expense.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-[#f5f5f5] hidden sm:table-cell">
                        {expense.description || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                          <button
                            onClick={() => startEdit(expense)}
                            className="px-2 sm:px-3 py-1 bg-yellow-600 text-white rounded text-xs sm:text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => confirmDelete(expense)}
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
                {editingId ? "Edit Expense" : "Add Expense"}
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
                  Expense Name *
                </label>
                <input
                  type="text"
                  name="expense"
                  value={form.expense}
                  onChange={handleChange}
                  placeholder="e.g., Office Supplies, Utilities, Rent"
                  className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cccccc] mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Additional details about the expense"
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
                    : "Add Expense"}
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
                Delete Expense
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
                {deleteTarget.expense}
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
  );
};

export default Expenditure;
