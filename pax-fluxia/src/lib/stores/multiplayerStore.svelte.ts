// ============================================================================
// Multiplayer Store - Colyseus Client Connection
// ============================================================================

import { Client, Room } from '@colyseus/sdk';
import type { EngineConfig } from '@pax/common';
import type { PlayerState, StarState, StarConnection, StarId, GameHistoryEntry } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import type { TickEvents, TransferEvent } from '@pax/common';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';

// Server URL: env var > same-origin (production) > localhost (dev)
const SERVER_URL = import.meta.env.VITE_SERVER_URL
    || (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? window.location.origin
        : 'http://127.0.0.1:2567');

// ============================================================================
// State (Svelte 5 Runes)
// ============================================================================

let client: Client | null = null;
let room: Room | null = null;

// Connection state
let isConnected = $state(false);
let isConnecting = $state(false);
let connectionError = $state<string | null>(null);
let roomId = $state<string | null>(null);

// Room state (synced from server)
let phase = $state<'lobby' | 'playing' | 'ended'>('lobby');
let tick = $state(0);
let tickProgress = $state(0);
let isPaused = $state(true);
let speed = $state(1);
let playerCount = $state(0);
let maxPlayers = $state(4);
let hostSessionId = $state<string | null>(null);
let winnerId = $state<string | null>(null);
let localSessionId = $state<string | null>(null);

// Game state (converted from Colyseus schema)
let players = $state<PlayerState[]>([]);
let stars = $state<StarState[]>([]);
let connections = $state<StarConnection[]>([]);
let pendingTransfers = $state<TransferEvent[]>([]);
let gameHistory = $state<GameHistoryEntry[]>([]);

// Client-side tick interpolation (for smooth animations in MP)
const BASE_TICK_MS = 1200;
let lastTickTime = 0;
let tickProgressRAF: number | null = null;

function startTickProgressLoop() {
    if (tickProgressRAF !== null) return;

    function loop() {
        if (isPaused || phase !== 'playing' || speed <= 0) {
            tickProgress = 0;
            tickProgressRAF = requestAnimationFrame(loop);
            return;
        }

        const tickIntervalMs = BASE_TICK_MS / speed;
        const elapsed = performance.now() - lastTickTime;
        tickProgress = Math.min(1, elapsed / tickIntervalMs);
        tickProgressRAF = requestAnimationFrame(loop);
    }
    tickProgressRAF = requestAnimationFrame(loop);
}

function stopTickProgressLoop() {
    if (tickProgressRAF !== null) {
        cancelAnimationFrame(tickProgressRAF);
        tickProgressRAF = null;
    }
    tickProgress = 0;
}

// Derived - use function to ensure reactivity
function getIsHost(): boolean {
    return localSessionId !== null && hostSessionId !== null && localSessionId === hostSessionId;
}

// ============================================================================
// Connection Management
// ============================================================================

async function connect(): Promise<void> {
    if (client) return;

    isConnecting = true;
    connectionError = null;

    try {
        client = new Client(SERVER_URL);
        log.net('Colyseus', 'Client created');
    } catch (err) {
        connectionError = `Failed to connect: ${err}`;
        log.error('Colyseus', 'Connection failed', err);
    } finally {
        isConnecting = false;
    }
}

async function createRoom(options: {
    playerCount?: number;
    mapType?: string;
    starsPerPlayer?: number;
    shipsPerStar?: number;
    starSpacing?: number;
    minLinks?: number;
    maxLinks?: number;
    retainOrderOnConquest?: boolean;
    gameplayConfig?: Partial<EngineConfig>;
} = {}): Promise<string | null> {
    if (!client) await connect();
    if (!client) return null;

    isConnecting = true;
    connectionError = null;

    try {
        // Use $state.snapshot() to strip Svelte 5 Proxy - proper method for Svelte 5
        const plainOptions = $state.snapshot(options);
        log.net('Room', 'Creating room with options', plainOptions);
        room = await client.create('game_room', plainOptions);

        log.net('Room', `Created: id=${room?.roomId} session=${room?.sessionId}`);

        roomId = room.roomId;
        localSessionId = room.sessionId;
        isConnected = true;

        log.success('Room', `Joined: ${roomId}`);
        setupRoomListeners();
        return roomId;
    } catch (err: any) {
        connectionError = `Failed to create room: ${err}`;
        log.error('Room', `Creation failed: ${err?.message}`, err);
        return null;
    } finally {
        isConnecting = false;
    }
}

