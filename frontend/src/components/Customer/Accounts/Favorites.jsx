import { Heart, Utensils } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:5000";

const Favorites = ({
  favorites,
  currencyFormatter,
  getAuthToken,
  fetchFavorites,
}) => {
  // Handle remove from favorites
  const handleRemoveFavorite = async (menuId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/auth/favorites/${menuId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to remove favorite");
      }

      fetchFavorites();
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove favorite");
    }
  };

  return (
    <div className="space-y-4">
      {favorites.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-3xl border border-[#383838] bg-[#232323] p-12 text-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#2f2f2f] flex items-center justify-center mb-4">
            <Heart className="w-12 h-12 text-[#383838]" />
          </div>
          <h2 className="text-2xl font-semibold text-white">
            No favorites yet
          </h2>
          <p className="text-[#ababab] max-w-md">
            Start adding your favorite items to this list!
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((item) => (
            <div
              key={item._id}
              className="bg-[#232323] border border-[#383838] rounded-2xl overflow-hidden"
            >
              <div className="relative h-48 bg-[#2f2f2f]">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Utensils className="w-12 h-12 text-[#383838]" />
                  </div>
                )}
                <button
                  onClick={() => handleRemoveFavorite(item._id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-[#1f1f1f]/80 backdrop-blur-sm hover:bg-[#2f2f2f] transition"
                >
                  <Heart className="w-5 h-5 text-[#C05050] fill-[#C05050]" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-[#ababab] mb-2 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#C05050]">
                    {currencyFormatter.format(item.price)}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-[#1f1f1f] border border-[#2f2f2f] text-xs text-[#ababab]">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
