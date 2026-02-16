// ============================================================================
// Active Game Store - Unified facade for game state
// ============================================================================
// This store provides a single interface for all game state and actions,
// automatically delegating to the correct backend:
//   - SINGLE-PLAYER: Uses gameStore (local GameEngine)
//   - MULTIPLAYER: Uses multiplayerStore (Colyseus server)
// 
// Components should ONLY use this store, never directly access gameStore or multiplayerStore.

import { multiplayerStore } from './multiplayerStore.svelte';
import { gameStore } from './gameStore.svelte';
import type { Star, Player, Connection, GameSpeed } from '@pax/common';
import { validateOrder } from '@pax/common';
import type { TickEvents } from '@pax/common';
import type { StarState, PlayerState, ConnectionState, GameHistoryEntry } from '$lib/types/game.types';
import { combatLog } from '$lib/stores/combatLogStore';
import { GAME_CONFIG } from '$lib/config/game.config';

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * Determine if we're in multiplayer mode.
 * Multiplayer = connected to a Colyseus room (inRoom or playing)
 */
function isMultiplayerMode(): boolean {
    const mpPhase = multiplayerStore.phase;
    return multiplayerStore.isConnected && (mpPhase === 'lobby' || mpPhase === 'playing' || mpPhase === 'ended');
}

// ============================================================================
// Event Pipeline State
// ============================================================================

// Pending tick events — fed by SP or MP, consumed by canvas
let pendingTickEvents: TickEvents | null = $state(null);

/**
 * Push tick events from either SP engine or MP server.
 * Also feeds combat log from events.
 */
function pushTickEvents(events: TickEvents): void {
    pendingTickEvents = events;

    // Feed combat log from events (unified — no longer done separately in each store)
    for (const combat of events.combats) {
        combatLog.add({
            tick: combat.tick,
            attacker: {
                id: combat.attackerIds.length > 1 ? `${combat.attackerIds.length} stars` : combat.attackerIds[0],
                ships: Math.floor(combat.totalAttackForce),
                starType: '',
                ownerId: combat.attackerOwnerId,
                kills: Math.floor(combat.killsOnAttacker),
                disabled: Math.floor(combat.disabledOnAttacker),
            },
            defender: {
                id: combat.defenderId,
                ships: Math.floor(combat.defenderForce),
                starType: '',
                ownerId: combat.defenderOwnerId,
                kills: Math.floor(combat.killsOnDefender),
                disabled: Math.floor(combat.disabledOnDefender),
            },
            settings: { aggressor: 0, damage: 0, lethality: 0, forceRatio: 0, repairRate: 0 },
            result: combat.conquered ? 'CONQUERED' : 'DEFENSE',
        });
    }
}

/**
 * Consume pending tick events (returns them and clears).
 * Called by canvas each frame.
 */
function consumeTickEvents(): TickEvents | null {
    const events = pendingTickEvents;
    pendingTickEvents = null;
    return events;
}

// ============================================================================
// State Accessors (route to correct source)
// ============================================================================

/**
 * Current game phase
 */
function getPhase(): 'menu' | 'lobby' | 'playing' | 'results' {
    if (isMultiplayerMode()) {
        const mp = multiplayerStore.phase;
        if (mp === 'playing') return 'playing';
        if (mp === 'ended') return 'results';
        if (mp === 'lobby') return 'lobby';
        return 'menu';
    } else {
        // Single-player: check gameStore
        if (gameStore.currentView === 'game') {
            return gameStore.hasStarted ? 'playing' : 'lobby';
        }
        if (gameStore.currentView === 'results') return 'results';
        return 'menu';
    }
}

/**
 * All stars in the game
 */
function getStars(): Star[] {
    if (isMultiplayerMode()) {
        return multiplayerStore.stars as Star[];
    } else {
        return (gameStore.snapshot?.stars ?? []) as unknown as Star[];
    }
}

/**
 * All connections between stars
 */
function getConnections(): Connection[] {
    if (isMultiplayerMode()) {
        return multiplayerStore.connections as Connection[];
    } else {
        return (gameStore.snapshot?.connections ?? []) as unknown as Connection[];
    }
}

/**
 * All players in the game
 */
function getPlayers(): Player[] {
    if (isMultiplayerMode()) {
        return multiplayerStore.players as Player[];
    } else {
        return (gameStore.snapshot?.players ?? []) as unknown as Player[];
    }
}

/**
 * Local player's ID (the user running this client)
 */
function getLocalPlayerId(): string | null {
    if (isMultiplayerMode()) {
        return multiplayerStore.getLocalPlayerId();
    } else {
        // Single-player: human player ID
        const human = gameStore.snapshot?.players.find(p => !p.isAI);
        return human?.id ?? null;
    }
}

