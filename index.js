import { createServer } from "http";
import { Server } from "socket.io";

const hostname = "0.0.0.0"; // important for Render
const port = 8000;
const httpServer = createServer();

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ["https://voticast.netlify.app/","http://localhost:5173/"], // React dev server
    methods: ["GET", "POST"], // Allowed HTTP methods
  },
});

// Track connection statistics
let connectionCount = 0;
let votes = { A: 0, B: 0, C: 0 };

// Socket.io connection handling
io.on("connection", (socket) => {
  connectionCount++;
  console.log(`User connected: ${socket.id} (Total connections: ${connectionCount})`);

  // Handle user joining the voting room
  socket.on("vote", (option) => {
    try {
      if (votes[option] !== undefined) {
        votes[option]++;
        console.log('Updated Client Votes  : ',votes);

        // Send updated votes back to everyone
        io.emit("vote-update", {
          votes,
          total: votes.A + votes.B + votes.C,
        });
      }
    } catch (error) {
      console.error("Error handling room join:", error);
      socket.emit("error", { message: "Failed to join voting room" });
    }
  });

  // Optional: send current state when a user connects
  socket.emit("vote-update", {
    votes,
    total: votes.A + votes.B + votes.C,
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    connectionCount--;
    console.log(`User disconnected: ${socket.id}, reason: ${reason} (Total connections: ${connectionCount})`);

    // Log room statistics after disconnect
    setTimeout(() => {
      console.log(`Voting room now has ${connectionCount} connected users`);
    }, 100);
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error("Socket error for user", socket.id, ":", error);
  });

  // Handle unexpected events gracefully
  socket.onAny((eventName, ...args) => {
    if (!["vote-update", "vote", "disconnect", "error"].includes(eventName)) {
      console.warn(`Unexpected event '${eventName}' from ${socket.id}:`, args);
    }
  });
});

// Make io accessible to API routes
global.io = io;

httpServer
  .once("error", (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
