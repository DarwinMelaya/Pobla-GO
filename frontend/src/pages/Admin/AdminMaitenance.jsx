import React, { useState } from "react";
import Layout from "../../components/Layout/Layout";
import UnitMeasurements from "../../components/Admin/Maintenance/UnitMeasurements";
import MenuCategories from "../../components/Admin/Maintenance/MenuCategories";
import RawMaterials from "../../components/Admin/Maintenance/RawMaterials";
import Suppliers from "../../components/Admin/Maintenance/Suppliers";
import Menus from "../../components/Admin/Maintenance/Menus";
import Expenditure from "../../components/Admin/Maintenance/Expenditure";
import {
  Ruler,
  FolderOpen,
  Package,
  Truck,
  Menu,
  Banknote,
} from "lucide-react";

const AdminMaitenance = () => {
  const [activeTab, setActiveTab] = useState("unit");

  const renderActive = () => {
    if (activeTab === "unit") return <UnitMeasurements />;
    if (activeTab === "categories") return <MenuCategories />;
    if (activeTab === "raw") return <RawMaterials />;
    if (activeTab === "suppliers") return <Suppliers />;
    if (activeTab === "menus") return <Menus />;
    if (activeTab === "expenditure") return <Expenditure />;
    return null;
  };

  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-4 sm:p-6 lg:p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 lg:mb-8 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f5f5f5] tracking-wide">
            Maitenance
          </h1>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="inline-flex items-center gap-1 bg-[#181818] border border-[#383838] rounded-lg p-1 shadow-sm min-w-max sm:min-w-0">
              {[
                { id: "unit", label: "Unit Measurements", icon: Ruler, shortLabel: "Units" },
                { id: "categories", label: "Menu Categories", icon: FolderOpen, shortLabel: "Categories" },
                { id: "raw", label: "Raw Materials", icon: Package, shortLabel: "Materials" },
                { id: "suppliers", label: "Suppliers", icon: Truck, shortLabel: "Suppliers" },
                { id: "menus", label: "Menus", icon: Menu, shortLabel: "Menus" },
                { id: "expenditure", label: "Expenditure", icon: Banknote, shortLabel: "Expenses" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    aria-pressed={isActive}
                    title={tab.label}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b100] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1f1f] ${
                      isActive
                        ? "bg-[#2a2a2a] text-[#f5f5f5] border border-[#4a4a4a] shadow-inner"
                        : "text-[#b5b5b5] hover:text-white hover:bg-[#262626] border border-transparent"
                    }`}
                  >
                    <tab.icon size={16} className="flex-shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active content */}
        <div className="bg-[#232323] p-4 sm:p-6 rounded-lg shadow border border-[#383838]">
          {renderActive()}
        </div>
      </div>
    </Layout>
  );
};

export default AdminMaitenance;
