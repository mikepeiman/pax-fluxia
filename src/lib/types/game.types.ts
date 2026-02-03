// ============================================================================
// Game Types - Core type definitions for Pax Fluxia
// ============================================================================

/** Current application view */
export type GameView = 'menu' | 'game' | 'results';

/** Speed multiplier (0 = paused) */
export type GameSpeed = 0 | 1 | 2 | 4 | 10 | 50;

/** AI difficulty level */
export type AILevel = 'easy' | 'normal' | 'hard' | 'expert';

/** Unique identifiers */
export type StarId = string;
export type PlayerId = string;
export type LinkId = string;

/** 
 * Star Types - Canonical Spec
 * GREY=basic (no bonus), YELLOW=production, BLUE=movement, PURPLE=repair, RED=defense, GREEN=attack
 * Each type has 2x bonus on its specialty stat, all other stats @ 1.0
 */
export type StarType = 'grey' | 'yellow' | 'blue' | 'purple' | 'red' | 'green';

/** Game settings from menu */
export interface GameSettings {
    map: 'empire' | 'random';
    mapType?: 'standard' | 'debug';
    playerCount: 2 | 3 | 4 | 5 | 6;
    difficulty: AILevel;
}

/** Player configuration */
export interface PlayerConfig {
    id: PlayerId;
    name: string;
    color: string;
    isAI: boolean;
    difficulty?: AILevel;
}

/** Player runtime state */
export interface PlayerState {
    id: PlayerId;
    name: string;
    color: string;
    isAI: boolean;
    isEliminated: boolean;
    totalShips: number;
    starCount: number;
}

/** Star configuration for map generation */
export interface StarConfig {
    x: number;
    y: number;
    radius: number;
    productionRate: number;
    ownerId: PlayerId;
    starType?: StarType;
    activeShips?: number;
    damagedShips?: number;
    // Combat V2 Properties
    activationRate?: number;    // 0-1
    defensivePosture?: number;  // 0-1
    defenseStrength?: number;   // Multiplier
    repairRate?: number;        // Flat/Pct
    transferRate?: number;      // Pct
}

/** Star runtime state */
export interface StarState {
    id: StarId;
    x: number;
    y: number;
    radius: number;
    productionRate: number;
    activeShips: number;
    damagedShips: number;
    ownerId: PlayerId;
    targetId: StarId | null;
    icon: string;
    starType: StarType;
    // Combat V2 Props (Runtime)
    activationRate: number;
    defensivePosture: number;
    defenseStrength: number;
    repairRate: number;
    transferRate: number;
}

/** Flow link state */
export interface FlowLinkState {
    id: LinkId;
    sourceId: StarId;
    targetId: StarId;
    ownerId: PlayerId;
}

/** Fleet state (ships in transit) */
export interface FleetState {
    id: string;
    sourceId: StarId;
    targetId: StarId;
    ownerId: PlayerId;
    shipCount: number;
    progress: number; // 0.0 to 1.0
}

/** Combat resolution result */
export interface CombatResult {
    attackerLoss: number;
    defenderLoss: number;
    captured: boolean;
    newOwnerId?: PlayerId;
}

/** Star connection (valid path between stars) */
export interface StarConnection {
    sourceId: StarId;
    targetId: StarId;
    distance: number;
}

/** Complete game state snapshot for UI */
export interface GameState {
    tick: number;
    tickProgress: number;
    speed: GameSpeed;
    isPaused: boolean;
    stars: StarState[];
    fleets: FleetState[];
    connections: StarConnection[];  // Valid paths between stars
    links: FlowLinkState[];
    players: PlayerState[];
    winner: PlayerState | null;
    elapsedMs: number;
    history: GameHistoryEntry[];
}

export interface GameHistoryEntry {
    tick: number;
    players: {
        id: PlayerId;
        totalShips: number;
        starCount: number;
    }[];
}

/** Player/AI command */
export interface Order {
    type: 'create_link' | 'cancel_link';
    sourceId: StarId;
    targetId?: StarId;
}

/** Engine configuration */
export interface EngineConfig {
    settings: GameSettings;
    humanPlayerId: PlayerId;
}

/** Game statistics for results screen */
export interface GameStats {
    winner: PlayerState;
    elapsedTime: string;
    totalTicks: number;
    peakFleetSize: number;
    starsCaptured: number;
}
