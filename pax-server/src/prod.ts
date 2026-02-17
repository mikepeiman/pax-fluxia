// ============================================================================
// Production Entry Point — Pax Fluxia
// Mirrors index.ts simplicity + express.static for SPA serving
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Server, matchMaker } from "colyseus";
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
        // Custom API: list available rooms
        app.get("/api/rooms", async (_req: any, res: any) => {
            try {
                const rooms = await matchMaker.query({ name: "game_room", private: false, locked: false });
                res.json(rooms.map((r: any) => ({
                    roomId: r.roomId,
                    name: r.name || r.roomId,
                    clients: r.clients,
                    maxClients: r.maxClients,
                    metadata: r.metadata,
                })));
            } catch (err: any) {
                log.error("API", "Failed to query rooms", err);
                res.json([]);
            }
        });

        // Serve built SPA static files
        app.use(express.static(CLIENT_DIR));
        log.sys("Init", `Serving static files from ${CLIENT_DIR}`);
    },
});

// Define rooms (identical to index.ts)
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
