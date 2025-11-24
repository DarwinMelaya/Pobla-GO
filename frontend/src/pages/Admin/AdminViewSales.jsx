import Layout from "../../components/Layout/Layout";
import AllSalesReports from "../../components/Admin/Reports/AllSalesReports";

const AdminViewSales = () => {
  return (
    <Layout>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header row */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f5]">
              Sales Recording & Analytics
            </h1>
            <p className="text-[#ababab] mt-1">
              Track and analyze sales performance
            </p>
          </div>
        </div>

        {/* All Sales Reports View */}
        <AllSalesReports />
      </div>
    </Layout>
  );
};

export default AdminViewSales;
