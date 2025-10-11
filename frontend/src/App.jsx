import { Routers } from "./Routers/Routers";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <div>
      <Routers />
      <Toaster position="top-right" />
    </div>
  );
};

export default App;
