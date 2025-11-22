import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  regions,
  provinces,
  cities,
  barangays,
  regionByCode,
  provincesByCode,
  provinceByName,
} from "select-philippines-address";
import logoClear from "/logoClear.png";
import bgPobla from "/bgPobla.jpg";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Address state
  const [regionCode, setRegionCode] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [barangayCode, setBarangayCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Load Marinduque province data on mount
  useEffect(() => {
    const loadMarinduqueData = async () => {
      try {
        setIsLoadingAddress(true);
        // Get Marinduque province code
        const marinduqueProvince = await provinceByName("Marinduque");
        if (marinduqueProvince) {
          const provinceCodeValue = marinduqueProvince.province_code;
          setProvinceCode(provinceCodeValue);
          
          // Get region code for Marinduque (Region IV-B - MIMAROPA)
          // Marinduque is in region code "17" (MIMAROPA)
          // Try to get from province data, otherwise use known value
          const regionCodeValue = marinduqueProvince.region_code || "17";
          setRegionCode(regionCodeValue);
          
          // Load cities/municipalities for Marinduque
          const citiesData = await cities(provinceCodeValue);
          setCityList(citiesData || []);
        } else {
          toast.error("Marinduque province not found");
        }
      } catch (error) {
        toast.error("Failed to load address data");
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadMarinduqueData();
  }, []);

  // Load barangays when city is selected
  useEffect(() => {
    const loadBarangays = async () => {
      if (!cityCode) {
        setBarangayList([]);
        setBarangayCode("");
        return;
      }

      try {
        setIsLoadingAddress(true);
        
        // Find the selected city to get its full code
        const selectedCity = cityList.find(
          (c) => (c.code || c.city_code || c.municipality_code) === cityCode
        );
        
        // Try different code formats that the library might expect
        const codeToUse = selectedCity?.code || 
                         selectedCity?.city_code || 
                         selectedCity?.municipality_code || 
                         cityCode;
        
        // Try the code as-is first
        let barangaysData;
        try {
          barangaysData = await barangays(codeToUse);
        } catch (firstError) {
          // If that fails, try with different code formats
          // Try with province code + city code if available
          if (selectedCity && provinceCode) {
            const combinedCode = provinceCode + codeToUse;
            try {
              barangaysData = await barangays(combinedCode);
            } catch (secondError) {
              // Try just the city code from the object
              const altCode = selectedCity.city_code || selectedCity.municipality_code || selectedCity.code;
              barangaysData = await barangays(altCode);
            }
          } else {
            throw firstError;
          }
        }
        
        // Handle different data structures
        let formattedBarangays = [];
        if (Array.isArray(barangaysData)) {
          formattedBarangays = barangaysData;
        } else if (barangaysData && typeof barangaysData === 'object') {
          // If it's an object, try to extract array from common properties
          formattedBarangays = barangaysData.data || barangaysData.barangays || Object.values(barangaysData).filter(Array.isArray)[0] || [];
        }
        
        setBarangayList(formattedBarangays);
      } catch (error) {
        // Don't show toast for every error, just silently fail
        setBarangayList([]);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadBarangays();
  }, [cityCode, cityList, provinceCode]);

  // Update address string when address components change
  useEffect(() => {
    const addressParts = [];
    if (streetAddress) addressParts.push(streetAddress);
    if (barangayCode) {
      const barangay = barangayList.find(
        (b) => b.code === barangayCode || b.barangay_code === barangayCode
      );
      if (barangay) {
        addressParts.push(barangay.name || barangay.barangay_name);
      }
    }
    if (cityCode) {
      const city = cityList.find(
        (c) => c.code === cityCode || c.city_code === cityCode
      );
      if (city) {
        addressParts.push(city.name || city.city_name || city.municipality_name);
      }
    }
    if (provinceCode) {
      addressParts.push("Marinduque");
    }
    if (regionCode) {
      addressParts.push("MIMAROPA");
    }

    setFormData((prev) => ({
      ...prev,
      address: addressParts.join(", "),
    }));
  }, [streetAddress, barangayCode, cityCode, provinceCode, regionCode, cityList, barangayList]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCityChange = (e) => {
    const selectedCityCode = e.target.value;
    setCityCode(selectedCityCode);
    setBarangayCode(""); // Reset barangay when city changes
  };

  const handleBarangayChange = (e) => {
    setBarangayCode(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !streetAddress ||
      !cityCode ||
      !barangayCode ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast.error("Please fill in all fields including complete address");
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
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
          address: "",
          password: "",
          confirmPassword: "",
        });
        setStreetAddress("");
        setCityCode("");
        setBarangayCode("");
        // Navigate to login page
        navigate("/login");
      }
    } catch (error) {
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
        onError={(e) => {
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
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Address Section - Marinduque Only */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Address (Marinduque Province)
                </label>

                {/* Street Address */}
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Street Address / House Number
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Enter street address or house number"
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* City/Municipality */}
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    City / Municipality
                  </label>
                  <select
                    value={cityCode}
                    onChange={handleCityChange}
                    disabled={isLoadingAddress || cityList.length === 0}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select City/Municipality</option>
                    {cityList.map((city) => {
                      const cityCodeValue = city.code || city.city_code || city.municipality_code;
                      const cityName = city.name || city.city_name || city.municipality_name;
                      return (
                        <option key={cityCodeValue} value={cityCodeValue} className="bg-[#1f1f1f]">
                          {cityName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Barangay */}
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Barangay
                  </label>
                  <select
                    value={barangayCode}
                    onChange={handleBarangayChange}
                    disabled={isLoadingAddress || !cityCode}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">
                      {isLoadingAddress 
                        ? "Loading barangays..." 
                        : !cityCode 
                        ? "Select city first" 
                        : barangayList.length === 0 
                        ? "No barangays available" 
                        : "Select Barangay"}
                    </option>
                    {barangayList.map((barangay, index) => {
                      // Handle various property name formats
                      const barangayCodeValue = barangay.code || barangay.barangay_code || barangay.brgy_code || index;
                      const barangayName = barangay.name || barangay.barangay_name || barangay.brgy_name || `Barangay ${index + 1}`;
                      return (
                        <option key={barangayCodeValue || index} value={barangayCodeValue} className="bg-[#1f1f1f]">
                          {barangayName}
                        </option>
                      );
                    })}
                  </select>
                  {cityCode && barangayList.length === 0 && !isLoadingAddress && (
                    <p className="text-xs text-yellow-400 mt-1">
                      No barangays found for this city. Please check the city selection.
                    </p>
                  )}
                </div>

                {/* Province (Read-only, Marinduque) */}
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Province
                  </label>
                  <input
                    type="text"
                    value="Marinduque"
                    disabled
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white/70 cursor-not-allowed"
                  />
                </div>
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
                    placeholder="Enter Password"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    className="w-full px-4 py-3 pr-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#bf595a] focus:border-transparent transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                  >
                    {showConfirmPassword ? (
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
