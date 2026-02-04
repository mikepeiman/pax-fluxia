// ============================================================================
// Colyseus Server Entry Point
// ============================================================================

import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom";

const BASE_PORT = Number(process.env.PORT) || 2567;
const MAX_PORT_ATTEMPTS = 10;

// Create Express app for health checks
const app = express();
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:1420", "http://127.0.0.1:1420"],
    credentials: true
}));

// Health endpoint - simple status check
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
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

// Try to find an available port
async function startServer(port: number, attempt: number = 1): Promise<void> {
    return new Promise((resolve, reject) => {
        httpServer.once("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "EADDRINUSE" && attempt < MAX_PORT_ATTEMPTS) {
                console.log(`⚠️  Port ${port} in use, trying ${port + 1}...`);
                httpServer.removeAllListeners("error");
                startServer(port + 1, attempt + 1).then(resolve).catch(reject);
            } else if (err.code === "EADDRINUSE") {
                console.error(`\n❌ Could not find available port after ${MAX_PORT_ATTEMPTS} attempts`);
                reject(err);
            } else {
                reject(err);
            }
        });

        httpServer.listen(port, () => {
            console.log(`\n🚀 Pax Fluxia Server running on port ${port}`);
            console.log(`   Health: http://localhost:${port}/health`);
            console.log(`   WebSocket: ws://localhost:${port}`);
            console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);
            resolve();
        });
    });
}

// Start the server
startServer(BASE_PORT).catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
