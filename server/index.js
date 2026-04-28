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

const runRoute = require("./routes/run");
app.use("/api/run", runRoute);

// Socket.io handler
require("./socket/socketHandler")(io);

const PORT = process.env.PORT || 3001;

async function start() {
  // Initialize PostgreSQL schema if a database is configured
  try {
    const initSchema = require("./db/init");
    await initSchema();
  } catch (err) {
    console.error("Schema init failed:", err.message);
  }

  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
