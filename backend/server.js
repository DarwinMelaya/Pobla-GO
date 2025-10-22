const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
require("dotenv").config();

// Import passport configuration
require("./config/passport")(passport);

const app = express();

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  session({
    secret: "yourSecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/inventory", require("./routes/inventory"));
app.use("/menu", require("./routes/menu"));
app.use("/units", require("./routes/units"));
app.use("/categories", require("./routes/categories"));
app.use("/orders", require("./routes/orders"));
app.use("/reservations", require("./routes/reservations"));
app.use("/suppliers", require("./routes/suppliers"));
app.use("/raw-materials", require("./routes/rawMaterials"));
app.use("/unit-conversions", require("./routes/unitConversions"));
app.use("/menu-maintenance", require("./routes/menuMaintenance"));
app.use("/menu-recipes", require("./routes/menuRecipes"));
app.use("/menu-expenses", require("./routes/menuExpenses"));
app.use("/expenses", require("./routes/expenses"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
