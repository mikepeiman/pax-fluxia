// ============================================================================
// Core Game Types - Re-export from @pax/common with local extensions
// ============================================================================

// Re-export all types from @pax/common as the canonical source
export type {
  StarId,
  PlayerId,
  StarType,
  GameSpeed,
  GameState,
  GameSettings,
  Player,
  Star,
  Connection,
  CombatResult,
  StarConfig
} from '@pax/common';

// Import for local use
import type {
  Player as CommonPlayer,
  Star as CommonStar,
  Connection as CommonConnection,
  GameState as CommonGameState
} from '@pax/common';

// ============================================================================
// Local Type Aliases (for backward compatibility)
// ============================================================================

/** @deprecated Use Player from @pax/common */
export type PlayerState = CommonPlayer;

/** @deprecated Use Star from @pax/common */
export type StarState = CommonStar;

/** @deprecated Use Connection from @pax/common */
export type StarConnection = CommonConnection;

/** @deprecated Use Connection from @pax/common */
export type ConnectionState = CommonConnection;

// ============================================================================
// Client-Specific Types (not in common)
// ============================================================================

export type GameView = 'menu' | 'game' | 'results';

export type AILevel = 'easy' | 'normal' | 'hard' | 'expert';

export interface EngineConfig {
  settings: import('@pax/common').GameSettings;
  humanPlayerId: string;
}

// ============================================================================
// Stats Types (for endgame charts)
// ============================================================================

export interface GameHistoryEntry {
  tick: number;
  totalCombatEvents?: number;
  conquestsThisTick?: number;
  players: {
    id: string;
    starCount: number;
    totalShips: number;
    production?: number;
    activeAttacks?: number;
    underAttack?: number;
  }[];
}

// ============================================================================
// Fleet Types (client-side only, for fleet animations)
// ============================================================================

export interface FleetState {
  id: string;
  sourceId: string;
  targetId: string;
  ownerId: string;
  shipCount: number;
  progress: number;
}