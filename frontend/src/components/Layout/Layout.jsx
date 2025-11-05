import StaffSidebar from "../Sidebar/StaffSidebar";
import AdminSidebar from "../Sidebar/AdminSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const Layout = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle window resize - close sidebar on mobile, keep open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state based on screen size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine if current route is admin or staff
  const isAdminRoute = location.pathname.startsWith("/admin-");
  const isStaffRoute = location.pathname.startsWith("/staff-");

  // Default to staff sidebar if route doesn't match admin or staff
  const showAdminSidebar = isAdminRoute;
  const showStaffSidebar = isStaffRoute || (!isAdminRoute && !isStaffRoute);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Conditional Sidebar Rendering */}
      {showAdminSidebar && (
        <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      )}
      {showStaffSidebar && (
        <StaffSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Burger Menu Button - Mobile Only */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md bg-[#1f1f1f] text-[#f5f5f5] hover:bg-[#232323] border border-[#383838] transition-colors"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Main content will be rendered here */}
        <main className="flex-1 overflow-y-auto p-0">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
