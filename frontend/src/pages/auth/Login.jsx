import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import logoClear from "/logoClear.png";
import bgPobla from "/bgPobla.jpg";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/auth/login",
        formData
      );

      if (response.data.success) {
        // Store user data and token in localStorage
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        toast.success("Login successful!");

        // Navigate based on user role or intended destination
        const from = location.state?.from;
        if (from) {
          navigate(from, { replace: true });
        } else {
          if (response.data.user.role === "Admin") {
            navigate("/admin-dashboard", { replace: true });
          } else if (response.data.user.role === "Staff") {
            navigate("/staff-dashboard", { replace: true });
          } else if (response.data.user.role === "Customer") {
            navigate("/foods", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("An error occurred during login. Please try again.");
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
              Welcome back! Sign in to continue your journey
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
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-white/80">Sign in to your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-[#bf595a] focus:ring-[#bf595a] border-white/30 rounded bg-white/20"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-white/90"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a
                    href="#"
                    className="text-white/80 hover:text-[#bf595a] transition-colors duration-200"
                  >
                    Forgot password?
                  </a>
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
                {isLoading ? "Signing In..." : "Sign In"}
              </button>

              {/* Sign Up Link */}
              {/* <div className="text-center">
                <p className="text-white/80">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-white hover:text-[#bf595a] font-medium hover:underline transition-colors duration-200"
                  >
                    Sign up here
                  </Link>
                </p>
              </div> */}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