/**
 * Whether game is paused
 */
function getIsPaused(): boolean {
    if (isMultiplayerMode()) {
        return multiplayerStore.isPaused;
    } else {
        return gameStore.snapshot?.isPaused ?? true;
    }
}

/**
 * Current game speed
 */
function getSpeed(): GameSpeed {
    if (isMultiplayerMode()) {
        return multiplayerStore.speed as GameSpeed;
    } else {
        return (gameStore.snapshot?.speed ?? 1) as GameSpeed;
    }
}

/**
 * Whether local player is the host
 */
function getIsHost(): boolean {
    if (isMultiplayerMode()) {
        return multiplayerStore.isHost;
    } else {
        return true; // Single-player is always host
    }
}

/**
 * Tick progress (0-1) for animations
 */
function getTickProgress(): number {
    if (isMultiplayerMode()) {
        return multiplayerStore.tickProgress;
    } else {
        return gameStore.tickProgress;
    }
}

/**
 * Session ID (changes on new game, used for cache invalidation)
 */
function getSessionId(): number {
    return gameStore.sessionId;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a star belongs to the local player
 */
function isLocalStar(star: Star): boolean {
    const localId = getLocalPlayerId();
    return localId !== null && star.ownerId === localId;
}

/**
 * Get player color by owner ID
 */
function getPlayerColor(ownerId: string): number | null {
    // In SP, ownerId matches player.id. In MP, ownerId is sessionId.
    // Check both to handle both modes uniformly.
    const player = getPlayers().find(p =>
        p.id === ownerId || (p as any).sessionId === ownerId
    );
    if (player?.color) {
        return parseInt(player.color.replace('#', ''), 16);
    }
    return null;
}

// ============================================================================
// Actions (route to correct handler)
// ============================================================================

/**
 * Issue an order from source star to target star
 */
function issueOrder(sourceId: string, targetId: string, persist?: boolean): void {
    if (isMultiplayerMode()) {
        multiplayerStore.issueOrder(sourceId, targetId, persist);
    } else {
        gameStore.issueOrder(sourceId, targetId, persist);
    }
}

/**
 * Cancel an existing order
 */
function cancelOrder(starId: string): void {
    if (isMultiplayerMode()) {
        multiplayerStore.cancelOrder(starId);
    } else {
        gameStore.cancelOrder(starId);
    }
}

/**
 * Set a deferred order on an enemy star
 */
function setDeferredOrder(starId: string, targetId: string, persist?: boolean): void {
    if (isMultiplayerMode()) {
        multiplayerStore.setDeferredOrder(starId, targetId, persist);
    } else {
        gameStore.setDeferredOrder(starId, targetId, persist);
    }
}

/**
 * Pause the game
 */
function pauseGame(): void {
    if (isMultiplayerMode()) {
        multiplayerStore.pauseGame();
    } else {
        gameStore.pauseGame();
    }
}

/**
 * Resume the game
 */
function resumeGame(): void {
    if (isMultiplayerMode()) {
        multiplayerStore.resumeGame();
    } else {
        gameStore.resumeGame();
    }
}

/**
 * Set game speed
 */
function setSpeed(speed: GameSpeed): void {
    if (isMultiplayerMode()) {
        multiplayerStore.setSpeed(speed);
    } else {
        gameStore.setSpeed(speed);
    }
}

/**
 * Start the game (host only, or single-player)
 */
function startGame(): void {
    if (isMultiplayerMode()) {
        multiplayerStore.startGame();
    } else {
        // Single-player: begin the game (START button)
        gameStore.beginGame();
    }
}

// ============================================================================
// Order Validation (uses shared logic for optimistic UI)
// ============================================================================

/**
 * Validate if an order can be issued (for optimistic UI)
 */
function canIssueOrder(sourceId: string, targetId: string): boolean {
    const source = getStars().find(s => s.id === sourceId);
    const target = getStars().find(s => s.id === targetId);
    const localId = getLocalPlayerId();

    if (!source || !target || !localId) return false;

    const error = validateOrder(source, target, localId, getConnections());
    return error === null;
}

// ============================================================================
// Results / History (for game-over screen)
// ============================================================================

function getHistory(): GameHistoryEntry[] {
    if (isMultiplayerMode()) {
        return multiplayerStore.history;
    }
    return gameStore.getHistory() as GameHistoryEntry[];
}

function getStats() {
    if (isMultiplayerMode()) {
        return {
            elapsedMs: 0,
            totalTicks: multiplayerStore.tick,
            peakFleetSize: 0,
            starsCaptured: 0,
        };
    }
    return gameStore.getStats();
}

function getWinner(): PlayerState | null {
    if (isMultiplayerMode()) {
        const wId = multiplayerStore.winnerId;
        if (!wId) return null;
        const players = multiplayerStore.players;
        return players.find(p => (p as any).sessionId === wId || p.id === wId) ?? null;
    }
    return gameStore.winner;
}

function getHumanPlayer(): PlayerState | null {
    if (isMultiplayerMode()) {
        const sid = multiplayerStore.localSessionId;
        return multiplayerStore.players.find(p => (p as any).sessionId === sid) ?? null;
    }
    return gameStore.humanPlayer;
}

function isVictory(): boolean {
    const w = getWinner();
    if (!w) return false;
    if (isMultiplayerMode()) {
        const sid = multiplayerStore.localSessionId;
        return (w as any).sessionId === sid;
    }
    const human = getHumanPlayer();
    return human != null && (w as any).id === (human as any).id;
}

/** MP: Send surrender to server, stay connected to spectate */
function surrenderAndSpectate(): void {
    if (isMultiplayerMode()) {
        multiplayerStore.surrenderPlayer();
    } else {
        gameStore.surrender();
    }
}

/** MP: Send surrender to server, then leave room and return to menu */
function surrenderAndLeave(): void {
    if (isMultiplayerMode()) {
        multiplayerStore.surrenderPlayer();
        // Small delay so server processes the surrender before we disconnect
        setTimeout(() => {
            multiplayerStore.leaveRoom();
            gameStore.returnToMenu();
        }, 200);
    } else {
        gameStore.surrender();
        gameStore.returnToMenu();
    }
}

/** Legacy surrender (used by elimination modal) */
function surrender(): void {
    if (isMultiplayerMode()) {
        multiplayerStore.surrenderPlayer();
    } else {
        gameStore.surrender();
    }
}

function playAgain(): void {
    if (isMultiplayerMode()) {
        // MP: restart within same room (server resets state to lobby)
        multiplayerStore.restartGame();
        return;
    }
    gameStore.playAgain();
}

function returnToMenu(): void {
    if (isMultiplayerMode()) {
        multiplayerStore.leaveRoom();
    }
    gameStore.returnToMenu();
}

function isLocalPlayerEliminated(): boolean {
    if (getPhase() !== 'playing') return false;
    const localId = getLocalPlayerId();
    if (!localId) return false;
    const players = getPlayers();
    const local = players.find((p: any) => p.id === localId || p.sessionId === localId);
    return local?.isEliminated === true;
}

// ============================================================================
// Export Store
// ============================================================================

export const activeGameStore = {
    // Mode detection
    get isMultiplayer() { return isMultiplayerMode(); },

    // State getters
    get phase() { return getPhase(); },
    get stars() { return getStars(); },
    get connections() { return getConnections(); },
    get players() { return getPlayers(); },
    get localPlayerId() { return getLocalPlayerId(); },
    get isPaused() { return getIsPaused(); },
    get speed() { return getSpeed(); },
    get effectiveTickMs() {
        const speed = getSpeed() || 1;
        return Math.max(GAME_CONFIG.MIN_TICK_MS, GAME_CONFIG.BASE_TICK_MS / speed);
    },
    get tickProgress() { return getTickProgress(); },
    get currentTick() {
        if (isMultiplayerMode()) return multiplayerStore.tick ?? 0;
        return gameStore.getTick();
    },
    get sessionId() { return getSessionId(); },

    // Tick events pipeline
    pushTickEvents,
    consumeTickEvents,

    // Helpers
    isLocalStar,
    getPlayerColor,
    canIssueOrder,

    // Actions
    issueOrder,
    cancelOrder,
    setDeferredOrder,
    pauseGame,
    resumeGame,
    setSpeed,
    startGame,
    playAgain,
    returnToMenu,
    surrender,
    surrenderAndSpectate,
    surrenderAndLeave,

    // Results / History
    getHistory,
    getStats,
    getWinner,
    getHumanPlayer,
    isVictory,
    isLocalPlayerEliminated,

    // Spectator mode
    get isSpectating() {
        if (isMultiplayerMode()) return multiplayerStore.isSpectating;
        return false;
    },

    // Restart vote info (MP only)
    get restartVoteInfo() {
        if (isMultiplayerMode()) return multiplayerStore.restartVoteInfo;
        return null;
    },

    /** Update BASE_TICK_MS and reschedule engine interval (SP only) */
    updateTickInterval(ms: number) {
        GAME_CONFIG.BASE_TICK_MS = ms;
        if (!isMultiplayerMode()) {
            gameStore.updateConfig();
        }
    },
};
