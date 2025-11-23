import { useState, useEffect } from "react";
import { MapPin, Plus, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { cities, barangays, provinceByName } from "select-philippines-address";

const API_BASE_URL = "http://localhost:5000";

const Address = ({ user, getAuthToken, fetchProfile }) => {
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    address: "",
    isDefault: false,
  });

  // Address form state
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
        const marinduqueProvince = await provinceByName("Marinduque");
        if (marinduqueProvince) {
          const provinceCodeValue = marinduqueProvince.province_code;
          setProvinceCode(provinceCodeValue);
          const regionCodeValue = marinduqueProvince.region_code || "17";
          setRegionCode(regionCodeValue);
          const citiesData = await cities(provinceCodeValue);
          setCityList(citiesData || []);
        }
      } catch (error) {
        console.error("Failed to load address data:", error);
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
        const selectedCity = cityList.find(
          (c) => (c.code || c.city_code || c.municipality_code) === cityCode
        );
        const codeToUse =
          selectedCity?.code ||
          selectedCity?.city_code ||
          selectedCity?.municipality_code ||
          cityCode;

        let barangaysData;
        try {
          barangaysData = await barangays(codeToUse);
        } catch (firstError) {
          if (selectedCity && provinceCode) {
            const combinedCode = provinceCode + codeToUse;
            try {
              barangaysData = await barangays(combinedCode);
            } catch (secondError) {
              const altCode =
                selectedCity.city_code ||
                selectedCity.municipality_code ||
                selectedCity.code;
              barangaysData = await barangays(altCode);
            }
          } else {
            throw firstError;
          }
        }

        let formattedBarangays = [];
        if (Array.isArray(barangaysData)) {
          formattedBarangays = barangaysData;
        } else if (barangaysData && typeof barangaysData === "object") {
          formattedBarangays =
            barangaysData.data ||
            barangaysData.barangays ||
            Object.values(barangaysData).filter(Array.isArray)[0] ||
            [];
        }

        setBarangayList(formattedBarangays);
      } catch (error) {
        setBarangayList([]);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadBarangays();
  }, [cityCode, cityList, provinceCode]);

  // Update address string when address components change
  useEffect(() => {
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
        addressParts.push(
          city.name || city.city_name || city.municipality_name
        );
      }
    }
    if (provinceCode) {
      addressParts.push("Marinduque");
    }
    if (regionCode) {
      addressParts.push("MIMAROPA");
    }

    const newAddress = addressParts.join(", ");
    if (newAddress && newAddress !== addressForm.address) {
      setAddressForm((prev) => ({ ...prev, address: newAddress }));
    }
  }, [
    streetAddress,
    barangayCode,
    cityCode,
    provinceCode,
    regionCode,
    cityList,
    barangayList,
    isParsingAddress,
    addressForm.address,
  ]);

  // Parse address when editing
  const parseAddressForEdit = async (addressString) => {
    if (!addressString || !cityList.length) return;

    setIsParsingAddress(true);
    try {
      const addressParts = addressString.split(",").map((part) => part.trim());
      const filteredParts = addressParts.filter(
        (part) =>
          part.toLowerCase() !== "marinduque" &&
          part.toLowerCase() !== "mimaropa"
      );

      if (filteredParts.length >= 3) {
        setStreetAddress(filteredParts[0]);

        const barangayName = filteredParts[1];
        const cityName = filteredParts[2];

        const matchedCity = cityList.find((c) => {
          const cityNameLower = cityName.toLowerCase();
          const cName = (
            c.name ||
            c.city_name ||
            c.municipality_name ||
            ""
          ).toLowerCase();
          return (
            cName === cityNameLower ||
            cName.includes(cityNameLower) ||
            cityNameLower.includes(cName)
          );
        });

        if (matchedCity) {
          const cityCodeValue =
            matchedCity.code ||
            matchedCity.city_code ||
            matchedCity.municipality_code;
          setCityCode(cityCodeValue);

          // Wait for barangays to load, then find matching barangay
          setTimeout(async () => {
            try {
              const selectedCity = cityList.find(
                (c) =>
                  (c.code || c.city_code || c.municipality_code) ===
                  cityCodeValue
              );

              const codeToUse =
                selectedCity?.code ||
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
                    const altCode =
                      selectedCity.city_code ||
                      selectedCity.municipality_code ||
                      selectedCity.code;
                    barangaysData = await barangays(altCode);
                  }
                } else {
                  throw firstError;
                }
              }

              let formattedBarangays = [];
              if (Array.isArray(barangaysData)) {
                formattedBarangays = barangaysData;
              } else if (barangaysData && typeof barangaysData === "object") {
                formattedBarangays =
                  barangaysData.data ||
                  barangaysData.barangays ||
                  Object.values(barangaysData).filter(Array.isArray)[0] ||
                  [];
              }

              if (formattedBarangays.length > 0 && barangayName) {
                const matchedBarangay = formattedBarangays.find((b) => {
                  const barangayNameLower = barangayName.toLowerCase();
                  const bName = (
                    b.name ||
                    b.barangay_name ||
                    b.brgy_name ||
                    ""
                  ).toLowerCase();
                  return (
                    bName === barangayNameLower ||
                    bName.includes(barangayNameLower) ||
                    barangayNameLower.includes(bName)
                  );
                });

                if (matchedBarangay) {
                  const barangayCodeValue =
                    matchedBarangay.code ||
                    matchedBarangay.barangay_code ||
                    matchedBarangay.brgy_code;
                  setBarangayCode(barangayCodeValue);
                }
              }
            } catch (error) {
              console.error("Error loading barangays:", error);
            }
          }, 800);
        }
      }
    } catch (error) {
      console.error("Error parsing address:", error);
    } finally {
      setIsParsingAddress(false);
    }
  };

  // Handle add/edit address
  const handleSaveAddress = async () => {
    if (!addressForm.label || !streetAddress || !cityCode || !barangayCode) {
      toast.error(
        "Please fill in all address fields (Label, Street Address, City/Municipality, and Barangay)"
      );
      return;
    }

    try {
      const token = getAuthToken();
      const url = editingAddress
        ? `${API_BASE_URL}/auth/addresses/${editingAddress._id}`
        : `${API_BASE_URL}/auth/addresses`;

      const method = editingAddress ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addressForm),
      });

      if (!response.ok) {
        throw new Error("Failed to save address");
      }

      const data = await response.json();
      fetchProfile();
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressForm({ label: "", address: "", isDefault: false });
      setStreetAddress("");
      setCityCode("");
      setBarangayCode("");
      setBarangayList([]);
      toast.success(
        editingAddress
          ? "Address updated successfully"
          : "Address added successfully"
      );
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

  // Handle delete address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/auth/addresses/${addressId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      const data = await response.json();
      fetchProfile();
      toast.success("Address deleted successfully");
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    }
  };

  // Handle edit address
  const handleEditAddress = async (address) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      address: address.address,
      isDefault: address.isDefault,
    });

    // Reset address fields
    setStreetAddress("");
    setCityCode("");
    setBarangayCode("");
    setBarangayList([]);

    // Parse the address
    await parseAddressForEdit(address.address);
    setShowAddressModal(true);
  };

  // Handle city change
  const handleCityChange = (e) => {
    const selectedCityCode = e.target.value;
    setCityCode(selectedCityCode);
    setBarangayCode("");
  };

  // Handle barangay change
  const handleBarangayChange = (e) => {
    setBarangayCode(e.target.value);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Saved Addresses</h2>
          <button
            onClick={() => {
              setEditingAddress(null);
              setAddressForm({ label: "", address: "", isDefault: false });
              setStreetAddress("");
              setCityCode("");
              setBarangayCode("");
              setBarangayList([]);
              setShowAddressModal(true);
            }}
            className="px-4 py-2 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>

        {user?.addresses?.length === 0 ? (
          <section className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-12 text-center gap-4">
            <div className="w-24 h-24 rounded-full bg-[#2f2f2f] flex items-center justify-center mb-4">
              <MapPin className="w-12 h-12 text-[#383838]" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              No addresses saved
            </h2>
            <p className="text-[#ababab] max-w-md">
              Add your first address to make ordering easier!
            </p>
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user?.addresses?.map((address) => (
              <div
                key={address._id}
                className="bg-[#232323] border border-[#383838] rounded-2xl p-6 relative"
              >
                {address.isDefault && (
                  <span className="absolute top-4 right-4 px-2 py-1 rounded-full bg-[#C05050]/20 text-[#C05050] text-xs font-semibold">
                    Default
                  </span>
                )}
                <div className="flex items-start gap-3 mb-3">
                  <MapPin className="w-5 h-5 text-[#C05050] flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {address.label}
                    </h3>
                    <p className="text-[#ababab] text-sm">{address.address}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-[#2f2f2f]">
                  <button
                    onClick={() => handleEditAddress(address)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#2f2f2f] text-white hover:bg-[#2f2f2f] transition flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(address._id)}
                    className="px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#2f2f2f] text-red-400 hover:bg-[#2f2f2f] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#232323] border border-[#383838] rounded-2xl p-6 max-w-2xl w-full space-y-4 my-8">
            <h2 className="text-xl font-semibold text-white">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </h2>
            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-[#ababab] mb-2">
                  Label (e.g., Home, Work, Office)
                </label>
                <input
                  type="text"
                  value={addressForm.label}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, label: e.target.value })
                  }
                  placeholder="Home"
                  className="w-full px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white placeholder-[#ababab] focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 transition-all duration-200"
                />
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
                  <option value="" className="bg-[#1f1f1f]">
                    Select City/Municipality
                  </option>
                  {cityList.map((city) => {
                    const cityCodeValue =
                      city.code || city.city_code || city.municipality_code;
                    const cityName =
                      city.name || city.city_name || city.municipality_name;
                    return (
                      <option
                        key={cityCodeValue}
                        value={cityCodeValue}
                        className="bg-[#1f1f1f]"
                      >
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
                    const barangayCodeValue =
                      barangay.code ||
                      barangay.barangay_code ||
                      barangay.brgy_code ||
                      index;
                    const barangayName =
                      barangay.name ||
                      barangay.barangay_name ||
                      barangay.brgy_name ||
                      `Barangay ${index + 1}`;
                    return (
                      <option
                        key={barangayCodeValue || index}
                        value={barangayCodeValue}
                        className="bg-[#1f1f1f]"
                      >
                        {barangayName}
                      </option>
                    );
                  })}
                </select>
                {cityCode && barangayList.length === 0 && !isLoadingAddress && (
                  <p className="text-xs text-yellow-400 mt-1">
                    No barangays found for this city. Please check the city
                    selection.
                  </p>
                )}
              </div>

              {/* Province (Read-only) */}
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

              {/* Default Address Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) =>
                    setAddressForm({
                      ...addressForm,
                      isDefault: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded bg-[#1f1f1f] border-[#2f2f2f] text-[#C05050] focus:ring-[#C05050]"
                />
                <label
                  htmlFor="isDefault"
                  className="text-sm text-[#ababab] cursor-pointer"
                >
                  Set as default address
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setEditingAddress(null);
                  setAddressForm({ label: "", address: "", isDefault: false });
                  setStreetAddress("");
                  setCityCode("");
                  setBarangayCode("");
                  setBarangayList([]);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1f1f1f] border border-[#2f2f2f] text-white font-semibold hover:bg-[#2f2f2f] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                className="flex-1 px-4 py-3 rounded-xl bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition"
              >
                {editingAddress ? "Update" : "Add"} Address
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Address;
