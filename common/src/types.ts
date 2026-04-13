// ============================================================================
// Pax Fluxia - Canonical Types (Shared between client and server)
// ============================================================================

import type { LaneConstraintStatus, LanePathKind } from './mapgen/types';

// === Primitive IDs ===
export type StarId = string;
export type PlayerId = string;

// === Star Types ===
export type StarType = 'grey' | 'yellow' | 'blue' | 'purple' | 'red' | 'green';

// === Game Speed ===
export type GameSpeed = 0 | 1 | 2 | 4 | 10;
export type AILevel = 'easy' | 'normal' | 'hard' | 'expert';

// === Application Views ===
export type AppView = 'menu' | 'settings' | 'mapEditor' | 'lobby' | 'playing' | 'results';

// === Core Entities ===

export interface Player {
    id: PlayerId;
    name: string;
    color: string;
    isAI: boolean;
    isEliminated: boolean;
    isConnected?: boolean;
    sessionId?: string;
    // Computed stats
    starCount?: number;
    totalShips?: number;
    activeShips?: number;
    damagedShips?: number;
    production?: number;
}

export interface Star {
    id: StarId;
    x: number;
    y: number;
    radius: number;
    ownerId: PlayerId;
    starType: string;  // StarType union, but string in Schema for Colyseus compat
    // Ships
    activeShips: number;
    damagedShips: number;
    // Overflow accumulators (integer ship invariant)
    productionOverflow: number;
    repairOverflow: number;
    // Combat state
    lastCombatTick: number;   // tick when this star was last DEFENDING (under attack)
    lastAttackTick: number;   // tick when this star was last ATTACKING (sending ships)
    repairedThisTick?: number;
    // Orders
    targetId: StarId | null;
    queuedOrderTargetId: StarId | null;
    // Rates
    productionRate: number;
    repairRate: number;
    transferRate: number;
    activationRate: number;
    // Combat
    defensivePosture: number;
    defenseStrength: number;
    // Visual
    icon?: string;
}

export interface Connection {
    sourceId: StarId;
    targetId: StarId;
    distance: number;
    /** Optional centerline polyline from shared mapgen / server truth. */
    laneWaypoints?: Array<[number, number]>;
    /** Optional shared lane path classification. */
    lanePathKind?: LanePathKind;
    /** Optional shared lane-constraint result classification. */
    laneConstraintStatus?: LaneConstraintStatus;
}

// === Game State ===

export interface GameState {
    tick: number;
    tickProgress: number;
    isPaused: boolean;
    speed: GameSpeed;
    phase: AppView;
    players: Player[];
    stars: Star[];
    connections: Connection[];
    winner?: Player | null;
    hostSessionId?: string;
}

// === Settings ===

export interface GameSettings {
    playerCount: number;
    mapType?: 'standard' | 'debug' | 'debug-b';
    starSpacing?: number;
    minLinksPerStar?: number;
    maxLinksPerStar?: number;
    difficulty?: string;
    gameSpeed?: number;
    /** Custom player colors as hex strings (e.g. '#4488ff'). Index 0 = human. */
    playerColors?: string[];
    neutralStarCount?: number;
    neutralShipsPerStar?: number;
    specialStarPercentage?: number;
    /** Random map: 0 = loose placement bbox, 1 = expand/center to fill padded board */
    mapBoardFit?: number;
}

// === Combat ===

export interface CombatResult {
    attackerKills: number;
    defenderKills: number;
    attackerDisabled: number;
    defenderDisabled: number;
}

// === Star Config (for map generation) ===

export interface StarConfig {
    x: number;
    y: number;
    radius?: number;
    productionRate?: number;
    ownerId?: PlayerId;
    starType?: StarType;
    activeShips?: number;
    damagedShips?: number;
    // Combat V2 optional properties
    activationRate?: number;
    defensivePosture?: number;
    defenseStrength?: number;
    repairRate?: number;
    transferRate?: number;
}
