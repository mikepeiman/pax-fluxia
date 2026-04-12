// ============================================================================
// Pax Fluxia - Game Room (Colyseus)
// ============================================================================

import { Room, Client } from "colyseus";
import {
    GameRoomState,
    PlayerSchema,
    StarSchema,
    ConnectionSchema,
    PointSchema,
} from "../schema/GameState.schema";

// Import shared game logic from @pax/common
import { GameEngine, STAR_TYPE_STATS, DEFAULT_ENGINE_CONFIG } from "@pax/common";
import { attachLaneWaypointsToConnections, generateMap, type LanePathKind, type MapConnection, type MapLaneMode } from "@pax/common/mapgen";
import type { EngineConfig } from "@pax/common";
import { log } from '../utils/logger';

// Player colors palette (same as GameEngine)
const PLAYER_COLORS = [
    '#4488ff', // Blue
    '#ff4466', // Red
    '#44ff88', // Green
    '#ffcc44', // Yellow
    '#aa66ff', // Purple
    '#ff8844'  // Orange
];


// Room options passed from client (shared between SP MainMenu and MP Lobby)
interface RoomOptions {
    playerCount?: number;
    mapType?: 'standard' | 'debug' | 'debug-b';
    starsPerPlayer?: number;
    shipsPerStar?: number;
    starSpacing?: number;
    mapBoardFit?: number;
    minLinks?: number;
    maxLinks?: number;
    retainOrderOnConquest?: boolean;
    playerColors?: string[];
    // Phase A: Full gameplay config from client
    gameplayConfig?: Partial<EngineConfig>;
}

type LaneGameplayConfig = {
    MODIFIED_VORONOI_STAR_MARGIN?: number;
    MAPGEN_LANE_MARGIN_PX?: number;
    /** @deprecated Combined into `MAPGEN_LANE_MARGIN_PX` on client; server migrates if margin absent */
    MAPGEN_LANE_BUFFER_PX?: number;
    MAPGEN_LANE_MODE?: MapLaneMode;
    MAPGEN_LANE_CURVE_VS_PRUNE_BIAS?: number;
};

// Message types from client
type MessageType =
    | { type: 'issueOrder'; sourceId: string; targetId: string; persist?: boolean }
    | { type: 'cancelOrder'; starId: string }
    | { type: 'setDeferredOrder'; enemyStarId: string; nextTargetId: string; persist?: boolean }
    | { type: 'setSpeed'; speed: number }
    | { type: 'pause' }
    | { type: 'resume' }
    | { type: 'startGame' };

export class GameRoom extends Room {
    // Config
    maxClients = 4;
    private tickIntervalId: ReturnType<typeof setInterval> | null = null;
    private tickStartTime = 0;
    private tickIntervalBase = 1200; // Configurable BASE_TICK_MS, default 1200
    private disposeTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly DISPOSE_GRACE_MS = 5 * 60 * 1000; // 5 minutes
    private roomOptions: RoomOptions = {};
    private engineConfig: EngineConfig = { ...DEFAULT_ENGINE_CONFIG };
    private restartVotes: Set<string> = new Set();
    private startVotes: Set<string> = new Set();

    // State - will be set in onCreate using this.setState() per 0.17.29 requirement
    declare state: GameRoomState;

    // ========================================================================
    // Room Lifecycle
    // ========================================================================

    onCreate(options: RoomOptions) {
        try {
            log.sys('GameRoom', `onCreate: players=${options.playerCount || 4}, map=${options.mapType || 'standard'}`);

            // Seat reservation for proxied deployments
            this.seatReservationTimeout = 30;

            // Prevent Colyseus from auto-disposing room when host leaves
            this.autoDispose = false;

            // IMPORTANT: Use setState() per Colyseus 0.17.29 strict type requirements
            this.setState(new GameRoomState());

            this.roomOptions = options;
            this.maxClients = options.playerCount || 4;

            // Merge client gameplay config with defaults
            if (options.gameplayConfig) {
                this.engineConfig = { ...DEFAULT_ENGINE_CONFIG, ...options.gameplayConfig };
            }

            // Initialize state values
            this.state.maxPlayers = this.maxClients;
            this.state.phase = "lobby";
            this.state.speed = 1;
            this.state.isPaused = true;
            this.state.tick = 0;
            this.state.tickProgress = 0;

            // Register message handlers
            this.registerMessageHandlers();

            // Set initial metadata for room listing
            this.updateListingMetadata();

            log.sys('GameRoom', `onCreate complete. Max players: ${this.maxClients}`);
        } catch (err) {
            log.error('GameRoom', 'Error in onCreate', err);
            throw err;
        }
    }

