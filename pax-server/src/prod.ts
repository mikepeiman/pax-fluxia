// ============================================================================
// Production Entry Point — Pax Fluxia
// Express 5 serves static SPA + Colyseus ws-transport on SAME port
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
const CLIENT_DIR = path.resolve(__dirname, "../../client");

// ============================================================================
// Express 5 — serves static SPA files
// ============================================================================

const app = express();

app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// Explicit root route — must be defined BEFORE Colyseus binds its own "/" handler
app.get("/", (_req, res) => {
    res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

// Serve static client files (with cache headers for assets)
app.use(express.static(CLIENT_DIR, {
    maxAge: "1y",
    immutable: true,
}));

// SPA fallback for client-side routes (before Colyseus binds matchmaker)
app.get("/{*splat}", (req, res, next) => {
    // Let /matchmake and /colyseus paths fall through to Colyseus
    if (req.path.startsWith("/matchmake") || req.path.startsWith("/colyseus")) {
        return next();
    }
    res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

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

// ============================================================================
// Start
// ============================================================================

gameServer.listen(PORT).then(() => {
    log.sys("Init", `🚀 Pax Fluxia PRODUCTION on port ${PORT}`);
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