async function joinRoom(targetRoomId: string): Promise<boolean> {
    if (!client) await connect();
    if (!client) return false;

    isConnecting = true;
    connectionError = null;

    try {
        log.net('Room', `Joining room: ${targetRoomId}`);
        room = await client.joinById(targetRoomId);
        roomId = room.roomId;
        localSessionId = room.sessionId;
        isConnected = true;

        log.success('Room', `Joined: ${roomId}, session: ${localSessionId}`);
        setupRoomListeners();
        return true;
    } catch (err) {
        connectionError = `Failed to join room: ${err}`;
        log.error('Room', 'Join failed', err);
        return false;
    } finally {
        isConnecting = false;
    }
}

function leaveRoom(): void {
    stopTickProgressLoop();
    if (room) {
        room.leave();
        room = null;
    }

    isConnected = false;
    roomId = null;
    localSessionId = null;
    hostSessionId = null;
    phase = 'lobby';
    playerCount = 0;
    players = [];
    stars = [];
    connections = [];
    gameHistory = [];
}

function disconnect(): void {
    leaveRoom();
    client = null;
}

// ============================================================================
// State Sync
// ============================================================================

function syncStateFromRoom(state: any): void {
    const newPhase = state.phase ?? 'lobby';
    // Only log phase transitions, not every tick
    if (newPhase !== phase) {
        log.data('Sync', `phase=${newPhase} players=${state.players?.size ?? 0}`);
    }

    // Track tick changes for local interpolation
    const newTick = state.tick ?? 0;
    const newIsPaused = state.isPaused ?? true;

    if (newTick !== tick) {
        // New tick arrived — reset interpolation timer
        lastTickTime = performance.now();
    }

    // Detect restart: server reset phase back to "lobby"
    const prevPhase = phase;
    phase = newPhase;
    if (newPhase === 'lobby' && (prevPhase === 'playing' || prevPhase === 'ended')) {
        log.net('Room', 'Server reset to lobby — triggering menu transition');
        // Set gameStore view to menu so MainMenu shows (it will auto-detect MP connection)
        import('./gameStore.svelte').then(({ gameStore }) => {
            gameStore.setView('menu');
        });
    }
    tick = newTick;
    // tickProgress computed locally via RAF — don't overwrite from server
    isPaused = newIsPaused;
    speed = state.speed ?? 1;
    playerCount = state.playerCount ?? 0;
    maxPlayers = state.maxPlayers ?? 4;
    hostSessionId = state.hostSessionId ?? null;
    winnerId = state.winnerId ?? null;

    // Start/stop tick interpolation based on game state
    if (phase === 'playing' && !isPaused) {
        startTickProgressLoop();
    } else {
        stopTickProgressLoop();
    }

    // Convert players map to array
    const playerArray: PlayerState[] = [];
    if (state.players) {
        state.players.forEach((player: any, key: string) => {
            playerArray.push({
                id: player.id,
                name: player.name,
                color: player.color,
                isAI: player.isAI,
                isEliminated: player.isEliminated,
                starCount: player.starCount,
                totalShips: player.totalShips,
                activeShips: player.activeShips,
                damagedShips: player.damagedShips,
                production: player.production,
                sessionId: player.sessionId
            } as PlayerState & { sessionId: string });
        });
    }
    players = playerArray;

    // Accumulate history snapshot for game-over charts
    if (newPhase === 'playing' && newTick > 0 && playerArray.length > 0) {
        gameHistory.push({
            tick: newTick,
            players: playerArray.map(p => ({
                id: p.id,
                starCount: p.starCount ?? 0,
                totalShips: p.totalShips ?? 0,
                production: p.production ?? 0,
            }))
        });
    }

    // Convert stars map to array
    const starArray: StarState[] = [];
    if (state.stars) {
        state.stars.forEach((star: any) => {
            starArray.push({
                id: star.id,
                x: star.x,
                y: star.y,
                radius: star.radius,
                productionRate: star.productionRate,
                activeShips: star.activeShips,
                damagedShips: star.damagedShips,
                ownerId: star.ownerId,
                targetId: star.targetId || null,
                queuedOrderTargetId: star.queuedOrderTargetId || null,
                icon: star.icon,
                starType: star.starType as any,
                activationRate: star.activationRate,
                defensivePosture: star.defensivePosture,
                defenseStrength: star.defenseStrength,
                repairRate: star.repairRate,
                transferRate: star.transferRate,
                productionOverflow: star.productionOverflow ?? 0,
                repairOverflow: star.repairOverflow ?? 0,
                lastCombatTick: star.lastCombatTick ?? -1
            });
        });
    }
    stars = starArray;

    // Convert connections array
    const connArray: StarConnection[] = [];
    if (state.connections) {
        state.connections.forEach((conn: any) => {
            connArray.push({
                sourceId: conn.sourceId,
                targetId: conn.targetId,
                distance: conn.distance
            });
        });
    }
    connections = connArray;
}

