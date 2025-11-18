import React from "react";
import { Outlet } from "react-router-dom";
import CustomerSidebar from "../Sidebar/CustomerSidebar";

const CustomerLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5] pb-20">
      <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-28">
        {children || <Outlet />}
      </div>
      <CustomerSidebar />
    </div>
  );
};

export default CustomerLayout;
