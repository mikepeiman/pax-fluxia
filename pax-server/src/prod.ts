// ============================================================================
// Production Entry Point — Pax Fluxia
// Mirrors index.ts simplicity + express.static for SPA serving
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Server, LobbyRoom } from "colyseus";
// NOTE: Do NOT import WebSocketTransport here!
// Letting Server.getDefaultTransport() handle it via dynamicImport ensures
// a single @colyseus/core module instance. Importing ws-transport explicitly
// causes bun to resolve @colyseus/core as a SEPARATE module instance,
// giving ws-transport its own matchMaker singleton with an empty rooms map.
import { GameRoom } from "./rooms/GameRoom";
import { TestRoom } from "./rooms/TestRoom";
import { log } from "./utils/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 2567;
const CLIENT_DIR = path.resolve(__dirname, "../../client");

// ============================================================================
// Server — identical pattern to index.ts, plus express.static for SPA serving
// ============================================================================

const gameServer = new Server({
    express: (app: any) => {
        // Serve built SPA static files
        app.use(express.static(CLIENT_DIR));
        log.sys("Init", `Serving static files from ${CLIENT_DIR}`);
    },
});

// Built-in Lobby Room — provides realtime room listing to clients
gameServer.define("lobby", LobbyRoom);

// Define rooms
gameServer.define("game_room", GameRoom)
    .enableRealtimeListing()
    .on("create", (room) => log.sys("MatchMaker", `game_room CREATED: ${room.roomId}`))
    .on("join", (room, client) => log.net("MatchMaker", `Client JOINED game_room ${room.roomId}: ${client.sessionId}`))
    .on("dispose", (room) => log.sys("MatchMaker", `game_room DISPOSED: ${room.roomId}`));

gameServer.define("test_room", TestRoom)
    .on("create", (room) => log.sys("MatchMaker", `test_room CREATED: ${room.roomId}`))
    .on("join", (room, client) => log.net("MatchMaker", `Client JOINED test_room ${room.roomId}: ${client.sessionId}`))
    .on("dispose", (room) => log.sys("MatchMaker", `test_room DISPOSED: ${room.roomId}`));

// Start
gameServer.listen(PORT).then(() => {
    log.sys("Init", `🚀 Pax Fluxia PRODUCTION on port ${PORT}`);
}).catch((err) => {
    log.error("Init", "Server failed to start", err);
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    log.error("Process", "Unhandled Rejection", { reason, promise });
});

process.on("uncaughtException", (err) => {
    log.error("Process", "Uncaught Exception", err);
});
