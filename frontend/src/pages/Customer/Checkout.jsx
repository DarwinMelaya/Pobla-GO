import { useMemo, useState, useEffect } from "react";
import {
  MapPin,
  CreditCard,
  Wallet,
  ArrowLeft,
  CheckCircle,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import CustomerLayout from "../../components/Layout/CustomerLayout";
import { useCart } from "../../contexts/CartContext";
import { useNavigate, useLocation } from "react-router-dom";

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

  const [deliveryAddress, setDeliveryAddress] = useState(userAddress);
  const [paymentMethod, setPaymentMethod] = useState("gcash"); // "gcash" or "cash"

  // Update delivery address when user data is available
  useEffect(() => {
    if (userAddress && !deliveryAddress) {
      setDeliveryAddress(userAddress);
    }
  }, [userAddress, deliveryAddress]);

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

  const handlePlaceOrder = () => {
    // Validation
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter your delivery address");
      return;
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
                  <div>
                    <label className="block text-sm text-[#ababab] mb-2">
                      Your Address
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter your complete delivery address..."
                      className="w-full bg-[#1f1f1f] border border-[#383838] rounded-xl p-4 text-white placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 min-h-[120px] resize-none"
                      rows={4}
                    />
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
