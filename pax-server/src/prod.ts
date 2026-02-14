// ============================================================================
// Production Entry Point — Pax Fluxia
// Express serves static SPA + Colyseus game server on the SAME port
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom";
import { TestRoom } from "./rooms/TestRoom";
import { log } from "./utils/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 2567;

// Path to the pre-built SvelteKit SPA (copied by Dockerfile)
const CLIENT_DIR = path.resolve(__dirname, "../../client");

// ============================================================================
// Express — serves static SPA files
// ============================================================================

const app = express();

// Colyseus @colyseus/core@0.17 accesses app.router to detect Express,
// but Express 4.x throws on that access. Override with actual router.
Object.defineProperty(app, 'router', {
    get() { return (this as any)._router; },
    configurable: true,
});

// CORS headers for any API routes
app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// Serve static client files
app.use(express.static(CLIENT_DIR));

// ============================================================================
// Colyseus — game server on the same HTTP server
// ============================================================================

const httpServer = createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
});

log.sys("Init", "Defining rooms...");

gameServer.define("game_room", GameRoom)
    .on("create", (room) => log.sys("MatchMaker", `game_room CREATED: ${room.roomId}`))
    .on("join", (room, client) => log.net("MatchMaker", `Client JOINED game_room ${room.roomId}: ${client.sessionId}`))
    .on("dispose", (room) => log.sys("MatchMaker", `game_room DISPOSED: ${room.roomId}`));

gameServer.define("test_room", TestRoom)
    .on("create", (room) => log.sys("MatchMaker", `test_room CREATED: ${room.roomId}`))
    .on("join", (room, client) => log.net("MatchMaker", `Client JOINED test_room ${room.roomId}: ${client.sessionId}`))
    .on("dispose", (room) => log.sys("MatchMaker", `test_room DISPOSED: ${room.roomId}`));

// SPA fallback — must come AFTER Colyseus matchmaker routes
app.get("*", (_req, res) => {
    res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

// ============================================================================
// Start
// ============================================================================

gameServer.listen(PORT).then(() => {
    log.sys("Init", `🚀 Pax Fluxia PRODUCTION server on port ${PORT}`);
    log.sys("Init", `   Static SPA: ${CLIENT_DIR}`);
    log.sys("Init", `   WebSocket + Matchmaker on same port`);
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
