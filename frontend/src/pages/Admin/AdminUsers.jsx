import { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout/Layout";
import toast from "react-hot-toast";
import { Users } from "lucide-react";
import AddUserModal from "../../components/Modals/Admin/AddUserModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resendCooldowns, setResendCooldowns] = useState({});
  const [resendLoadingEmail, setResendLoadingEmail] = useState(null);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldowns((prev) => {
        let hasChanges = false;
        const next = {};
        Object.entries(prev).forEach(([email, value]) => {
          if (value > 0) {
            hasChanges = true;
            next[email] = value - 1;
          }
        });
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/auth/users`, {
        headers: { ...authHeaders },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data?.data) ? data.data : []);
      } else {
        const errorData = await response.json();
        toast.error(errorData?.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const roleColors = {
    Admin: "bg-purple-600 text-white",
    Staff: "bg-blue-600 text-white",
  };

  const handleResendVerification = async (email) => {
    if (!email) {
      toast.error("Missing email for verification.");
      return;
    }

    if (resendCooldowns[email]) {
      return;
    }

    try {
      setResendLoadingEmail(email);
      const response = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to resend verification code");
      }

      toast.success("Verification code sent.");
      setResendCooldowns((prev) => ({
        ...prev,
        [email]: 60,
      }));
    } catch (error) {
      console.error("Resend verification error:", error);
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setResendLoadingEmail(null);
    }
  };

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide flex items-center gap-3">
              <Users className="w-8 h-8 text-[#f6b100]" />
              Users Management
            </h1>
            <p className="text-[#b5b5b5] mt-2">
              View and manage all system users
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border border-[#f6b100]/60 bg-[#f6b100] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#1f1f1f] transition-all hover:bg-[#d79a00]"
          >
            Add Staff User
          </button>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-[#ababab] p-8 text-center">Loading...</div>
        ) : users.length === 0 ? (
          <div className="bg-[#232323] p-12 rounded-lg border border-[#383838] text-center">
            <Users className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <p className="text-[#ababab] text-lg">No users found.</p>
          </div>
        ) : (
          <div className="bg-[#232323] rounded-lg shadow border border-[#383838] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead className="bg-[#181818]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Verification
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-[#2a2a2a] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#f5f5f5]">
                          {user.name || user.displayName || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#cccccc]">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#cccccc]">
                          {user.phone || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            roleColors[user.role] || "bg-gray-600 text-white"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#cccccc]">
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isVerified ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-600 text-white">
                            Verified
                          </span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-600 text-white">
                              Pending
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResendVerification(user.email)}
                              disabled={
                                resendLoadingEmail === user.email ||
                                (resendCooldowns[user.email] ?? 0) > 0
                              }
                              className="text-xs border border-[#f6b100]/60 text-[#f6b100] rounded-md px-3 py-1 hover:bg-[#f6b100]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {resendLoadingEmail === user.email
                                ? "Sending..."
                                : (resendCooldowns[user.email] ?? 0) > 0
                                ? `Resend in ${resendCooldowns[user.email]}s`
                                : "Resend Code"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onUserAdded={fetchUsers}
        />
      </div>
    </Layout>
  );
};

export default AdminUsers;
