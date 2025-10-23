import {
  LayoutDashboard,
  FileText,
  Calendar,
  LogOut,
  Package,
  ClipboardList,
  TrendingUp,
  FileBarChart,
  UserCheck,
  Wrench,
  Factory,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Box,
  Boxes,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

const AdminSidebar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const navigationItems = [
    {
      icon: LayoutDashboard,
      text: "Dashboard",
      path: "/admin-dashboard",
      isActive: location.pathname === "/admin-dashboard",
    },
    {
      icon: Package,
      text: "Inventory",
      hasDropdown: true,
      isActive:
        location.pathname === "/admin-inventory-products" ||
        location.pathname === "/admin-inventory-raw-materials",
      subItems: [
        {
          icon: Box,
          text: "Menus",
          path: "/admin-inventory-menus",
          isActive: location.pathname === "/admin-inventory-menus",
        },
        {
          icon: Boxes,
          text: "Raw Materials",
          path: "/admin-inventory-raw-materials",
          isActive: location.pathname === "/admin-inventory-raw-materials",
        },
      ],
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
      icon: Factory,
      text: "Productions",
      path: "/admin-productions",
      isActive: location.pathname === "/admin-productions",
    },
    {
      icon: ShoppingCart,
      text: "Purchase Orders",
      path: "/admin-purchase-orders",
      isActive: location.pathname === "/admin-purchase-orders",
    },
    {
      icon: Wrench,
      text: "Maintenance",
      path: "/admin-maintenance",
      isActive: location.pathname === "/admin-maintenance",
    },
    // {
    //   icon: FileBarChart,
    //   text: "Generate Reports",
    //   path: "/admin-reports",
    //   isActive: location.pathname === "/admin-reports",
    // },
    // {
    //   icon: UserCheck,
    //   text: "View Staff Logs",
    //   path: "/admin-staff-logs",
    //   isActive: location.pathname === "/admin-staff-logs",
    // },
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
          <div key={index}>
            {/* Main Navigation Item */}
            <div
              onClick={() =>
                item.hasDropdown
                  ? setIsInventoryOpen(!isInventoryOpen)
                  : handleNavigation(item.path)
              }
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

              {/* Dropdown Arrow for Inventory */}
              {item.hasDropdown && (
                <div className="ml-auto">
                  {isInventoryOpen ? (
                    <ChevronUp
                      size={16}
                      className={
                        item.isActive ? "text-[#C05050]" : "text-white"
                      }
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      className={
                        item.isActive ? "text-[#C05050]" : "text-white"
                      }
                    />
                  )}
                </div>
              )}

              {/* Active indicator bar */}
              {item.isActive && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#C05050] rounded-l-full"></div>
              )}
            </div>

            {/* Dropdown Sub-items */}
            {item.hasDropdown && isInventoryOpen && (
              <div className="ml-4 mt-2 space-y-2">
                {item.subItems.map((subItem, subIndex) => (
                  <div
                    key={subIndex}
                    onClick={() => handleNavigation(subItem.path)}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      subItem.isActive
                        ? "text-[#C05050] bg-[#EECCCC]"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <subItem.icon
                      size={18}
                      className={
                        subItem.isActive ? "text-[#C05050]" : "text-white/80"
                      }
                    />
                    <span
                      className={
                        subItem.isActive
                          ? "text-[#C05050] font-medium text-sm"
                          : "text-white/80 text-sm"
                      }
                    >
                      {subItem.text}
                    </span>
                  </div>
                ))}
              </div>
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
