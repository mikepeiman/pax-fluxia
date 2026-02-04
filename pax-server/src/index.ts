// ============================================================================
// Colyseus Server Entry Point
// ============================================================================

import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom";

const PORT = Number(process.env.PORT) || 2567;

// Create Express app for health checks
const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
}));

app.get("/health", (_req, res) => {
    res.json({ status: "ok", rooms: gameServer.matchMaker.stats });
});

// Create HTTP server
const httpServer = createServer(app);

// Create Colyseus server
const gameServer = new Server({
    transport: new WebSocketTransport({
        server: httpServer
    })
});

// Register game room
gameServer.define("game_room", GameRoom);

// Start listening
httpServer.listen(PORT, () => {
    console.log(`\n🚀 Pax Fluxia Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   WebSocket: ws://localhost:${PORT}\n`);
});

// Handle port already in use
httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Kill existing process or use different port: PORT=2568 bun run dev\n`);
    } else {
        console.error("Server error:", err);
    }
    process.exit(1);
});
