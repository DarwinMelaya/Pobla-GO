import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import logoClear from "/logoClear.png";
import bgPobla from "/bgPobla.jpg";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelection = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.role
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/auth/signup",
        formData
      );

      if (response.data.success) {
        toast.success("Account created successfully!");
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "",
        });
        // Navigate to login page
        navigate("/login");
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("An error occurred during signup. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col lg:flex-row overflow-hidden">
      {/* Background Image */}
      <img
        src={bgPobla}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onLoad={() => console.log("Background image loaded successfully")}
        onError={(e) => {
          console.error("Background image failed to load:", e);
          // Try direct path if import fails
          e.target.src = "/bgPobla.jpg";
        }}
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 w-full h-full z-10"
        style={{ backgroundColor: "#000000", opacity: 0.5 }}
      />

      {/* Left Side - Logo Section */}
      <div className="relative z-20 w-full lg:w-1/2 flex flex-col items-center justify-center p-8 min-h-screen">
        <div className="text-center">
          {/* Logo Image */}
          <div className="mb-8">
            <img
              src={logoClear}
              alt="PoblaGO Logo"
              className="w-48 h-48 lg:w-64 lg:h-64 object-contain mx-auto"
            />
          </div>

          {/* Brand Text */}
          <div className="text-white">
            <h1 className="text-4xl lg:text-5xl font-bold mb-2">POBLACION</h1>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">PARES ATBP.</h2>
            <p className="text-lg lg:text-xl opacity-90">
              Join our community and discover amazing experiences
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Glass Form Card */}
      <div className="relative z-20 w-full lg:w-1/2 flex items-center justify-center p-8 min-h-screen">
        <div className="w-full max-w-md">
          {/* Glass Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Sign Up</h1>
              <p className="text-white/80">
                Create your account to get started
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Employee Name */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Employee Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter employee name"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Employee Email */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Employee Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter employee email"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Employee Phone */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Employee Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter employee phone"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter Password"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Choose your role
                </label>
                <div className="flex gap-3 mt-2">
                  {["Waiter", "Cashier", "Admin"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleSelection(role)}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm ${
                        formData.role === role
                          ? "bg-[#bf595a] text-white shadow-lg border border-white/30"
                          : "bg-white/20 text-white/90 hover:bg-white/30 border border-white/30"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform shadow-lg ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#bf595a] hover:bg-[#a04a4b] hover:scale-105"
                } text-white`}
              >
                {isLoading ? "Creating Account..." : "Sign up"}
              </button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-white/80">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-white hover:text-[#bf595a] font-medium hover:underline transition-colors duration-200"
                  >
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
