// ============================================================================
// Colyseus Server Entry Point - Pax Fluxia
// Using default uWebSocketsTransport (required for HTTP matchmaker routes)
// ============================================================================

import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";
import { TestRoom } from "./rooms/TestRoom";
import { log } from "./utils/logger";

const PORT = Number(process.env.PORT) || 2567;

log.sys('Init', 'Initializing Colyseus server with uWebSocketsTransport (default)...');

// Create server using default transport (uWebSockets.js - works with matchmaker)
const gameServer = new Server();

log.sys('Init', 'Server instance created, defining rooms...');

// Define the game room with logging
gameServer.define("game_room", GameRoom)
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

log.sys('Init', 'Rooms defined: game_room, test_room');

// Start the server
gameServer.listen(PORT).then(() => {
    log.sys('Init', `Pax Fluxia Server running on port ${PORT}`);
    log.sys('Init', `Transport: uWebSocketsTransport (default)`);
    log.sys('Init', `WebSocket: ws://127.0.0.1:${PORT}`);
    log.sys('Init', `HTTP: http://127.0.0.1:${PORT}`);
}).catch((err) => {
    log.error('Init', 'Server failed to start', err);
});

// Catch any unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    log.error('Process', 'Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (err) => {
    log.error('Process', 'Uncaught Exception', err);
});

