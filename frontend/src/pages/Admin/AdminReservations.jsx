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
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide">
            Reservations
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-xl font-bold shadow"
          >
            Add Reservation
          </button>
        </div>
        {/* Filters: card bg-[#232323], high contrast labels/inputs */}
        <div className="bg-[#232323] rounded-lg shadow-sm border border-[#383838] p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#b5b5b5] w-4 h-4" />
              <input
                type="text"
                placeholder="Search reservations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#f6b100] focus:border-transparent bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#f6b100] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
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
              className="px-3 py-2 border border-[#383838] rounded-lg focus:ring-2 focus:ring-[#f6b100] focus:border-transparent bg-[#181818] text-[#f5f5f5]"
            />
          </div>
        </div>
        {/* Table/lists: dark bg, white/yellow text, high contrast status chips */}
        <div className="bg-[#232323] rounded-lg shadow-sm border border-[#383838] overflow-hidden mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C05050]" />
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-[#b5b5b5] mx-auto mb-4" />
              <p className="text-[#b5b5b5]">No reservations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#292929] border-b border-[#383838]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#f5f5f5] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#232323]">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation._id} className="hover:bg-[#282828]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-[#b5b5b5] mr-2" />
                          <div>
                            <div className="text-sm font-bold text-[#f5f5f5]">
                              {reservation.customer_name}
                            </div>
                            <div className="text-sm text-[#cccccc]">
                              {reservation.contact_number}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#b5b5b5]">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-[#b5b5b5] mr-2" />
                          <span>{reservation.table_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#cccccc]">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-[#b5b5b5] mr-2" />
                          <div>
                            <div className="text-sm text-[#f5f5f5]">
                              {new Date(
                                reservation.reservation_date
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-[#cccccc] flex items-center">
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
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              reservation.status === "confirmed"
                                ? "bg-green-700 border-green-800 text-white"
                                : reservation.status === "pending"
                                ? "bg-yellow-700 border-yellow-800 text-white"
                                : reservation.status === "cancelled"
                                ? "bg-red-700 border-red-800 text-white"
                                : reservation.status === "completed"
                                ? "bg-blue-700 border-blue-800 text-white"
                                : "bg-[#383838] text-[#f5f5f5]"
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setViewingReservation(reservation);
                              setShowViewModal(true);
                            }}
                            className="bg-blue-700 text-white p-1 rounded hover:bg-blue-800"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingReservation(reservation);
                              setShowAddModal(true);
                            }}
                            className="bg-yellow-600 text-white p-1 rounded hover:bg-yellow-700"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingReservation(reservation);
                              setShowDeleteModal(true);
                            }}
                            className="bg-red-700 text-white p-1 rounded hover:bg-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {reservation.status === "pending" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(reservation._id, "confirmed")
                              }
                              className="bg-green-700 text-white p-1 rounded hover:bg-green-800"
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
