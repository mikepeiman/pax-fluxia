// ============================================================================
// Production Entry Point — Pax Fluxia
// Plain Node.js HTTP server for static files + Colyseus ws-transport
// Same port for everything — NO Express
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { readFileSync, existsSync, statSync } from "fs";
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
// MIME types for static file serving
// ============================================================================

const MIME: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".wasm": "application/wasm",
    ".webp": "image/webp",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
};

// ============================================================================
// Static file handler (no Express needed)
// ============================================================================

function tryServeFile(req: IncomingMessage, res: ServerResponse): boolean {
    const url = (req.url || "/").split("?")[0];

    // Skip Colyseus matchmaker routes — let them fall through
    if (url.startsWith("/matchmake")) return false;

    const filePath = path.join(CLIENT_DIR, url === "/" ? "index.html" : url);

    try {
        if (existsSync(filePath) && statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            res.writeHead(200, {
                "Content-Type": MIME[ext] || "application/octet-stream",
                "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
            });
            res.end(readFileSync(filePath));
            return true;
        }
    } catch {
        // fall through
    }

    // SPA fallback — serve index.html for client-side routes
    const indexPath = path.join(CLIENT_DIR, "index.html");
    if (existsSync(indexPath)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(indexPath));
        return true;
    }

    return false;
}

// ============================================================================
// HTTP Server (static files) + Colyseus (WebSocket + matchmaker)
// ============================================================================

const httpServer = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // Try static files first; if not handled, Colyseus matchmaker routes
    // are registered on this server by the transport
    if (!tryServeFile(req, res)) {
        res.writeHead(404);
        res.end("Not found");
    }
});

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
