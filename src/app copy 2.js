const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");

// Import routes
const userRoutes = require("./routes/userRoutes");
const clockRoutes = require("./routes/clockRoutes");
const storeRoutes = require("./routes/storeRoutes");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/users", userRoutes); // For user-related routes
app.use("/api/clock", clockRoutes); // For clock-in/clock-out routes
app.use("/api/stores", storeRoutes); // For store-related routes
app.use("/api/payroll", userRoutes); 





// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
