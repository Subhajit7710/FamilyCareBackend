const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const http = require("http");

const app = express();
const PORT = 3000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Status / Health Checks ──────────────────────────────────────────
app.get("/", (req, res) => res.json({ message: "FamilyCare API Gateway", status: "running" }));
app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));
app.get("/gateway/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));

app.get("/gateway/status", async (req, res) => {
  const axios = require("axios");
  const status = { auth: "unknown", family: "unknown", health: "unknown" };
  try { await axios.get("http://localhost:3001/health"); status.auth = "healthy"; } catch { status.auth = "unhealthy"; }
  try { await axios.get("http://localhost:3002/health"); status.family = "healthy"; } catch { status.family = "unhealthy"; }
  try { await axios.get("http://localhost:3003/health"); status.health = "healthy"; } catch { status.health = "unhealthy"; }
  res.json({ success: true, status });
});

// ── Socket.io proxy (HTTP polling + WebSocket upgrade) ──────────────
const socketProxy = createProxyMiddleware({
  target: "http://localhost:3003",
  ws: true,
  changeOrigin: true,
  logLevel: "silent",
});

// Handle HTTP polling requests for socket.io
app.use("/socket.io", socketProxy);

// ── Auth Service ─────────────────────────────────────────────────────
app.use("/auth", createProxyMiddleware({
  target: "http://localhost:3001",
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[AUTH] → http://localhost:3001${req.originalUrl}`);
      if (req.headers.authorization) proxyReq.setHeader("Authorization", req.headers.authorization);
    },
  },
}));

// ── Family Service ───────────────────────────────────────────────────
app.use("/families", createProxyMiddleware({
  target: "http://localhost:3002",
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[FAMILY] → http://localhost:3002${req.originalUrl}`);
      if (req.headers.authorization) proxyReq.setHeader("Authorization", req.headers.authorization);
    },
    error: (err, req, res) => {
      console.error("[FAMILY ERROR]", err.message);
      res.status(503).json({ error: "Family service unavailable" });
    },
  },
}));

// ── Health Service ───────────────────────────────────────────────────
app.use("/health", createProxyMiddleware({
  target: "http://localhost:3003",
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[HEALTH] → http://localhost:3003${req.originalUrl}`);
      if (req.headers.authorization) proxyReq.setHeader("Authorization", req.headers.authorization);
    },
    error: (err, req, res) => {
      console.error("[HEALTH ERROR]", err.message);
      res.status(503).json({ error: "Health service unavailable" });
    },
  },
}));

// ── Start server with WebSocket upgrade support ──────────────────────
const server = http.createServer(app);
server.on("upgrade", socketProxy.upgrade);

server.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
});
