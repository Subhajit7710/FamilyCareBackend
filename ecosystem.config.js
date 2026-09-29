// pm2 process file for production.
//   pm2 start ecosystem.config.js     (first time)
//   pm2 reload ecosystem.config.js    (after an update)
// Each service still reads its own .env file for secrets and DB settings.
const common = {
  script: "server.js",
  instances: 1,
  autorestart: true,
  max_memory_restart: "400M",
  env: {
    NODE_ENV: "production",
    HOST: "127.0.0.1", // only nginx talks to the services
    TZ: "Asia/Kolkata", // medication reminders use server local time
  },
};

module.exports = {
  apps: [
    { ...common, name: "auth-service", cwd: "./auth-service" },
    { ...common, name: "family-service", cwd: "./family-service" },
    { ...common, name: "health-service", cwd: "./health-service" },
    { ...common, name: "api-gateway", cwd: "./api-gateway" },
  ],
};
