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
    expiry_date: initialData.expiry_date || "",
    description: initialData.description || "",
    supplier: initialData.supplier || "",
    purchase_price: initialData.purchase_price || "",
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData.name || "",
        category: initialData.category || "",
        quantity: initialData.quantity || "",
        unit: initialData.unit || "",
        expiry_date: initialData.expiry_date || "",
        description: initialData.description || "",
        supplier: initialData.supplier || "",
        purchase_price: initialData.purchase_price || "",
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/95 backdrop-blur-md rounded-lg w-full max-w-md max-h-[90vh] border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 pb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#C05050]" />
            {editingItem ? "Edit Inventory Item" : "Add New Inventory"}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
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
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                placeholder="Enter category"
              />
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expiry Date *
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
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
