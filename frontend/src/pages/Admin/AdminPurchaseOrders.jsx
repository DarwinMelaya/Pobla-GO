import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout/Layout";
import toast from "react-hot-toast";

const AdminPurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [unitConversions, setUnitConversions] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [nextPONumber, setNextPONumber] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    supplier: "",
    items: [
      { raw_material: "", unit_conversion: "", quantity: 1, unit_price: 0 },
    ],
    expected_delivery_date: "",
    notes: "",
  });

  // Receive form state
  const [receiveFormData, setReceiveFormData] = useState({
    items: [],
    date_received: "",
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchRawMaterials();
    fetchNextPONumber();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/purchase-orders", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success) {
        setPurchaseOrders(data.data);
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("http://localhost:5000/suppliers");
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch("http://localhost:5000/raw-materials");
      const data = await response.json();
      if (data.success) {
        setRawMaterials(data.data);
      }
    } catch (error) {
      console.error("Error fetching raw materials:", error);
    }
  };

  const fetchNextPONumber = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/purchase-orders/next-po-number"
      );
      const data = await response.json();
      if (data.success) {
        setNextPONumber(data.data.next_po_number);
      }
    } catch (error) {
      console.error("Error fetching next PO number:", error);
    }
  };

  const fetchUnitConversions = async (materialId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/purchase-orders/unit-conversions/${materialId}`
      );
      const data = await response.json();
      if (data.success) {
        setUnitConversions((prev) => ({
          ...prev,
          [materialId]: data.data,
        }));
      }
    } catch (error) {
      console.error("Error fetching unit conversions:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If supplier changed, clear items' raw material selections that don't match the new supplier
    if (name === "supplier") {
      const selectedSupplier = suppliers.find((s) => s._id === value);
      const supplierCompanyName = selectedSupplier?.company_name || "";
      
      setFormData((prev) => {
        const updatedItems = prev.items.map((item) => {
          // If item has a raw material selected, check if it belongs to the new supplier
          if (item.raw_material) {
            const material = rawMaterials.find((m) => m._id === item.raw_material);
            // If material doesn't match the new supplier, clear it
            if (material && material.supplier !== supplierCompanyName) {
              return {
                ...item,
                raw_material: "",
                unit_conversion: "",
                unit_price: 0,
                total_price: 0,
              };
            }
          }
          return item;
        });
        
        return {
          ...prev,
          [name]: value,
          items: updatedItems,
        };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // If raw material changed, fetch unit conversions and set base price
    if (field === "raw_material") {
      newItems[index].unit_conversion = "";
      newItems[index].unit_price = 0;
      newItems[index].total_price = 0;

      if (value) {
        // Find the selected raw material and set its unit price
        const selectedMaterial = rawMaterials.find((m) => m._id === value);
        if (selectedMaterial) {
          newItems[index].unit_price = selectedMaterial.unit_price || 0;
          newItems[index].total_price =
            newItems[index].quantity * (selectedMaterial.unit_price || 0);
        }
        fetchUnitConversions(value);
      }
    }

    // If unit conversion changed, update unit price
    if (field === "unit_conversion") {
      const materialId = newItems[index].raw_material;
      const conversions = unitConversions[materialId] || [];
      const selectedConversion = conversions.find((conv) => conv._id === value);

      if (selectedConversion) {
        newItems[index].unit_price = selectedConversion.unit_price;
        newItems[index].total_price =
          newItems[index].quantity * selectedConversion.unit_price;
      } else if (value === "base_unit" || value === "" || !value) {
        // For base unit or empty, use the raw material's base unit price
        const selectedMaterial = rawMaterials.find((m) => m._id === materialId);
        if (selectedMaterial) {
          newItems[index].unit_price = selectedMaterial.unit_price || 0;
          newItems[index].total_price =
            newItems[index].quantity * (selectedMaterial.unit_price || 0);
        }
      }
    }

    // Recalculate total price for this item
    if (field === "quantity" || field === "unit_price") {
      const quantity =
        field === "quantity"
          ? parseFloat(value) || 0
          : newItems[index].quantity;
      const unitPrice =
        field === "unit_price"
          ? parseFloat(value) || 0
          : newItems[index].unit_price;
      newItems[index].total_price = quantity * unitPrice;
    }

    setFormData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          raw_material: "",
          unit_conversion: "",
          quantity: 1,
          unit_price: 0,
          total_price: 0,
        },
      ],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        items: newItems,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.supplier ||
      formData.items.some(
        (item) =>
          !item.raw_material ||
          item.quantity === "" ||
          item.quantity === null ||
          item.quantity === undefined ||
          item.unit_price === "" ||
          item.unit_price === null ||
          item.unit_price === undefined
      )
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/purchase-orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Purchase order created successfully!");
        setShowModal(false);
        setFormData({
          supplier: "",
          items: [
            {
              raw_material: "",
              unit_conversion: "",
              quantity: 1,
              unit_price: 0,
            },
          ],
          expected_delivery_date: "",
          notes: "",
        });
        fetchPurchaseOrders();
        fetchNextPONumber();
      } else {
        toast.error(data.message || "Error creating purchase order");
      }
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast.error("Error creating purchase order");
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (poId) => {
    setOpenDropdown(openDropdown === poId ? null : poId);
  };

  const openDetailsModal = (po) => {
    setSelectedPO(po);
    setShowDetailsModal(true);
    setOpenDropdown(null);
  };

  const openReceiveModal = (po) => {
    setSelectedPO(po);
    setReceiveFormData({
      items: po.items.map((item) => ({
        received_quantity: item.quantity, // Default to ordered quantity
      })),
      date_received: new Date().toISOString().split("T")[0], // Today's date
    });
    setShowReceiveModal(true);
    setOpenDropdown(null);
  };

  const handleReceiveItemChange = (index, value) => {
    const newItems = [...receiveFormData.items];
    newItems[index].received_quantity = value;
    setReceiveFormData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const handleReceiveDateChange = (e) => {
    setReceiveFormData((prev) => ({
      ...prev,
      date_received: e.target.value,
    }));
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();

    if (!receiveFormData.date_received) {
      toast.error("Please select date received");
      return;
    }

    if (
      receiveFormData.items.some(
        (item) =>
          item.received_quantity === "" ||
          item.received_quantity === null ||
          item.received_quantity === undefined
      )
    ) {
      toast.error("Please fill in all received quantities");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/purchase-orders/${selectedPO._id}/receive`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(receiveFormData),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Purchase order received successfully!");
        setShowReceiveModal(false);
        setSelectedPO(null);
        fetchPurchaseOrders();
      } else {
        toast.error(data.message || "Error receiving purchase order");
      }
    } catch (error) {
      console.error("Error receiving purchase order:", error);
      toast.error("Error receiving purchase order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-500";
      case "Approved":
        return "bg-green-500";
      case "Rejected":
        return "bg-red-500";
      case "Delivered":
        return "bg-blue-500";
      case "Cancelled":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const computeDeliveredItemTotal = (item) => {
    const qty =
      item.received_quantity !== undefined && item.received_quantity !== null
        ? item.received_quantity
        : item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    return qty * unitPrice;
  };

  const getDisplayedTotalAmount = (purchaseOrder) => {
    if (purchaseOrder.status === "Delivered") {
      if (
        purchaseOrder.received_total_amount !== undefined &&
        purchaseOrder.received_total_amount !== null
      ) {
        return purchaseOrder.received_total_amount || 0;
      }
      const deliveredSum = (purchaseOrder.items || []).reduce(
        (sum, item) => sum + computeDeliveredItemTotal(item),
        0
      );
      return deliveredSum;
    }
    return purchaseOrder.total_amount || 0;
  };

  const getItemDisplayedTotal = (purchaseOrder, item) => {
    if (purchaseOrder.status === "Delivered") {
      if (
        item.received_total_price !== undefined &&
        item.received_total_price !== null
      ) {
        return item.received_total_price || 0;
      }
      return computeDeliveredItemTotal(item);
    }
    return item.total_price || 0;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce(
      (total, item) => total + (item.total_price || 0),
      0
    );
  };

  // Filter raw materials based on selected supplier
  const getFilteredRawMaterials = () => {
    if (!formData.supplier) {
      return rawMaterials; // Show all if no supplier selected
    }
    
    const selectedSupplier = suppliers.find((s) => s._id === formData.supplier);
    if (!selectedSupplier) {
      return rawMaterials;
    }
    
    // Filter raw materials where supplier matches the selected supplier's company name
    return rawMaterials.filter(
      (material) => material.supplier === selectedSupplier.company_name
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#1a1a1a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#232323] p-6 rounded-lg shadow border border-[#383838]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-[#f5f5f5]">
                Purchase Orders
              </h1>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold transition-colors"
              >
                Create Purchase Order
              </button>
            </div>

            {/* Purchase Orders Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#383838]">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Order Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Date Received
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383838]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-8 text-center text-[#ababab]"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : purchaseOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-8 text-center text-[#ababab]"
                      >
                        No purchase orders found
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((po) => (
                      <tr key={po._id}>
                        <td className="px-4 py-2 text-[#f5f5f5] font-medium">
                          {po.po_number}
                        </td>
                        <td className="px-4 py-2 text-[#f5f5f5]">
                          {po.supplier?.company_name}
                        </td>
                        <td className="px-4 py-2 text-[#f5f5f5]">
                          {po.items.length} item(s)
                          <div className="text-xs text-[#cccccc] mt-1">
                            {po.items.map((item, idx) => (
                              <div key={idx}>
                                {item.raw_material?.name} ({item.unit})
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-[#f6b100] font-bold text-right">
                          ₱{getDisplayedTotalAmount(po).toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-3 py-1 rounded-full text-white text-sm ${getStatusColor(
                              po.status
                            )}`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[#f5f5f5]">
                          {formatDate(po.order_date)}
                        </td>
                        <td className="px-4 py-2 text-[#f5f5f5]">
                          {po.date_received ? (
                            <span className="text-[#f6b100] font-medium">
                              {formatDate(po.date_received)}
                            </span>
                          ) : (
                            <span className="text-[#ababab] italic text-sm">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end">
                            <button
                              id={`action-btn-${po._id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(po._id);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] rounded-md text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                              Actions
                            </button>

                            {openDropdown === po._id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setOpenDropdown(null)}
                                />
                                <div
                                  className="fixed z-50 min-w-[200px] w-max bg-[#232323] border border-[#383838] rounded-lg shadow-2xl overflow-visible animate-fadeIn"
                                  style={{
                                    top: `${
                                      document
                                        .getElementById(`action-btn-${po._id}`)
                                        ?.getBoundingClientRect().top - 10
                                    }px`,
                                    right: `${
                                      window.innerWidth -
                                      document
                                        .getElementById(`action-btn-${po._id}`)
                                        ?.getBoundingClientRect().right
                                    }px`,
                                    transform: "translateY(-100%)",
                                  }}
                                >
                                  <div className="py-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDetailsModal(po);
                                      }}
                                      className="w-full text-left px-5 py-3 text-sm text-[#f5f5f5] hover:bg-[#383838] transition-colors duration-150 flex items-center gap-3 group whitespace-nowrap"
                                    >
                                      <span className="text-lg group-hover:scale-110 transition-transform">
                                        📋
                                      </span>
                                      <span className="font-medium">
                                        View Details
                                      </span>
                                    </button>
                                    {(po.status === "Approved" ||
                                      po.status === "Pending") && (
                                      <>
                                        <div className="mx-4 my-1 border-t border-[#383838]" />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openReceiveModal(po);
                                          }}
                                          className="w-full text-left px-5 py-3 text-sm text-[#f5f5f5] hover:bg-[#383838] transition-colors duration-150 flex items-center gap-3 group whitespace-nowrap"
                                        >
                                          <span className="text-lg group-hover:scale-110 transition-transform">
                                            📦
                                          </span>
                                          <span className="font-medium">
                                            Receive Order
                                          </span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Purchase Order Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-[#232323] w-full max-w-4xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#f5f5f5]">
                  Create Purchase Order
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[#b5b5b5] hover:text-white"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* PO Number Display */}
                <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                  <label className="block text-sm font-medium text-[#cccccc] mb-2">
                    PO Number (Auto-generated)
                  </label>
                  <div className="text-lg font-mono text-[#f6b100] font-bold">
                    {nextPONumber}
                  </div>
                </div>

                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium text-[#cccccc] mb-2">
                    Supplier <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.company_name} - {supplier.contact_person}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Type */}
                <div>
                  <label className="block text-sm font-medium text-[#cccccc] mb-2">
                    Item Type
                  </label>
                  <div className="px-3 py-2 bg-[#181818] border border-[#383838] rounded-md text-[#f5f5f5]">
                    Raw Materials
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-[#cccccc]">
                      Items <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!formData.supplier || getFilteredRawMaterials().length === 0}
                      className="bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Item
                    </button>
                  </div>
                  
                  {formData.supplier && getFilteredRawMaterials().length === 0 && (
                    <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-md">
                      <p className="text-sm text-yellow-400">
                        ⚠️ No raw materials available for the selected supplier. Please select a different supplier or add raw materials for this supplier first.
                      </p>
                    </div>
                  )}

                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-[#181818] p-4 rounded-lg border border-[#383838] mb-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-[#cccccc] text-sm mb-1">
                            Raw Material <span className="text-red-400">*</span>
                          </label>
                          <select
                            value={item.raw_material}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "raw_material",
                                e.target.value
                              )
                            }
                            required
                            disabled={!formData.supplier}
                            className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#232323] text-[#f5f5f5] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {!formData.supplier
                                ? "Select Supplier First"
                                : getFilteredRawMaterials().length === 0
                                ? "No materials available for this supplier"
                                : "Select Material"}
                            </option>
                            {getFilteredRawMaterials().map((material) => (
                              <option key={material._id} value={material._id}>
                                {material.name} ({material.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#cccccc] text-sm mb-1">
                            Unit
                          </label>
                          <select
                            value={item.unit_conversion}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unit_conversion",
                                e.target.value
                              )
                            }
                            disabled={!item.raw_material}
                            className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#232323] text-[#f5f5f5] disabled:opacity-50"
                          >
                            <option value="">Select Unit</option>
                            {/* Show base unit if no conversions available */}
                            {item.raw_material &&
                              (!unitConversions[item.raw_material] ||
                                unitConversions[item.raw_material]?.length ===
                                  0) && (
                                <option value="base_unit">
                                  {
                                    rawMaterials.find(
                                      (m) => m._id === item.raw_material
                                    )?.unit
                                  }{" "}
                                  (Base Unit)
                                </option>
                              )}
                            {unitConversions[item.raw_material]?.map(
                              (conversion) => (
                                <option
                                  key={conversion._id}
                                  value={conversion._id}
                                >
                                  {conversion.equivalent_unit} - ₱
                                  {conversion.unit_price}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#cccccc] text-sm mb-1">
                            Quantity <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value === ""
                                  ? ""
                                  : parseFloat(e.target.value)
                              )
                            }
                            required
                            className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#232323] text-[#f5f5f5]"
                          />
                        </div>

                        <div>
                          <label className="block text-[#cccccc] text-sm mb-1">
                            Unit Price <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unit_price",
                                e.target.value === ""
                                  ? ""
                                  : parseFloat(e.target.value)
                              )
                            }
                            required
                            className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#232323] text-[#f5f5f5]"
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="flex-1">
                            <label className="block text-[#cccccc] text-sm mb-1">
                              Total Price
                            </label>
                            <div className="px-3 py-2 bg-[#232323] border border-[#383838] rounded-md text-[#f6b100] font-bold">
                              ₱{(item.total_price || 0).toFixed(2)}
                            </div>
                          </div>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="ml-2 bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-md text-sm font-bold"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Total Amount */}
                  <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#cccccc] font-medium">
                        Total Amount:
                      </span>
                      <span className="text-[#f6b100] font-bold text-lg">
                        ₱{calculateTotalAmount().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-[#cccccc] mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    name="expected_delivery_date"
                    value={formData.expected_delivery_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[#cccccc] mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] placeholder-[#bababa]"
                    placeholder="Additional notes or comments..."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-4 py-2 rounded-md font-bold hover:bg-[#262626]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#f6b100] hover:bg-[#dab000] text-[#232323] px-4 py-2 rounded-md font-bold disabled:opacity-70"
                  >
                    {loading ? "Creating..." : "Create Purchase Order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receive Purchase Order Modal */}
        {showReceiveModal && selectedPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowReceiveModal(false)}
            />
            <div className="relative bg-[#232323] w-full max-w-4xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#f5f5f5]">
                  Receive Purchase Order - {selectedPO.po_number}
                </h2>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="text-[#b5b5b5] hover:text-white"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleReceiveSubmit} className="space-y-6">
                {/* Supplier Info */}
                <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                  <div className="text-sm text-[#cccccc] mb-1">Supplier</div>
                  <div className="text-lg text-[#f5f5f5] font-medium">
                    {selectedPO.supplier?.company_name}
                  </div>
                </div>

                {/* Items to Receive */}
                <div>
                  <label className="block text-sm font-medium text-[#cccccc] mb-4">
                    Items to Receive <span className="text-red-400">*</span>
                  </label>

                  <div className="space-y-3">
                    {selectedPO.items.map((item, index) => (
                      <div
                        key={index}
                        className="bg-[#181818] p-4 rounded-lg border border-[#383838]"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <label className="block text-[#cccccc] text-xs mb-1">
                              Material
                            </label>
                            <div className="text-[#f5f5f5] font-medium">
                              {item.raw_material?.name}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[#cccccc] text-xs mb-1">
                              Unit
                            </label>
                            <div className="text-[#f5f5f5]">{item.unit}</div>
                          </div>

                          <div>
                            <label className="block text-[#cccccc] text-xs mb-1">
                              Unit Price
                            </label>
                            <div className="text-[#f6b100] font-bold">
                              ₱{item.unit_price.toFixed(2)}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[#cccccc] text-xs mb-1">
                              Ordered Qty
                            </label>
                            <div className="text-[#f5f5f5] font-medium">
                              {item.quantity}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[#cccccc] text-xs mb-1">
                              Received Qty{" "}
                              <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                receiveFormData.items[index]
                                  ?.received_quantity || ""
                              }
                              onChange={(e) =>
                                handleReceiveItemChange(
                                  index,
                                  e.target.value === ""
                                    ? ""
                                    : parseFloat(e.target.value)
                                )
                              }
                              required
                              className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#232323] text-[#f5f5f5]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Received */}
                <div>
                  <label className="block text-sm font-medium text-[#cccccc] mb-2">
                    Date Received <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={receiveFormData.date_received}
                    onChange={handleReceiveDateChange}
                    required
                    className="w-full px-3 py-2 border border-[#383838] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f6b100] bg-[#181818] text-[#f5f5f5] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReceiveModal(false)}
                    className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-4 py-2 rounded-md font-bold hover:bg-[#262626]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold disabled:opacity-70"
                  >
                    {loading ? "Receiving..." : "Confirm Receipt"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showDetailsModal && selectedPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowDetailsModal(false)}
            />
            <div className="relative bg-[#232323] w-full max-w-4xl mx-4 my-8 rounded-lg border border-[#383838] shadow p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#f5f5f5]">
                  Purchase Order Details - {selectedPO.po_number}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-[#b5b5b5] hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                    <div className="text-sm text-[#cccccc] mb-1">Supplier</div>
                    <div className="text-lg text-[#f5f5f5] font-medium">
                      {selectedPO.supplier?.company_name}
                    </div>
                  </div>

                  <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                    <div className="text-sm text-[#cccccc] mb-1">Status</div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-white text-sm ${getStatusColor(
                        selectedPO.status
                      )}`}
                    >
                      {selectedPO.status}
                    </span>
                  </div>

                  <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                    <div className="text-sm text-[#cccccc] mb-1">
                      Order Date
                    </div>
                    <div className="text-[#f5f5f5]">
                      {formatDate(selectedPO.order_date)}
                    </div>
                  </div>

                  <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                    <div className="text-sm text-[#cccccc] mb-1">
                      Expected Delivery
                    </div>
                    <div className="text-[#f5f5f5]">
                      {selectedPO.expected_delivery_date
                        ? formatDate(selectedPO.expected_delivery_date)
                        : "Not specified"}
                    </div>
                  </div>

                  {selectedPO.date_received && (
                    <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                      <div className="text-sm text-[#cccccc] mb-1">
                        Date Received
                      </div>
                      <div className="text-[#f6b100] font-medium">
                        {formatDate(selectedPO.date_received)}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                    <div className="text-sm text-[#cccccc] mb-1">
                      Total Amount
                    </div>
                    <div className="text-[#f6b100] font-bold text-lg">
                      ₱{getDisplayedTotalAmount(selectedPO).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="text-lg font-bold text-[#f5f5f5] mb-4">
                    Order Items
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#383838]">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase">
                            Material
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[#cccccc] uppercase">
                            Unit
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Ordered Qty
                          </th>
                          {selectedPO.status === "Delivered" && (
                            <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                              Received Qty
                            </th>
                          )}
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Unit Price
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-[#cccccc] uppercase">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#383838]">
                        {selectedPO.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-[#f5f5f5]">
                              {item.raw_material?.name}
                            </td>
                            <td className="px-4 py-2 text-[#f5f5f5]">
                              {item.unit}
                            </td>
                            <td className="px-4 py-2 text-[#f5f5f5] text-right">
                              {item.quantity}
                            </td>
                            {selectedPO.status === "Delivered" && (
                              <td className="px-4 py-2 text-[#f6b100] font-medium text-right">
                                {item.received_quantity || 0}
                              </td>
                            )}
                            <td className="px-4 py-2 text-[#f5f5f5] text-right">
                              ₱{item.unit_price.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-[#f6b100] font-bold text-right">
                              ₱{getItemDisplayedTotal(selectedPO, item).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {selectedPO.notes && (
                  <div className="bg-[#181818] p-4 rounded-lg border border-[#383838]">
                    <div className="text-sm text-[#cccccc] mb-2">Notes</div>
                    <div className="text-[#f5f5f5]">{selectedPO.notes}</div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(false)}
                    className="flex items-center gap-2 bg-[#181818] text-[#b5b5b5] border border-[#383838] px-4 py-2 rounded-md font-bold hover:bg-[#262626]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPurchaseOrders;
