import React, { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";

const AddInventoryModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  editingItem,
  initialData = {},
}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    category: initialData.category || "",
    quantity: initialData.quantity || "",
    unit: initialData.unit || "",
    expiry_type: initialData.expiry_type || "fixed", // fixed | perishable | non-perishable
    expiry_date: initialData.expiry_date || "",
    description: initialData.description || "",
    supplier: initialData.supplier || "",
    purchase_price: initialData.purchase_price || "",
  });

  // Category → expiry type mapping based on examples
  const inferExpiryTypeFromCategory = (category) => {
    const perishable = [
      "Meat & Poultry",
      "Seafood",
      "Vegetables",
      "Fruits",
      "Eggs & Eggs Products",
    ];
    const fixed = [
      "Dairy Products",
      "Condiments & Sauces",
      "Frozen Items",
      "Beverages & Drinks",
      "Desserts &  Sweets",
      "Alcoholic Beverages",
    ];
    const nonPerishable = ["Pantry Staples", "Gains & Rice", "Herbs & Spices"];

    if (perishable.includes(category)) return "perishable";
    if (fixed.includes(category)) return "fixed";
    if (nonPerishable.includes(category)) return "non-perishable";
    return "fixed";
  };

  // Auto-adjust expiry_type when category changes
  React.useEffect(() => {
    if (!formData.category) return;
    const inferred = inferExpiryTypeFromCategory(formData.category);
    setFormData((prev) => ({ ...prev, expiry_type: inferred }));
  }, [formData.category]);

  // Handle form input changes
  const handleInputChange = (e) => {
    v;
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  // For adding expiry date when not fixed
  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure backend-required expiry_date is provided even when not fixed
    let payload = { ...formData };
    if (formData.expiry_type !== "fixed") {
      const today = new Date();
      if (formData.expiry_type === "perishable") {
        // Default: +7 days for perishable
        const plus7 = new Date(today);
        plus7.setDate(plus7.getDate() + 7);
        payload.expiry_date = plus7.toISOString().split("T")[0];
      } else {
        // non-perishable: far future default
        payload.expiry_date = "2099-12-31";
      }
    }
    onSubmit(payload);
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData.name || "",
        category: initialData.category || "",
        quantity: initialData.quantity || "",
        unit: initialData.unit || "",
        expiry_type: initialData.expiry_type || "fixed",
        expiry_date: initialData.expiry_date || "",
        description: initialData.description || "",
        supplier: initialData.supplier || "",
        purchase_price: initialData.purchase_price || "",
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-lg max-h-[90vh] border border-[#383838] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="px-8 py-5 border-b border-[#383838] flex justify-between items-center bg-[#262626] rounded-t-2xl">
          <h2 className="text-2xl font-bold text-[#f5f5f5] flex items-center gap-2">
            <Plus className="w-6 h-6 text-[#f6b100]" />
            {editingItem ? "Edit Inventory Item" : "Add New Inventory"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg transition-all"
            type="button"
            disabled={loading}
          >
            {/* Use Lucide X icon as close, matching AddMenuModal */}X
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-[#232323]">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Inputs use modern dark input style as in AddOrders */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                placeholder="Enter item name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white transition-all duration-200"
              >
                <option value="" className="bg-gray-700 text-white">
                  Select category...
                </option>
                <option
                  value="Meat & Poultry"
                  className="bg-gray-700 text-white"
                >
                  Meat & Poultry
                </option>
                <option value="Seafood" className="bg-gray-700 text-white">
                  Seafood
                </option>
                <option value="Vegetables" className="bg-gray-700 text-white">
                  Vegetables
                </option>
                <option value="Fruits" className="bg-gray-700 text-white">
                  Fruits
                </option>
                <option value="Gains & Rice" className="bg-gray-700 text-white">
                  Gains & Rice
                </option>
                <option
                  value="Dairy Products"
                  className="bg-gray-700 text-white"
                >
                  Dairy Products
                </option>
                <option
                  value="Eggs & Eggs Products"
                  className="bg-gray-700 text-white"
                >
                  Eggs & Eggs Products
                </option>
                <option
                  value="Condiments & Sauces"
                  className="bg-gray-700 text-white"
                >
                  Condiments & Sauces
                </option>
                <option
                  value="Desserts &  Sweets"
                  className="bg-gray-700 text-white"
                >
                  Desserts & Sweets
                </option>
                <option
                  value="Beverages & Drinks"
                  className="bg-gray-700 text-white"
                >
                  Beverages & Drinks
                </option>
                <option
                  value="Herbs & Spices"
                  className="bg-gray-700 text-white"
                >
                  Herbs & Spices
                </option>
                <option value="Frozen Items" className="bg-gray-700 text-white">
                  Frozen Items
                </option>
                <option
                  value="Pantry Staples"
                  className="bg-gray-700 text-white"
                >
                  Pantry Staples
                </option>
                <option
                  value="Alcoholic Beverages"
                  className="bg-gray-700 text-white"
                >
                  Alcoholic Beverages
                </option>
              </select>
              {formData.category && (
                <p className="mt-2 text-xs text-[#b5b5b5]">
                  {formData.expiry_type === "fixed" &&
                    "This category usually has a fixed expiration date."}
                  {formData.expiry_type === "perishable" &&
                    "This category is perishable. Check condition before use."}
                  {formData.expiry_type === "non-perishable" &&
                    "This category is generally non-perishable; no strict expiry needed."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unit *
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white transition-all duration-200"
                >
                  <option value="" className="bg-gray-700 text-white">
                    Select unit...
                  </option>
                  <option value="pieces" className="bg-gray-700 text-white">
                    Pieces
                  </option>
                  <option value="kg" className="bg-gray-700 text-white">
                    Kilograms (kg)
                  </option>
                  <option value="grams" className="bg-gray-700 text-white">
                    Grams (g)
                  </option>
                  <option value="liters" className="bg-gray-700 text-white">
                    Liters (L)
                  </option>
                  <option value="ml" className="bg-gray-700 text-white">
                    Milliliters (ml)
                  </option>
                  <option value="boxes" className="bg-gray-700 text-white">
                    Boxes
                  </option>
                  <option value="packs" className="bg-gray-700 text-white">
                    Packs
                  </option>
                  <option value="bottles" className="bg-gray-700 text-white">
                    Bottles
                  </option>
                  <option value="cans" className="bg-gray-700 text-white">
                    Cans
                  </option>
                  <option value="bags" className="bg-gray-700 text-white">
                    Bags
                  </option>
                  <option value="dozen" className="bg-gray-700 text-white">
                    Dozen
                  </option>
                  <option value="custom" className="bg-gray-700 text-white">
                    Custom...
                  </option>
                </select>
                {formData.unit === "custom" && (
                  <input
                    type="text"
                    name="customUnit"
                    placeholder="Enter custom unit"
                    className="w-full px-3 py-2 mt-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        unit: e.target.value,
                      }));
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Expiry
                </label>
                <select
                  name="expiry_type"
                  value={formData.expiry_type}
                  onChange={handleInputChange}
                  className="px-2 py-1 text-sm bg-gray-700/80 border border-gray-600/50 rounded-md text-white focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
                >
                  <option value="fixed" className="bg-gray-700 text-white">
                    Fixed date
                  </option>
                  <option value="perishable" className="bg-gray-700 text-white">
                    Perishable
                  </option>
                  <option
                    value="non-perishable"
                    className="bg-gray-700 text-white"
                  >
                    Non-perishable
                  </option>
                </select>
              </div>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleInputChange}
                required={formData.expiry_type === "fixed"}
                disabled={formData.expiry_type !== "fixed"}
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="2"
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                placeholder="Enter item description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                placeholder="Enter supplier name (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Purchase Price (₱)
              </label>
              <input
                type="number"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#C05050]/90 backdrop-blur-sm text-white rounded-lg hover:bg-[#B04040]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#C05050]/30"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingItem ? "Updating..." : "Adding..."}
                  </div>
                ) : editingItem ? (
                  "Update Item"
                ) : (
                  "Add Item"
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

export default AddInventoryModal;