    onJoin(client: Client, options: any) {
        // Cancel dispose timer if a player joins during grace period
        if (this.disposeTimer) {
            clearTimeout(this.disposeTimer);
            this.disposeTimer = null;
            log.net('GameRoom', 'Dispose timer cancelled — player joined during grace period');
        }

        log.net('GameRoom', `onJoin: session=${client.sessionId}, phase=${this.state.phase}, players=${this.state.players.size}/${this.maxClients}`);

        // ── LOBBY PHASE: add as new player ──
        if (this.state.phase === 'lobby') {
            if (this.state.players.size >= this.maxClients) {
                log.error('GameRoom', `Join rejected: room full (${this.state.players.size}/${this.maxClients})`);
                client.leave(4000); // code 4000 = room full
                return;
            }

            // First player is host
            if (this.state.players.size === 0) {
                this.state.hostSessionId = client.sessionId;
                log.net('GameRoom', `Host assigned: ${client.sessionId}`);
            }

            const playerIndex = this.state.players.size;
            const player = new PlayerSchema();
            player.id = `player-${playerIndex}`;
            player.sessionId = client.sessionId;
            player.name = options.name || `Player ${playerIndex + 1}`;
            const configuredColor = this.getConfiguredPlayerColor(playerIndex);
            player.color = configuredColor
                ?? ((options.color && /^#[0-9a-fA-F]{6}$/.test(options.color))
                    ? options.color
                    : PLAYER_COLORS[playerIndex % PLAYER_COLORS.length]);
            player.isAI = false;
            player.isEliminated = false;
            player.isConnected = true;

            // Enforce unique name
            const existingNames = new Set<string>();
            this.state.players.forEach((p: any) => existingNames.add(p.name));
            if (existingNames.has(player.name)) {
                let suffix = 2;
                while (existingNames.has(`${player.name} ${suffix}`)) suffix++;
                player.name = `${player.name} ${suffix}`;
            }

            // Enforce min 30deg hue separation against existing players
            if (!configuredColor) {
                player.color = this.enforceHueSeparation(player.color);
            }

            this.state.players.set(client.sessionId, player);
            this.state.playerCount = this.state.players.size;

            log.success('GameRoom', `Player ${player.id} (${player.name}) joined lobby as ${player.color}`);
            client.send("playerJoined", { sessionId: client.sessionId });

            // ── PLAYING/ENDED PHASE: take over an AI slot ──
        } else {
            // Find target AI to take over
            const takeOverId = options.takeOverId; // optional: specific AI session to take over

            // Find an available AI player to take over
            const aiEntries = Array.from(this.state.players.entries())
                .filter(([sid, p]: [string, any]) => p.isAI && !p.isEliminated)
                .filter(([sid]: [string, any]) => !takeOverId || sid === takeOverId);
            const found = aiEntries[0]; // first match

            if (!found) {
                log.error('GameRoom', `Join rejected: no available AI slots for takeover (takeOverId=${takeOverId || 'any'})`);
                client.send("joinError", { reason: "No AI players available to take over" });
                client.leave(4001); // code 4001 = no AI slots
                return;
            }

            const [oldSessionId, aiPlayer] = found as [string, any];
            // Always prefer client-provided name; never inherit AI name
            const newName = options.name || `Player ${this.state.players.size + 1}`;
            const newColor = (options.color && /^#[0-9a-fA-F]{6}$/.test(options.color))
                ? options.color
                : aiPlayer.color;

            log.net('GameRoom', `AI takeover: ${oldSessionId} → ${client.sessionId} (${newName})`);

            // 1. Transfer star ownership from AI session to human session
            let starsTransferred = 0;
            this.state.stars.forEach((star: any) => {
                if (star.ownerId === oldSessionId) {
                    star.ownerId = client.sessionId;
                    starsTransferred++;
                }
            });
            log.data('GameRoom', `Transferred ${starsTransferred} stars from ${oldSessionId} to ${client.sessionId}`);

            // 2. Remove old AI player entry, create new human entry with same game state
            const takenPlayer = new PlayerSchema();
            takenPlayer.id = aiPlayer.id; // keep same player id (player-2, etc.)
            takenPlayer.sessionId = client.sessionId;
            takenPlayer.name = newName;
            takenPlayer.color = newColor;

            // Enforce unique name (same as lobby path)
            const existingNames = new Set<string>();
            this.state.players.forEach((p: any) => existingNames.add(p.name));
            if (existingNames.has(takenPlayer.name)) {
                let suffix = 2;
                while (existingNames.has(`${takenPlayer.name} ${suffix}`)) suffix++;
                takenPlayer.name = `${takenPlayer.name} ${suffix}`;
            }

            // Enforce min 30deg hue separation (skip the AI being replaced)
            takenPlayer.color = this.enforceHueSeparation(takenPlayer.color, oldSessionId);

            takenPlayer.isAI = false;
            takenPlayer.isEliminated = aiPlayer.isEliminated;
            takenPlayer.isConnected = true;

            this.state.players.delete(oldSessionId);
            this.state.players.set(client.sessionId, takenPlayer);

            log.success('GameRoom', `AI takeover complete: ${takenPlayer.id} (${takenPlayer.name}) now controls ${starsTransferred} stars`);
            client.send("playerJoined", { sessionId: client.sessionId, takenOver: oldSessionId });
        }

        this.updateListingMetadata();
        client.send("welcome", "Default welcome message from server!");
    }

    onLeave(client: Client, code?: number) {
        log.net('GameRoom', `Player left: ${client.sessionId} (code: ${code})`);

        const player = this.state.players.get(client.sessionId);
        if (player) {
            player.isConnected = false;

            // If game is in lobby, remove player entirely
            if (this.state.phase === "lobby") {
                this.state.players.delete(client.sessionId);
                this.state.playerCount = this.state.players.size;
            }
        }

        // Handle host leaving
        if (client.sessionId === this.state.hostSessionId) {
            // Find next connected human player to be host
            let newHost: string | null = null;
            this.state.players.forEach((p, sid) => {
                if (!p.isAI && p.isConnected && sid !== client.sessionId && !newHost) {
                    newHost = sid;
                }
            });
            if (newHost) {
                this.state.hostSessionId = newHost;
                log.net('GameRoom', `New host assigned: ${newHost}`);
            }
        }

        // If no human players remain connected, start 5-minute dispose timer
        let anyHumansConnected = false;
        this.state.players.forEach((p) => {
            if (!p.isAI && p.isConnected) {
                anyHumansConnected = true;
            }
        });
        if (!anyHumansConnected && !this.disposeTimer) {
            log.net('GameRoom', `No human players remaining — starting ${this.DISPOSE_GRACE_MS / 1000}s dispose timer`);
            this.stopTick();
            this.updateListingMetadata();
            this.disposeTimer = setTimeout(() => {
                log.net('GameRoom', 'Dispose timer expired — disposing room');
                this.disconnect();
            }, this.DISPOSE_GRACE_MS);
        }
    }

    onDispose() {
        log.sys('GameRoom', 'Room disposed');
        this.stopTick();
        if (this.disposeTimer) {
            clearTimeout(this.disposeTimer);
            this.disposeTimer = null;
        }
    }

    // ========================================================================
    // Color Helpers
    // ========================================================================

    /** Convert hex color to hue (0-360) */
    private hexToHue(hex: string): number {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max === min) return 0;
        let h = 0;
        const d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
        return h;
    }

    /** Convert hue (0-360) to hex color with fixed S=0.7, L=0.55 */
    private hueToHex(hue: number): string {
        const s = 0.7, l = 0.55;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + hue / 30) % 12;
            const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
            return Math.round(c * 255).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    /**
     * Enforce minimum 30° hue separation against all existing players.
     * @param hex - The candidate color
     * @param skipSessionId - Optional session ID to exclude from comparison (e.g. AI being replaced)
     * @returns The (possibly shifted) hex color
     */
    private enforceHueSeparation(hex: string, skipSessionId?: string): string {
        let myHue = this.hexToHue(hex);
        let shifted = false;
        this.state.players.forEach((p: any, sid: string) => {
            if (skipSessionId && sid === skipSessionId) return;
            const otherHue = this.hexToHue(p.color);
            const diff = Math.abs(myHue - otherHue);
            const circDiff = Math.min(diff, 360 - diff);
            if (circDiff < 30) {
                myHue = (otherHue + 30) % 360;
                shifted = true;
            }
        });
        return shifted ? this.hueToHex(myHue) : hex;
    }

    private getConfiguredPlayerColor(index: number): string | null {
        const color = this.roomOptions.playerColors?.[index];
        return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
    }

    /** Update room listing metadata for public browser */
    private updateListingMetadata() {
        let humanCount = 0;
        let hostName = 'Unknown';
        const playerNames: string[] = [];
        const aiPlayers: { sessionId: string; name: string; color: string }[] = [];
        this.state.players.forEach((p, sid) => {
            if (!p.isAI) humanCount++;
            else if (!p.isEliminated) aiPlayers.push({ sessionId: sid, name: p.name, color: p.color });
            if (sid === this.state.hostSessionId) hostName = p.name;
            playerNames.push(p.name + (p.isAI ? ' (AI)' : ''));
        });
        this.setMetadata({
            mapType: this.roomOptions.mapType || 'standard',
            playerCount: humanCount,
            maxPlayers: this.maxClients,
            phase: this.state.phase,
            hostName,
            starsPerPlayer: this.roomOptions.starsPerPlayer || 3,
            shipsPerStar: this.roomOptions.shipsPerStar || 10,
            tick: this.state.tick,
            playerNames,
            aiPlayers,
        });
    }

    // ========================================================================
    // Message Handlers
    // ========================================================================

    private registerMessageHandlers() {
        // Start game (host only)
        this.onMessage("startGame", (client) => {
            if (client.sessionId !== this.state.hostSessionId) {
                log.net('GameRoom', `Non-host tried to start game: ${client.sessionId}`);
                return;
            }
            if (this.state.phase !== "lobby") {
                log.game('GameRoom', 'Game already started');
                return;
            }

            log.game('GameRoom', 'Game starting!');
            try {
                this.initializeGame();
            } catch (err) {
                log.error('GameRoom', 'initializeGame CRASHED:', err);
                console.error('Full initializeGame error:', err);
                return;
            }
            this.state.phase = "playing";
            this.state.isPaused = true;  // Start paused so players can see the board
            this.updateListingMetadata();
        });

        // Update gameplay config (host only, lobby phase)
        this.onMessage("updateConfig", (client, message: { config: Partial<EngineConfig> }) => {
            if (client.sessionId !== this.state.hostSessionId) return;
            if (this.state.phase !== "lobby") return;
            if (!message.config || typeof message.config !== 'object') return;

            this.engineConfig = { ...this.engineConfig, ...message.config };
            log.game('GameRoom', `Config updated by host: ${Object.keys(message.config).join(', ')}`);
        });

        // Update room options (host only, lobby phase)
        this.onMessage("updateRoomOptions", (client, message: Partial<RoomOptions>) => {
            if (client.sessionId !== this.state.hostSessionId) return;
            if (this.state.phase !== "lobby") return;

            if (message.playerCount && message.playerCount !== this.maxClients) {
                this.maxClients = message.playerCount;
                this.state.maxPlayers = message.playerCount;
            }
            if (message.mapType) this.roomOptions.mapType = message.mapType;
            if (message.starsPerPlayer) this.roomOptions.starsPerPlayer = message.starsPerPlayer;
            if (message.shipsPerStar) this.roomOptions.shipsPerStar = message.shipsPerStar;
            if (message.starSpacing) this.roomOptions.starSpacing = message.starSpacing;
            if (message.mapBoardFit !== undefined) this.roomOptions.mapBoardFit = message.mapBoardFit;

            this.updateListingMetadata();
            log.game('GameRoom', `Room options updated by host`);
        });

        // Restart game — vote-based: any connected human can vote
        this.onMessage("requestRestart", (client) => {
            if (this.state.phase !== "playing" && this.state.phase !== "ended") return;

            const player = this.state.players.get(client.sessionId);
            if (!player || player.isAI) return;

            this.restartVotes.add(client.sessionId);

            // Count connected humans (use Room.clients, not schema)
            const connectedIds = new Set(this.clients.map(c => c.sessionId));
            let connectedHumans = 0;
            this.state.players.forEach((p, sid) => {
                if (!p.isAI && connectedIds.has(sid)) connectedHumans++;
            });

            const votesNeeded = connectedHumans;
            const currentVotes = this.restartVotes.size;

            log.game('GameRoom', `Restart vote: ${player.name} (${currentVotes}/${votesNeeded})`);

            // Broadcast vote progress to all clients
            this.broadcast("restartVote", {
                votes: currentVotes,
                needed: votesNeeded,
                voters: Array.from(this.restartVotes),
            });

            // Execute restart when all connected humans agree
            if (currentVotes >= votesNeeded) {
                this.executeRestart();
            }
        });

        // Legacy: old restartGame message maps to requestRestart
        this.onMessage("restartGame", (client) => {
            // Backwards-compatible: host-only instant restart
            if (client.sessionId !== this.state.hostSessionId) {
                // Non-host? Treat as a vote
                this.restartVotes.add(client.sessionId);
                return;
            }
            this.executeRestart();
        });

        // Surrender — player forfeits but stays connected as spectator
        this.onMessage("surrender", (client) => {
            if (this.state.phase !== "playing") return;

            const player = this.state.players.get(client.sessionId);
            if (!player || player.isEliminated) return;

            log.game('GameRoom', `Player ${player.name} (${client.sessionId}) surrendered`);
            player.isEliminated = true;

            // Neutralize all their stars (clear owner, cancel orders) 
            this.state.stars.forEach((star) => {
                if (star.ownerId === client.sessionId) {
                    star.ownerId = "";
                    star.targetId = "";
                    star.queuedOrderTargetId = "";
                    // Keep ships in place as neutral defenders
                }
            });

            // Check if this creates a winner (only one non-eliminated player left)
            this.checkForWinner();
            this.updateListingMetadata();
        });

        // Unpause/resume
        this.onMessage("resume", (client) => {
            if (this.state.phase !== "playing") return;
            this.state.isPaused = false;
            this.startTick();
            log.game('GameRoom', `Game resumed by ${client.sessionId}`);
        });

        // Pause
        this.onMessage("pause", (client) => {
            if (this.state.phase !== "playing") return;
            this.state.isPaused = true;
            this.stopTick();
            log.game('GameRoom', `Game paused by ${client.sessionId}`);
        });

        // Set speed
        this.onMessage("setSpeed", (client, message: { speed: number }) => {
            if (this.state.phase !== "playing") return;
            this.state.speed = message.speed;
            if (message.speed === 0) {
                this.stopTick();
            } else {
                this.restartTick();
            }
            log.game('GameRoom', `Speed set to ${message.speed}x by ${client.sessionId}`);
        });

        // Set tick interval (BASE_TICK_MS)
        this.onMessage("setTickInterval", (client, message: { ms: number }) => {
            if (this.state.phase !== "playing") return;
            const ms = Math.max(100, Math.min(5000, message.ms));
            this.tickIntervalBase = ms;
            if (!this.state.isPaused && this.state.speed > 0) {
                this.restartTick();
            }
            log.game('GameRoom', `Tick interval set to ${ms}ms by ${client.sessionId}`);
        });

        // Issue order (attack/reinforce)
        this.onMessage("issueOrder", (client, message: { sourceId: string; targetId: string; persist?: boolean }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const source = this.state.stars.get(message.sourceId);
            if (!source) return;

            // Only allow orders on owned stars
            if (source.ownerId !== player.sessionId) {
                log.net('GameRoom', `Player ${player.sessionId} tried to order non-owned star ${message.sourceId}`);
                return;
            }

            const target = this.state.stars.get(message.targetId);
            if (!target) return;

            // Verify source and target are connected by a route
            if (!this.areStarsConnected(message.sourceId, message.targetId)) {
                log.net('GameRoom', `Rejected order: ${message.sourceId} → ${message.targetId} (not connected)`);
                return;
            }

            // Prevent same-player opposing loops (A→B and B→A by same owner).
            // Cross-player mutual combat is always allowed.
            if (target.targetId === message.sourceId && target.ownerId === source.ownerId) {
                target.targetId = "";
                log.game('GameRoom', `Opposing loop cancelled: ${message.targetId} → ${message.sourceId}`);
            }

            // Set order
            source.targetId = message.targetId;

            log.game('GameRoom', `Order: ${message.sourceId} → ${message.targetId} by ${player.sessionId}`);
        });

        // Cancel order
        this.onMessage("cancelOrder", (client, message: { starId: string }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const star = this.state.stars.get(message.starId);
            if (!star || star.ownerId !== player.sessionId) return;

            star.targetId = "";
            star.queuedOrderTargetId = "";
            log.game('GameRoom', `Order cancelled: ${message.starId} by ${player.sessionId}`);
        });

        // Deferred order (through enemy star)
        this.onMessage("setDeferredOrder", (client, message: { enemyStarId: string; nextTargetId: string; persist?: boolean }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const enemyStar = this.state.stars.get(message.enemyStarId);
            if (!enemyStar) return;

            // Must be enemy star
            if (enemyStar.ownerId === player.sessionId) return;

            // Verify enemy star and next target are connected
            if (!this.areStarsConnected(message.enemyStarId, message.nextTargetId)) {
                log.net('GameRoom', `Rejected deferred order: ${message.enemyStarId} → ${message.nextTargetId} (not connected)`);
                return;
            }

            enemyStar.queuedOrderTargetId = message.nextTargetId;
            log.game('GameRoom', `Deferred order: ${message.enemyStarId} → ${message.nextTargetId} by ${player.sessionId}`);
        });

        // Dispose room (host only, lobby phase, no other humans)
        this.onMessage("disposeRoom", (client) => {
            if (client.sessionId !== this.state.hostSessionId) {
                client.send("disposeError", { reason: "Only the host can dispose the room" });
                return;
            }
            // Count connected humans other than the host
            let otherHumans = 0;
            this.state.players.forEach((p, sid) => {
                if (!p.isAI && p.isConnected && sid !== client.sessionId) otherHumans++;
            });
            if (otherHumans > 0) {
                client.send("disposeError", { reason: "Cannot dispose — other players are still connected" });
                return;
            }
            log.net('GameRoom', `Host ${client.sessionId} disposed room`);
            this.disconnect();
        });

        // ── Lobby chat ──────────────────────────────────────────────────────
        this.onMessage("chat", (client, message: { text: string }) => {
            if (!message.text || typeof message.text !== 'string') return;
            const text = message.text.trim().slice(0, 500); // cap length
            if (!text) return;

            const player = this.state.players.get(client.sessionId);
            const senderName = player?.name || 'Unknown';
            const senderColor = player?.color || '#888888';

            this.broadcast("chat", {
                senderId: client.sessionId,
                senderName,
                senderColor,
                text,
                timestamp: Date.now(),
            });
            log.net('GameRoom', `Chat from ${senderName}: ${text.slice(0, 80)}`);
        });

        // ── Vote to start (non-host lobby vote) ─────────────────────────────
        this.onMessage("voteToStart", (client) => {
            if (this.state.phase !== "lobby") return;
            // Host doesn't need to vote — they have START GAME
            if (client.sessionId === this.state.hostSessionId) return;

            const player = this.state.players.get(client.sessionId);
            if (!player || player.isAI) return;

            this.startVotes.add(client.sessionId);

            // Count connected non-host humans
            const connectedIds = new Set(this.clients.map(c => c.sessionId));
            let nonHostHumans = 0;
            this.state.players.forEach((p, sid) => {
                if (!p.isAI && connectedIds.has(sid) && sid !== this.state.hostSessionId) nonHostHumans++;
            });

            const currentVotes = this.startVotes.size;
            log.game('GameRoom', `Vote to start: ${player.name} (${currentVotes}/${nonHostHumans})`);

            // Broadcast vote progress
            this.broadcast("startVote", {
                votes: currentVotes,
                needed: nonHostHumans,
                voters: Array.from(this.startVotes),
            });
        });
    }

    // ========================================================================
    // Game Initialization
    // ========================================================================

    private initializeGame() {
        // Fill remaining slots with AI
        const humanCount = this.state.players.size;
        const totalPlayers = this.maxClients;

        for (let i = humanCount; i < totalPlayers; i++) {
            const aiPlayer = new PlayerSchema();
            aiPlayer.id = `ai-${i}`;
            aiPlayer.sessionId = `ai-session-${i}`;
            aiPlayer.name = `AI ${i}`;
            const configuredColor = this.getConfiguredPlayerColor(i);
            aiPlayer.color = configuredColor ?? PLAYER_COLORS[i % PLAYER_COLORS.length];
            aiPlayer.isAI = true;
            aiPlayer.isEliminated = false;
            aiPlayer.isConnected = true;
            this.state.players.set(aiPlayer.sessionId, aiPlayer);

            // Enforce min 30deg hue separation against humans and other AIs
            if (!configuredColor) {
                aiPlayer.color = this.enforceHueSeparation(aiPlayer.color);
            }
        }

        this.state.playerCount = this.state.players.size;

        // Generate map based on mapType
        const mt = this.roomOptions.mapType || 'standard';
        if (mt === 'debug' || mt === 'debug-b') {
            this.initDebugMap();
        } else {
            this.initStandardMap();
        }

        log.sys('GameRoom', `Map initialized: ${this.state.stars.size} stars, ${this.state.connections.length} connections`);

        // Tally initial player stats so leaderboard shows correct values immediately
        GameEngine.updatePlayerStats(this.state);
    }

    private initDebugMap() {
        const centerX = 800;
        const centerY = 450;
        const spread = 250;

        const playerIds = Array.from(this.state.players.values()).map(p => p.sessionId);
        const humanId = playerIds[0] || 'player-0';
        const aiId = playerIds[1] || 'ai-1';

        // Star A: Human (top)
        this.createStar('star-a', centerX, centerY - spread, humanId, 'green');

        // Star B: AI (bottom-left)
        this.createStar('star-b', centerX - spread, centerY + spread * 0.6, aiId, 'red');

        // Star C: Neutral (bottom-right)
        this.createStar('star-c', centerX + spread, centerY + spread * 0.6, 'neutral', 'yellow');

        // Star D: Dead-end (far top-right)
        this.createStar('star-d', centerX + spread * 1.2, centerY - spread * 0.8, 'neutral', 'blue');

        // Connections (triangle + dead-end)
        this.addConnection('star-a', 'star-b');
        this.addConnection('star-b', 'star-c');
        this.addConnection('star-c', 'star-a');
        this.addConnection('star-a', 'star-d');

        const { mapLaneMode, laneMarginPx } = this.getLaneGenerationOptions();
        this.attachLaneDataToExistingConnections(mapLaneMode, laneMarginPx);
    }

    private initStandardMap() {
        const playerIds = Array.from(this.state.players.values()).map(p => p.sessionId);
        const starsPerPlayer = this.roomOptions.starsPerPlayer ?? 5;

        // Delegate placement + connections to shared mapgen
        const { msr, laneMarginPx, curveVsPruneBias, mapLaneMode } = this.getLaneGenerationOptions();
        const result = generateMap({
            width: 1600,
            height: 900,
            playerCount: playerIds.length,
            starsPerPlayer,
            spacingMultiplier: this.roomOptions.starSpacing ?? 1.0,
            minLinksPerStar: this.roomOptions.minLinks ?? 1,
            maxLinksPerStar: this.roomOptions.maxLinks ?? 6,
            boardFit: this.roomOptions.mapBoardFit ?? 0,
            mapgenStarMarginPx: msr,
            mapgenLaneMarginPx: laneMarginPx,
            mapgenLaneCurveVsPruneBias: curveVsPruneBias,
            mapLaneMode,
        });

        log.sys('GameRoom', `Map: ${result.positions.length} stars, ${result.connections.length} connections (hex r=${result.hexRadius}, ${result.width}x${result.height})`);

        // Randomize which position gets which owner via shuffled indices.
        // IMPORTANT: positions must stay in original order because generateMap()
        // assigns IDs star-0..N matching position indices, and connections reference those IDs.
        const starTypes = ['grey', 'yellow', 'blue', 'purple', 'red', 'green'];
        const totalStars = result.positions.length;
        const ownerIndices = Array.from({ length: totalStars }, (_, i) => i);
        for (let i = ownerIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ownerIndices[i], ownerIndices[j]] = [ownerIndices[j], ownerIndices[i]];
        }

        result.positions.forEach((pos, i) => {
            const ownerIdx = ownerIndices[i];
            const ownerId = playerIds[ownerIdx % playerIds.length];
            const isCapital = ownerIdx < playerIds.length;
            // Randomize star type (capitals are always grey)
            const starType = isCapital
                ? 'grey'
                : starTypes[Math.floor(Math.random() * starTypes.length)];
            this.createStar(`star-${i}`, pos.x, pos.y, ownerId, starType);
        });

        // Create connection schemas from shared result
        for (const conn of result.connections) {
            this.addConnection(conn.sourceId, conn.targetId, conn.distance, conn.laneWaypoints, conn.lanePathKind);
        }
    }

