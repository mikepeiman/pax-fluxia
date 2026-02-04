// ============================================================================
// Multiplayer Store - Colyseus Client Connection
// ============================================================================

import { Client, Room } from '@colyseus/sdk';
import type { PlayerState, StarState, StarConnection, StarId } from '$lib/types/game.types';

// Server URL (dev default)
const SERVER_URL = 'http://localhost:2567';

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
        console.log('🔌 Colyseus client created');
    } catch (err) {
        connectionError = `Failed to connect: ${err}`;
        console.error('❌ Connection failed:', err);
    } finally {
        isConnecting = false;
    }
}

async function createRoom(options: { playerCount?: number; mapType?: string } = {}): Promise<string | null> {
    if (!client) await connect();
    if (!client) return null;

    isConnecting = true;
    connectionError = null;

    try {
        console.log('🏠 Creating room with options:', options);
        room = await client.create('game_room', options);
        roomId = room.roomId;
        localSessionId = room.sessionId;
        isConnected = true;

        console.log(`✅ Room created: ${roomId}, sessionId: ${localSessionId}`);
        setupRoomListeners();
        return roomId;
    } catch (err) {
        connectionError = `Failed to create room: ${err}`;
        console.error('❌ Room creation failed:', err);
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
        console.log('🚪 Joining room:', targetRoomId);
        room = await client.joinById(targetRoomId);
        roomId = room.roomId;
        localSessionId = room.sessionId;
        isConnected = true;

        console.log(`✅ Joined room: ${roomId}, sessionId: ${localSessionId}`);
        setupRoomListeners();
        return true;
    } catch (err) {
        connectionError = `Failed to join room: ${err}`;
        console.error('❌ Room join failed:', err);
        return false;
    } finally {
        isConnecting = false;
    }
}

function leaveRoom(): void {
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
}

function disconnect(): void {
    leaveRoom();
    client = null;
}

// ============================================================================
// State Sync
// ============================================================================

function syncStateFromRoom(state: any): void {
    console.log('🔄 Syncing state:', {
        phase: state.phase,
        playerCount: state.playerCount,
        hostSessionId: state.hostSessionId,
        playersSize: state.players?.size ?? 0
    });

    // Update local state from server
    phase = state.phase ?? 'lobby';
    tick = state.tick ?? 0;
    tickProgress = state.tickProgress ?? 0;
    isPaused = state.isPaused ?? true;
    speed = state.speed ?? 1;
    playerCount = state.playerCount ?? 0;
    maxPlayers = state.maxPlayers ?? 4;
    hostSessionId = state.hostSessionId ?? null;
    winnerId = state.winnerId ?? null;

    // Convert players map to array
    const playerArray: PlayerState[] = [];
    if (state.players) {
        state.players.forEach((player: any, key: string) => {
            console.log(`  👤 Player: ${key} = ${player.name} (${player.color})`);
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
                transferRate: star.transferRate
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

    console.log(`  📊 Synced: ${players.length} players, isHost=${getIsHost()}`);
}

// ============================================================================
// Room Listeners
// ============================================================================

function setupRoomListeners(): void {
    if (!room) return;

    console.log('📡 Setting up room listeners...');

    // Listen for state changes - this fires AFTER handshake completes with actual data
    room.onStateChange((state: any) => {
        console.log('📥 onStateChange fired');
        syncStateFromRoom(state);
    });

    // Error handler
    room.onError((code: number, message?: string) => {
        console.error(`❌ Room error [${code}]:`, message);
        connectionError = message ?? 'Unknown error';
    });

    // Leave handler
    room.onLeave((code: number) => {
        console.log(`👋 Left room with code: ${code}`);
        isConnected = false;
    });
}

// ============================================================================
// Game Actions (send to server)
// ============================================================================

function startGame(): void {
    console.log('🚀 Sending startGame message');
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

// ============================================================================
// Helpers
// ============================================================================

function getLocalPlayerId(): string | null {
    if (!localSessionId) return null;
    const player = players.find(p => (p as any).sessionId === localSessionId);
    return player?.id ?? null;
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

    // Helpers
    getLocalPlayerId,
    isOwnStar
};
