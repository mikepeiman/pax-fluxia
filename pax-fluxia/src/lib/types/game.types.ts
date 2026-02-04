// ============================================================================
// Core Game Types - Basic type definitions
// ============================================================================

export type StarId = string;
export type PlayerId = string;
export type StarType = 'grey' | 'yellow' | 'blue' | 'purple' | 'red' | 'green';

export interface GameState {
  tick: number;
  players: PlayerState[];
  stars: StarState[];
  connections: StarConnection[];
  territoryPolygons?: Record<string, number[][]>;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: string;
  isAI: boolean;
  isEliminated: boolean;
  // Extended stats (computed by GameEngine)
  starCount?: number;
  totalShips?: number;
  activeShips?: number;
  damagedShips?: number;
  production?: number; // Total production rate across all owned stars
}

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
  queuedOrderTargetId: StarId | null;
  icon: string;
  starType: StarType;
  activationRate: number;
  defensivePosture: number;
  defenseStrength: number;
  repairRate: number;
  transferRate: number;
}

export interface StarConnection {
  sourceId: StarId;
  targetId: StarId;
  distance: number;
}

export interface StarConfig {
  x: number;
  y: number;
  radius: number;
  productionRate: number;
  ownerId: PlayerId;
  starType?: StarType;
  activeShips?: number;
  damagedShips?: number;
  activationRate?: number;
  defensivePosture?: number;
  defenseStrength?: number;
  repairRate?: number;
  transferRate?: number;
}

export interface EngineConfig {
  settings: GameSettings;
  humanPlayerId: PlayerId;
}

export interface GameSettings {
  playerCount: number;
  mapType?: 'standard' | 'debug';
  starSpacing?: number;
  minLinksPerStar?: number;
  maxLinksPerStar?: number;
  difficulty?: string;
  gameSpeed?: number;
}

export type GameSpeed = 'slow' | 'medium' | 'fast';

export interface CombatResult {
  killsOnA: number;
  killsOnB: number;
  disabledOnA: number;
  disabledOnB: number;
}