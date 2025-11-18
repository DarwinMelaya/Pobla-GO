import React, { useState, useEffect } from "react";
import { Plus, X, Calendar, Clock, RefreshCw } from "lucide-react";

const AddReservationModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  editingReservation,
  initialData = {},
}) => {
  const [formData, setFormData] = useState({
    customer_name: initialData.customer_name || "",
    contact_number: initialData.contact_number || "",
    table_number: initialData.table_number || "",
    reservation_date: initialData.reservation_date || "",
    status: initialData.status || "pending",
  });

  const [errors, setErrors] = useState({});
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch available tables
  const fetchAvailableTables = async (reservationDate = null, currentTableNumber = null) => {
    setLoadingTables(true);
    try {
      const token = getAuthToken();
      let url = "http://localhost:5000/reservations/tables/available";
      
      if (reservationDate) {
        // Handle different date formats
        let dateStr;
        if (typeof reservationDate === 'string') {
          // If it's already a datetime-local string, convert it
          if (reservationDate.includes('T')) {
            dateStr = new Date(reservationDate).toISOString();
          } else {
            dateStr = new Date(reservationDate).toISOString();
          }
        } else {
          dateStr = new Date(reservationDate).toISOString();
        }
        url += `?reservation_date=${encodeURIComponent(dateStr)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch available tables");
      }

      const data = await response.json();
      const tables = data.data || [];
      
      // If editing, include the current table even if it's not in the available list
      const tableToInclude = currentTableNumber || formData.table_number;
      if (editingReservation && tableToInclude && !tables.includes(tableToInclude)) {
        setAvailableTables([tableToInclude, ...tables]);
      } else {
        setAvailableTables(tables);
      }
    } catch (error) {
      console.error("Error fetching available tables:", error);
      // On error, allow any table (fallback behavior)
      setAvailableTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If reservation_date changes, refresh available tables
    if (name === "reservation_date" && value) {
      fetchAvailableTables(value, formData.table_number);
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = "Customer name is required";
    }

    if (!formData.contact_number.trim()) {
      newErrors.contact_number = "Contact number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.contact_number)) {
      newErrors.contact_number = "Please enter a valid contact number";
    }

    if (!formData.table_number.trim()) {
      newErrors.table_number = "Table number is required";
    }

    if (!formData.reservation_date) {
      newErrors.reservation_date = "Reservation date and time is required";
    } else {
      const selectedDate = new Date(formData.reservation_date);
      const now = new Date();
      if (selectedDate <= now) {
        newErrors.reservation_date = "Reservation date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      reservation_date: new Date(formData.reservation_date).toISOString(),
    });
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const newFormData = {
        customer_name: initialData.customer_name || "",
        contact_number: initialData.contact_number || "",
        table_number: initialData.table_number || "",
        reservation_date: initialData.reservation_date || "",
        status: initialData.status || "pending",
      };
      setFormData(newFormData);
      setErrors({});
      
      // Fetch available tables when modal opens
      // Format reservation_date if it exists (handle ISO string or Date object)
      let reservationDate = newFormData.reservation_date;
      if (reservationDate) {
        // If it's an ISO string, convert to datetime-local format
        if (typeof reservationDate === 'string' && reservationDate.includes('T') && reservationDate.includes('Z')) {
          // Convert ISO string to datetime-local format
          reservationDate = reservationDate.slice(0, 16);
        }
      }
      
      if (reservationDate) {
        fetchAvailableTables(reservationDate, newFormData.table_number);
      } else {
        fetchAvailableTables(null, newFormData.table_number);
      }
    }
  }, [isOpen, initialData]);

  // Watch for changes in available tables and clear table_number if it becomes unavailable
  useEffect(() => {
    if (
      formData.table_number &&
      availableTables.length > 0 &&
      !availableTables.includes(formData.table_number) &&
      !editingReservation
    ) {
      // Only clear if we're not editing and the table is no longer available
      setFormData((prev) => ({
        ...prev,
        table_number: "",
      }));
    }
  }, [availableTables, editingReservation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-2xl max-h-[90vh] border border-[#383838] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="px-8 py-5 border-b border-[#383838] flex justify-between items-center bg-[#262626] rounded-t-2xl">
          <h2 className="text-2xl font-bold text-[#f5f5f5] flex items-center gap-2">
            <Plus className="w-6 h-6 text-[#f6b100]" />
            {editingReservation ? "Edit Reservation" : "Add New Reservation"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg transition-all"
            type="button"
            disabled={loading}
          >
            <X className="w-7 h-7" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-[#232323]">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Inputs use modern dark input style as in AddOrders */}
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 ${
                    errors.customer_name
                      ? "border-red-500"
                      : "border-gray-600/50"
                  }`}
                  placeholder="Enter customer name"
                />
                {errors.customer_name && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.customer_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 ${
                    errors.contact_number
                      ? "border-red-500"
                      : "border-gray-600/50"
                  }`}
                  placeholder="Enter contact number"
                />
                {errors.contact_number && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.contact_number}
                  </p>
                )}
              </div>
            </div>

            {/* Table and Date Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Table Number *
                  {loadingTables && (
                    <span className="ml-2 text-xs text-gray-400 flex items-center">
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                      Loading...
                    </span>
                  )}
                </label>
                <select
                  name="table_number"
                  value={formData.table_number}
                  onChange={handleInputChange}
                  required
                  disabled={loadingTables || availableTables.length === 0}
                  className={`w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white transition-all duration-200 ${
                    errors.table_number
                      ? "border-red-500"
                      : "border-gray-600/50"
                  } ${loadingTables || availableTables.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="" className="bg-gray-700 text-white">
                    {loadingTables
                      ? "Loading available tables..."
                      : availableTables.length === 0
                      ? "No tables available for this time"
                      : "Select a table"}
                  </option>
                  {availableTables.map((table) => (
                    <option
                      key={table}
                      value={table}
                      className="bg-gray-700 text-white"
                    >
                      Table {table}
                    </option>
                  ))}
                </select>
                {errors.table_number && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.table_number}
                  </p>
                )}
                {availableTables.length === 0 && !loadingTables && (
                  <p className="text-yellow-400 text-xs mt-1">
                    No tables available for the selected date/time. Please try a different time.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white transition-all duration-200"
                >
                  <option value="pending" className="bg-gray-700 text-white">
                    Pending
                  </option>
                  <option value="confirmed" className="bg-gray-700 text-white">
                    Confirmed
                  </option>
                  <option value="cancelled" className="bg-gray-700 text-white">
                    Cancelled
                  </option>
                  <option value="completed" className="bg-gray-700 text-white">
                    Completed
                  </option>
                </select>
              </div>
            </div>

            {/* Reservation Date and Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reservation Date & Time *
                <span className="ml-2 text-xs text-gray-400">
                  (Available tables will update based on this date/time)
                </span>
              </label>
              <input
                type="datetime-local"
                name="reservation_date"
                value={formData.reservation_date}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().slice(0, 16)}
                className={`w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white transition-all duration-200 ${
                  errors.reservation_date
                    ? "border-red-500"
                    : "border-gray-600/50"
                }`}
              />
              {errors.reservation_date && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.reservation_date}
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#C05050]/90 backdrop-blur-sm text-white rounded-lg hover:bg-[#B04040]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#C05050]/30"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingReservation ? "Updating..." : "Adding..."}
                  </div>
                ) : editingReservation ? (
                  "Update Reservation"
                ) : (
                  "Add Reservation"
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-500/30"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddReservationModal;
