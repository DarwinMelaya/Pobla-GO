import { useState } from "react";
import IntroLoading from "./IntroLoading";
import LandingPage from "../../pages/Landing/LandingPage";

const LandingPageWithIntro = () => {
  const [showLanding, setShowLanding] = useState(false);

  const handleIntroComplete = () => {
    setShowLanding(true);
  };

  if (!showLanding) {
    return <IntroLoading onComplete={handleIntroComplete} />;
  }

  return <LandingPage />;
};

export default LandingPageWithIntro;

