require("dotenv").config();
const Redis = require("ioredis");

// Set REDIS_URL in .env (e.g. redis://127.0.0.1:6379 or redis://:password@host:6379)
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// maxRetriesPerRequest: null is required by BullMQ
const createRedis = (options = {}) =>
  new Redis(REDIS_URL, { maxRetriesPerRequest: null, ...options });

module.exports = { createRedis, REDIS_URL };
