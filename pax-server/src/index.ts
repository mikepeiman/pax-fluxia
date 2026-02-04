// ============================================================================
// Colyseus Server Entry Point - Pax Fluxia
// Using Server class approach for better debugging
// ============================================================================

import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";

const PORT = Number(process.env.PORT) || 2567;

// Create server using Server class
const gameServer = new Server({
    // Using default transport (uWebSockets.js)
});

// Define the room
gameServer.define("game_room", GameRoom);

// Add verbose logging for matchmaking events
gameServer.onShutdown(() => {
    console.log("🔴 Server shutting down...");
});

// Start the server
gameServer.listen(PORT).then(() => {
    console.log(`\n🚀 Pax Fluxia Server running on port ${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   HTTP: http://localhost:${PORT}`);
    console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);
}).catch((err) => {
    console.error("❌ Server failed to start:", err);
});
