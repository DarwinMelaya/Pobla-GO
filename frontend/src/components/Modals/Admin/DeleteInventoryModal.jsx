import React from "react";
import { AlertTriangle, X } from "lucide-react";

const DeleteInventoryModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  itemName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-md border border-[#383838] shadow-2xl">
        <div className="px-8 py-6 border-b border-[#383838] flex justify-between items-center bg-[#232323] rounded-t-2xl">
          <h2 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
            Confirm Delete
          </h2>
          <button
            onClick={onClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg"
            type="button"
          >
            X
          </button>
        </div>
        <div className="p-8 bg-[#232323] text-[#f5f5f5] rounded-b-2xl space-y-5 text-center">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">
                Delete Inventory Item
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 mb-3">
              Are you sure you want to delete this inventory item?
            </p>
            {itemName && (
              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                <p className="text-white font-medium">{itemName}</p>
              </div>
            )}
            <p className="text-red-400 text-sm mt-3">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-700/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                "Delete Item"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-500/30"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteInventoryModal;
