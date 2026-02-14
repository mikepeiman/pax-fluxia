// ============================================================================
// Production Entry Point — Pax Fluxia
// Mirrors index.ts simplicity + express.static for SPA serving
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom";
import { TestRoom } from "./rooms/TestRoom";
import { log } from "./utils/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 2567;
const CLIENT_DIR = path.resolve(__dirname, "../../client");

// ============================================================================
// Server — as close to index.ts as possible, plus static file serving
// ============================================================================

const transport = new WebSocketTransport({});

const gameServer = new Server({
    transport,

    express: (app: any) => {
        // Serve built SPA static files
        app.use(express.static(CLIENT_DIR));
        log.sys("Init", `Serving static files from ${CLIENT_DIR}`);
    },
});

// ============================================================================
// DIAGNOSTIC: Wrap onConnection to see EXACTLY what connectClientToRoom receives.
// Replaces the ws-transport's own handler with a wrapper that logs, then delegates.
// Remove once the 4002 issue is resolved.
// ============================================================================
const wss = (transport as any).wss;
const originalOnConnection = wss.listeners("connection")[0]; // ws-transport's handler
wss.removeAllListeners("connection");
wss.on("connection", (rawClient: any, req: any) => {
    try {
        const url = new URL(`ws://s/${req.url}`);
        const sid = url.searchParams.get("sessionId");
        const m = url.pathname.match(/\/([a-zA-Z0-9_\-]+)\/([a-zA-Z0-9_\-]+)$/);
        const pid = m?.[1] || null;
        const rid = m?.[2] || null;
        const room = rid ? (matchMaker as any).getLocalRoomById(rid) : null;
        const seats = room ? Object.keys(room["_reservedSeats"] || {}) : [];
        const has = room && sid ? room.hasReservedSeat(sid) : false;
        const reconnToken = url.searchParams.get("reconnectionToken");
        const hasWithToken = room && sid ? room.hasReservedSeat(sid, reconnToken) : false;
        log.net("WS-Diag-CONN", [
            `url=${req.url}`,
            `pid=${pid} rid=${rid} sid=${sid}`,
            `roomFound=${!!room} seats=${JSON.stringify(seats)}`,
            `hasReserved=${has} hasReservedWithToken=${hasWithToken}`,
            `reconnToken=${reconnToken}`,
            `seatDetail=${room && sid && room["_reservedSeats"]?.[sid] ? JSON.stringify(room["_reservedSeats"][sid]) : "none"}`,
        ].join(" | "));
    } catch (e: any) {
        log.error("WS-Diag", e.message);
    }
    // Delegate to original handler
    originalOnConnection(rawClient, req);
});

// Define rooms (identical to index.ts)
gameServer.define("game_room", GameRoom)
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
