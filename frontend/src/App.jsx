import { Routers } from "./Routers/Routers";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "./contexts/CartContext";

const App = () => {
  return (
    <CartProvider>
      <div>
        <Routers />
        <Toaster position="top-right" />
      </div>
    </CartProvider>
  );
};

export default App;
