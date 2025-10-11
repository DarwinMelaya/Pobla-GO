// Import images
import logoClear from "/logoClear.png";
import bgPobla from "/bgPobla.jpg";
import { Link } from "react-router-dom";
import { useState } from "react";

const LandingPage = () => {
  const [isLoading, setIsLoading] = useState({
    login: false,
    signup: false,
  });

  const handleButtonClick = (type) => {
    setIsLoading((prev) => ({ ...prev, [type]: true }));

    // Simulate slower loading for better UX
    setTimeout(() => {
      setIsLoading((prev) => ({ ...prev, [type]: false }));
    }, 10000); // Increased to 3 seconds for a slower effect
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <img
        src={bgPobla}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onLoad={() => console.log("Background image loaded successfully")}
        onError={(e) => {
          console.error("Background image failed to load:", e);
          // Try direct path if import fails
          e.target.src = "/bgPobla.jpg";
        }}
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 w-full h-full z-10"
        style={{ backgroundColor: "#000000", opacity: 0.5 }}
      />

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center space-y-12">
        {/* Logo Image */}
        <div className="relative">
          <img
            src={logoClear}
            alt="PoblaGO Logo"
            className="w-80 h-80 object-contain"
          />
        </div>

        {/* Call-to-Action Buttons */}
        <div className="flex space-x-6">
          {/* Login Button */}
          <Link
            to="/login"
            onClick={() => handleButtonClick("login")}
            className={`bg-[#bf595a] hover:bg-[#a04a4b] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 inline-block text-center transform hover:scale-105 hover:shadow-lg ${
              isLoading.login ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isLoading.login ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : (
              "Login"
            )}
          </Link>

          {/* Sign Up Button */}
          <Link
            to="/signup"
            onClick={() => handleButtonClick("signup")}
            className={`bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 inline-block text-center transform hover:scale-105 hover:shadow-lg ${
              isLoading.signup ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isLoading.signup ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : (
              "Sign Up"
            )}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
