import { useMemo, useState, useEffect } from "react";
import {
  MapPin,
  CreditCard,
  Wallet,
  ArrowLeft,
  CheckCircle,
  Phone,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import CustomerLayout from "../../components/Layout/CustomerLayout";
import { useCart } from "../../contexts/CartContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  cities,
  barangays,
  provinceByName,
} from "select-philippines-address";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, getCartTotal, getCartItemCount, clearCart } = useCart();

  // Get orderType from location state, default to "delivery"
  const orderType = location.state?.orderType || "delivery";

  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userAddress = user?.address || "";
  const userPhone = user?.phone || "";

  const [deliveryAddress, setDeliveryAddress] = useState(userAddress || "");
  const [paymentMethod, setPaymentMethod] = useState("gcash"); // "gcash" or "cash"
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [hasAddressChanged, setHasAddressChanged] = useState(false);

  // Address state
  const [regionCode, setRegionCode] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [barangayCode, setBarangayCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isParsingAddress, setIsParsingAddress] = useState(false);

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

  // Try to match barangay from existing address when barangayList is loaded
  useEffect(() => {
    if (!userAddress || !barangayList.length || barangayCode || !cityCode) {
      return;
    }

    // Parse address to find barangay name
    try {
      const addressParts = userAddress.split(",").map(part => part.trim());
      const filteredParts = addressParts.filter(
        part => part.toLowerCase() !== "marinduque" && part.toLowerCase() !== "mimaropa"
      );
      
      if (filteredParts.length >= 3) {
        const barangayName = filteredParts[1];
        
        // Find matching barangay
        const matchedBarangay = barangayList.find(
          (b) => {
            const barangayNameLower = barangayName.toLowerCase();
            const bName = (b.name || b.barangay_name || b.brgy_name || "").toLowerCase();
            return bName === barangayNameLower || bName.includes(barangayNameLower) || barangayNameLower.includes(bName);
          }
        );
        
        if (matchedBarangay) {
          const barangayCodeValue = matchedBarangay.code || matchedBarangay.barangay_code || matchedBarangay.brgy_code;
          setBarangayCode(barangayCodeValue);
        }
      }
    } catch (error) {
      // Silently fail
      console.error("Error matching barangay:", error);
    }
  }, [barangayList, userAddress, cityCode, barangayCode]);

  // Parse existing address and populate fields when userAddress and cityList are available
  useEffect(() => {
    const parseExistingAddress = async () => {
      if (!userAddress || !cityList.length || isParsingAddress) {
        return; // Skip if no address, cityList not loaded, or already parsing
      }

      // Only parse if fields are empty
      if (streetAddress || cityCode || barangayCode) {
        return;
      }

      setIsParsingAddress(true);
      try {
        // Address format: "Street Address, Barangay Name, City Name, Marinduque, MIMAROPA"
        const addressParts = userAddress.split(",").map(part => part.trim());
        
        if (addressParts.length >= 3) {
          // Extract street address (first part)
          const parsedStreetAddress = addressParts[0];
          if (parsedStreetAddress && parsedStreetAddress !== "Marinduque" && parsedStreetAddress !== "MIMAROPA") {
            setStreetAddress(parsedStreetAddress);
          }

          // Extract city name and barangay
          let cityName = "";
          let barangayName = "";
          
          // Remove province and region from consideration
          const filteredParts = addressParts.filter(
            part => part.toLowerCase() !== "marinduque" && part.toLowerCase() !== "mimaropa"
          );
          
          if (filteredParts.length >= 3) {
            // Format: Street, Barangay, City
            barangayName = filteredParts[1];
            cityName = filteredParts[2];
          } else if (filteredParts.length === 2) {
            // Format: Street, City (no barangay)
            cityName = filteredParts[1];
          }

          // Find matching city
          if (cityName) {
            const matchedCity = cityList.find(
              (c) => {
                const cityNameLower = cityName.toLowerCase();
                const cName = (c.name || c.city_name || c.municipality_name || "").toLowerCase();
                return cName === cityNameLower || cName.includes(cityNameLower) || cityNameLower.includes(cName);
              }
            );

            if (matchedCity) {
              const cityCodeValue = matchedCity.code || matchedCity.city_code || matchedCity.municipality_code;
              setCityCode(cityCodeValue);
              
              // Load barangays for this city if barangay name exists
              if (barangayName) {
                // Wait for barangays to load from the other effect, then find matching barangay
                setTimeout(async () => {
                  try {
                    const selectedCity = cityList.find(
                      (c) => (c.code || c.city_code || c.municipality_code) === cityCodeValue
                    );
                    
                    const codeToUse = selectedCity?.code || 
                                     selectedCity?.city_code || 
                                     selectedCity?.municipality_code || 
                                     cityCodeValue;
                    
                    let barangaysData;
                    try {
                      barangaysData = await barangays(codeToUse);
                    } catch (firstError) {
                      if (selectedCity && provinceCode) {
                        const combinedCode = provinceCode + codeToUse;
                        try {
                          barangaysData = await barangays(combinedCode);
                        } catch (secondError) {
                          const altCode = selectedCity.city_code || selectedCity.municipality_code || selectedCity.code;
                          barangaysData = await barangays(altCode);
                        }
                      } else {
                        throw firstError;
                      }
                    }
                    
                    let formattedBarangays = [];
                    if (Array.isArray(barangaysData)) {
                      formattedBarangays = barangaysData;
                    } else if (barangaysData && typeof barangaysData === 'object') {
                      formattedBarangays = barangaysData.data || barangaysData.barangays || Object.values(barangaysData).filter(Array.isArray)[0] || [];
                    }
                    
                    // Find matching barangay
                    if (formattedBarangays.length > 0) {
                      const matchedBarangay = formattedBarangays.find(
                        (b) => {
                          const barangayNameLower = barangayName.toLowerCase();
                          const bName = (b.name || b.barangay_name || b.brgy_name || "").toLowerCase();
                          return bName === barangayNameLower || bName.includes(barangayNameLower) || barangayNameLower.includes(bName);
                        }
                      );
                      
                      if (matchedBarangay) {
                        const barangayCodeValue = matchedBarangay.code || matchedBarangay.barangay_code || matchedBarangay.brgy_code;
                        setBarangayCode(barangayCodeValue);
                      }
                    }
                  } catch (error) {
                    // Silently fail if barangay loading fails
                    console.error("Error loading barangays:", error);
                  }
                }, 800);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error parsing address:", error);
      } finally {
        setIsParsingAddress(false);
      }
    };

    parseExistingAddress();
  }, [userAddress, cityList, provinceCode, streetAddress, cityCode, barangayCode, isParsingAddress]);

  // Update address string when address components change
  useEffect(() => {
    // Skip if we're still parsing the existing address
    if (isParsingAddress) {
      return;
    }

    const addressParts = [];
    if (streetAddress) addressParts.push(streetAddress);
    if (barangayCode && barangayList.length > 0) {
      const barangay = barangayList.find(
        (b) => b.code === barangayCode || b.barangay_code === barangayCode
      );
      if (barangay) {
        addressParts.push(barangay.name || barangay.barangay_name);
      }
    }
    if (cityCode && cityList.length > 0) {
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

    const newAddress = addressParts.join(", ");
    if (newAddress) {
      setDeliveryAddress(newAddress);
    }
  }, [streetAddress, barangayCode, cityCode, provinceCode, regionCode, cityList, barangayList, isParsingAddress]);

  // Track if address has changed from original
  useEffect(() => {
    setHasAddressChanged(deliveryAddress !== userAddress);
  }, [deliveryAddress, userAddress]);

  // Save address to user profile
  const handleSaveAddress = async () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter an address to save");
      return;
    }

    if (!user || (!user.id && !user._id)) {
      toast.error("User not found. Please login again.");
      return;
    }

    setIsSavingAddress(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        "http://localhost:5000/auth/profile",
        { address: deliveryAddress },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Update localStorage with new user data
        const updatedUser = { ...user, address: deliveryAddress };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setHasAddressChanged(false);
        toast.success("Address saved to your profile!");
      }
    } catch (error) {
      console.error("Error saving address:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to save address. Please try again.");
      }
    } finally {
      setIsSavingAddress(false);
    }
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }),
    []
  );

  const subtotal = getCartTotal();
  const deliveryFee = orderType === "delivery" ? 50 : 0;
  const total = subtotal + deliveryFee;

  const handleCityChange = (e) => {
    const selectedCityCode = e.target.value;
    setCityCode(selectedCityCode);
    setBarangayCode(""); // Reset barangay when city changes
  };

  const handleBarangayChange = (e) => {
    setBarangayCode(e.target.value);
  };

  const handlePlaceOrder = () => {
    // Validation
    if (orderType === "delivery") {
      if (!streetAddress.trim() || !cityCode || !barangayCode) {
        toast.error("Please fill in all address fields (Street Address, City/Municipality, and Barangay)");
        return;
      }
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // TODO: Implement actual order submission to backend
    // For now, just show success message
    toast.success("Order placed successfully!");

    // Clear cart and navigate back to foods
    clearCart();
    setTimeout(() => {
      navigate("/foods");
    }, 1500);
  };

  // Redirect if cart is empty
  if (cartItems.length === 0) {
    return (
      <CustomerLayout>
        <div className="bg-[#1f1f1f] min-h-screen px-4 py-8 md:px-8 text-white">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate("/carts")}
              className="mb-6 flex items-center gap-2 text-[#ababab] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Cart</span>
            </button>
            <div className="bg-[#232323] border border-[#383838] rounded-2xl p-12 text-center">
              <p className="text-lg text-[#ababab]">
                Your cart is empty. Please add items to your cart first.
              </p>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-[#1f1f1f] min-h-screen px-4 py-8 md:px-8 text-white">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <section className="relative overflow-hidden rounded-3xl border border-[#383838] bg-gradient-to-br from-[#232323] via-[#1f1f1f] to-[#2b2b2b] p-6 md:p-8">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(192,80,80,0.4),_transparent_60%)]" />
            <div className="relative flex items-center justify-between">
              <div>
                <button
                  onClick={() => navigate("/carts")}
                  className="mb-4 flex items-center gap-2 text-[#ababab] hover:text-white transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Cart</span>
                </button>
                <p className="uppercase tracking-[0.3em] text-xs text-[#ababab] mb-2">
                  Checkout
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Review Payment & Address
                </h1>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Address */}
              {orderType === "delivery" && (
                <section className="bg-[#232323] border border-[#383838] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-[#C05050]" />
                    <h2 className="text-xl font-semibold text-white">
                      Delivery Address
                    </h2>
                  </div>

                  {/* Address Input */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm text-[#ababab]">
                        Address (Marinduque Province)
                      </label>
                      {hasAddressChanged && (
                        <button
                          onClick={handleSaveAddress}
                          disabled={isSavingAddress}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#C05050] hover:text-[#a63e3e] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSavingAddress ? "Saving..." : "Save to Profile"}
                        </button>
                      )}
                    </div>

                    {/* Street Address */}
                    <div>
                      <label className="block text-xs text-[#ababab] mb-1">
                        Street Address / House Number
                      </label>
                      <input
                        type="text"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="Enter street address or house number"
                        className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#383838] rounded-xl text-white placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200"
                      />
                    </div>

                    {/* City/Municipality */}
                    <div>
                      <label className="block text-xs text-[#ababab] mb-1">
                        City / Municipality
                      </label>
                      <select
                        value={cityCode}
                        onChange={handleCityChange}
                        disabled={isLoadingAddress || cityList.length === 0}
                        className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#383838] rounded-xl text-white focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="" className="bg-[#1f1f1f]">Select City/Municipality</option>
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
                      <label className="block text-xs text-[#ababab] mb-1">
                        Barangay
                      </label>
                      <select
                        value={barangayCode}
                        onChange={handleBarangayChange}
                        disabled={isLoadingAddress || !cityCode}
                        className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#383838] rounded-xl text-white focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                      >
                        <option value="" className="bg-[#1f1f1f]">
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
                      <label className="block text-xs text-[#ababab] mb-1">
                        Province
                      </label>
                      <input
                        type="text"
                        value="Marinduque"
                        disabled
                        className="w-full px-4 py-3 bg-[#1f1f1f]/50 border border-[#383838]/50 rounded-xl text-white/70 cursor-not-allowed"
                      />
                    </div>

                    {hasAddressChanged && (
                      <p className="text-xs text-[#ababab] mt-2">
                        Address has been modified. Click "Save to Profile" to
                        update your account.
                      </p>
                    )}
                  </div>

                  {/* Mobile Number Display */}
                  {userPhone && (
                    <div className="bg-[#1f1f1f] border border-[#383838] rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-[#C05050]" />
                        <div>
                          <label className="block text-xs text-[#ababab] mb-1">
                            Mobile Number
                          </label>
                          <p className="text-white font-medium">{userPhone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Payment Method */}
              <section className="bg-[#232323] border border-[#383838] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-5 h-5 text-[#C05050]" />
                  <h2 className="text-xl font-semibold text-white">
                    Payment Method
                  </h2>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod("gcash")}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === "gcash"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "gcash"
                            ? "border-[#C05050] bg-[#C05050]"
                            : "border-[#6b6b6b]"
                        }`}
                      >
                        {paymentMethod === "gcash" && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-[#2f2f2f]">
                          <Wallet className="w-6 h-6 text-[#C05050]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">GCash</p>
                          <p className="text-sm text-[#ababab]">
                            Pay using GCash mobile wallet
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === "cash"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "cash"
                            ? "border-[#C05050] bg-[#C05050]"
                            : "border-[#6b6b6b]"
                        }`}
                      >
                        {paymentMethod === "cash" && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-[#2f2f2f]">
                          <CreditCard className="w-6 h-6 text-[#C05050]" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Cash</p>
                          <p className="text-sm text-[#ababab]">
                            {orderType === "delivery"
                              ? "Pay with cash upon delivery"
                              : "Pay with cash upon pickup"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <section className="bg-[#232323] border border-[#383838] rounded-2xl p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Order Summary
                </h2>

                {/* Order Items */}
                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
                  {cartItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-start gap-3 pb-3 border-b border-[#2f2f2f] last:border-0"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[#2f2f2f] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-[#6b6b6b]">No img</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#ababab]">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-sm font-semibold text-[#C05050] mt-1">
                          {currencyFormatter.format(
                            (item.price || 0) * (item.quantity || 1)
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="bg-[#1f1f1f] rounded-xl p-4 border border-[#2f2f2f]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#ababab] text-sm">Subtotal</span>
                      <span className="text-lg font-bold text-white">
                        {currencyFormatter.format(subtotal)}
                      </span>
                    </div>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-[#ababab]">
                      <span>Delivery Fee</span>
                      <span>{currencyFormatter.format(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-[#2f2f2f] flex justify-between text-lg font-semibold text-white">
                    <span>Total</span>
                    <span className="text-[#C05050]">
                      {currencyFormatter.format(total)}
                    </span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  className="w-full px-6 py-4 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Place Order
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default Checkout;
