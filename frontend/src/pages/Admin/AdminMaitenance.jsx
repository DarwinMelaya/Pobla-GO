import React, { useState } from "react";
import Layout from "../../components/Layout/Layout";
import UnitMeasurements from "../../components/Admin/Maintenance/UnitMeasurements";
import MenuCategories from "../../components/Admin/Maintenance/MenuCategories";
import RawMaterials from "../../components/Admin/Maintenance/RawMaterials";
import Suppliers from "../../components/Admin/Maintenance/Suppliers";
import Menus from "../../components/Admin/Maintenance/Menus";

const AdminMaitenance = () => {
  const [activeTab, setActiveTab] = useState("unit");

  const renderActive = () => {
    if (activeTab === "unit") return <UnitMeasurements />;
    if (activeTab === "categories") return <MenuCategories />;
    if (activeTab === "raw") return <RawMaterials />;
    if (activeTab === "suppliers") return <Suppliers />;
    if (activeTab === "menus") return <Menus />;
    return null;
  };

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide">
            Maitenance
          </h1>
        </div>

        {/* Tabs styled like AdminViewSales */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "unit", label: "Unit Measurements" },
              { id: "categories", label: "Menu Categories" },
              { id: "raw", label: "Raw Materials" },
              { id: "suppliers", label: "Suppliers" },
              { id: "menus", label: "Menus" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Active content */}
        <div className="bg-[#232323] p-6 rounded-lg shadow border border-[#383838]">
          {renderActive()}
        </div>
      </div>
    </Layout>
  );
};

export default AdminMaitenance;
