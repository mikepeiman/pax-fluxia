// ============================================================================
// Production Entry Point — Pax Fluxia
// Static files served at HTTP level (bypasses Colyseus route override)
// Colyseus matchmaker + WebSocket via Express 5 + ws-transport
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

import express from "express";
import { createServer } from "http";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
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

// Startup diagnostics
log.sys("Init", `CLIENT_DIR: ${CLIENT_DIR}`);
log.sys("Init", `CLIENT_DIR exists: ${existsSync(CLIENT_DIR)}`);
if (existsSync(CLIENT_DIR)) {
    log.sys("Init", `Contents: ${readdirSync(CLIENT_DIR).join(", ")}`);
}

// ============================================================================
// MIME types
// ============================================================================

const MIME: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".wasm": "application/wasm",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
};

// ============================================================================
// Express app (only used for Colyseus matchmaker routes)
// ============================================================================

const app = express();

// ============================================================================
// HTTP Server — static files handled HERE, before Express/Colyseus
// ============================================================================

const httpServer = createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];

    // Serve static files for GET requests (non-matchmake paths)
    if (req.method === "GET" && !url.startsWith("/matchmake")) {
        const filePath = path.join(CLIENT_DIR, url === "/" ? "index.html" : url);

        try {
            if (existsSync(filePath) && statSync(filePath).isFile()) {
                const ext = path.extname(filePath);
                res.writeHead(200, {
                    "Content-Type": MIME[ext] || "application/octet-stream",
                    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
                    "Access-Control-Allow-Origin": "*",
                });
                res.end(readFileSync(filePath));
                return;
            }
        } catch (e) {
            // fall through
        }

        // SPA fallback — serve index.html for client-side routes
        const indexPath = path.join(CLIENT_DIR, "index.html");
        if (existsSync(indexPath)) {
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
            });
            res.end(readFileSync(indexPath));
            return;
        }
    }

    // Everything else → Express app (Colyseus matchmaker + WebSocket)
    app(req, res);
});

// ============================================================================
// Colyseus — game server on the same HTTP server
// ============================================================================

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
