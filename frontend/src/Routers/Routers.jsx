import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  LandingPage,
  Login,
  SignUp,
  AdminDashboard,
  ManageInventory,
  AdminMenu,
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

        {/* Protected Dashboard Pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center">
                <h1 className="text-2xl font-bold">Welcome to Dashboard!</h1>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Protected Cashier Pages */}
        <Route
          path="/cashier-dashboard"
          element={
            <ProtectedRoute requiredRole="Cashier">
              <div className="min-h-screen flex items-center justify-center">
                <h1 className="text-2xl font-bold">Cashier Dashboard</h1>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Protected Waiter Pages */}
        <Route
          path="/waiter-dashboard"
          element={
            <ProtectedRoute requiredRole="Waiter">
              <div className="min-h-screen flex items-center justify-center">
                <h1 className="text-2xl font-bold">Waiter Dashboard</h1>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};
