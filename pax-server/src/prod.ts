// ============================================================================
// Production Entry Point — Pax Fluxia
// Colyseus (default uWebSocketsTransport, same as dev) + Bun.serve() static
// Two ports, one container — NO Express, NO ws-transport
// Used by Dockerfile / Northflank — NOT for local dev
// ============================================================================

import path from "path";
import { fileURLToPath } from "url";
import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";
import { TestRoom } from "./rooms/TestRoom";
import { log } from "./utils/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 2567;
const STATIC_PORT = Number(process.env.STATIC_PORT) || 3000;
const CLIENT_DIR = path.resolve(__dirname, "../../client");
const COLYSEUS_URL = process.env.COLYSEUS_URL || `http://localhost:${PORT}`;

// ============================================================================
// 1. Colyseus game server — default uWebSocketsTransport (same as dev)
// ============================================================================

const gameServer = new Server();

log.sys("Init", "Defining rooms...");

gameServer.define("game_room", GameRoom)
    .on("create", (room) => log.sys("MatchMaker", `game_room CREATED: ${room.roomId}`))
    .on("join", (room, client) => log.net("MatchMaker", `Client JOINED game_room ${room.roomId}: ${client.sessionId}`))
    .on("dispose", (room) => log.sys("MatchMaker", `game_room DISPOSED: ${room.roomId}`));

gameServer.define("test_room", TestRoom)
    .on("create", (room) => log.sys("MatchMaker", `test_room CREATED: ${room.roomId}`))
    .on("join", (room, client) => log.net("MatchMaker", `Client JOINED test_room ${room.roomId}: ${client.sessionId}`))
    .on("dispose", (room) => log.sys("MatchMaker", `test_room DISPOSED: ${room.roomId}`));

gameServer.listen(PORT).then(() => {
    log.sys("Init", `🎮 Colyseus on port ${PORT} (uWebSocketsTransport)`);
}).catch((err) => {
    log.error("Init", "Colyseus failed to start", err);
    process.exit(1);
});

// ============================================================================
// 2. Static file server — Bun.serve() (SPA + runtime config injection)
// ============================================================================

// Cache index.html with injected server URL
const indexPath = path.join(CLIENT_DIR, "index.html");
const indexFile = Bun.file(indexPath);
let indexHtml: string | null = null;

async function getIndexHtml(): Promise<string> {
    if (!indexHtml) {
        const raw = await indexFile.text();
        // Inject the Colyseus server URL at runtime (not build time)
        indexHtml = raw.replace(
            "</head>",
            `<script>window.__COLYSEUS_URL__="${COLYSEUS_URL}";</script></head>`
        );
    }
    return indexHtml;
}

Bun.serve({
    port: STATIC_PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Try to serve the exact file
        if (pathname !== "/" && pathname !== "/index.html") {
            const filePath = path.join(CLIENT_DIR, pathname);
            const file = Bun.file(filePath);
            if (await file.exists()) {
                return new Response(file);
            }
        }

        // SPA fallback — serve index.html with injected config
        const html = await getIndexHtml();
        return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    },
});

log.sys("Init", `🌐 Static SPA on port ${STATIC_PORT}`);
log.sys("Init", `   Client dir: ${CLIENT_DIR}`);
log.sys("Init", `   Injected COLYSEUS_URL: ${COLYSEUS_URL}`);

// ============================================================================
// Error handlers
// ============================================================================

process.on("unhandledRejection", (reason, promise) => {
    log.error("Process", "Unhandled Rejection", { reason, promise });
});

process.on("uncaughtException", (err) => {
    log.error("Process", "Uncaught Exception", err);
});
