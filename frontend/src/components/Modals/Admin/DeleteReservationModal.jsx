import React from "react";
import { AlertTriangle, X } from "lucide-react";

const DeleteReservationModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  reservation,
}) => {
  if (!isOpen || !reservation) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/95 backdrop-blur-md rounded-lg w-full max-w-md border border-gray-700/50 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Reservation</h2>
          </div>

          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete this reservation? This action
              cannot be undone.
            </p>

            <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span className="text-white font-medium">
                  {reservation.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Table:</span>
                <span className="text-white font-medium">
                  {reservation.table_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-white font-medium">
                  {new Date(reservation.reservation_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time:</span>
                <span className="text-white font-medium">
                  {new Date(reservation.reservation_date).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`font-medium capitalize ${
                    reservation.status === "confirmed"
                      ? "text-green-400"
                      : reservation.status === "pending"
                      ? "text-yellow-400"
                      : reservation.status === "cancelled"
                      ? "text-red-400"
                      : "text-blue-400"
                  }`}
                >
                  {reservation.status}
                </span>
              </div>
            </div>
          </div>

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
                "Delete Reservation"
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

export default DeleteReservationModal;
