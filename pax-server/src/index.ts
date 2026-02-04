// ============================================================================
// Colyseus Server Entry Point
// ============================================================================

import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom";

const PORT = Number(process.env.PORT) || 2567;

// Create Express app
const app = express();
app.use(cors({
    origin: true, // Allow all origins in dev
    credentials: true
}));
app.use(express.json());

// Health endpoint
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

// Create HTTP server
const httpServer = createServer(app);

// Create Colyseus server with the HTTP server
const gameServer = new Server({
    transport: new WebSocketTransport({
        server: httpServer
    })
});

// Register game room
gameServer.define("game_room", GameRoom);

// Attach Colyseus to Express app (registers /matchmake routes)
gameServer.attach({ server: httpServer });

// Start the server
httpServer.listen(PORT, () => {
    console.log(`\n🚀 Pax Fluxia Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);
});