// ============================================================================
// Room Listeners
// ============================================================================

function setupRoomListeners(): void {
    if (!room) return;

    log.net('Room', 'Setting up listeners');

    // Listen for state changes - this fires AFTER handshake completes with actual data
    room.onStateChange((state: any) => {
        syncStateFromRoom(state);
    });

    // Handle playerJoined message (sent by server when a player joins)
    room.onMessage('playerJoined', (data: { sessionId: string }) => {
        log.net('Room', `Player joined: ${data.sessionId}`);
    });

    // Handle welcome message (sent by server on join)
    room.onMessage('welcome', (message: string) => {
        log.net('Room', `Welcome: ${message}`);
    });

    // Handle tick events (combat, transfer, conquest broadcasts from server)
    room.onMessage('tickEvents', (events: TickEvents) => {
        // Feed into unified event pipeline (handles combat log + canvas animations)
        activeGameStore.pushTickEvents(events);
    });

    // Error handler
    room.onError((code: number, message?: string) => {
        log.error('Room', `Error [${code}]: ${message}`);
        connectionError = message ?? 'Unknown error';
    });

    // Leave handler
    room.onLeave((code: number) => {
        log.net('Room', `Left with code: ${code}`);
        isConnected = false;
    });
}

// ============================================================================
// Game Actions (send to server)
// ============================================================================

function startGame(): void {
    log.net('Room', 'Sending startGame');
    room?.send('startGame');
}

function resumeGame(): void {
    room?.send('resume');
}

function pauseGame(): void {
    room?.send('pause');
}

function setSpeed(newSpeed: number): void {
    room?.send('setSpeed', { speed: newSpeed });
}

function issueOrder(sourceId: StarId, targetId: StarId, persistAfterConquest = true): boolean {
    if (!room) return false;

    room.send('issueOrder', { sourceId, targetId, persist: persistAfterConquest });
    return true;
}

function cancelOrder(starId: StarId): void {
    room?.send('cancelOrder', { starId });
}

function setDeferredOrder(enemyStarId: StarId, nextTargetId: StarId, persistAfterConquest = true): boolean {
    if (!room) return false;

    room.send('setDeferredOrder', { enemyStarId, nextTargetId, persist: persistAfterConquest });
    return true;
}

function restartGame(): void {
    log.net('Room', 'Sending restartGame');
    room?.send('restartGame');
}

// ============================================================================
// Helpers
// ============================================================================

function getLocalPlayerId(): string | null {
    if (!localSessionId) return null;
    const player = players.find(p => (p as any).sessionId === localSessionId);
    // Return sessionId — matches star.ownerId which is keyed by session
    return player ? localSessionId : null;
}

function isOwnStar(starId: StarId): boolean {
    const localId = getLocalPlayerId();
    if (!localId) return false;
    const star = stars.find(s => s.id === starId);
    return star?.ownerId === localId;
}

// ============================================================================
// Export Store
// ============================================================================

export const multiplayerStore = {
    // Connection state
    get isConnected() { return isConnected; },
    get isConnecting() { return isConnecting; },
    get connectionError() { return connectionError; },
    get roomId() { return roomId; },
    get localSessionId() { return localSessionId; },

    // Room state
    get phase() { return phase; },
    get tick() { return tick; },
    get tickProgress() { return tickProgress; },
    get isPaused() { return isPaused; },
    get speed() { return speed; },
    get playerCount() { return playerCount; },
    get maxPlayers() { return maxPlayers; },
    get isHost() { return getIsHost(); },
    get winnerId() { return winnerId; },

    // Game state
    get players() { return players; },
    get stars() { return stars; },
    get connections() { return connections; },
    get localPlayer() { return players.find(p => (p as any).sessionId === localSessionId); },
    get pendingTransfers() { return pendingTransfers; },
    get history() { return gameHistory; },
    consumeTransfers() {
        const t = pendingTransfers;
        pendingTransfers = [];
        return t;
    },

    // Connection actions
    connect,
    createRoom,
    joinRoom,
    leaveRoom,
    disconnect,

    // Game actions
    startGame,
    resumeGame,
    pauseGame,
    setSpeed,
    issueOrder,
    cancelOrder,
    setDeferredOrder,
    restartGame,

    // Helpers
    getLocalPlayerId,
    isOwnStar
};
