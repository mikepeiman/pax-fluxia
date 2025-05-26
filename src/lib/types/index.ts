/**
 * Core Game Types for Pax Fluxia
 * Phase 1: Core Data Structures
 */

// Star Types enum matching GDD I.B.4
export enum StarType {
  STANDARD = 'STANDARD',
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
  VIOLET = 'VIOLET',
  WHITE_PORTAL = 'WHITE_PORTAL'
}

// Player interface
export interface Player {
  id: string;
  name: string;
  color: string; // hex color
  activeShipsTotal: number;
  damagedShipsTotal: number;
}

// Static properties of star types
export interface StarDataBase {
  defenseBonusFactor: number;
  attackBonusFactor: number;
  movementBonusFactor: number;
  productionBonusFactor: number;
  repairBonusFactorPeacetime: number;
  repairBonusFactorWartime: number;
}

// Map of star type to its static data
export type StarDataMap = Record<StarType, StarDataBase>;

// Dynamic star state
export interface Star {
  id: string;
  x: number;
  y: number;
  ownerPlayerId: string | null;
  starType: StarType;
  portalGroupId?: string; // for WHITE_PORTAL stars
  activeShips: number;
  damagedShips: number;
  productionProgress: number; // 0 to 1
  currentOutgoingOrder: {
    targetStarId: string;
    path?: string[];
  } | null;
  isUnderAttack?: boolean; // Added for Phase 3
}

// Path between stars
export interface Path {
  id: string;
  starA_id: string;
  starB_id: string;
}

// Server-side game state (full state)
export interface ServerGameState {
  tick: number;
  stars: Record<string, Star>;
  paths: Record<string, Path>;
  players: Record<string, Player>;
  gameSpeedMultiplier: number;
  mapName: string;
  isPaused: boolean;
}

// Client-side game state (relevant for rendering)
export interface ClientGameState {
  tick: number;
  stars: Record<string, Star>;
  paths: Record<string, Path>;
  players: Record<string, Player>;
  gameSpeedMultiplier: number;
  isPaused: boolean;
  lastTickMovements?: Array<{
    fromStarId: string;
    toStarId: string;
    count: number;
    playerId: string;
  }>;
}

// Server configuration
export interface GameConfigServer {
  baseTickDurationMs: number;
  baseProductionTicksPerShip: number;
  baseRepairRateFactor: number; // e.g., 0.05 for 5%
  baseMovementShipPercentage: number; // e.g., 0.10 for 10%
  capturePercentageDamagedShips: number; // e.g., 0.5 for 50%
}

// Map data structure for initialization
export interface MapData {
  stars: Array<Omit<Star, 'ownerPlayerId'|'activeShips'|'damagedShips'|'productionProgress'|'currentOutgoingOrder'> & {
    initialOwnerPlayerId?: string | null;
    initialActiveShips?: number;
    initialDamagedShips?: number;
  }>;
  paths: Array<Path>;
  players: Array<Omit<Player, 'activeShipsTotal'|'damagedShipsTotal'>>;
}
