/**
 * Constants for Pax Fluxia
 * Phase 1: OpCodes and Star Data
 */

import { StarType, type StarDataMap } from '../types/index.js';

// Nakama OpCodes for message types
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
