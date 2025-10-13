import React from "react";
import { AlertTriangle, X } from "lucide-react";

const DeleteMenuModal = ({ isOpen, onClose, onConfirm, loading, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-md border border-[#383838] shadow-2xl">
        <div className="px-8 py-6 border-b border-[#383838] flex justify-between items-center bg-[#232323] rounded-t-2xl">
          <h2 className="text-xl font-bold text-[#f5f5f5] flex items-center gap-2">
            <X className="w-5 h-5 text-[#f6b100]" /> Confirm Delete
          </h2>
          <button
            onClick={onClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg"
            type="button"
          >
            <X className="w-7 h-7" />
          </button>
        </div>
        <div className="p-8 bg-[#232323] text-[#f5f5f5] rounded-b-2xl space-y-5 text-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-600/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Menu Item</h2>
          </div>

          <p className="text-gray-300 mb-6">
            Are you sure you want to delete{" "}
            <strong className="text-white">{itemName}</strong>? This action
            cannot be undone and will permanently remove the menu item from the
            system.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-700/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-red-600/30"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                "Delete"
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

export default DeleteMenuModal;
