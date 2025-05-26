/**
 * Game State Store for Pax Fluxia
 * Phase 1: Basic game state management
 */

import { writable, derived } from 'svelte/store';
import type { ClientGameState, Star, Player } from '../types/index.js';

// Create writable store for game state
export const gameState = writable<ClientGameState | null>(null);

// Connection status store
export const isConnected = writable<boolean>(false);

// Current player ID store
export const currentPlayerId = writable<string | null>(null);

// Derived stores for easier access to game data
export const stars = derived(
  gameState,
  ($gameState) => $gameState?.stars || {}
);

export const players = derived(
  gameState,
  ($gameState) => $gameState?.players || {}
);

export const paths = derived(
  gameState,
  ($gameState) => $gameState?.paths || {}
);

export const currentTick = derived(
  gameState,
  ($gameState) => $gameState?.tick || 0
);

export const gameSpeedMultiplier = derived(
  gameState,
  ($gameState) => $gameState?.gameSpeedMultiplier || 1.0
);

export const isPaused = derived(
  gameState,
  ($gameState) => $gameState?.isPaused || false
);

// Derived store for current player
export const currentPlayer = derived(
  [players, currentPlayerId],
  ([$players, $currentPlayerId]) => {
    if (!$currentPlayerId || !$players[$currentPlayerId]) {
      return null;
    }
    return $players[$currentPlayerId];
  }
);

// Derived store for stars owned by current player
export const ownedStars = derived(
  [stars, currentPlayerId],
  ([$stars, $currentPlayerId]) => {
    if (!$currentPlayerId) return {};
    
    const owned: Record<string, Star> = {};
    for (const [starId, star] of Object.entries($stars)) {
      if (star.ownerPlayerId === $currentPlayerId) {
        owned[starId] = star;
      }
    }
    return owned;
  }
);

// Helper functions for updating game state
export const gameStateActions = {
  // Update the entire game state
  updateGameState: (newState: ClientGameState) => {
    gameState.set(newState);
  },

  // Clear game state
  clearGameState: () => {
    gameState.set(null);
  },

  // Update connection status
  setConnectionStatus: (connected: boolean) => {
    isConnected.set(connected);
  },

  // Set current player ID
  setCurrentPlayerId: (playerId: string | null) => {
    currentPlayerId.set(playerId);
  }
};
