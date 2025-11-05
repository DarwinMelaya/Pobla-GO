import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Calendar,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const StaffSidebar = ({ onNavigate, isOpen = true, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    // {
    //   icon: LayoutDashboard,
    //   text: "Dashboard",
    //   path: "/staff-dashboard",
    //   isActive: location.pathname === "/staff-dashboard",
    // },
    {
      icon: FileText,
      text: "Menu",
      path: "/staff-menu",
      isActive: location.pathname === "/staff-menu",
    },
    {
      icon: ClipboardList,
      text: "Manage Orders",
      path: "/staff-orders",
      isActive: location.pathname === "/staff-orders",
    },
    {
      icon: Calendar,
      text: "Manage Reservations",
      path: "/staff-reservations",
      isActive: location.pathname === "/staff-reservations",
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (typeof onNavigate === "function") onNavigate();
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024 && typeof onClose === "function") {
      onClose();
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Close sidebar on mobile
    if (window.innerWidth < 1024 && typeof onClose === "function") {
      onClose();
    }

    // Redirect to login page
    navigate("/login");
    if (typeof onNavigate === "function") onNavigate();
  };

  return (
    <div
      className={`fixed lg:static inset-y-0 left-0 z-50 h-screen w-64 flex flex-col bg-[#1f1f1f] border-r border-[#383838] transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      {/* Logo - Fixed at top */}
      <div className="px-6 py-4 border-b border-[#383838] flex-shrink-0">
        <h1 className="text-xl font-semibold">
          <span className="text-[#f5f5f5]">POBLA</span>
          <span className="text-[#C05050]">GO</span>
        </h1>
      </div>

      {/* Navigation Items - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigationItems.map((item, index) => (
          <div
            key={index}
            onClick={() => handleNavigation(item.path)}
            className={`group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 relative ${
              item.isActive
                ? "bg-[#232323] text-[#f5f5f5] font-medium"
                : "text-[#ababab] hover:bg-[#232323] hover:text-[#f5f5f5]"
            }`}
          >
            <item.icon
              size={18}
              className={`flex-shrink-0 ${
                item.isActive
                  ? "text-[#C05050]"
                  : "text-[#ababab] group-hover:text-[#f5f5f5]"
              }`}
            />
            <span className="text-sm truncate">{item.text}</span>

            {/* Active indicator bar */}
            {item.isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C05050] rounded-r-full"></div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout Button - Fixed at bottom */}
      <div className="p-3 border-t border-[#383838] flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md bg-[#C05050] text-[#f5f5f5] hover:bg-[#B04040] transition-colors duration-200 text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default StaffSidebar;
