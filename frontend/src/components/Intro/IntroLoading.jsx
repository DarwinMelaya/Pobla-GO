import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoClear from "/logoClear.png";
import bgPobla from "/bgPobla.jpg";
import "./IntroLoading.css";

const IntroLoading = ({ onComplete, navigateTo }) => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth transition
    const showTimer = setTimeout(() => {
      setShowContent(true);
    }, 100);

    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else if (navigateTo) {
        navigate(navigateTo);
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(showTimer);
    };
  }, [navigate, onComplete, navigateTo]);

  return (
    <div className="intro-loading">
      {/* Background Image */}
      <img
        src={bgPobla}
        alt="Background"
        className="intro-background"
        onLoad={() => console.log("Background image loaded successfully")}
        onError={(e) => {
          console.error("Background image failed to load:", e);
          e.target.src = "/bgPobla.jpg";
        }}
      />

      {/* Overlay */}
      <div className="intro-overlay" />

      {/* Content */}
      <div className={`intro-loading-content ${showContent ? "show" : ""}`}>
        <img src={logoClear} alt="PoblaGO Logo" className="intro-logo" />
        <div className="intro-brand-text">
          <h1 className="intro-title">POBLACION</h1>
          <h2 className="intro-subtitle">PARES ATBP.</h2>
        </div>
      </div>
    </div>
  );
};

export default IntroLoading;
