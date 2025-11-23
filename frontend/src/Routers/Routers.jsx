import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  LandingPage,
  Login,
  SignUp,
  AdminDashboard,
  ManageInventory,
  AdminMenu,
  AdminManageOrders,
  AdminReservations,
  AdminViewSales,
  AdminInventoryReports,
  AdminMaitenance,
  StaffDashboard,
  StaffMenu,
  StaffManageOrders,
  StaffManageReservation,
  AdminProductions,
  AdminPurchaseOrders,
  AdminMaterials,
  Pos,
  StaffProductions,
  AdminUsers,
  StaffInventoryMaterials,
  Foods,
  Search,
  Carts,
  Accounts,
  AdminOnlineOrders,
  Checkout,
} from "../pages";
import ProtectedRoute from "../components/Security/ProtectedRoute";
import LandingPageWithIntro from "../components/Intro/LandingPageWithIntro";

export const Routers = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPageWithIntro />} />
        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected Admin Pages */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-inventory"
          element={
            <ProtectedRoute requiredRole="Admin">
              <ManageInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-menu"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminMenu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-orders"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminManageOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-reservations"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminReservations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-sales-report"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminViewSales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-inventory-report"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminInventoryReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-maintenance"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminMaitenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-productions"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminProductions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-purchase-orders"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminPurchaseOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-inventory-materials"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminMaterials />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-users"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-online-orders"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminOnlineOrders />
            </ProtectedRoute>
          }
        />

        {/* Protected Staff Pages */}
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute requiredRole="Staff">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-menu"
          element={
            <ProtectedRoute requiredRole="Staff">
              <StaffMenu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-orders"
          element={
            <ProtectedRoute requiredRole="Staff">
              <StaffManageOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-reservations"
          element={
            <ProtectedRoute requiredRole="Staff">
              <StaffManageReservation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-productions"
          element={
            <ProtectedRoute requiredRole="Staff">
              <StaffProductions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-inventory-materials"
          element={
            <ProtectedRoute requiredRole="Staff">
              <StaffInventoryMaterials />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute requiredRole={["Admin", "Staff"]}>
              <Pos />
            </ProtectedRoute>
          }
        />

        {/* Customer Pages */}
        <Route
          path="/foods"
          element={
            <ProtectedRoute requiredRole="Customer">
              <Foods />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute requiredRole="Customer">
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/carts"
          element={
            <ProtectedRoute requiredRole="Customer">
              <Carts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute requiredRole="Customer">
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute requiredRole="Customer">
              <Accounts />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};
