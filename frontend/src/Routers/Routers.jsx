import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home, Login } from "../pages";

export const Routers = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
};
