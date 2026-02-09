// ============================================================================
// Pax Fluxia - Game Room (Colyseus)
// ============================================================================

import { Room, Client } from "colyseus";
import {
    GameRoomState,
    PlayerSchema,
    StarSchema,
    ConnectionSchema
} from "../schema/GameState.schema";

// Import shared game logic from @pax/common
import { GameEngine, STAR_TYPE_STATS } from "@pax/common";
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


// Room options passed from client
interface RoomOptions {
    playerCount?: number;
    mapType?: 'standard' | 'debug';
    starSpacing?: number;
}

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
    private roomOptions: RoomOptions = {};

    // State - will be set in onCreate using this.setState() per 0.17.29 requirement
    declare state: GameRoomState;

    // ========================================================================
    // Room Lifecycle
    // ========================================================================

    onCreate(options: RoomOptions) {
        try {
            log.sys('GameRoom', 'onCreate starting...', options);

            // IMPORTANT: Use setState() per Colyseus 0.17.29 strict type requirements
            log.sys('GameRoom', 'Calling this.setState()...');
            this.setState(new GameRoomState());

            this.roomOptions = options;
            this.maxClients = options.playerCount || 4;

            log.sys('GameRoom', 'Setting state values...');
            // Initialize state values
            this.state.maxPlayers = this.maxClients;
            this.state.phase = "lobby";
            this.state.speed = 1;
            this.state.isPaused = true;
            this.state.tick = 0;
            this.state.tickProgress = 0;

            log.sys('GameRoom', 'Registering message handlers...');
            // Register message handlers
            this.registerMessageHandlers();

            log.sys('GameRoom', `onCreate complete. Max players: ${this.maxClients}`);
        } catch (err) {
            log.error('GameRoom', 'Error in onCreate', err);
            throw err;
        }
    }

    onJoin(client: Client, options: any) {
        log.net('GameRoom', `Player joined: ${client.sessionId}`);
        client.send("playerJoined", { sessionId: client.sessionId });
        client.send("welcome", "Default welcome message from server!")
        // First player is host
        if (this.state.players.size === 0) {
            this.state.hostSessionId = client.sessionId;
            log.net('GameRoom', `Host assigned: ${client.sessionId}`);
        }

        // Create player schema
        const playerIndex = this.state.players.size;
        const player = new PlayerSchema();
        player.id = `player-${playerIndex}`;
        player.sessionId = client.sessionId;
        player.name = options.name || `Player ${playerIndex + 1}`;
        player.color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
        player.isAI = false;
        player.isEliminated = false;
        player.isConnected = true;

        this.state.players.set(client.sessionId, player);
        this.state.playerCount = this.state.players.size;

        log.net('GameRoom', `Player ${player.id} (${player.name}) joined as ${player.color}`);
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
        if (client.sessionId === this.state.hostSessionId && this.state.players.size > 0) {
            // Assign new host
            const newHost = Array.from(this.state.players.keys())[0];
            this.state.hostSessionId = newHost;
            log.net('GameRoom', `New host assigned: ${newHost}`);
        }
    }

    onDispose() {
        log.sys('GameRoom', 'Room disposed');
        this.stopTick();
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
            this.initializeGame();
            this.state.phase = "playing";
            this.state.isPaused = true; // Start paused, await player ready
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

            // Set order
            source.targetId = message.targetId;

            // Prevent circular orders: if target has order back to source, cancel it
            if (target.ownerId === player.sessionId && target.targetId === message.sourceId) {
                target.targetId = "";
                log.game('GameRoom', `Circular order cancelled: ${message.targetId} → ${message.sourceId}`);
            }

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
            aiPlayer.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
            aiPlayer.isAI = true;
            aiPlayer.isEliminated = false;
            aiPlayer.isConnected = true;
            this.state.players.set(aiPlayer.sessionId, aiPlayer);
        }

        this.state.playerCount = this.state.players.size;

        // Generate map based on mapType
        if (this.roomOptions.mapType === 'debug') {
            this.initDebugMap();
        } else {
            this.initStandardMap();
        }

        log.sys('GameRoom', `Map initialized: ${this.state.stars.size} stars, ${this.state.connections.length} connections`);
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
    }

    private initStandardMap() {
        const width = 1600;
        const height = 900;
        const padding = 100;

        const playerIds = Array.from(this.state.players.values()).map(p => p.sessionId);
        const starsPerPlayer = 5;
        const totalStars = playerIds.length * starsPerPlayer;

        // Generate random positions with spacing
        const positions: { x: number; y: number }[] = [];
        const minSpacing = 120;

        for (let i = 0; i < totalStars && positions.length < totalStars; i++) {
            let attempts = 0;
            while (attempts < 100) {
                const x = padding + Math.random() * (width - padding * 2);
                const y = padding + Math.random() * (height - padding * 2);

                // Check spacing
                const tooClose = positions.some(p =>
                    Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < minSpacing
                );

                if (!tooClose) {
                    positions.push({ x, y });
                    break;
                }
                attempts++;
            }
        }

        // Create stars
        positions.forEach((pos, i) => {
            const ownerId = playerIds[i % playerIds.length];
            const starTypes = ['grey', 'yellow', 'blue', 'purple', 'red', 'green'];
            const starType = starTypes[Math.floor(Math.random() * starTypes.length)];
            this.createStar(`star-${i}`, pos.x, pos.y, ownerId, starType);
        });

        // Generate connections using Delaunay-like approach (simplified)
        this.generateConnections();
    }

    private createStar(id: string, x: number, y: number, ownerId: string, starType: string) {
        const star = new StarSchema();
        const stats = STAR_TYPE_STATS[starType as import("@pax/common").StarType] || STAR_TYPE_STATS['grey'];
        star.id = id;
        star.x = x;
        star.y = y;
        star.ownerId = ownerId;
        star.starType = starType;
        star.activeShips = 40; // Starting ships
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
        this.state.stars.set(id, star);
    }

    private addConnection(sourceId: string, targetId: string) {
        const source = this.state.stars.get(sourceId);
        const target = this.state.stars.get(targetId);
        if (!source || !target) return;

        const distance = Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2);

        // Add bidirectional
        const conn1 = new ConnectionSchema();
        conn1.sourceId = sourceId;
        conn1.targetId = targetId;
        conn1.distance = distance;
        this.state.connections.push(conn1);

        const conn2 = new ConnectionSchema();
        conn2.sourceId = targetId;
        conn2.targetId = sourceId;
        conn2.distance = distance;
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

    private generateConnections() {
        const stars = Array.from(this.state.stars.values());
        const connected = new Set<string>();
        const linkCount = new Map<string, number>();
        stars.forEach(s => linkCount.set(s.id, 0));

        // Phase 1: Build nearest-neighbor connections
        stars.forEach(star => {
            const distances = stars
                .filter(s => s.id !== star.id)
                .map(s => ({
                    id: s.id,
                    distance: Math.sqrt((s.x - star.x) ** 2 + (s.y - star.y) ** 2)
                }))
                .sort((a, b) => a.distance - b.distance);

            const connectionCount = 2 + Math.floor(Math.random() * 3); // 2-4
            distances.slice(0, connectionCount).forEach(d => {
                const key = [star.id, d.id].sort().join('-');
                if (!connected.has(key)) {
                    connected.add(key);
                    linkCount.set(star.id, (linkCount.get(star.id) || 0) + 1);
                    linkCount.set(d.id, (linkCount.get(d.id) || 0) + 1);
                }
            });
        });

        const starMap = new Map(stars.map(s => [s.id, s]));

        // Phase 2: Remove near-zero angle connections (15° minimum)
        const MIN_ANGLE_RAD = (15 * Math.PI) / 180;
        let changed = true;
        while (changed) {
            changed = false;
            for (const star of stars) {
                const edges: { key: string; targetId: string; angle: number; dist: number }[] = [];
                connected.forEach(key => {
                    const [aId, bId] = key.split('-');
                    let targetId: string | null = null;
                    if (aId === star.id) targetId = bId;
                    else if (bId === star.id) targetId = aId;
                    if (!targetId) return;

                    const target = starMap.get(targetId)!;
                    const dx = target.x - star.x;
                    const dy = target.y - star.y;
                    edges.push({ key, targetId, angle: Math.atan2(dy, dx), dist: Math.sqrt(dx * dx + dy * dy) });
                });

                if (edges.length < 2) continue;
                edges.sort((a, b) => a.angle - b.angle);

                for (let i = 0; i < edges.length; i++) {
                    const curr = edges[i];
                    const next = edges[(i + 1) % edges.length];
                    let angleDiff = next.angle - curr.angle;
                    if (angleDiff < 0) angleDiff += 2 * Math.PI;

                    if (angleDiff < MIN_ANGLE_RAD) {
                        const toRemove = curr.dist > next.dist ? curr : next;
                        const sCount = linkCount.get(star.id)!;
                        const tCount = linkCount.get(toRemove.targetId)!;
                        if (sCount > 1 && tCount > 1) {
                            connected.delete(toRemove.key);
                            linkCount.set(star.id, sCount - 1);
                            linkCount.set(toRemove.targetId, tCount - 1);
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }

        // Phase 3: Remove connections that pass through intermediate stars
        const CLEARANCE = 35;
        changed = true;
        while (changed) {
            changed = false;
            for (const key of Array.from(connected)) {
                const [aId, bId] = key.split('-');
                const a = starMap.get(aId)!;
                const b = starMap.get(bId)!;

                let passesThrough = false;
                for (const other of stars) {
                    if (other.id === aId || other.id === bId) continue;
                    const dist = this.pointToSegment(other.x, other.y, a.x, a.y, b.x, b.y);
                    if (dist < CLEARANCE) {
                        passesThrough = true;
                        break;
                    }
                }

                if (passesThrough) {
                    const ac = linkCount.get(aId)!;
                    const bc = linkCount.get(bId)!;
                    if (ac > 1 && bc > 1) {
                        connected.delete(key);
                        linkCount.set(aId, ac - 1);
                        linkCount.set(bId, bc - 1);
                        changed = true;
                    }
                }
            }
        }

        // Create final connection schemas
        connected.forEach(key => {
            const [aId, bId] = key.split('-');
            this.addConnection(aId, bId);
        });
    }

    private pointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
        return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
    }

    // ========================================================================
    // Tick Loop
    // ========================================================================

    private startTick() {
        if (this.tickIntervalId) return;

        const BASE_TICK_MS = 1200;
        const interval = Math.max(100, BASE_TICK_MS / this.state.speed);

        this.tickStartTime = Date.now();
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
        // 1. AI DECISION MAKING (server-only, runs before shared tick)
        this.processAI();

        // 2. SHARED ENGINE TICK (production, orders, combat, repair, stats, win-check)
        const events = GameEngine.tick(this.state);

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

}
