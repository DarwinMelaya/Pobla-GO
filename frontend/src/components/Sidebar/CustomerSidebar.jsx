import { Utensils, Search, ShoppingCart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";

const CustomerSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartItemCount } = useCart();
  const cartItemCount = getCartItemCount();

  const navItems = [
    { icon: Utensils, label: "Foods", path: "/foods" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: ShoppingCart, label: "Carts", path: "/carts" },
    { icon: User, label: "Account", path: "/accounts" },
  ].map((item) => ({
    ...item,
    isActive:
      location.pathname === item.path ||
      (item.path !== "/" && location.pathname.startsWith(item.path)),
  }));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#383838] bg-[#1f1f1f]">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
              item.isActive
                ? "bg-[#232323] text-[#f5f5f5]"
                : "text-[#ababab] hover:bg-[#232323] hover:text-[#f5f5f5]"
            }`}
          >
            <div className="relative">
              <item.icon
                size={20}
                className={`transition-colors ${
                  item.isActive
                    ? "text-[#C05050]"
                    : "text-[#ababab] group-hover:text-[#f5f5f5]"
                }`}
              />
              {item.path === "/carts" && cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#C05050] text-white text-[10px] font-bold flex items-center justify-center">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </div>
            <span>{item.label}</span>
            {item.isActive && (
              <span className="absolute inset-x-5 -top-2 h-1 rounded-full bg-[#C05050]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CustomerSidebar;
