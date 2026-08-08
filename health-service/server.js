const serverAdapter = require("./queues/bullBoard");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const Redis = require("ioredis");
const { sequelize, testConnection } = require("./config/database");
const healthRoutes = require("./routes/healthRoutes");
const { setupSocket } = require("./socket");
const { initializeReminders } = require("./queues/medicationQueue");
require("./models");

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3003;

// Redis client
const redis = new Redis({ host: "localhost", port: 6379 });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/admin/queues", serverAdapter.getRouter());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (_, res) => {
  res.json({
    status: "healthy",
    service: "health-service",
    websocket: "active",
    bullmq: "running",
    timestamp: new Date().toISOString(),
  });
});

// Test connections
testConnection();

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err));

// Sync database
sequelize
  .sync({ alter: false })
  .then(() => {
    console.log("Database synced");
    // Initialize medication reminders
    initializeReminders();
  })
  .catch((err) => console.error("Sync error:", err));

// Setup WebSocket
const io = setupSocket(server);
console.log("WebSocket server ready");

// Routes (these require authentication)
app.use("/health", healthRoutes);

server.listen(PORT, () => {
  console.log(`Health Service running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
});
