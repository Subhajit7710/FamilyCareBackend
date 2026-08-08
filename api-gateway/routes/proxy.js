const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const router = express.Router();

// Auth Service Proxy
router.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/auth": "/auth" },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[AUTH] ${req.method} ${req.url}`);
      // Forward the authorization header
      if (req.token) {
        proxyReq.setHeader("Authorization", `Bearer ${req.token}`);
      }
    },
    onError: (err, req, res) => {
      console.error("Auth Service Error:", err);
      res
        .status(503)
        .json({ success: false, error: "Auth service unavailable" });
    },
  }),
);

// Family Service Proxy
router.use(
  "/families",
  createProxyMiddleware({
    target: process.env.FAMILY_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[FAMILY] ${req.method} ${req.url}`);
      if (req.token) {
        proxyReq.setHeader("Authorization", `Bearer ${req.token}`);
      }
    },
    onError: (err, req, res) => {
      console.error("Family Service Error:", err);
      res
        .status(503)
        .json({ success: false, error: "Family service unavailable" });
    },
  }),
);

// Health Service Proxy
router.use(
  "/health",
  createProxyMiddleware({
    target: process.env.HEALTH_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[HEALTH] ${req.method} ${req.url}`);
      if (req.token) {
        proxyReq.setHeader("Authorization", `Bearer ${req.token}`);
      }
    },
    onError: (err, req, res) => {
      console.error("Health Service Error:", err);
      res
        .status(503)
        .json({ success: false, error: "Health service unavailable" });
    },
  }),
);

// Health check endpoint (proxied)
router.use(
  "/health-check",
  createProxyMiddleware({
    target: process.env.HEALTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/health-check": "/health" },
  }),
);

module.exports = router;
