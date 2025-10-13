import React, { useState, useEffect } from "react";
import { Plus, Upload, X, AlertCircle } from "lucide-react";

const AddMenuModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  editingItem,
  initialData = {},
  availableInventory = [],
}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    description: initialData.description || "",
    category: initialData.category || "",
    price: initialData.price || "",
    image: initialData.image || "",
    ingredients: initialData.ingredients || [],
    preparation_time: initialData.preparation_time || "",
    serving_size: initialData.serving_size || "",
    servings: initialData.servings || 1,
    is_available:
      initialData.is_available !== undefined ? initialData.is_available : true,
  });

  const [newIngredient, setNewIngredient] = useState({
    inventoryItem: "",
    quantity: "",
    unit: "",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle image upload and convert to base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 10MB to be safe)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert("File size too large. Please choose an image smaller than 10MB.");
        e.target.value = ""; // Clear the input
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        e.target.value = ""; // Clear the input
        return;
      }

      setImageUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result;
        setFormData((prev) => ({
          ...prev,
          image: base64String,
        }));
        setImagePreview(base64String);
        setImageUploading(false);
      };
      reader.onerror = () => {
        alert("Error reading file. Please try again.");
        setImageUploading(false);
        e.target.value = ""; // Clear the input
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: "",
    }));
    setImagePreview("");
    setImageUploading(false);
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Add ingredient
  const addIngredient = () => {
    if (
      newIngredient.inventoryItem &&
      newIngredient.quantity &&
      newIngredient.unit
    ) {
      const selectedInventory = availableInventory.find(
        (item) => item._id === newIngredient.inventoryItem
      );

      setFormData((prev) => ({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          {
            inventoryItem: newIngredient.inventoryItem,
            quantity: parseFloat(newIngredient.quantity),
            unit: newIngredient.unit,
            inventoryName: selectedInventory?.name || "",
          },
        ],
      }));

      setNewIngredient({ inventoryItem: "", quantity: "", unit: "" });
    }
  };

  // Remove ingredient
  const removeIngredient = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Clean up ingredients data (remove inventoryName which is just for display)
    const cleanedIngredients = formData.ingredients.map(
      ({ inventoryName, ...ingredient }) => ingredient
    );

    onSubmit({
      ...formData,
      ingredients: cleanedIngredients,
      price: parseFloat(formData.price),
      preparation_time: formData.preparation_time
        ? parseInt(formData.preparation_time)
        : undefined,
      servings: parseInt(formData.servings) || 1,
    });
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        category: initialData.category || "",
        price: initialData.price || "",
        image: initialData.image || "",
        ingredients: initialData.ingredients || [],
        preparation_time: initialData.preparation_time || "",
        serving_size: initialData.serving_size || "",
        servings: initialData.servings || 1,
        is_available:
          initialData.is_available !== undefined
            ? initialData.is_available
            : true,
      });
      setImagePreview(initialData.image || "");
      setImageUploading(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-3xl max-h-[90vh] border border-[#383838] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="px-8 py-5 border-b border-[#383838] flex justify-between items-center bg-[#262626] rounded-t-2xl">
          <h2 className="text-2xl font-bold text-[#f5f5f5] flex items-center gap-2">
            <Plus className="w-6 h-6 text-[#f6b100]" />
            {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
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
            {/* Inputs use dark input style as in AddOrders */}
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Enter menu item name"
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
                  <option value="Appetizer" className="bg-gray-700 text-white">
                    Appetizer
                  </option>
                  <option
                    value="Main Course"
                    className="bg-gray-700 text-white"
                  >
                    Main Course
                  </option>
                  <option value="Dessert" className="bg-gray-700 text-white">
                    Dessert
                  </option>
                  <option value="Beverage" className="bg-gray-700 text-white">
                    Beverage
                  </option>
                  <option value="Side Dish" className="bg-gray-700 text-white">
                    Side Dish
                  </option>
                  <option value="Other" className="bg-gray-700 text-white">
                    Other
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                placeholder="Enter menu item description (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price (₱) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  name="preparation_time"
                  value={formData.preparation_time}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Servings *
                </label>
                <input
                  type="number"
                  name="servings"
                  value={formData.servings}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Serving Size
                </label>
                <input
                  type="text"
                  name="serving_size"
                  value={formData.serving_size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  placeholder="e.g., 1 person, 2-3 people"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image (Max 10MB)
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      imageUploading
                        ? "bg-gray-600/20 border border-gray-600/50 cursor-not-allowed"
                        : "bg-[#C05050]/20 border border-[#C05050]/50 hover:bg-[#C05050]/30"
                    }`}
                  >
                    {imageUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    ) : (
                      <Upload className="w-4 h-4 text-[#C05050]" />
                    )}
                    <span className="text-sm text-white">
                      {imageUploading ? "Processing..." : "Upload Image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && !imageUploading && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600/20 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition-all duration-200"
                    >
                      <X className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">Remove</span>
                    </button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-600/50"
                    />
                  </div>
                )}
                {imageUploading && (
                  <div className="text-sm text-gray-400">
                    Converting image to base64...
                  </div>
                )}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ingredients *
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={newIngredient.inventoryItem}
                    onChange={(e) =>
                      setNewIngredient((prev) => ({
                        ...prev,
                        inventoryItem: e.target.value,
                      }))
                    }
                    className="px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white transition-all duration-200"
                  >
                    <option value="" className="bg-gray-700 text-white">
                      Select ingredient...
                    </option>
                    {availableInventory.map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                        className="bg-gray-700 text-white"
                      >
                        {item.name} ({item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newIngredient.quantity}
                    onChange={(e) =>
                      setNewIngredient((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    placeholder="Quantity"
                    min="0"
                    step="0.01"
                    className="px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  />
                  <input
                    type="text"
                    value={newIngredient.unit}
                    onChange={(e) =>
                      setNewIngredient((prev) => ({
                        ...prev,
                        unit: e.target.value,
                      }))
                    }
                    placeholder="Unit"
                    className="px-3 py-2 bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="px-4 py-2 bg-[#C05050]/90 text-white rounded-lg hover:bg-[#B04040]/90 transition-all duration-200"
                  >
                    Add
                  </button>
                </div>

                {formData.ingredients.length > 0 && (
                  <div className="space-y-2">
                    {formData.ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                      >
                        <span className="text-white">
                          {ingredient.inventoryName} - {ingredient.quantity}{" "}
                          {ingredient.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Availability */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_available"
                checked={formData.is_available}
                onChange={handleInputChange}
                className="w-4 h-4 text-[#C05050] bg-gray-700 border-gray-600 rounded focus:ring-[#C05050] focus:ring-2"
              />
              <label className="text-sm text-gray-300">
                Available for order
              </label>
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
                    {editingItem ? "Updating..." : "Adding..."}
                  </div>
                ) : editingItem ? (
                  "Update Menu Item"
                ) : (
                  "Add Menu Item"
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

export default AddMenuModal;
