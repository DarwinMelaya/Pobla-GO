import { useMemo, useState } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Utensils,
  ArrowRight,
  Truck,
  Store,
} from "lucide-react";
import toast from "react-hot-toast";
import CustomerLayout from "../../components/Layout/CustomerLayout";
import { useCart } from "../../contexts/CartContext";
import { useNavigate } from "react-router-dom";

const Carts = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
  } = useCart();
  const [orderType, setOrderType] = useState("delivery"); // "delivery" or "pickup"

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
  const deliveryFee = orderType === "delivery" ? 50 : 0; // Delivery fee only for delivery
  const total = subtotal + deliveryFee;

  const handleIncreaseQuantity = (item) => {
    const maxQuantity = item.servings || item.availableServings || 0;
    if (item.quantity >= maxQuantity) {
      toast.error(
        `Only ${maxQuantity} serving${maxQuantity !== 1 ? "s" : ""} available`
      );
      return;
    }
    updateQuantity(item._id, item.quantity + 1);
  };

  const handleDecreaseQuantity = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item._id, item.quantity - 1);
    } else {
      removeFromCart(item._id);
      toast.success("Item removed from cart");
    }
  };

  const handleRemoveItem = (item) => {
    removeFromCart(item._id);
    toast.success(`${item.name} removed from cart`);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    // Navigate to checkout page with orderType
    navigate("/checkout", { state: { orderType } });
  };

  return (
    <CustomerLayout>
      <div className="bg-[#1f1f1f] min-h-screen px-4 py-8 md:px-8 text-white">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <section className="relative overflow-hidden rounded-3xl border border-[#383838] bg-gradient-to-br from-[#232323] via-[#1f1f1f] to-[#2b2b2b] p-6 md:p-8">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(192,80,80,0.4),_transparent_60%)]" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-[#ababab] mb-2">
                  Your Cart
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {getCartItemCount() > 0
                    ? `${getCartItemCount()} item${
                        getCartItemCount() !== 1 ? "s" : ""
                      } in your cart`
                    : "Your cart is empty"}
                </h1>
              </div>
              <ShoppingCart className="w-12 h-12 text-[#C05050] opacity-50" />
            </div>
          </section>

          {cartItems.length === 0 ? (
            /* Empty Cart State */
            <section className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-12 text-center gap-4">
              <div className="w-24 h-24 rounded-full bg-[#2f2f2f] flex items-center justify-center mb-4">
                <ShoppingCart className="w-12 h-12 text-[#383838]" />
              </div>
              <h2 className="text-2xl font-semibold text-white">
                Your cart is empty
              </h2>
              <p className="text-[#ababab] max-w-md">
                Looks like you haven't added anything to your cart yet. Start
                adding delicious items from our menu!
              </p>
              <button
                onClick={() => navigate("/foods")}
                className="mt-4 px-6 py-3 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition flex items-center gap-2"
              >
                <Utensils className="w-5 h-5" />
                Browse Menu
              </button>
            </section>
          ) : (
            <>
              {/* Delivery/Pickup Selection */}
              <section className="bg-[#232323] border border-[#383838] rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Choose your order type
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setOrderType("delivery")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === "delivery"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`p-3 rounded-full ${
                          orderType === "delivery"
                            ? "bg-[#C05050]"
                            : "bg-[#2f2f2f]"
                        }`}
                      >
                        <Truck
                          className={`w-6 h-6 ${
                            orderType === "delivery"
                              ? "text-white"
                              : "text-[#ababab]"
                          }`}
                        />
                      </div>
                      <div className="text-center">
                        <p
                          className={`font-semibold ${
                            orderType === "delivery"
                              ? "text-white"
                              : "text-[#ababab]"
                          }`}
                        >
                          Delivery
                        </p>
                        <p className="text-xs text-[#ababab] mt-1">
                          {currencyFormatter.format(50)} delivery fee
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setOrderType("pickup")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === "pickup"
                        ? "border-[#C05050] bg-[#C05050]/10"
                        : "border-[#383838] bg-[#1f1f1f] hover:border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`p-3 rounded-full ${
                          orderType === "pickup"
                            ? "bg-[#C05050]"
                            : "bg-[#2f2f2f]"
                        }`}
                      >
                        <Store
                          className={`w-6 h-6 ${
                            orderType === "pickup"
                              ? "text-white"
                              : "text-[#ababab]"
                          }`}
                        />
                      </div>
                      <div className="text-center">
                        <p
                          className={`font-semibold ${
                            orderType === "pickup"
                              ? "text-white"
                              : "text-[#ababab]"
                          }`}
                        >
                          Pickup
                        </p>
                        <p className="text-xs text-[#ababab] mt-1">
                          No delivery fee
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </section>

              {/* Cart Items */}
              <section className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item._id}
                    className="bg-[#232323] border border-[#383838] rounded-2xl overflow-hidden shadow-lg"
                  >
                    <div className="p-5 md:p-6 flex flex-col md:flex-row gap-4">
                      {/* Item Image */}
                      <div className="relative w-full md:w-32 h-32 md:h-32 rounded-xl overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-[#2f2f2f] flex items-center justify-center">
                            <Utensils className="w-8 h-8 text-[#383838]" />
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg md:text-xl font-semibold text-white mb-1">
                                {item.name}
                              </h3>
                              <p className="text-sm text-[#ababab] line-clamp-2">
                                {item.description || "No description provided."}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="ml-4 p-2 rounded-lg hover:bg-[#2f2f2f] transition text-[#ababab] hover:text-red-400"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-[#1f1f1f] border border-[#2f2f2f] text-xs text-[#f6b100]">
                              {item.category}
                            </span>
                            {item.servings !== undefined && (
                              <span className="px-3 py-1 rounded-full bg-[#1f1f1f] border border-[#2f2f2f] text-xs text-[#ababab]">
                                {item.servings} servings left
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls and Price */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2f2f2f]">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#ababab]">
                              Quantity:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDecreaseQuantity(item)}
                                className="w-8 h-8 rounded-lg bg-[#1f1f1f] border border-[#2f2f2f] flex items-center justify-center hover:bg-[#2f2f2f] transition text-white"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-12 text-center font-semibold text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleIncreaseQuantity(item)}
                                disabled={item.quantity >= (item.servings || 0)}
                                className="w-8 h-8 rounded-lg bg-[#1f1f1f] border border-[#2f2f2f] flex items-center justify-center hover:bg-[#2f2f2f] transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg md:text-xl font-bold text-[#C05050]">
                              {currencyFormatter.format(
                                (item.price || 0) * (item.quantity || 1)
                              )}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-xs text-[#ababab]">
                                {currencyFormatter.format(item.price || 0)} each
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Order Summary */}
              <section className="bg-[#232323] border border-[#383838] rounded-2xl p-6 md:p-8 sticky bottom-4">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Order Summary
                </h2>
                <div className="space-y-3 mb-6">
                  <div className="bg-[#1f1f1f] rounded-xl p-4 border border-[#2f2f2f]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#ababab] text-sm">Subtotal</span>
                      <span className="text-xl font-bold text-white">
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 px-6 py-3 rounded-full border border-[#383838] bg-[#1f1f1f] text-white font-semibold hover:bg-[#2f2f2f] transition"
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={handleCheckout}
                    className="flex-1 px-6 py-3 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition flex items-center justify-center gap-2"
                  >
                    Review payment and address
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default Carts;
