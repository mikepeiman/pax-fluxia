// ============================================================================
// Colyseus Server Entry Point - Pax Fluxia
// Using default transport for Node.js compatibility
// ============================================================================

import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";

const PORT = Number(process.env.PORT) || 2567;

console.log("🔧 Initializing Colyseus server (default transport)...");

// Create server using default transport (works with Node.js)
const gameServer = new Server();

console.log("🔧 Server instance created, defining rooms...");

// Define the room with logging
gameServer.define("game_room", GameRoom)
    .on("create", (room) => {
        console.log(`📦 [MatchMaker] Room CREATED: ${room.roomId}`);
    })
    .on("join", (room, client) => {
        console.log(`📦 [MatchMaker] Client JOINED room ${room.roomId}: ${client.sessionId}`);
    })
    .on("leave", (room, client) => {
        console.log(`📦 [MatchMaker] Client LEFT room ${room.roomId}: ${client.sessionId}`);
    })
    .on("dispose", (room) => {
        console.log(`📦 [MatchMaker] Room DISPOSED: ${room.roomId}`);
    });

console.log("🔧 Room 'game_room' defined");

// Add verbose logging for matchmaking events
gameServer.onShutdown(() => {
    console.log("🔴 Server shutting down...");
});

// Start the server
gameServer.listen(PORT).then(() => {
    console.log(`\n🚀 Pax Fluxia Server running on port ${PORT}`);
    console.log(`   Transport: Default (uWebSockets.js)`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   HTTP: http://localhost:${PORT}`);
    console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);
}).catch((err) => {
    console.error("❌ Server failed to start:", err);
    console.error("Stack:", err.stack);
});

// Catch any unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});
