// ============================================================================
// Colyseus Server Entry Point - Pax Fluxia
// Following official Colyseus 0.17 docs exactly
// ============================================================================

import { defineServer, defineRoom } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";

const PORT = Number(process.env.PORT) || 2567;

// Define the server using Colyseus 0.17 pattern
const server = defineServer({
    rooms: {
        game_room: defineRoom(GameRoom),
    },
});

// Start the server
server.listen(PORT).then(() => {
    console.log(`\n🚀 Pax Fluxia Server running on port ${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   Started: ${new Date().toLocaleTimeString()}\n`);
});
