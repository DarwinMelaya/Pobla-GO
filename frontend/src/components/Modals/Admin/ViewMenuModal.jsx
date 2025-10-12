import React from "react";
import { X, Clock, Users, Package, DollarSign, Tag, Eye } from "lucide-react";

const ViewMenuModal = ({ isOpen, onClose, menuItem }) => {
  if (!isOpen || !menuItem) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/95 backdrop-blur-md rounded-lg w-full max-w-4xl max-h-[90vh] border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#C05050]" />
            Menu Item Details
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Image */}
          {menuItem.image && (
            <div className="mb-6">
              <img
                src={menuItem.image}
                alt={menuItem.name}
                className="w-full h-64 object-cover rounded-lg border border-gray-600/50"
              />
            </div>
          )}

          {/* Basic Info */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-white">{menuItem.name}</h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  menuItem.is_available
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {menuItem.is_available ? "Available" : "Unavailable"}
              </span>
            </div>

            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              {menuItem.description || "No description available"}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Category */}
            <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
              <Tag className="w-5 h-5 text-[#C05050]" />
              <div>
                <p className="text-sm text-gray-400">Category</p>
                <p className="font-semibold text-white">{menuItem.category}</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
              <DollarSign className="w-5 h-5 text-[#C05050]" />
              <div>
                <p className="text-sm text-gray-400">Price</p>
                <p className="font-semibold text-white text-lg">
                  ₱{menuItem.price}
                </p>
              </div>
            </div>

            {/* Preparation Time */}
            {menuItem.preparation_time && (
              <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
                <Clock className="w-5 h-5 text-[#C05050]" />
                <div>
                  <p className="text-sm text-gray-400">Preparation Time</p>
                  <p className="font-semibold text-white">
                    {menuItem.preparation_time} minutes
                  </p>
                </div>
              </div>
            )}

            {/* Serving Size */}
            {menuItem.serving_size && (
              <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
                <Users className="w-5 h-5 text-[#C05050]" />
                <div>
                  <p className="text-sm text-gray-400">Serving Size</p>
                  <p className="font-semibold text-white">
                    {menuItem.serving_size} servings
                  </p>
                </div>
              </div>
            )}

            {/* Available Quantity */}
            <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
              <Package className="w-5 h-5 text-[#C05050]" />
              <div>
                <p className="text-sm text-gray-400">Available Quantity</p>
                <p
                  className={`font-semibold ${
                    menuItem.availableQuantity > 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {menuItem.availableQuantity || 0} servings
                </p>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          {menuItem.ingredients && menuItem.ingredients.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">
                Ingredients
              </h4>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                <div className="space-y-2">
                  {menuItem.ingredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-gray-600/50 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {ingredient.inventoryItem?.name ||
                            ingredient.name ||
                            "Unknown Ingredient"}
                        </p>
                        {ingredient.inventoryItem?.unit && (
                          <p className="text-sm text-gray-400">
                            Unit: {ingredient.inventoryItem.unit}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {ingredient.quantity}{" "}
                          {ingredient.inventoryItem?.unit || ""}
                        </p>
                        {ingredient.inventoryItem?.available_quantity !==
                          undefined && (
                          <p
                            className={`text-xs ${
                              ingredient.inventoryItem.available_quantity >=
                              ingredient.quantity
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            Available:{" "}
                            {ingredient.inventoryItem.available_quantity}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#C05050]/90 backdrop-blur-sm text-white rounded-lg hover:bg-[#B04040]/90 transition-all duration-200 border border-[#C05050]/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewMenuModal;
