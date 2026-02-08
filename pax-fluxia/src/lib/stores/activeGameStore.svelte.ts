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
import type { StarState, PlayerState, ConnectionState } from '$lib/types/game.types';

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * Determine if we're in multiplayer mode.
 * Multiplayer = connected to a Colyseus room (inRoom or playing)
 */
function isMultiplayerMode(): boolean {
    const mpPhase = multiplayerStore.phase;
    return mpPhase === 'inRoom' || mpPhase === 'playing' || mpPhase === 'ended';
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
        if (mp === 'inRoom') return 'lobby';
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
function getPlayerColor(ownerId: string): number {
    const player = getPlayers().find(p => p.id === ownerId);
    if (player?.color) {
        // Parse hex color string to number
        return parseInt(player.color.replace('#', ''), 16);
    }
    return 0x888888; // Default gray
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
    get isHost() { return getIsHost(); },
    get tickProgress() { return getTickProgress(); },

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
};
