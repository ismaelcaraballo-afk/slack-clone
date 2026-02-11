const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const channelRoutes = require("./routes/channels");
const messageRoutes = require("./routes/messages");
const chatHandler = require("./sockets/chatHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket"],
});

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Socket.io
chatHandler(io);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
