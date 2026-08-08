const { Server } = require("socket.io");
const Redis = require("ioredis");
const jwt = require("jsonwebtoken");
const { setIo } = require("./ioStore");

// Redis client for Pub/Sub
const redis = new Redis({ host: "localhost", port: 6379 });
const redisSub = new Redis({ host: "localhost", port: 6379 });

// Store active connections
const activeUsers = new Map();
const familyRooms = new Map();

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Store globally so controllers can emit events directly
  setIo(io);

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected - ${socket.id}`);

    // Store user connection
    activeUsers.set(socket.userId, socket.id);

    // Join family room
    socket.on("join-family", (familyId) => {
      socket.join(`family:${familyId}`);
      console.log(`User ${socket.userId} joined family ${familyId}`);

      // Track family membership
      if (!familyRooms.has(familyId)) {
        familyRooms.set(familyId, new Set());
      }
      familyRooms.get(familyId).add(socket.userId);

      // Notify others in family
      socket.to(`family:${familyId}`).emit("user-online", {
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Leave family room
    socket.on("leave-family", (familyId) => {
      socket.leave(`family:${familyId}`);
      console.log(`User ${socket.userId} left family ${familyId}`);

      if (familyRooms.has(familyId)) {
        familyRooms.get(familyId).delete(socket.userId);
      }
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected`);
      activeUsers.delete(socket.userId);

      // Remove from family rooms
      familyRooms.forEach((users, familyId) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          io.to(`family:${familyId}`).emit("user-offline", {
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
  });

  // Redis Pub/Sub for cross-service communication
  redisSub.subscribe(
    "medication:reminders",
    "medication:taken",
    "family:updates",
  );

  redisSub.on("message", (channel, message) => {
    const data = JSON.parse(message);
    console.log(`Redis message on ${channel}:`, data);

    switch (channel) {
      case "medication:reminders":
        // Broadcast reminder to family room
        io.to(`family:${data.familyId}`).emit("medication-reminder", data);
        break;

      case "medication:taken":
        // Broadcast taken confirmation to family room
        io.to(`family:${data.familyId}`).emit("medication-taken", data);
        break;

      case "family:updates":
        // Broadcast general family updates
        io.to(`family:${data.familyId}`).emit("family-update", data);
        break;
    }
  });

  return io;
};

// Helper to emit to specific user
const emitToUser = (userId, event, data) => {
  const socketId = activeUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

// Helper to emit to family
const emitToFamily = (familyId, event, data) => {
  io.to(`family:${familyId}`).emit(event, data);
};

module.exports = {
  setupSocket,
  emitToUser,
  emitToFamily,
};
