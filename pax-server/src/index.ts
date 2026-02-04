// ============================================================================
// Colyseus Server Entry Point - Pax Fluxia
// ============================================================================

import { Server } from "@colyseus/core";
import { BunWebSockets } from "@colyseus/bun-websockets";
import { GameRoom } from "./rooms/GameRoom";

const PORT = Number(process.env.PORT) || 2567;

// Create the Colyseus server using Bun WebSockets transport
const gameServer = new Server({
    transport: new BunWebSockets(),
});

// Register game room
gameServer.define("game_room", GameRoom);

// Start the server
gameServer.listen(PORT).then(() => {
    console.log(`\n🚀 Pax Fluxia Server running on port ${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);
});
