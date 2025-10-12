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
  StaffDashboard,
  StaffMenu,
  StaffManageOrders,
  StaffManageReservation,
} from "../pages";
import ProtectedRoute from "../components/Security/ProtectedRoute";

export const Routers = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
      </Routes>
    </Router>
  );
};
