import StaffSidebar from "../Sidebar/StaffSidebar";
import { Outlet } from "react-router-dom";

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Staff Sidebar */}
      <StaffSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main content will be rendered here */}
        <main className="flex-1 overflow-y-auto p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
