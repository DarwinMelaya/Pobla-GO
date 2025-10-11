import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage, Login, SignUp, AdminDashboard } from "../pages";

export const Routers = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Admin */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
};