    private createStar(id: string, x: number, y: number, ownerId: string, starType: string) {
        const star = new StarSchema();
        const stats = STAR_TYPE_STATS[starType as import("@pax/common").StarType] || STAR_TYPE_STATS['grey'];
        star.id = id;
        star.x = x;
        star.y = y;
        star.ownerId = ownerId;
        star.starType = starType;
        star.activeShips = this.roomOptions.shipsPerStar ?? 40;
        star.damagedShips = 0;
        star.productionRate = 1;
        star.repairRate = stats.repairRate;
        star.transferRate = stats.transferRate;
        star.activationRate = stats.activationRate;
        star.defensivePosture = stats.defensivePosture;
        star.defenseStrength = stats.defenseStrength;
        star.radius = 25;
        star.icon = "🌟";
        // Integer-ship invariant fields
        star.productionOverflow = 0;
        star.repairOverflow = 0;
        star.lastCombatTick = -1;
        star.lastAttackTick = -1;
        this.state.stars.set(id, star);
    }

    private getLaneGenerationOptions(): {
        msr: number;
        laneMarginPx: number;
        curveVsPruneBias: number;
        mapLaneMode: MapLaneMode;
    } {
        const gc = this.roomOptions.gameplayConfig as LaneGameplayConfig | undefined;
        const msr = gc?.MODIFIED_VORONOI_STAR_MARGIN ?? 45;
        const laneMarginPx =
            gc?.MAPGEN_LANE_MARGIN_PX
            ?? (gc?.MAPGEN_LANE_BUFFER_PX != null ? msr + gc.MAPGEN_LANE_BUFFER_PX : 75);
        const curveVsPruneBias = Math.min(
            1,
            Math.max(0, gc?.MAPGEN_LANE_CURVE_VS_PRUNE_BIAS ?? 0.55),
        );

        return {
            msr,
            laneMarginPx,
            curveVsPruneBias,
            mapLaneMode: gc?.MAPGEN_LANE_MODE ?? 'curved',
        };
    }

