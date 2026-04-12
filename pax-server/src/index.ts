// ============================================================================
// Colyseus Server Entry Point - Pax Fluxia
// Using default uWebSocketsTransport (required for HTTP matchmaker routes)
// ============================================================================

import { Server, LobbyRoom, matchMaker } from "@colyseus/core";
import { GameRoom } from "./rooms/GameRoom";
import { TestRoom } from "./rooms/TestRoom";
import { log } from "./utils/logger";
import { PatchedBunWebSockets } from "./transport/PatchedBunWebSockets";

const PORT = Number(process.env.PORT) || 2567;

log.sys('Init', 'Initializing Colyseus server with patched Bun WebSockets transport...');

// Use a local patched transport because the published Bun transport currently
// parses websocket upgrade paths with the query string attached, which causes
// valid seat reservations to be rejected as expired on room connect.
const gameServer = new Server({
    transport: new PatchedBunWebSockets(),
});

log.sys('Init', 'Server instance created, defining rooms...');

// Built-in Lobby Room — provides realtime room listing to clients
// Clients join "lobby" and receive "rooms", "+", "-" messages automatically
gameServer.define("lobby", LobbyRoom);

// Define the game room with logging
gameServer.define("game_room", GameRoom)
    .enableRealtimeListing()
    .on("create", (room) => {
        log.sys('MatchMaker', `game_room CREATED: ${room.roomId}`);
    })
    .on("join", (room, client) => {
        log.net('MatchMaker', `Client JOINED game_room ${room.roomId}: ${client.sessionId}`);
    })
    .on("dispose", (room) => {
        log.sys('MatchMaker', `game_room DISPOSED: ${room.roomId}`);
    });

// Define the TEST room (minimal, for debugging)
gameServer.define("test_room", TestRoom)
    .on("create", (room) => {
        log.sys('MatchMaker', `test_room CREATED: ${room.roomId}`);
    })
    .on("join", (room, client) => {
        log.net('MatchMaker', `Client JOINED test_room ${room.roomId}: ${client.sessionId}`);
    })
    .on("dispose", (room) => {
        log.sys('MatchMaker', `test_room DISPOSED: ${room.roomId}`);
    });

log.sys('Init', 'Rooms defined: lobby, game_room, test_room');

async function ensurePersistentPublicRoom(): Promise<void> {
    try {
        const room = await matchMaker.createRoom("game_room", {
            isPublicAnchor: true,
            publicRoomLabel: "Public Room",
            playerCount: 6,
            mapType: "standard",
            starsPerPlayer: 5,
            shipsPerStar: 50,
            starSpacing: 1,
            mapBoardFit: 0.55,
        });
        log.sys('Init', `Persistent public room ready: ${room.roomId}`);
    } catch (err) {
        log.error('Init', 'Failed to create persistent public room', err);
    }
}

// Start the server
gameServer.listen(PORT).then(() => {
    log.sys('Init', `Pax Fluxia Server running on port ${PORT}`);
    log.sys('Init', `Transport: PatchedBunWebSockets`);
    log.sys('Init', `WebSocket: ws://127.0.0.1:${PORT}`);
    log.sys('Init', `HTTP: http://127.0.0.1:${PORT}`);
    void ensurePersistentPublicRoom();
}).catch((err) => {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'EADDRINUSE') {
        log.error('Init', `Server failed to start: port ${PORT} is already in use`, err);
        return;
    }
    log.error('Init', 'Server failed to start', err);
});

// Catch any unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    log.error('Process', 'Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (err) => {
    log.error('Process', 'Uncaught Exception', err);
});
