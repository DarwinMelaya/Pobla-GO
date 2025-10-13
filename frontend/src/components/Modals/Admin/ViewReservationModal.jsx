import React from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock as ClockIcon,
  X,
} from "lucide-react";

const ViewReservationModal = ({ isOpen, onClose, reservation }) => {
  if (!isOpen || !reservation) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "pending":
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "text-green-400 bg-green-400/20 border-green-400/30";
      case "pending":
        return "text-yellow-400 bg-yellow-400/20 border-yellow-400/30";
      case "cancelled":
        return "text-red-400 bg-red-400/20 border-red-400/30";
      case "completed":
        return "text-blue-400 bg-blue-400/20 border-blue-400/30";
      default:
        return "text-gray-400 bg-gray-400/20 border-gray-400/30";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f1f] rounded-2xl w-full max-w-xl max-h-[90vh] border border-[#383838] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-[#383838] flex justify-between items-center bg-[#262626] rounded-t-2xl">
          <h2 className="text-2xl font-bold text-[#f5f5f5]">
            Reservation Details
          </h2>
          <button
            onClick={onClose}
            className="text-[#ababab] hover:text-[#f6b100] p-3 hover:bg-[#353535] rounded-lg"
            type="button"
          >
            <X className="w-7 h-7" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-[#232323]">
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex justify-center">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(
                  reservation.status
                )}`}
              >
                {getStatusIcon(reservation.status)}
                <span className="font-medium capitalize">
                  {reservation.status}
                </span>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#C05050]" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Customer Name
                  </label>
                  <p className="text-white font-medium">
                    {reservation.customer_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Contact Number
                  </label>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {reservation.contact_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Reservation Details */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C05050]" />
                Reservation Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Table Number
                  </label>
                  <p className="text-white font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {reservation.table_number}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Reservation Date
                  </label>
                  <p className="text-white font-medium">
                    {new Date(reservation.reservation_date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Reservation Time
                  </label>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date(reservation.reservation_date).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Created At
                  </label>
                  <p className="text-white font-medium">
                    {new Date(reservation.created_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Additional Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Reservation ID:</span>
                  <span className="text-white font-mono text-sm">
                    {reservation._id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="text-white">
                    {new Date(reservation.updated_at).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-gray-700/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all duration-200 border border-gray-500/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewReservationModal;
