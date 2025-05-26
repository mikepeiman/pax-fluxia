/**
 * Server-side types for Pax Fluxia Nakama modules
 * Duplicated from client types for server use
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

// Server-side game state (full state) - this is MatchState
export interface MatchState {
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

// OpCodes
export const OPCODE_GAME_STATE_UPDATE = 1;
export const OPCODE_PLAYER_MOVE_ORDER_INTENT = 2;
export const OPCODE_PLAYER_CANCEL_ORDER_INTENT = 3;
export const OPCODE_GAME_OVER = 4;
export const OPCODE_SET_GAME_SPEED = 5;
export const OPCODE_TOGGLE_PAUSE = 6;
export const OPCODE_SURRENDER = 7;
export const OPCODE_SEND_PEACE_REQUEST = 8;
export const OPCODE_ACCEPT_PEACE = 9;
export const OPCODE_BREAK_TRUCE = 10;
export const OPCODE_PLAYER_CHAT_MESSAGE = 11;
export const OPCODE_CHEAT_CODE = 12;
export const OPCODE_SET_TWEAK_PARAM = 13;

// Star Data Map with bonuses from GDD I.B.4
export const STAR_DATA_MAP: StarDataMap = {
  [StarType.STANDARD]: {
    defenseBonusFactor: 1.0,
    attackBonusFactor: 1.0,
    movementBonusFactor: 1.0,
    productionBonusFactor: 1.0,
    repairBonusFactorPeacetime: 1.0,
    repairBonusFactorWartime: 0.2
  },
  [StarType.RED]: {
    defenseBonusFactor: 2.0,
    attackBonusFactor: 1.0,
    movementBonusFactor: 1.0,
    productionBonusFactor: 1.0,
    repairBonusFactorPeacetime: 1.0,
    repairBonusFactorWartime: 0.2
  },
  [StarType.GREEN]: {
    defenseBonusFactor: 1.0,
    attackBonusFactor: 2.0,
    movementBonusFactor: 1.0,
    productionBonusFactor: 1.0,
    repairBonusFactorPeacetime: 1.0,
    repairBonusFactorWartime: 0.2
  },
  [StarType.BLUE]: {
    defenseBonusFactor: 1.0,
    attackBonusFactor: 1.0,
    movementBonusFactor: 2.0,
    productionBonusFactor: 1.0,
    repairBonusFactorPeacetime: 1.0,
    repairBonusFactorWartime: 0.2
  },
  [StarType.YELLOW]: {
    defenseBonusFactor: 1.0,
    attackBonusFactor: 1.0,
    movementBonusFactor: 1.0,
    productionBonusFactor: 2.0,
    repairBonusFactorPeacetime: 1.0,
    repairBonusFactorWartime: 0.2
  },
  [StarType.VIOLET]: {
    defenseBonusFactor: 1.0,
    attackBonusFactor: 1.0,
    movementBonusFactor: 1.0,
    productionBonusFactor: 1.0,
    repairBonusFactorPeacetime: 2.0,
    repairBonusFactorWartime: 1.0
  },
  [StarType.WHITE_PORTAL]: {
    defenseBonusFactor: 1.0,
    attackBonusFactor: 1.0,
    movementBonusFactor: 1.0,
    productionBonusFactor: 1.0,
    repairBonusFactorPeacetime: 1.0,
    repairBonusFactorWartime: 0.2
  }
};
