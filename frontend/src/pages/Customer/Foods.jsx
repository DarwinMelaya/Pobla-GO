import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  Utensils,
  Filter,
  AlertTriangle,
  CheckCircle,
  Flame,
} from "lucide-react";
import CustomerLayout from "../../components/Layout/CustomerLayout";

const resolveApiBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  return "http://localhost:5000";
};

const API_BASE_URL = resolveApiBaseUrl();

const stockStyles = {
  in_stock: {
    label: "In Stock",
    text: "text-green-400",
    bg: "bg-green-400/10 border border-green-400/30",
    icon: CheckCircle,
  },
  low_stock: {
    label: "Low Stock",
    text: "text-yellow-300",
    bg: "bg-yellow-400/10 border border-yellow-400/30",
    icon: Flame,
  },
  out_of_stock: {
    label: "Out of Stock",
    text: "text-red-400",
    bg: "bg-red-400/10 border border-red-400/30",
    icon: AlertTriangle,
  },
};

const Foods = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }),
    []
  );

  const stats = useMemo(() => {
    const available = menuItems.filter((item) => item.is_available).length;
    const lowStock = menuItems.filter(
      (item) => item.stock_status === "low_stock"
    ).length;
    const outOfStock = menuItems.filter(
      (item) => item.stock_status === "out_of_stock"
    ).length;

    return {
      total: menuItems.length,
      available,
      lowStock,
      outOfStock,
    };
  }, [menuItems]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/menu/categories/list`);
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (catErr) {
        console.error("Failed to fetch categories:", catErr);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        if (selectedCategory !== "all") {
          params.set("category", selectedCategory);
        }

        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }

        params.set("available_only", availableOnly ? "true" : "false");

        const response = await fetch(
          `${API_BASE_URL}/menu?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load menu.");
        }

        if (isMounted) {
          setMenuItems(data.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch menu:", err);
        if (isMounted) {
          setError(
            err.message || "Something went wrong while loading the menu."
          );
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(delay);
    };
  }, [selectedCategory, searchTerm, availableOnly, fetchNonce]);

  const handleRefresh = () => {
    setFetchNonce((prev) => prev + 1);
  };

  const renderMenuCard = (item) => {
    const stock = stockStyles[item.stock_status] || stockStyles.in_stock;
    const StatusIcon = stock.icon;

    return (
      <div
        key={item._id}
        className="bg-[#232323] border border-[#383838] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
      >
        <div className="relative h-48 w-full overflow-hidden">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[#2f2f2f] flex flex-col items-center justify-center text-[#ababab] gap-2">
              <Utensils className="w-8 h-8 text-[#383838]" />
              <span>No image available</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f1f1f] via-transparent to-transparent pointer-events-none" />

          <div className="absolute top-4 left-4 bg-[#1f1f1f]/70 backdrop-blur-md rounded-full px-4 py-1 text-sm font-medium text-white uppercase tracking-wide">
            {item.category}
          </div>

          <div className="absolute top-4 right-4 text-white text-lg font-semibold bg-[#C05050]/80 rounded-full px-4 py-1">
            {currencyFormatter.format(item.price || 0)}
          </div>
        </div>

        <div className="flex-1 p-5 flex flex-col gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">
              {item.name}
            </h3>
            <p className="text-sm text-[#ababab] min-h-[2.5rem]">
              {item.description || "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-[#1f1f1f] border border-[#2f2f2f] text-[#f6b100]">
              Servings left: {item.servings}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#1f1f1f] border border-[#2f2f2f] text-[#ababab]">
              Critical level: {item.critical_level || "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between mt-auto pt-4">
            <div className={`flex items-center gap-2 text-sm ${stock.text}`}>
              <StatusIcon className="w-4 h-4" />
              <span>{stock.label}</span>
            </div>

            <button
              disabled={!item.is_available}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                item.is_available
                  ? "bg-[#C05050] text-white hover:bg-[#a63e3e]"
                  : "bg-[#2f2f2f] text-[#6b6b6b] cursor-not-allowed"
              }`}
            >
              {item.is_available ? "Add to cart" : "Unavailable"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <CustomerLayout>
      <div className="bg-[#1f1f1f] min-h-screen px-4 py-8 md:px-8 text-white">
        <div className="max-w-6xl mx-auto space-y-8">
          <section className="relative overflow-hidden rounded-3xl border border-[#383838] bg-gradient-to-br from-[#232323] via-[#1f1f1f] to-[#2b2b2b] p-8">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(192,80,80,0.4),_transparent_60%)]" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-[#ababab] mb-3">
                  PoblaGO Menu
                </p>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  Discover dishes crafted fresh daily
                </h1>
                <p className="text-[#ababab] mt-4 max-w-2xl">
                  Explore curated meals inspired by your favorites. Filter by
                  cravings, check availability in real-time, and experience a
                  Foodpanda-like browsing flow with PoblaGO&apos;s bold dark
                  palette.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-2xl bg-[#232323] border border-[#2f2f2f] px-4 py-3">
                  <p className="text-3xl font-bold text-[#f6b100]">
                    {stats.total}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-[#ababab]">
                    Dishes
                  </p>
                </div>
                <div className="rounded-2xl bg-[#232323] border border-[#2f2f2f] px-4 py-3">
                  <p className="text-3xl font-bold text-[#51d68b]">
                    {stats.available}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-[#ababab]">
                    Available now
                  </p>
                </div>
                <div className="rounded-2xl bg-[#232323] border border-[#2f2f2f] px-4 py-3">
                  <p className="text-3xl font-bold text-[#ffbd4f]">
                    {stats.lowStock}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-[#ababab]">
                    Low stock
                  </p>
                </div>
                <div className="rounded-2xl bg-[#232323] border border-[#2f2f2f] px-4 py-3">
                  <p className="text-3xl font-bold text-[#f87171]">
                    {stats.outOfStock}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-[#ababab]">
                    Out of stock
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ababab] w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search dishes, flavors, or cravings..."
                  className="w-full bg-[#232323] border border-[#383838] rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setAvailableOnly((prev) => !prev)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition ${
                    availableOnly
                      ? "bg-[#C05050] border-[#C05050]"
                      : "bg-[#232323] border-[#383838]"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {availableOnly ? "Available only" : "All menu items"}
                  </span>
                </button>

                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#383838] bg-[#232323] hover:bg-[#2f2f2f] transition"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span className="text-sm font-semibold">Refresh</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {["all", ...categories].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2 rounded-full border transition whitespace-nowrap ${
                    selectedCategory === category
                      ? "bg-[#C05050] border-[#C05050] text-white"
                      : "bg-[#232323] border-[#383838] text-[#ababab] hover:text-white"
                  }`}
                >
                  {category === "all"
                    ? "All categories"
                    : category.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </section>

          <section>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse bg-[#232323] border border-[#2f2f2f] rounded-2xl h-80"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-10 text-center gap-4">
                <AlertTriangle className="w-10 h-10 text-[#f87171]" />
                <p className="text-lg font-semibold text-white">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-3 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition"
                >
                  Try again
                </button>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-10 text-center gap-3">
                <Utensils className="w-10 h-10 text-[#383838]" />
                <p className="text-lg font-semibold text-white">
                  No dishes match your filters.
                </p>
                <p className="text-sm text-[#ababab]">
                  Adjust your search or filter selections to see more items.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {menuItems.map((item) => renderMenuCard(item))}
              </div>
            )}
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default Foods;
