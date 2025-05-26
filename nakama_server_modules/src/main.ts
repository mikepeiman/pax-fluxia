/**
 * Main Nakama server module for Pax Fluxia
 * Phase 1: Basic match lifecycle and message handling
 */

import { 
  MatchState, 
  MapData, 
  GameConfigServer, 
  Star, 
  Player,
  STAR_DATA_MAP,
  OPCODE_GAME_STATE_UPDATE,
  OPCODE_PLAYER_MOVE_ORDER_INTENT,
  OPCODE_PLAYER_CANCEL_ORDER_INTENT,
  OPCODE_TOGGLE_PAUSE,
  OPCODE_SET_GAME_SPEED
} from './types';

const fs = require('fs');
const path = require('path');

// Load game configuration
function loadGameConfig(): GameConfigServer {
  const configPath = path.join(__dirname, '../data/game_config_server.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(configData);
}

// Load map data
function loadMapData(mapName: string): MapData {
  const mapPath = path.join(__dirname, `../data/maps/${mapName}.json`);
  const mapData = fs.readFileSync(mapPath, 'utf8');
  return JSON.parse(mapData);
}

// Initialize match state from map data
function initializeMatchState(mapData: MapData): MatchState {
  const stars: Record<string, Star> = {};
  const players: Record<string, Player> = {};
  
  // Initialize players
  for (const playerData of mapData.players) {
    players[playerData.id] = {
      ...playerData,
      activeShipsTotal: 0,
      damagedShipsTotal: 0
    };
  }
  
  // Initialize stars
  for (const starData of mapData.stars) {
    stars[starData.id] = {
      id: starData.id,
      x: starData.x,
      y: starData.y,
      starType: starData.starType,
      portalGroupId: starData.portalGroupId,
      ownerPlayerId: starData.initialOwnerPlayerId || null,
      activeShips: starData.initialActiveShips || 0,
      damagedShips: starData.initialDamagedShips || 0,
      productionProgress: 0,
      currentOutgoingOrder: null
    };
    
    // Update player totals
    if (starData.initialOwnerPlayerId && players[starData.initialOwnerPlayerId]) {
      players[starData.initialOwnerPlayerId].activeShipsTotal += starData.initialActiveShips || 0;
      players[starData.initialOwnerPlayerId].damagedShipsTotal += starData.initialDamagedShips || 0;
    }
  }
  
  return {
    tick: 0,
    stars,
    paths: mapData.paths.reduce((acc, path) => {
      acc[path.id] = path;
      return acc;
    }, {} as Record<string, any>),
    players,
    gameSpeedMultiplier: 1.0,
    mapName: 'default_map',
    isPaused: false
  };
}

// Match initialization
function matchInit(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: {[key: string]: string}): {state: nkruntime.MatchState, tickRate: number, label: string} {
  logger.info('Match initializing...');
  
  const mapName = params.mapName || 'default_map';
  const mapData = loadMapData(mapName);
  const gameConfig = loadGameConfig();
  
  const state = initializeMatchState(mapData);
  
  const tickRate = Math.floor(1000 / gameConfig.baseTickDurationMs); // Convert ms to ticks per second
  const label = `Pax Fluxia - ${mapName}`;
  
  logger.info(`Match initialized with map: ${mapName}, tick rate: ${tickRate}`);
  
  return {
    state,
    tickRate,
    label
  };
}

// Match join attempt
function matchJoinAttempt(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presence: nkruntime.Presence, metadata: {[key: string]: any}): {state: nkruntime.MatchState, accept: boolean, rejectMessage?: string} | null {
  logger.info(`Player ${presence.userId} attempting to join match`);
  
  const matchState = state as MatchState;
  
  // Check if player is already in the game
  const playerExists = Object.values(matchState.players).some(p => p.id === presence.userId);
  
  if (playerExists) {
    logger.info(`Player ${presence.userId} rejoining match`);
    return {
      state: matchState,
      accept: true
    };
  }
  
  // For now, reject new players if game has started
  if (matchState.tick > 0) {
    return {
      state: matchState,
      accept: false,
      rejectMessage: "Game already in progress"
    };
  }
  
  return {
    state: matchState,
    accept: true
  };
}

// Match join
function matchJoin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]): {state: nkruntime.MatchState} | null {
  const matchState = state as MatchState;
  
  for (const presence of presences) {
    logger.info(`Player ${presence.userId} joined match`);
    
    // Send initial game state to the new player
    const gameStateMessage = JSON.stringify(matchState);
    dispatcher.broadcastMessage(OPCODE_GAME_STATE_UPDATE, gameStateMessage, [presence]);
  }
  
  return {
    state: matchState
  };
}

