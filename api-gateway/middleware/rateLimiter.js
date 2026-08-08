const rateLimit = require("express-rate-limit");

// Convert string to number
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const max = parseInt(process.env.RATE_LIMIT_MAX) || 100;

// Simple in-memory rate limiter
const limiter = rateLimit({
  windowMs: windowMs, // Now it's a number!
  max: max,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: "Too many login attempts, please try again later.",
  },
});

module.exports = { limiter, authLimiter };
