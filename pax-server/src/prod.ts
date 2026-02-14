// ============================================================================
// Production Entry Point — Pax Fluxia
// Uses Colyseus Server's `express` callback to inject static SPA middleware
// into the transport's internal Express app — ONE Express, ONE listener.
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

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
// MIME types for static file serving
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
// Static file middleware — injected into Colyseus's internal Express via callback
// ============================================================================

function staticMiddleware(req: any, res: any, next: () => void) {
    // Only handle GET requests; let POST /matchmake/* pass to Colyseus
    if (req.method !== "GET") return next();

    const url: string = req.path || req.url?.split("?")[0] || "/";

    // Let Colyseus handle its own API paths
    if (url.startsWith("/matchmake") || url.startsWith("/colyseus") || url === "/__healthcheck") {
        return next();
    }

    // Try to serve an exact file from CLIENT_DIR
    const filePath = path.join(CLIENT_DIR, url === "/" ? "index.html" : url);
    try {
        if (existsSync(filePath) && statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
            res.setHeader("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable");
            res.end(readFileSync(filePath));
            return;
        }
    } catch {
        // Fall through to SPA fallback
    }

    // SPA fallback — serve index.html for client-side routes
    const indexPath = path.join(CLIENT_DIR, "index.html");
    if (existsSync(indexPath)) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(readFileSync(indexPath));
        return;
    }

    // No client files — let request continue
    next();
}

// ============================================================================
// HTTP Server + Colyseus
// Create httpServer with NO callback — Colyseus's transport owns the Express app
// ============================================================================

const httpServer = createServer();

const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),

    // Inject our static middleware into the transport's internal Express app
    // This runs BEFORE bindRouterToTransport adds matchmaker routes
    express: (app: any) => {
        app.disable("x-powered-by");
        app.use(staticMiddleware);
        log.sys("Init", "Static SPA middleware injected into Colyseus Express app");
    },
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
