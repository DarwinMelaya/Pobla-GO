import React, { useState, useEffect } from "react";
import { Plus, X, Calendar, Clock, Trash2, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";

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
    reservation_date: initialData.reservation_date || "",
    status: initialData.status || "pending",
    number_of_persons: initialData.number_of_persons
      ? String(initialData.number_of_persons)
      : "1",
  });

  const [errors, setErrors] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [foodItems, setFoodItems] = useState([]);
  const [menuSearchTerm, setMenuSearchTerm] = useState("");

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch menu items
  const fetchMenuItems = async () => {
    setLoadingMenuItems(true);
    try {
      const token = getAuthToken();
      const response = await fetch("http://localhost:5000/menu?available_only=true", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }

      const data = await response.json();
      const items = data.success && Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
      setMenuItems(items.filter(item => item.is_available !== false));
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to fetch menu items");
    } finally {
      setLoadingMenuItems(false);
    }
  };

  // Add food item
  const addFoodItem = (menuItem) => {
    const existingItem = foodItems.find(
      (item) => item.menu_item_id === menuItem._id
    );

    if (existingItem) {
      // Update quantity if item already exists
      setFoodItems((prev) =>
        prev.map((item) =>
          item.menu_item_id === menuItem._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.price,
              }
            : item
        )
      );
    } else {
      // Add new item
      const newItem = {
        item_name: menuItem.name,
        quantity: 1,
        price: menuItem.price,
        total_price: menuItem.price,
        menu_item_id: menuItem._id,
        special_instructions: "",
      };
      setFoodItems((prev) => [...prev, newItem]);
    }
  };

  // Update food item quantity
  const updateFoodItemQuantity = (menuItemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFoodItem(menuItemId);
      return;
    }

    setFoodItems((prev) =>
      prev.map((item) =>
        item.menu_item_id === menuItemId
          ? {
              ...item,
              quantity: newQuantity,
              total_price: newQuantity * item.price,
            }
          : item
      )
    );
  };

  // Remove food item
  const removeFoodItem = (menuItemId) => {
    setFoodItems((prev) =>
      prev.filter((item) => item.menu_item_id !== menuItemId)
    );
  };

  // Get filtered menu items
  const getFilteredMenuItems = () => {
    if (!menuSearchTerm.trim()) {
      return menuItems;
    }
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(menuSearchTerm.toLowerCase()))
    );
  };

  // Calculate total amount
  const calculateTotal = () => {
    return foodItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "number_of_persons") {
      const cleaned = value.replace(/[^0-9]/g, "");
      nextValue = cleaned;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

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

    const numericNumberOfPersons = Number(formData.number_of_persons);
    if (formData.number_of_persons === "" || isNaN(numericNumberOfPersons)) {
      newErrors.number_of_persons = "Number of persons is required";
    } else if (!Number.isInteger(numericNumberOfPersons) || numericNumberOfPersons < 1) {
      newErrors.number_of_persons = "Number of persons must be at least 1";
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
      food_items: foodItems,
      number_of_persons: Number(formData.number_of_persons || "1"),
    });
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Format reservation_date for datetime-local input
      let formattedDate = "";
      if (initialData.reservation_date) {
        const date = new Date(initialData.reservation_date);
        if (!isNaN(date.getTime())) {
          // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }

      const newFormData = {
        customer_name: initialData.customer_name || "",
        contact_number: initialData.contact_number || "",
        reservation_date: formattedDate,
        status: initialData.status || "pending",
        number_of_persons: initialData.number_of_persons
          ? String(initialData.number_of_persons)
          : "1",
      };
      setFormData(newFormData);
      setErrors({});
      
      // Set food items from initial data if editing
      if (initialData.food_items && Array.isArray(initialData.food_items)) {
        setFoodItems(initialData.food_items);
      } else {
        setFoodItems([]);
      }
      
      // Fetch menu items
      fetchMenuItems();
    } else {
      // Reset when modal closes
      setFoodItems([]);
      setMenuSearchTerm("");
    }
  }, [isOpen, initialData]);

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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Persons *
              </label>
              <input
                type="number"
                name="number_of_persons"
                min="1"
                value={formData.number_of_persons}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 ${
                  errors.number_of_persons ? "border-red-500" : "border-gray-600/50"
                }`}
                placeholder="Enter number of persons"
              />
              {errors.number_of_persons && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.number_of_persons}
                </p>
              )}
            </div>

            {/* Status */}
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

            {/* Reservation Date and Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reservation Date & Time *
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

            {/* Food Items Section */}
            <div className="border-t border-gray-700/50 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#C05050]" />
                Food Items (Optional)
              </h3>

              {/* Menu Items Selection */}
              <div className="mb-4">
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400"
                  />
                </div>

                {loadingMenuItems ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C05050] mx-auto"></div>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto bg-gray-800/50 rounded-lg p-2">
                    {getFilteredMenuItems().length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-2">
                        No menu items found
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {getFilteredMenuItems().map((item) => (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => addFoodItem(item)}
                            className="text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-gray-600/50 hover:border-[#C05050] transition-all"
                          >
                            <div className="text-sm font-medium text-white">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              ₱{item.price?.toFixed(2) || "0.00"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Food Items */}
              {foodItems.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium text-gray-300">
                    Selected Items:
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {foodItems.map((item, index) => (
                      <div
                        key={item.menu_item_id || index}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600/50"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">
                            {item.item_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            ₱{item.price?.toFixed(2)} × {item.quantity} = ₱
                            {item.total_price?.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateFoodItemQuantity(
                                item.menu_item_id,
                                item.quantity - 1
                              )
                            }
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          >
                            -
                          </button>
                          <span className="text-white font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateFoodItemQuantity(
                                item.menu_item_id,
                                item.quantity + 1
                              )
                            }
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFoodItem(item.menu_item_id)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-gray-700/50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-300">
                        Total:
                      </span>
                      <span className="text-lg font-bold text-[#f6b100]">
                        ₱{calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
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
