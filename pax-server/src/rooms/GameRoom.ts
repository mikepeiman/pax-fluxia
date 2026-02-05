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
import {
    calculateCombat,
    calculateProduction,
    calculateRepair,
    calculateTransfer,
    isAttackOrder,
    COMBAT_CONFIG,
    ORDER_CONFIG
} from "@pax/common";

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
            console.log(`📍 onCreate starting...`);
            console.log(`🎮 GameRoom created with options:`, options);

            // IMPORTANT: Use setState() per Colyseus 0.17.29 strict type requirements
            console.log(`📍 Calling this.setState()...`);
            this.setState(new GameRoomState());

            this.roomOptions = options;
            this.maxClients = options.playerCount || 4;

            console.log(`📍 Setting state values...`);
            // Initialize state values
            this.state.maxPlayers = this.maxClients;
            this.state.phase = "lobby";

            console.log(`📍 Registering message handlers...`);
            // Register message handlers
            this.registerMessageHandlers();

            console.log(`✅ onCreate complete. Max players: ${this.maxClients}`);
        } catch (err) {
            console.error(`❌ Error in onCreate:`, err);
            throw err;
        }
    }

    onJoin(client: Client, options: any) {
        console.log(`👤 Player joined: ${client.sessionId}`);
        client.send("playerJoined", { sessionId: client.sessionId });
        client.send("welcome", "Default welcome message from server!")
        // First player is host
        if (this.state.players.size === 0) {
            this.state.hostSessionId = client.sessionId;
            console.log(`   → Host assigned: ${client.sessionId}`);
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

        console.log(`   → Player ${player.id} (${player.name}) joined as ${player.color}`);
    }

    onLeave(client: Client, code?: number) {
        console.log(`👤 Player left: ${client.sessionId} (code: ${code})`);

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
            console.log(`   → New host: ${newHost}`);
        }
    }

    onDispose() {
        console.log(`🗑️ GameRoom disposed`);
        this.stopTick();
    }

    // ========================================================================
    // Message Handlers
    // ========================================================================

    private registerMessageHandlers() {
        // Start game (host only)
        this.onMessage("startGame", (client) => {
            if (client.sessionId !== this.state.hostSessionId) {
                console.log(`   ⚠️ Non-host tried to start game: ${client.sessionId}`);
                return;
            }
            if (this.state.phase !== "lobby") {
                console.log(`   ⚠️ Game already started`);
                return;
            }

            console.log(`🚀 Game starting!`);
            this.initializeGame();
            this.state.phase = "playing";
            this.state.isPaused = true; // Start paused, await player ready
        });

        // Unpause/resume
        this.onMessage("resume", (client) => {
            if (this.state.phase !== "playing") return;
            this.state.isPaused = false;
            this.startTick();
            console.log(`▶️ Game resumed by ${client.sessionId}`);
        });

        // Pause
        this.onMessage("pause", (client) => {
            if (this.state.phase !== "playing") return;
            this.state.isPaused = true;
            this.stopTick();
            console.log(`⏸️ Game paused by ${client.sessionId}`);
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
            console.log(`⏩ Speed set to ${message.speed}x by ${client.sessionId}`);
        });

        // Issue order (attack/reinforce)
        this.onMessage("issueOrder", (client, message: { sourceId: string; targetId: string; persist?: boolean }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const source = this.state.stars.get(message.sourceId);
            if (!source) return;

            // Only allow orders on owned stars
            if (source.ownerId !== player.id) {
                console.log(`   ⚠️ Player ${player.id} tried to order non-owned star ${message.sourceId}`);
                return;
            }

            const target = this.state.stars.get(message.targetId);
            if (!target) return;

            // Set order
            source.targetId = message.targetId;
            console.log(`📍 Order: ${message.sourceId} → ${message.targetId} by ${player.id}`);
        });

        // Cancel order
        this.onMessage("cancelOrder", (client, message: { starId: string }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const star = this.state.stars.get(message.starId);
            if (!star || star.ownerId !== player.id) return;

            star.targetId = "";
            star.queuedOrderTargetId = "";
            console.log(`❌ Order cancelled: ${message.starId} by ${player.id}`);
        });

        // Deferred order (through enemy star)
        this.onMessage("setDeferredOrder", (client, message: { enemyStarId: string; nextTargetId: string; persist?: boolean }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const enemyStar = this.state.stars.get(message.enemyStarId);
            if (!enemyStar) return;

            // Must be enemy star
            if (enemyStar.ownerId === player.id) return;

            enemyStar.queuedOrderTargetId = message.nextTargetId;
            console.log(`📍 Deferred: ${message.enemyStarId} → ${message.nextTargetId} by ${player.id}`);
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

        console.log(`🗺️ Map initialized with ${this.state.stars.size} stars, ${this.state.connections.length} connections`);
    }

    private initDebugMap() {
        const centerX = 800;
        const centerY = 450;
        const spread = 250;

        const playerIds = Array.from(this.state.players.values()).map(p => p.id);
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

        const playerIds = Array.from(this.state.players.values()).map(p => p.id);
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
        star.id = id;
        star.x = x;
        star.y = y;
        star.ownerId = ownerId;
        star.starType = starType;
        star.activeShips = 40; // Starting ships
        star.damagedShips = 0;
        star.productionRate = 1;
        star.repairRate = 0.2;
        star.radius = 25;
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

    private generateConnections() {
        // Simple nearest-neighbor connections
        const stars = Array.from(this.state.stars.values());
        const connected = new Set<string>();

        stars.forEach(star => {
            // Find 2-4 nearest neighbors
            const distances = stars
                .filter(s => s.id !== star.id)
                .map(s => ({
                    id: s.id,
                    distance: Math.sqrt((s.x - star.x) ** 2 + (s.y - star.y) ** 2)
                }))
                .sort((a, b) => a.distance - b.distance);

            const connectionCount = 2 + Math.floor(Math.random() * 3); // 2-4 connections
            distances.slice(0, connectionCount).forEach(d => {
                const key = [star.id, d.id].sort().join('-');
                if (!connected.has(key)) {
                    connected.add(key);
                    this.addConnection(star.id, d.id);
                }
            });
        });
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
        this.state.tick++;

        // 1. PRODUCTION
        this.state.stars.forEach(star => {
            if (star.ownerId && star.ownerId !== 'neutral') {
                // Simple production: add ships based on productionRate
                star.activeShips += star.productionRate;
            }
        });

        // 2. AI DECISION MAKING
        this.processAI();

        // 3. PROCESS ORDERS (simplified combat/reinforcement)
        this.processOrders();

        // 4. REPAIR
        this.state.stars.forEach(star => {
            if (star.damagedShips > 0) {
                const repaired = Math.max(1, Math.floor(star.damagedShips * star.repairRate));
                star.damagedShips -= repaired;
                star.activeShips += repaired;
            }
        });

        // 5. UPDATE PLAYER STATS
        this.updatePlayerStats();

        // 6. CHECK WIN CONDITION
        this.checkWinCondition();

        // Update tick progress
        this.state.tickProgress = 0;
    }

    private processAI() {
        // Get all AI players
        const aiPlayers = Array.from(this.state.players.values()).filter(p => p.isAI);

        for (const ai of aiPlayers) {
            // Get AI's stars
            const aiStars = Array.from(this.state.stars.values()).filter(s => s.ownerId === ai.id);

            for (const star of aiStars) {
                // Skip if already has an order
                if (star.targetId) continue;

                // Skip if too few ships to attack
                if (star.activeShips < 20) continue;

                // Find connected stars
                const connectedIds = Array.from(this.state.connections)
                    .filter(c => c.sourceId === star.id)
                    .map(c => c.targetId);

                // Look for enemy target
                let bestTarget: { id: string; ships: number } | null = null;
                let weakestFriendly: { id: string; ships: number } | null = null;

                for (const targetId of connectedIds) {
                    const target = this.state.stars.get(targetId);
                    if (!target) continue;

                    if (target.ownerId !== ai.id) {
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

    private processOrders() {
        this.state.stars.forEach(source => {
            if (!source.targetId) return;

            const target = this.state.stars.get(source.targetId);
            if (!target) return;

            // Use shared logic to determine attack vs reinforcement
            if (source.ownerId !== target.ownerId) {
                // COMBAT: Use shared combat calculation
                if (target.activeShips <= 0) {
                    // Instant conquest
                    this.executeConquest(source, target);
                    return;
                }

                // Calculate combat using shared logic
                const result = calculateCombat(source.activeShips, target.activeShips);

                // Apply damage to attacker (source)
                source.activeShips = Math.max(0, source.activeShips - result.attackerKills);
                source.damagedShips += result.attackerDisabled;

                // Apply damage to defender (target)
                target.activeShips = Math.max(0, target.activeShips - result.defenderKills);
                target.damagedShips += result.defenderDisabled;

                // Check conquest
                if (target.activeShips <= 0) {
                    this.executeConquest(source, target);
                }
            } else {
                // REINFORCEMENT: Use shared transfer calculation
                const transferAmount = calculateTransfer(source as any);
                if (transferAmount > 0 && source.activeShips > 0) {
                    const shipped = Math.min(transferAmount, source.activeShips);
                    source.activeShips -= shipped;
                    target.activeShips += shipped;
                }
            }
        });
    }

    private executeConquest(attacker: StarSchema, defender: StarSchema) {
        const previousOwner = defender.ownerId;

        // Transfer ownership
        defender.ownerId = attacker.ownerId;

        // Transfer 50% of attacker's ships
        const transferAmount = Math.floor(attacker.activeShips * 0.5);
        attacker.activeShips -= transferAmount;
        defender.activeShips = transferAmount;
        defender.damagedShips = 0;

        // Clear orders
        defender.targetId = "";

        // Check for queued order
        if (defender.queuedOrderTargetId) {
            defender.targetId = defender.queuedOrderTargetId;
            defender.queuedOrderTargetId = "";
        }

        // Clear attacker's order (target conquered)
        attacker.targetId = "";

        console.log(`🏴 Conquest: ${defender.id} captured by ${attacker.ownerId} (was ${previousOwner})`);
    }

    private updatePlayerStats() {
        this.state.players.forEach(player => {
            let totalShips = 0;
            let activeShips = 0;
            let damagedShips = 0;
            let starCount = 0;
            let production = 0;

            this.state.stars.forEach(star => {
                if (star.ownerId === player.id) {
                    starCount++;
                    activeShips += star.activeShips;
                    damagedShips += star.damagedShips;
                    production += star.productionRate;
                }
            });

            totalShips = activeShips + damagedShips;

            player.totalShips = totalShips;
            player.activeShips = activeShips;
            player.damagedShips = damagedShips;
            player.starCount = starCount;
            player.production = production;

            // Check elimination
            if (starCount === 0 && !player.isEliminated) {
                player.isEliminated = true;
                console.log(`💀 Player eliminated: ${player.name}`);
            }
        });
    }

    private checkWinCondition() {
        const activePlayers = Array.from(this.state.players.values())
            .filter(p => !p.isEliminated);

        if (activePlayers.length === 1) {
            this.state.winnerId = activePlayers[0].id;
            this.state.phase = "ended";
            this.stopTick();
            console.log(`🏆 Winner: ${activePlayers[0].name}!`);
        } else if (activePlayers.length === 0) {
            // Draw (shouldn't happen)
            this.state.phase = "ended";
            this.stopTick();
            console.log(`🤝 Draw! No players remain.`);
        }
    }
}
