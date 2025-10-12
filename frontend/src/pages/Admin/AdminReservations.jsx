import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import AddReservationModal from "../../components/Modals/Admin/AddReservationModal";
import DeleteReservationModal from "../../components/Modals/Admin/DeleteReservationModal";
import ViewReservationModal from "../../components/Modals/Admin/ViewReservationModal";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock as ClockIcon,
} from "lucide-react";

const AdminReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [deletingReservation, setDeletingReservation] = useState(null);
  const [viewingReservation, setViewingReservation] = useState(null);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Fetch reservations
  const fetchReservations = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch("http://localhost:5000/reservations", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }

      const data = await response.json();
      setReservations(data.data || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      alert("Failed to fetch reservations");
    } finally {
      setLoading(false);
    }
  };

  // Create/Update reservation
  const handleSubmitReservation = async (reservationData) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const url = editingReservation
        ? `http://localhost:5000/reservations/${editingReservation._id}`
        : "http://localhost:5000/reservations";

      const method = editingReservation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save reservation");
      }

      await fetchReservations();
      setShowAddModal(false);
      setEditingReservation(null);
      alert(
        editingReservation
          ? "Reservation updated successfully!"
          : "Reservation created successfully!"
      );
    } catch (error) {
      console.error("Error saving reservation:", error);
      alert(error.message || "Failed to save reservation");
    } finally {
      setLoading(false);
    }
  };

  // Delete reservation
  const handleDeleteReservation = async () => {
    if (!deletingReservation) return;

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `http://localhost:5000/reservations/${deletingReservation._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete reservation");
      }

      await fetchReservations();
      setShowDeleteModal(false);
      setDeletingReservation(null);
      alert("Reservation deleted successfully!");
    } catch (error) {
      console.error("Error deleting reservation:", error);
      alert("Failed to delete reservation");
    } finally {
      setLoading(false);
    }
  };

  // Update reservation status
  const handleUpdateStatus = async (reservationId, newStatus) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `http://localhost:5000/reservations/${reservationId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update reservation status");
      }

      await fetchReservations();
      alert("Reservation status updated successfully!");
    } catch (error) {
      console.error("Error updating reservation status:", error);
      alert("Failed to update reservation status");
    } finally {
      setLoading(false);
    }
  };

  // Filter reservations
  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.customer_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      reservation.contact_number.includes(searchTerm) ||
      reservation.table_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || reservation.status === statusFilter;

    const matchesDate =
      !dateFilter ||
      new Date(reservation.reservation_date).toDateString() ===
        new Date(dateFilter).toDateString();

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Get status icon and color
  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "pending":
        return <ClockIcon className="w-4 h-4 text-yellow-400" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-400/20 text-green-400 border-green-400/30";
      case "pending":
        return "bg-yellow-400/20 text-yellow-400 border-yellow-400/30";
      case "cancelled":
        return "bg-red-400/20 text-red-400 border-red-400/30";
      case "completed":
        return "bg-blue-400/20 text-blue-400 border-blue-400/30";
      default:
        return "bg-gray-400/20 text-gray-400 border-gray-400/30";
    }
  };

  // Load reservations on component mount
  useEffect(() => {
    fetchReservations();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
            <p className="text-gray-600">Manage customer reservations</p>
          </div>
          <button
            onClick={() => {
              setEditingReservation(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#C05050] text-white rounded-lg hover:bg-[#B04040] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Reservation
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reservations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C05050] focus:border-transparent"
            />
          </div>
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]"></div>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reservations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {reservation.customer_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {reservation.contact_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {reservation.table_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(
                                reservation.reservation_date
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(
                                reservation.reservation_date
                              ).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(reservation.status)}
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                              reservation.status
                            )}`}
                          >
                            {reservation.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setViewingReservation(reservation);
                              setShowViewModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingReservation(reservation);
                              setShowAddModal(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-900 p-1"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingReservation(reservation);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {reservation.status === "pending" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(reservation._id, "confirmed")
                              }
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Confirm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modals */}
        <AddReservationModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingReservation(null);
          }}
          onSubmit={handleSubmitReservation}
          loading={loading}
          editingReservation={editingReservation}
          initialData={editingReservation || {}}
        />

        <DeleteReservationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingReservation(null);
          }}
          onConfirm={handleDeleteReservation}
          loading={loading}
          reservation={deletingReservation}
        />

        <ViewReservationModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setViewingReservation(null);
          }}
          reservation={viewingReservation}
        />
      </div>
    </Layout>
  );
};

export default AdminReservations;
