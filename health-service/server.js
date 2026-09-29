require("dotenv").config();
const serverAdapter = require("./queues/bullBoard");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { sequelize, testConnection } = require("./config/database");
const healthRoutes = require("./routes/healthRoutes");
const { setupSocket } = require("./socket");
const { initializeReminders } = require("./queues/medicationQueue");
const { createRedis } = require("./config/redis");
require("./models");

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST; // e.g. 127.0.0.1 in production

// Redis client
const redis = createRedis();

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

const onListen = () => {
  console.log(`Health Service running on ${HOST || "all interfaces"}:${PORT}`);
  console.log(`WebSocket available on port ${PORT}`);
};
if (HOST) server.listen(PORT, HOST, onListen);
else server.listen(PORT, onListen);
