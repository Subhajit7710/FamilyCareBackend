require("dotenv").config();

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const http = require("http");

const app = express();

// ── Configuration (from .env, with local-development defaults) ─────
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST; // e.g. 127.0.0.1 in production (behind nginx)
const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const FAMILY_URL = process.env.FAMILY_SERVICE_URL || "http://localhost:3002";
const HEALTH_URL = process.env.HEALTH_SERVICE_URL || "http://localhost:3003";

// Comma-separated list of allowed frontend origins, or "*" for any.
// Example: ALLOWED_ORIGINS=https://familycare.vercel.app,http://localhost:5173
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Running behind nginx in production
app.set("trust proxy", 1);

app.use(cors({
  origin: ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Remove CORS headers set by the internal services so the gateway's
// ALLOWED_ORIGINS setting above is the one the browser sees.
const stripCors = (proxyRes) => {
  for (const h of Object.keys(proxyRes.headers)) {
    if (h.startsWith("access-control-")) delete proxyRes.headers[h];
  }
};

// ── Status / Health Checks ──────────────────────────────────────────
app.get("/", (req, res) => res.json({ message: "FamilyCare API Gateway", status: "running" }));
app.get("/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));
app.get("/gateway/health", (req, res) => res.json({ status: "ok", service: "api-gateway" }));

app.get("/gateway/status", async (req, res) => {
  const axios = require("axios");
  const status = { auth: "unknown", family: "unknown", health: "unknown" };
  try { await axios.get(`${AUTH_URL}/health`); status.auth = "healthy"; } catch { status.auth = "unhealthy"; }
  try { await axios.get(`${FAMILY_URL}/health`); status.family = "healthy"; } catch { status.family = "unhealthy"; }
  try { await axios.get(`${HEALTH_URL}/health`); status.health = "healthy"; } catch { status.health = "unhealthy"; }
  res.json({ success: true, status });
});

// ── Socket.io proxy (HTTP polling + WebSocket upgrade) ──────────────
const socketProxy = createProxyMiddleware({
  target: HEALTH_URL,
  ws: true,
  changeOrigin: true,
  pathFilter: "/socket.io",
  logLevel: "silent",
  on: { proxyRes: stripCors },
});

// Handle HTTP polling requests for socket.io
app.use(socketProxy);

// ── Auth Service ─────────────────────────────────────────────────────
app.use("/auth", createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  on: {
    proxyRes: stripCors,
    proxyReq: (proxyReq, req) => {
      console.log(`[AUTH] → ${AUTH_URL}${req.originalUrl}`);
      if (req.headers.authorization) proxyReq.setHeader("Authorization", req.headers.authorization);
    },
    error: (err, req, res) => {
      console.error("[AUTH ERROR]", err.message);
      res.status(503).json({ error: "Auth service unavailable" });
    },
  },
}));

// ── Family Service ───────────────────────────────────────────────────
app.use("/families", createProxyMiddleware({
  target: FAMILY_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  on: {
    proxyRes: stripCors,
    proxyReq: (proxyReq, req) => {
      console.log(`[FAMILY] → ${FAMILY_URL}${req.originalUrl}`);
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
  target: HEALTH_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  on: {
    proxyRes: stripCors,
    proxyReq: (proxyReq, req) => {
      console.log(`[HEALTH] → ${HEALTH_URL}${req.originalUrl}`);
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

const onListen = () => {
  console.log(`✅ API Gateway running on ${HOST || "all interfaces"}:${PORT}`);
};
if (HOST) server.listen(PORT, HOST, onListen);
else server.listen(PORT, onListen);
