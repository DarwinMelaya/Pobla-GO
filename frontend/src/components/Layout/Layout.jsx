import StaffSidebar from "../Sidebar/StaffSidebar";
import AdminSidebar from "../Sidebar/AdminSidebar";
import { Outlet, useLocation } from "react-router-dom";

const Layout = ({ children }) => {
  const location = useLocation();

  // Determine if current route is admin or staff
  const isAdminRoute = location.pathname.startsWith("/admin-");
  const isStaffRoute = location.pathname.startsWith("/staff-");

  // Default to staff sidebar if route doesn't match admin or staff
  const showAdminSidebar = isAdminRoute;
  const showStaffSidebar = isStaffRoute || (!isAdminRoute && !isStaffRoute);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Conditional Sidebar Rendering */}
      {showAdminSidebar && <AdminSidebar />}
      {showStaffSidebar && <StaffSidebar />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main content will be rendered here */}
        <main className="flex-1 overflow-y-auto p-0">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
