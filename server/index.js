const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// REST routes
const versionRoutes = require("./routes/versions");
app.use("/api/versions", versionRoutes);

// Socket.io handler (T3, T4, T5)
require("./socket/socketHandler")(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
