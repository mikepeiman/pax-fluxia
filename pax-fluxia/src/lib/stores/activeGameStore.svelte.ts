// ============================================================================
// Active Game Store - Unified facade for game state
// ============================================================================
// This store provides a single interface for all game state and actions,
// automatically delegating to the correct backend (server via multiplayerStore).
// Components should ONLY use this store, never directly access gameStore or multiplayerStore.

import { multiplayerStore } from './multiplayerStore.svelte';
import type { Star, Player, Connection, GameSpeed } from '@pax/common';
import { validateOrder } from '@pax/common';

// ============================================================================
// State Accessors (read from server state via multiplayerStore)
// ============================================================================

/**
 * Current game phase
 */
function getPhase(): 'menu' | 'lobby' | 'playing' | 'results' {
    const mp = multiplayerStore.phase;
    if (mp === 'playing') return 'playing';
    if (mp === 'inRoom') return 'lobby';
    return 'menu';
}

/**
 * All stars in the game
 */
function getStars(): Star[] {
    return multiplayerStore.stars as Star[];
}

/**
 * All connections between stars
 */
function getConnections(): Connection[] {
    return multiplayerStore.connections as Connection[];
}

/**
 * All players in the game
 */
function getPlayers(): Player[] {
    return multiplayerStore.players as Player[];
}

/**
 * Local player's ID (the user running this client)
 */
function getLocalPlayerId(): string | null {
    return multiplayerStore.getLocalPlayerId();
}

/**
 * Whether game is paused
 */
function getIsPaused(): boolean {
    return multiplayerStore.isPaused;
}

/**
 * Current game speed
 */
function getSpeed(): number {
    return multiplayerStore.speed;
}

/**
 * Whether local player is the host
 */
function getIsHost(): boolean {
    return multiplayerStore.isHost;
}

/**
 * Tick progress (0-1) for animations
 */
function getTickProgress(): number {
    return multiplayerStore.tickProgress;
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
// Actions (send to server via multiplayerStore)
// ============================================================================

/**
 * Issue an order from source star to target star
 */
function issueOrder(sourceId: string, targetId: string, persist?: boolean): void {
    multiplayerStore.issueOrder(sourceId, targetId, persist);
}

/**
 * Cancel an existing order
 */
function cancelOrder(starId: string): void {
    multiplayerStore.cancelOrder(starId);
}

/**
 * Set a deferred order on an enemy star
 */
function setDeferredOrder(starId: string, targetId: string, persist?: boolean): void {
    multiplayerStore.setDeferredOrder(starId, targetId, persist);
}

/**
 * Pause the game
 */
function pauseGame(): void {
    multiplayerStore.pauseGame();
}

/**
 * Resume the game
 */
function resumeGame(): void {
    multiplayerStore.resumeGame();
}

/**
 * Set game speed
 */
function setSpeed(speed: GameSpeed): void {
    multiplayerStore.setSpeed(speed);
}

/**
 * Start the game (host only)
 */
function startGame(): void {
    multiplayerStore.startGame();
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
