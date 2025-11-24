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
  User,
  Wrench,
  Factory,
  ShoppingCart,
  ChevronDown,
  Box,
  Boxes,
  Globe,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const AdminSidebar = ({ onNavigate, isOpen = true, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

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
          path: "/admin-menu",
          isActive: location.pathname === "/admin-menu",
        },
        {
          icon: Boxes,
          text: "Raw Materials",
          path: "/admin-inventory-materials",
          isActive: location.pathname === "/admin-inventory-materials",
        },
      ],
    },
    {
      icon: ClipboardList,
      text: "Manage Orders",
      path: "/admin-orders",
      isActive: location.pathname === "/admin-orders",
    },
    // {
    //   icon: Globe,
    //   text: "Online Orders",
    //   path: "/admin-online-orders",
    //   isActive: location.pathname === "/admin-online-orders",
    // },
    {
      icon: Calendar,
      text: "Manage Reservations",
      path: "/admin-reservations",
      isActive: location.pathname === "/admin-reservations",
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
      icon: FileBarChart,
      text: "Reports",
      hasDropdown: true,
      isActive:
        location.pathname === "/admin-sales-report" ||
        location.pathname === "/admin-inventory-report",
      subItems: [
        {
          icon: TrendingUp,
          text: "Sales Report",
          path: "/admin-sales-report",
          isActive: location.pathname === "/admin-sales-report",
        },
        {
          icon: Package,
          text: "Inventory Report",
          path: "/admin-inventory-report",
          isActive: location.pathname === "/admin-inventory-report",
        },
      ],
    },
    {
      icon: User,
      text: "User",
      path: "/admin-users",
      isActive: location.pathname === "/admin-users",
    },
    {
      icon: Wrench,
      text: "Maintenance",
      path: "/admin-maintenance",
      isActive: location.pathname === "/admin-maintenance",
    },

    // {
    //   icon: UserCheck,
    //   text: "View Staff Logs",
    //   path: "/admin-staff-logs",
    //   isActive: location.pathname === "/admin-staff-logs",
    // },
  ];

  // Auto-open dropdown if any sub-item is active
  useEffect(() => {
    const inventoryItem = navigationItems.find(
      (item) => item.text === "Inventory" && item.hasDropdown
    );
    const reportsItem = navigationItems.find(
      (item) => item.text === "Reports" && item.hasDropdown
    );

    if (inventoryItem?.subItems?.some((subItem) => subItem.isActive)) {
      setIsInventoryOpen(true);
    }
    if (reportsItem?.subItems?.some((subItem) => subItem.isActive)) {
      setIsReportsOpen(true);
    }
  }, [location.pathname]);

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
          <div key={index}>
            {/* Main Navigation Item */}
            <div
              onClick={() => {
                if (item.hasDropdown) {
                  if (item.text === "Inventory") {
                    setIsInventoryOpen(!isInventoryOpen);
                  } else if (item.text === "Reports") {
                    setIsReportsOpen(!isReportsOpen);
                  }
                } else {
                  handleNavigation(item.path);
                }
              }}
              className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 relative ${
                item.isActive
                  ? "bg-[#232323] text-[#f5f5f5] font-medium"
                  : "text-[#ababab] hover:bg-[#232323] hover:text-[#f5f5f5]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <item.icon
                  size={18}
                  className={`flex-shrink-0 ${
                    item.isActive
                      ? "text-[#C05050]"
                      : "text-[#ababab] group-hover:text-[#f5f5f5]"
                  }`}
                />
                <span className="text-sm truncate">{item.text}</span>
              </div>

              {/* Dropdown Arrow */}
              {item.hasDropdown && (
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 transition-transform duration-200 ${
                    (item.text === "Inventory" && isInventoryOpen) ||
                    (item.text === "Reports" && isReportsOpen)
                      ? "rotate-180"
                      : ""
                  } ${
                    item.isActive
                      ? "text-[#C05050]"
                      : "text-[#ababab] group-hover:text-[#f5f5f5]"
                  }`}
                />
              )}

              {/* Active indicator bar */}
              {item.isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C05050] rounded-r-full"></div>
              )}
            </div>

            {/* Dropdown Sub-items */}
            {item.hasDropdown &&
              ((item.text === "Inventory" && isInventoryOpen) ||
                (item.text === "Reports" && isReportsOpen)) && (
                <div className="ml-7 mt-1 space-y-1 border-l border-[#383838] pl-3">
                  {item.subItems.map((subItem, subIndex) => (
                    <div
                      key={subIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation(subItem.path);
                      }}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                        subItem.isActive
                          ? "bg-[#232323] text-[#f5f5f5] font-medium"
                          : "text-[#ababab] hover:bg-[#232323] hover:text-[#f5f5f5]"
                      }`}
                    >
                      <subItem.icon
                        size={16}
                        className={`flex-shrink-0 ${
                          subItem.isActive
                            ? "text-[#C05050]"
                            : "text-[#ababab] group-hover:text-[#f5f5f5]"
                        }`}
                      />
                      <span className="text-sm truncate">{subItem.text}</span>
                      {subItem.isActive && (
                        <div className="ml-auto w-1 h-1 rounded-full bg-[#C05050]"></div>
                      )}
                    </div>
                  ))}
                </div>
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

export default AdminSidebar;
