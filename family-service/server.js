const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const { sequelize, testConnection } = require("./config/database");
const familyRoutes = require("./routes/familyRoutes");
require("./models");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_, res) => {
  res.json({
    status: "healthy",
    service: "family-service",
  });
});

// Test database connection
testConnection();

sequelize
  .sync({ alter: false })
  .then(() => {
    console.log("Database synced");
  })
  .catch((err) => {
    console.error("Sync error:", err);
  });

// Routes
app.use("/families", familyRoutes);

// Start server
const HOST = process.env.HOST; // e.g. 127.0.0.1 in production
const onListen = () => console.log(`Family Service running on ${HOST || "all interfaces"}:${PORT}`);
if (HOST) app.listen(PORT, HOST, onListen);
else app.listen(PORT, onListen);