// Match leave
function matchLeave(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]): {state: nkruntime.MatchState} | null {
  const matchState = state as MatchState;
  
  for (const presence of presences) {
    logger.info(`Player ${presence.userId} left match`);
  }
  
  return {
    state: matchState
  };
}

// Match loop (game tick)
function matchLoop(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]): {state: nkruntime.MatchState} | null {
  const matchState = state as MatchState;
  const gameConfig = loadGameConfig();
  
  // Process incoming messages first
  for (const message of messages) {
    switch (message.opCode) {
      case OPCODE_PLAYER_MOVE_ORDER_INTENT:
        // TODO: Handle move orders in Phase 2
        logger.info(`Move order from ${message.sender.userId}: ${message.data}`);
        break;
        
      case OPCODE_PLAYER_CANCEL_ORDER_INTENT:
        // TODO: Handle cancel orders in Phase 2
        logger.info(`Cancel order from ${message.sender.userId}: ${message.data}`);
        break;
        
      case OPCODE_TOGGLE_PAUSE:
        matchState.isPaused = !matchState.isPaused;
        logger.info(`Game ${matchState.isPaused ? 'paused' : 'unpaused'} by ${message.sender.userId}`);
        break;
        
      case OPCODE_SET_GAME_SPEED:
        const speedData = JSON.parse(message.data);
        matchState.gameSpeedMultiplier = speedData.multiplier;
        logger.info(`Game speed set to ${matchState.gameSpeedMultiplier}x by ${message.sender.userId}`);
        break;
    }
  }
  
  // Skip game logic if paused
  if (matchState.isPaused) {
    return { state: matchState };
  }
  
  // Increment tick
  matchState.tick++;
  
  // PHASE 1: PRODUCTION LOGIC
  // Process ship production for each owned star
  for (const starId in matchState.stars) {
    const star = matchState.stars[starId];
    
    // Only owned stars produce ships
    if (star.ownerPlayerId && matchState.players[star.ownerPlayerId]) {
      // Get star type data for production bonus
      const starTypeData = STAR_DATA_MAP[star.starType];
      const productionBonus = starTypeData.productionBonusFactor;
      
      // Calculate production progress increment
      const productionIncrement = (1 / gameConfig.baseProductionTicksPerShip) * productionBonus;
      star.productionProgress += productionIncrement;
      
      // Check if we can produce new ships
      if (star.productionProgress >= 1.0) {
        const numNewShips = Math.floor(star.productionProgress);
        star.activeShips += numNewShips;
        star.productionProgress -= numNewShips;
        
        // Update player totals
        matchState.players[star.ownerPlayerId].activeShipsTotal += numNewShips;
        
        if (numNewShips > 0) {
          logger.debug(`Star ${starId} produced ${numNewShips} ships for player ${star.ownerPlayerId}`);
        }
      }
    }
  }
  
  // Broadcast game state update
  const gameStateMessage = JSON.stringify(matchState);
  dispatcher.broadcastMessage(OPCODE_GAME_STATE_UPDATE, gameStateMessage);
  
  return {
    state: matchState
  };
}

// Match terminate
function matchTerminate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, graceSeconds: number): {state: nkruntime.MatchState} | null {
  logger.info('Match terminating...');
  return null;
}

// Match signal
function matchSignal(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, data: string): {state: nkruntime.MatchState, data?: string} | null {
  logger.info(`Match signal received: ${data}`);
  return {
    state: state as MatchState
  };
}

// Register the match handler
function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
  logger.info('Pax Fluxia server module loaded');
  
  initializer.registerMatch('pax_fluxia', {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal
  });
}
