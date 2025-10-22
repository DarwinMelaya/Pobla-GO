import Layout from "../../components/Layout/Layout";
const AdminPurchaseOrders = () => {
  return (
    <Layout>
      <div>AdminPurchaseOrders</div>
      <div className="bg-[#1f1f1f] min-h-screen p-8 rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-[#f5f5f5] tracking-wide">
            Purchase Orders
          </h1>
        </div>
      </div>
    </Layout>
  );
};

export default AdminPurchaseOrders;
