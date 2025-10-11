import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Image,
  Calendar,
  HandCoins,
  MessageCircle,
  HelpCircle,
  Settings,
  LogOut,
  Package,
  Gift,
  Users,
  ClipboardList,
  TrendingUp,
  FileBarChart,
  UserCheck,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const AdminSidebar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      icon: LayoutDashboard,
      text: "Dashboard",
      path: "/admin-dashboard",
      isActive: location.pathname === "/admin-dashboard",
    },
    {
      icon: Package,
      text: "Manage Inventory",
      path: "/admin-inventory",
      isActive: location.pathname === "/admin-inventory",
    },
    {
      icon: FileText,
      text: "Menu",
      path: "/admin-menu",
      isActive: location.pathname === "/admin-menu",
    },
    {
      icon: ClipboardList,
      text: "Manage Orders",
      path: "/admin-orders",
      isActive: location.pathname === "/admin-orders",
    },
    {
      icon: Calendar,
      text: "Manage Reservations",
      path: "/admin-reservations",
      isActive: location.pathname === "/admin-reservations",
    },
    {
      icon: TrendingUp,
      text: "View Sales",
      path: "/admin-sales",
      isActive: location.pathname === "/admin-sales",
    },
    {
      icon: FileBarChart,
      text: "Generate Reports",
      path: "/admin-reports",
      isActive: location.pathname === "/admin-reports",
    },
    {
      icon: UserCheck,
      text: "View Staff Logs",
      path: "/admin-staff-logs",
      isActive: location.pathname === "/admin-staff-logs",
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (typeof onNavigate === "function") onNavigate();
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect to login page
    navigate("/login");
    if (typeof onNavigate === "function") onNavigate();
  };

  return (
    <div className="bg-[#362E2E] h-screen w-64 flex flex-col rounded-l-2xl">
      {/* Logo - Fixed at top */}
      <div className="p-6 border-b border-[#4A3F3F] flex-shrink-0">
        <h1 className="text-xl font-semibold">
          <span className="text-white">POBLA</span>
          <span className="text-[#C05050]">GO</span>
        </h1>
      </div>

      {/* Navigation Items - Scrollable */}
      <nav
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#4B5563 #1F2937",
        }}
      >
        <style>{`
          nav::-webkit-scrollbar {
            width: 6px;
          }
          nav::-webkit-scrollbar-track {
            background: #2A2222;
            border-radius: 3px;
          }
          nav::-webkit-scrollbar-thumb {
            background: #4A3F3F;
            border-radius: 3px;
            transition: background 0.2s ease;
          }
          nav::-webkit-scrollbar-thumb:hover {
            background: #5A4F4F;
          }
          nav::-webkit-scrollbar-corner {
            background: #2A2222;
          }
        `}</style>

        {navigationItems.map((item, index) => (
          <div
            key={index}
            onClick={() => handleNavigation(item.path)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors relative ${
              item.isActive
                ? "text-[#C05050] bg-[#EECCCC] rounded-r-none"
                : "text-white hover:bg-white/10"
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon
                size={20}
                className={item.isActive ? "text-[#C05050]" : "text-white"}
              />
              <span
                className={
                  item.isActive ? "text-[#C05050] font-medium" : "text-white"
                }
              >
                {item.text}
              </span>
            </div>

            {/* Active indicator bar */}
            {item.isActive && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#C05050] rounded-l-full"></div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout Button - Fixed at bottom */}
      <div className="p-6 border-t border-[#4A3F3F] flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full p-3 rounded-lg bg-[#C05050] text-white hover:bg-[#B04040] transition-colors"
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