    private attachLaneDataToExistingConnections(mode: MapLaneMode, laneMarginPx: number) {
        const stars = Array.from(this.state.stars.values()).map((star) => ({
            id: star.id,
            x: star.x,
            y: star.y,
        }));
        const seen = new Set<string>();
        const uniConnections: MapConnection[] = [];

        for (let index = 0; index < this.state.connections.length; index++) {
            const connection = this.state.connections[index];
            const a = connection.sourceId <= connection.targetId ? connection.sourceId : connection.targetId;
            const b = connection.sourceId <= connection.targetId ? connection.targetId : connection.sourceId;
            const key = `${a}|${b}`;
            if (seen.has(key)) continue;
            seen.add(key);
            uniConnections.push({
                sourceId: a,
                targetId: b,
                distance: connection.distance,
            });
        }

        attachLaneWaypointsToConnections(stars, uniConnections, mode, laneMarginPx);
        this.state.connections.splice(0, this.state.connections.length);
        for (const connection of uniConnections) {
            this.addConnection(
                connection.sourceId,
                connection.targetId,
                connection.distance,
                connection.laneWaypoints,
                connection.lanePathKind,
            );
        }
    }

    private addConnection(
        sourceId: string,
        targetId: string,
        distanceOverride?: number,
        laneWaypoints?: Array<[number, number]>,
        lanePathKind?: LanePathKind,
    ) {
        const source = this.state.stars.get(sourceId);
        const target = this.state.stars.get(targetId);
        if (!source || !target) return;

        const distance = distanceOverride ?? Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2);

