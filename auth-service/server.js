const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const { sequelize, testConnection } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
require("./models");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Then other middleware
app.use(helmet());
app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log(`[AUTH] ${req.method} ${req.path}`);
  next();
});

// Public health check (NO AUTH)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "auth-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/", authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Test database connection
testConnection();

// Sync database
sequelize
  .sync({ alter: false })
  .then(() => console.log("Database synced"))
  .catch((err) => console.error("Sync error:", err));

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
