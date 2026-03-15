// ============================================================================
// Multiplayer Store - Colyseus Client Connection
// ============================================================================

import { Client, Room } from '@colyseus/sdk';
import type { EngineConfig } from '@pax/common';
import type { PlayerState, StarState, StarConnection, StarId, GameHistoryEntry } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { TickEvents, TransferEvent } from '@pax/common';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';
import { audioManager } from '$lib/services/audioManager.svelte';

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

// Room browser (public listing)
let availableRooms = $state<RoomListing[]>([]);
let isFetchingRooms = $state(false);
let lobbyStatus = $state<string | null>(null);

// Restart vote tracking
let restartVoteInfo = $state<{ votes: number; needed: number; voters: string[] } | null>(null);

// Player identity settings (persisted to localStorage)
let playerName = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('pax_playerName') || '' : '');
let playerColor = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('pax_playerColor') || '' : '');

// Client-side tick interpolation (for smooth animations in MP)
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

        const tickIntervalMs = GAME_CONFIG.BASE_TICK_MS / speed;
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
    mapData?: any; // MapDefinition JSON for classic maps
} = {}): Promise<string | null> {
    if (!client) await connect();
    if (!client) return null;

    isConnecting = true;
    connectionError = null;

    try {
        // Use $state.snapshot() to strip Svelte 5 Proxy - proper method for Svelte 5
        const plainOptions = $state.snapshot(options);
        log.net('Room', 'Creating room with options', plainOptions);
        // Attach player identity to room options
        const joinOpts = {
            ...plainOptions,
            ...(playerName ? { name: playerName } : {}),
            ...(playerColor ? { color: playerColor } : {}),
        };
        room = await client.create('game_room', joinOpts);

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

async function joinRoom(targetRoomId: string, takeOverId?: string): Promise<boolean> {
    if (!client) await connect();
    if (!client) return false;

    isConnecting = true;
    connectionError = null;

    try {
        log.net('Room', `Joining room: ${targetRoomId}${takeOverId ? ` (takeover: ${takeOverId})` : ''}`);
        const joinOpts: Record<string, string> = {};
        if (playerName) joinOpts.name = playerName;
        if (playerColor) joinOpts.color = playerColor;
        if (takeOverId) joinOpts.takeOverId = takeOverId;
        room = await client.joinById(targetRoomId, joinOpts);
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
    restartVoteInfo = null;
}

function disconnect(): void {
    leaveRoom();
    client = null;
}

// ============================================================================
// Room Browser
// ============================================================================

export interface RoomListing {
    roomId: string;
    name: string;
    clients: number;
    maxClients: number;
    metadata?: {
        mapType?: string;
        playerCount?: number;
        maxPlayers?: number;
        phase?: string;
        hostName?: string;
        starsPerPlayer?: number;
        shipsPerStar?: number;
        tick?: number;
        playerNames?: string[];
        aiPlayers?: { sessionId: string; name: string; color: string }[];
    };
}
// ────────────────────────────────────────────────────────────────────────────
// Lobby Room — built-in Colyseus LobbyRoom for realtime room listing
// See: https://docs.colyseus.io/room/built-in/lobby
// ────────────────────────────────────────────────────────────────────────────

let lobbyRoom: Room | null = null;

const LOBBY_MAX_RETRIES = 5;
const LOBBY_BASE_DELAY_MS = 1000;

async function joinLobby(): Promise<void> {
    if (lobbyRoom) return; // Already connected
    isFetchingRooms = true;
    lobbyStatus = null;

    for (let attempt = 0; attempt <= LOBBY_MAX_RETRIES; attempt++) {
        try {
            if (!client) await connect();
            if (!client) {
                availableRooms = [];
                isFetchingRooms = false;
                lobbyStatus = null;
                return;
            }

            lobbyRoom = await client.joinOrCreate("lobby", {
                filter: { name: "game_room" }
            });

            // Success — clear retry status
            lobbyStatus = null;

            // Full room list on initial join
            lobbyRoom.onMessage("rooms", (rooms: any[]) => {
                availableRooms = rooms.map((r: any) => ({
                    roomId: r.roomId,
                    name: r.name || r.roomId,
                    clients: r.clients,
                    maxClients: r.maxClients,
                    metadata: r.metadata,
                }));
                log.net('RoomBrowser', `Lobby: received ${availableRooms.length} rooms`);
                isFetchingRooms = false;
            });

            // Room added or updated
            lobbyRoom.onMessage("+", ([roomId, room]: [string, any]) => {
                const idx = availableRooms.findIndex(r => r.roomId === roomId);
                const entry: RoomListing = {
                    roomId,  // use the tuple key, NOT room.roomId
                    name: room.name || roomId,
                    clients: room.clients,
                    maxClients: room.maxClients,
                    metadata: room.metadata,
                };
                if (idx !== -1) {
                    availableRooms[idx] = entry;
                } else {
                    availableRooms = [...availableRooms, entry];
                }
                log.net('RoomBrowser', `Lobby: room updated/added ${roomId} (${availableRooms.length} total)`);
            });

            // Room removed
            lobbyRoom.onMessage("-", (roomId: string) => {
                availableRooms = availableRooms.filter(r => r.roomId !== roomId);
                log.net('RoomBrowser', `Lobby: room removed ${roomId} (${availableRooms.length} total)`);
            });

            lobbyRoom.onLeave(() => {
                lobbyRoom = null;
                log.net('RoomBrowser', 'Left lobby room');
            });

            log.net('RoomBrowser', 'Joined lobby room for realtime room listing');
            return; // Connected successfully — exit retry loop

        } catch (err: any) {
            const status = err?.code ?? err?.status ?? err?.statusCode;
            const isRetryable = status === 503 || String(err).includes('503');

            if (isRetryable && attempt < LOBBY_MAX_RETRIES) {
                const delayMs = LOBBY_BASE_DELAY_MS * Math.pow(2, attempt);
                lobbyStatus = `Server restarting, retrying... (${attempt + 1}/${LOBBY_MAX_RETRIES})`;
                log.net('RoomBrowser', `503 — retry ${attempt + 1}/${LOBBY_MAX_RETRIES} in ${delayMs}ms`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }

            // Non-retryable or max retries exhausted
            log.error('RoomBrowser', 'Failed to join lobby room', err);
            lobbyStatus = isRetryable
                ? 'Server unavailable — please try again later.'
                : null;
            availableRooms = [];
            lobbyRoom = null;
            isFetchingRooms = false;
            return;
        }
    }
}

function leaveLobby(): void {
    if (lobbyRoom) {
        lobbyRoom.leave();
        lobbyRoom = null;
    }
}

// Legacy aliases for backward compat with MainMenu
function startRoomPolling() { joinLobby(); }
function stopRoomPolling() { leaveLobby(); }

async function fetchRooms(): Promise<void> {
    // If lobby is connected, it auto-updates. Otherwise, join it.
    if (!lobbyRoom) await joinLobby();
}

async function joinRoomById(targetRoomId: string, takeOverId?: string): Promise<boolean> {
    if (isConnected) {
        leaveRoom();
    }
    // Leave lobby connection to avoid conflicts
    leaveLobby();
    // Pass takeOverId for AI takeover in playing phase
    return joinRoom(targetRoomId, takeOverId);
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

        // Play metronome tick sound (if phase is playing)
        if (newPhase === 'playing' && !newIsPaused) {
            audioManager.play('tick');
        }
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
                lastCombatTick: star.lastCombatTick ?? -1,
                lastAttackTick: star.lastAttackTick ?? -1
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
        if (data.sessionId !== localSessionId) {
            audioManager.play('new_player');
        }
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

    // Restart vote progress
    room.onMessage('restartVote', (data: { votes: number; needed: number; voters: string[] }) => {
        restartVoteInfo = data;
        log.net('Room', `Restart vote: ${data.votes}/${data.needed}`);
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

function setTickInterval(ms: number): void {
    room?.send('setTickInterval', { ms });
}

function restartGame(): void {
    log.net('Room', 'Sending requestRestart (vote)');
    room?.send('requestRestart');
}

/** Request restart (vote-based) */
function requestRestart(): void {
    log.net('Room', 'Sending requestRestart (vote)');
    room?.send('requestRestart');
}

/** Surrender — mark self eliminated on server but stay connected to spectate */
function surrenderPlayer(): void {
    log.net('Room', 'Sending surrender');
    room?.send('surrender');
}

/** Dispose room (host only, no other humans connected) */
function disposeRoom(): void {
    log.net('Room', 'Sending disposeRoom');
    room?.send('disposeRoom');
    // Leave the room after a short delay to let the server process
    setTimeout(() => leaveRoom(), 500);
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
    get hostSessionId() { return hostSessionId; },
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

    // Room browser
    get availableRooms() { return availableRooms; },
    get isFetchingRooms() { return isFetchingRooms; },
    get lobbyStatus() { return lobbyStatus; },
    fetchRooms,
    startRoomPolling,
    stopRoomPolling,
    joinRoomById,

    // Game actions
    startGame,
    resumeGame,
    pauseGame,
    setSpeed,
    setTickInterval,
    issueOrder,
    cancelOrder,
    setDeferredOrder,
    restartGame,
    requestRestart,
    surrenderPlayer,
    disposeRoom,

    // Restart vote info
    get restartVoteInfo() { return restartVoteInfo; },
    clearRestartVote() { restartVoteInfo = null; },

    // Helpers
    getLocalPlayerId,
    isOwnStar,

    // Player identity (persisted to localStorage)
    get playerName() { return playerName; },
    set playerName(v: string) { playerName = v; localStorage.setItem('pax_playerName', v); },
    get playerColor() { return playerColor; },
    set playerColor(v: string) { playerColor = v; localStorage.setItem('pax_playerColor', v); },

    // Spectator mode
    get isSpectating() {
        if (!localSessionId || !isConnected) return false;
        const me = players.find(p => (p as any).sessionId === localSessionId);
        return me?.isEliminated === true;
    },
};
