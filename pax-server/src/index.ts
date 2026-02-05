// ============================================================================
// Colyseus Server Entry Point - Pax Fluxia
// Using default uWebSocketsTransport (required for HTTP matchmaker routes)
// ============================================================================

import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";
import { TestRoom } from "./rooms/TestRoom";

const PORT = Number(process.env.PORT) || 2567;

console.log("🔧 Initializing Colyseus server with uWebSocketsTransport (default)...");

// Create server using default transport (uWebSockets.js - works with matchmaker)
const gameServer = new Server();

console.log("🔧 Server instance created, defining rooms...");

// Define the game room with logging
gameServer.define("game_room", GameRoom)
    .on("create", (room) => {
        console.log(`📦 [MatchMaker] game_room CREATED: ${room.roomId}`);
    })
    .on("join", (room, client) => {
        console.log(`📦 [MatchMaker] Client JOINED game_room ${room.roomId}: ${client.sessionId}`);
    })
    .on("dispose", (room) => {
        console.log(`📦 [MatchMaker] game_room DISPOSED: ${room.roomId}`);
    });

// Define the TEST room (minimal, for debugging)
gameServer.define("test_room", TestRoom)
    .on("create", (room) => {
        console.log(`🧪 [MatchMaker] test_room CREATED: ${room.roomId}`);
    })
    .on("join", (room, client) => {
        console.log(`🧪 [MatchMaker] Client JOINED test_room ${room.roomId}: ${client.sessionId}`);
    })
    .on("dispose", (room) => {
        console.log(`🧪 [MatchMaker] test_room DISPOSED: ${room.roomId}`);
    });

console.log("🔧 Rooms defined: game_room, test_room");

// Start the server
gameServer.listen(PORT).then(() => {
    console.log(`\n🚀 Pax Fluxia Server running on port ${PORT}`);
    console.log(`   Transport: uWebSocketsTransport (default)`);
    console.log(`   WebSocket: ws://127.0.0.1:${PORT}`);
    console.log(`   HTTP: http://127.0.0.1:${PORT}`);
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
