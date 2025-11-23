import { useEffect, useMemo, useState } from "react";
import {
  Search as SearchIcon,
  RefreshCcw,
  Utensils,
  Filter,
  AlertTriangle,
  CheckCircle,
  Flame,
  X,
  TrendingUp,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import CustomerLayout from "../../components/Layout/CustomerLayout";
import { useCart } from "../../contexts/CartContext";

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

const Search = () => {
  const { addToCart, cartItems } = useCart();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularItems, setPopularItems] = useState([]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
      }),
    []
  );

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("poblaRecentSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load recent searches:", err);
      }
    }
  }, []);

  // Save recent searches to localStorage
  useEffect(() => {
    if (recentSearches.length > 0) {
      localStorage.setItem(
        "poblaRecentSearches",
        JSON.stringify(recentSearches.slice(0, 10))
      );
    }
  }, [recentSearches]);

  // Fetch categories
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

  // Fetch popular items (items with most servings or recently added)
  useEffect(() => {
    const fetchPopularItems = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/menu?available_only=true&limit=6`
        );
        const data = await response.json();
        if (data.items) {
          // Sort by servings (most available first)
          const sorted = [...data.items].sort(
            (a, b) => (b.servings || 0) - (a.servings || 0)
          );
          setPopularItems(sorted.slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to fetch popular items:", err);
      }
    };

    if (!searchTerm && menuItems.length === 0) {
      fetchPopularItems();
    }
  }, [searchTerm, menuItems.length]);

  // Search functionality with debounce
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (!searchTerm.trim() && selectedCategory === "all" && !availableOnly) {
      setMenuItems([]);
      setLoading(false);
      return;
    }

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
          throw new Error(data.message || "Unable to search menu.");
        }

        if (isMounted) {
          setMenuItems(data.items || []);
          setLoading(false);

          // Add to recent searches if search term exists
          if (searchTerm.trim()) {
            setRecentSearches((prev) => {
              const newSearches = [
                searchTerm.trim(),
                ...prev.filter((s) => s !== searchTerm.trim()),
              ];
              return newSearches.slice(0, 10);
            });
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Search failed:", err);
        if (isMounted) {
          setError(err.message || "Something went wrong while searching.");
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(delay);
    };
  }, [searchTerm, selectedCategory, availableOnly]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    setShowSuggestions(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setMenuItems([]);
    setSelectedCategory("all");
    setAvailableOnly(false);
  };

  const handleAddToCart = (item) => {
    if (!item.is_available) {
      toast.error("This item is currently unavailable");
      return;
    }

    const cartItem = cartItems.find((cartItem) => cartItem._id === item._id);
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    const maxQuantity = item.servings || 0;

    if (currentQuantity >= maxQuantity) {
      toast.error(
        `Only ${maxQuantity} serving${maxQuantity !== 1 ? "s" : ""} available for ${item.name}`
      );
      return;
    }

    addToCart(item);
    toast.success(`${item.name} added to cart!`);
  };

  const renderMenuCard = (item) => {
    const stock = stockStyles[item.stock_status] || stockStyles.in_stock;
    const StatusIcon = stock.icon;
    const cartItem = cartItems.find((ci) => ci._id === item._id);
    const inCart = cartItem ? cartItem.quantity : 0;

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
            <p className="text-sm text-[#ababab] min-h-[2.5rem] line-clamp-2">
              {item.description || "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-[#1f1f1f] border border-[#2f2f2f] text-[#f6b100]">
              Servings: {item.servings || 0}
            </span>
            {inCart > 0 && (
              <span className="px-3 py-1 rounded-full bg-[#C05050]/20 border border-[#C05050]/50 text-[#C05050]">
                In cart: {inCart}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-4">
            <div className={`flex items-center gap-2 text-sm ${stock.text}`}>
              <StatusIcon className="w-4 h-4" />
              <span>{stock.label}</span>
            </div>

            <button
              onClick={() => handleAddToCart(item)}
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

  const hasActiveSearch = searchTerm.trim() || selectedCategory !== "all" || availableOnly;

  return (
    <CustomerLayout>
      <div className="bg-[#1f1f1f] min-h-screen px-4 py-8 md:px-8 text-white">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Search Header */}
          <section className="relative overflow-hidden rounded-3xl border border-[#383838] bg-gradient-to-br from-[#232323] via-[#1f1f1f] to-[#2b2b2b] p-8">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(192,80,80,0.4),_transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <SearchIcon className="w-6 h-6 text-[#C05050]" />
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  Search Menu
                </h1>
              </div>
              <p className="text-[#ababab] mb-6">
                Find your favorite dishes quickly. Search by name, category, or
                description.
              </p>

              {/* Main Search Bar */}
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ababab] w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search for dishes, flavors, or ingredients..."
                  className="w-full bg-[#232323] border border-[#383838] rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#C05050] focus:ring-2 focus:ring-[#C05050]/30 text-lg"
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ababab] hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                {/* Search Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#232323] border border-[#383838] rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                    {recentSearches.length > 0 && (
                      <div className="p-4 border-b border-[#383838]">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-[#ababab]" />
                          <span className="text-xs font-semibold text-[#ababab] uppercase tracking-wide">
                            Recent Searches
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => handleSearch(search)}
                              className="px-3 py-1.5 rounded-full bg-[#1f1f1f] border border-[#383838] text-sm text-[#ababab] hover:bg-[#2f2f2f] hover:text-white transition"
                            >
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {categories.length > 0 && (
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-[#ababab]" />
                          <span className="text-xs font-semibold text-[#ababab] uppercase tracking-wide">
                            Categories
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categories.slice(0, 8).map((category) => (
                            <button
                              key={category}
                              onClick={() => {
                                setSelectedCategory(category);
                                setShowSuggestions(false);
                              }}
                              className="px-3 py-1.5 rounded-full bg-[#1f1f1f] border border-[#383838] text-sm text-[#ababab] hover:bg-[#2f2f2f] hover:text-white transition capitalize"
                            >
                              {category.replace(/-/g, " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Filters */}
          {hasActiveSearch && (
            <section className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setAvailableOnly((prev) => !prev)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition ${
                      availableOnly
                        ? "bg-[#C05050] border-[#C05050] text-white"
                        : "bg-[#232323] border-[#383838] text-[#ababab] hover:text-white"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {availableOnly ? "Available only" : "Show all"}
                    </span>
                  </button>

                  {(searchTerm || selectedCategory !== "all" || availableOnly) && (
                    <button
                      onClick={handleClearSearch}
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#383838] bg-[#232323] hover:bg-[#2f2f2f] transition text-[#ababab] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                      <span className="text-sm font-semibold">Clear filters</span>
                    </button>
                  )}
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
          )}

          {/* Results Section */}
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
                  onClick={() => {
                    setError(null);
                    handleClearSearch();
                  }}
                  className="px-6 py-3 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition"
                >
                  Try again
                </button>
              </div>
            ) : hasActiveSearch ? (
              menuItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-10 text-center gap-3">
                  <SearchIcon className="w-10 h-10 text-[#383838]" />
                  <p className="text-lg font-semibold text-white">
                    No results found
                  </p>
                  <p className="text-sm text-[#ababab]">
                    Try adjusting your search or filter selections.
                  </p>
                  <button
                    onClick={handleClearSearch}
                    className="mt-4 px-6 py-3 rounded-full bg-[#C05050] text-white font-semibold hover:bg-[#a63e3e] transition"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-[#ababab]">
                      Found <span className="text-white font-semibold">{menuItems.length}</span>{" "}
                      {menuItems.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {menuItems.map((item) => renderMenuCard(item))}
                  </div>
                </>
              )
            ) : (
              <div className="space-y-8">
                {/* Popular Items Section */}
                {popularItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <TrendingUp className="w-6 h-6 text-[#C05050]" />
                      <h2 className="text-2xl font-bold text-white">
                        Popular Items
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {popularItems.map((item) => renderMenuCard(item))}
                    </div>
                  </div>
                )}

                {/* Quick Categories */}
                {categories.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">
                      Browse by Category
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {categories.slice(0, 8).map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setSearchTerm("");
                          }}
                          className="p-6 rounded-2xl bg-[#232323] border border-[#383838] hover:border-[#C05050] hover:bg-[#2f2f2f] transition-all text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-[#1f1f1f] group-hover:bg-[#C05050]/10 transition">
                              <Utensils className="w-5 h-5 text-[#ababab] group-hover:text-[#C05050] transition" />
                            </div>
                            <div>
                              <p className="font-semibold text-white capitalize">
                                {category.replace(/-/g, " ")}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {popularItems.length === 0 && categories.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-10 text-center gap-3">
                    <SearchIcon className="w-10 h-10 text-[#383838]" />
                    <p className="text-lg font-semibold text-white">
                      Start searching
                    </p>
                    <p className="text-sm text-[#ababab]">
                      Enter a search term above to find dishes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default Search;
