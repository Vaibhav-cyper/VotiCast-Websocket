import { createServer } from "http";
import { Server } from "socket.io";

// On Render, use 0.0.0.0 to listen publicly
const hostname = "0.0.0.0";
const port = process.env.PORT || 8000;

// Create HTTP server
const httpServer = createServer((req, res) => {
  if (req.url === "/get") {
    // simple wake-up endpoint
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Server is awake");
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Initialize Socket.IO with proper CORS
const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://voticast.netlify.app", // production frontend
      "http://localhost:5173"          // local dev frontend
    ],
    methods: ["GET", "POST"],
    credentials: true, // allows cookies if you use them
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Track connections and votes
let connectionCount = 0;
let votes = { A: 0, B: 0, C: 0 };

// Handle socket connections
io.on("connection", (socket) => {
  connectionCount++;
  console.log(`User connected: ${socket.id} (Total connections: ${connectionCount})`);

  // Send initial vote state
  socket.emit("vote-update", {
    votes,
    total: votes.A + votes.B + votes.C,
  });

  // Handle votes
  socket.on("vote", (option) => {
    if (votes[option] !== undefined) {
      votes[option]++;
      console.log("Updated Votes:", votes);

      // Broadcast updated votes to all clients
      io.emit("vote-update", {
        votes,
        total: votes.A + votes.B + votes.C,
      });
    }
  });

  // Handle disconnects
  socket.on("disconnect", (reason) => {
    connectionCount--;
    console.log(`User disconnected: ${socket.id} (Reason: ${reason}) (Total: ${connectionCount})`);
  });

  // Catch-all for unexpected events
  socket.onAny((eventName, ...args) => {
    if (!["vote", "vote-update", "disconnect"].includes(eventName)) {
      console.warn(`Unexpected event '${eventName}' from ${socket.id}:`, args);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error for user", socket.id, ":", error);
  });
});

// Expose io globally (optional)
global.io = io;

// Start server
httpServer.listen(port, hostname, () => {
  console.log(`> Socket.IO server running at http://${hostname}:${port}`);
});
