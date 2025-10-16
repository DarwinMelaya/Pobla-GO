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

        {/* Tabs */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1 bg-[#181818] border border-[#383838] rounded-lg p-1 shadow-sm">
            {[
              { id: "unit", label: "Unit Measurements" },
              { id: "categories", label: "Menu Categories" },
              { id: "raw", label: "Raw Materials" },
              { id: "suppliers", label: "Suppliers" },
              { id: "menus", label: "Menus" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  aria-pressed={isActive}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b100] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1f1f] ${
                    isActive
                      ? "bg-[#2a2a2a] text-[#f5f5f5] border border-[#4a4a4a] shadow-inner"
                      : "text-[#b5b5b5] hover:text-white hover:bg-[#262626] border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
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
