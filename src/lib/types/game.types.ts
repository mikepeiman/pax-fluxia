// ============================================================================
// Game Types - Core type definitions for Pax Fluxia
// ============================================================================

/** Current application view */
export type GameView = 'menu' | 'game' | 'results';

/** Speed multiplier (0 = paused) */
export type GameSpeed = 0 | 1 | 2 | 4 | 10;

/** AI difficulty level */
export type AILevel = 'easy' | 'normal' | 'hard' | 'expert';

/** Unique identifiers */
export type StarId = string;
export type PlayerId = string;
export type LinkId = string;

/** Game settings from menu */
export interface GameSettings {
    map: 'empire' | 'random';
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
}

/** Flow link state */
export interface FlowLinkState {
    id: LinkId;
    sourceId: StarId;
    targetId: StarId;
    ownerId: PlayerId;
}

/** Combat resolution result */
export interface CombatResult {
    attackerLoss: number;
    defenderLoss: number;
    captured: boolean;
    newOwnerId?: PlayerId;
}

/** Complete game state snapshot for UI */
export interface GameState {
    tick: number;
    tickProgress: number;
    speed: GameSpeed;
    isPaused: boolean;
    stars: StarState[];
    links: FlowLinkState[];
    players: PlayerState[];
    winner: PlayerState | null;
    elapsedMs: number;
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