        const assignLaneData = (
            connection: ConnectionSchema,
            waypoints?: Array<[number, number]>,
            pathKind?: LanePathKind,
        ) => {
            connection.lanePathKind = pathKind ?? "";
            if (!waypoints || waypoints.length < 2) return;
            for (const [x, y] of waypoints) {
                const point = new PointSchema();
                point.x = x;
                point.y = y;
                connection.laneWaypoints.push(point);
            }
        };

        // Add bidirectional
        const conn1 = new ConnectionSchema();
        conn1.sourceId = sourceId;
        conn1.targetId = targetId;
        conn1.distance = distance;
        assignLaneData(conn1, laneWaypoints, lanePathKind);
        this.state.connections.push(conn1);

        const conn2 = new ConnectionSchema();
        conn2.sourceId = targetId;
        conn2.targetId = sourceId;
        conn2.distance = distance;
        assignLaneData(conn2, laneWaypoints ? [...laneWaypoints].reverse() : undefined, lanePathKind);
        this.state.connections.push(conn2);
    }

    /** Check if two stars are linked by a connection/route */
    private areStarsConnected(starA: string, starB: string): boolean {
        for (let i = 0; i < this.state.connections.length; i++) {
            const conn = this.state.connections[i];
            if (conn.sourceId === starA && conn.targetId === starB) return true;
        }
        return false;
    }

    // generateConnections + pointToSegment removed — now handled by @pax/common/mapgen

    // ========================================================================
    // Tick Loop
    // ========================================================================

    private startTick() {
        if (this.tickIntervalId) return;

        const interval = Math.max(100, this.tickIntervalBase / this.state.speed);

        // Fire the first tick immediately (no delay)
        this.tickStartTime = Date.now();
        this.executeTick();

        this.tickIntervalId = setInterval(() => {
            this.executeTick();
        }, interval);
    }

    private stopTick() {
        if (this.tickIntervalId) {
            clearInterval(this.tickIntervalId);
            this.tickIntervalId = null;
        }
    }

    private restartTick() {
        this.stopTick();
        if (this.state.speed > 0 && !this.state.isPaused) {
            this.startTick();
        }
    }

    private executeTick() {
        try {
            // 1. AI DECISION MAKING (server-only, runs before shared tick)
            this.processAI();

            // 2. SHARED ENGINE TICK (with gameplay config from client)
            const events = GameEngine.tick(this.state, this.engineConfig);

            // 3. BROADCAST TICK EVENTS to clients (for animations, combat logs)
            const hasEvents = events.transfers.length > 0 ||
                events.combats.length > 0 ||
                events.conquests.length > 0;
            if (hasEvents) {
                this.broadcast("tickEvents", events);
            }

            // 4. POST-TICK: Check if game ended (server needs to stop interval)
            if (this.state.phase === "ended") {
                this.stopTick();
                const winner = this.state.winnerId
                    ? this.state.players.get(this.state.winnerId)?.name
                    : 'nobody';
                log.game('GameRoom', `Game ended. Winner: ${winner}`);
            }

            // 5. Reset tick progress for interpolation
            this.state.tickProgress = 0;

            // 6. Update lobby listing metadata periodically (every 10 ticks)
            if (this.state.tick % 10 === 0) {
                this.updateListingMetadata();
            }
        } catch (err) {
            log.error('GameRoom', 'executeTick CRASHED:', err);
            console.error('Full tick error:', err);
            this.stopTick();
        }
    }

    private processAI() {
        // Get all AI players
        const aiPlayers = Array.from(this.state.players.values()).filter(p => p.isAI);

        for (const ai of aiPlayers) {
            // Get AI's stars
            const aiStars = Array.from(this.state.stars.values()).filter(s => s.ownerId === ai.sessionId);

            for (const star of aiStars) {
                // Skip if already has an order
                if (star.targetId) continue;

                // Skip if too few ships to attack
                if (star.activeShips < 20) continue;

                // Find connected stars
                const connectedIds = Array.from(this.state.connections)
                    .filter((c): c is ConnectionSchema => c != null && c.sourceId === star.id)
                    .map(c => c.targetId);

                // Look for enemy target
                let bestTarget: { id: string; ships: number } | null = null;
                let weakestFriendly: { id: string; ships: number } | null = null;

                for (const targetId of connectedIds) {
                    const target = this.state.stars.get(targetId);
                    if (!target) continue;

                    if (target.ownerId !== ai.sessionId) {
                        // Enemy - attack weakest
                        if (!bestTarget || target.activeShips < bestTarget.ships) {
                            bestTarget = { id: target.id, ships: target.activeShips };
                        }
                    } else {
                        // Friendly - reinforce weakest
                        if (!weakestFriendly || target.activeShips < weakestFriendly.ships) {
                            weakestFriendly = { id: target.id, ships: target.activeShips };
                        }
                    }
                }

                // Prefer attacking, then reinforcing
                if (bestTarget && star.activeShips > bestTarget.ships * 1.5) {
                    star.targetId = bestTarget.id;
                } else if (weakestFriendly && star.activeShips > weakestFriendly.ships * 2) {
                    star.targetId = weakestFriendly.id;
                }
            }
        }
    }

    /** Check if only one non-eliminated player remains — declare winner */
    private checkForWinner() {
        const alive: string[] = [];
        this.state.players.forEach((p, sid) => {
            if (!p.isEliminated) alive.push(sid);
        });

        if (alive.length === 1) {
            this.state.winnerId = alive[0];
            this.state.phase = "ended";
            this.stopTick();
            const winner = this.state.players.get(alive[0]);
            log.game('GameRoom', `Game ended via surrender. Winner: ${winner?.name ?? alive[0]}`);
        }
    }

    /** Execute the actual restart — clear state and return to lobby */
    private executeRestart() {
        log.game('GameRoom', 'Executing restart — returning to lobby');

        // Clear votes
        this.restartVotes.clear();

        // Stop game loop
        this.stopTick();

        // Clear map data
        this.state.stars.clear();
        this.state.connections.splice(0, this.state.connections.length);

        // Remove AI players, keep human players
        const aiSessionIds: string[] = [];
        this.state.players.forEach((p, sid) => {
            if (p.isAI) {
                aiSessionIds.push(sid);
            } else {
                // Reset human player stats
                p.totalShips = 0;
                p.starCount = 0;
                p.isEliminated = false;
            }
        });
        aiSessionIds.forEach(sid => this.state.players.delete(sid));
        this.state.playerCount = this.state.players.size;

        // Reset game state
        this.state.phase = "lobby";
        this.state.isPaused = true;
        this.state.tick = 0;
        this.state.tickProgress = 0;
        this.state.speed = 1;
        this.state.winnerId = "";

        log.game('GameRoom', `Restart complete. ${this.state.players.size} human players retained.`);
        this.updateListingMetadata();
    }

}
