/**
 * Mock Nakama Client for Pax Fluxia Phase 1 Development
 * This allows us to test the game logic without a running Nakama server
 */

import type { ClientGameState } from '../types/index.js';
import { StarType } from '../types/index.js';
import { 
  OPCODE_GAME_STATE_UPDATE,
  OPCODE_PLAYER_MOVE_ORDER_INTENT,
  OPCODE_PLAYER_CANCEL_ORDER_INTENT,
  OPCODE_TOGGLE_PAUSE,
  OPCODE_SET_GAME_SPEED
} from '../utils/constants.js';

export interface NakamaConfig {
  serverKey: string;
  host: string;
  port: string;
  useSSL: boolean;
}

export class MockNakamaClient {
  private gameStateCallback: ((state: ClientGameState) => void) | null = null;
  private connectionStatusCallback: ((connected: boolean) => void) | null = null;
  private isSocketConnected: boolean = false;
  private matchId: string | null = null;
  private mockGameState: ClientGameState | null = null;
  private gameTickInterval: NodeJS.Timeout | null = null;

  constructor(config: NakamaConfig) {
    console.log('Mock Nakama Client initialized with config:', config);
  }

  // Set callback for game state updates
  setGameStateCallback(callback: (state: ClientGameState) => void) {
    this.gameStateCallback = callback;
  }

  // Set callback for connection status changes
  setConnectionStatusCallback(callback: (connected: boolean) => void) {
    this.connectionStatusCallback = callback;
  }

  // Mock authenticate
  async authenticate(deviceId: string): Promise<void> {
    console.log('Mock authentication for device:', deviceId);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  }

  // Mock connect
  async connect(): Promise<void> {
    console.log('Mock connecting to Nakama...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate connection delay
    
    this.isSocketConnected = true;
    this.connectionStatusCallback?.(true);
    console.log('Mock connected to Nakama');
  }

  // Mock create match
  async createMatch(mapName: string = 'default_map'): Promise<string> {
    console.log('Mock creating match with map:', mapName);
    
    this.matchId = 'mock_match_' + Math.random().toString(36).substr(2, 9);
    
    // Create mock game state based on default map
    this.mockGameState = {
      tick: 0,
      stars: {
        's1': {
          id: 's1',
          x: 100,
          y: 200,
          ownerPlayerId: 'p1',
          starType: StarType.STANDARD,
          activeShips: 10,
          damagedShips: 0,
          productionProgress: 0,
          currentOutgoingOrder: null
        },
        's2': {
          id: 's2',
          x: 400,
          y: 200,
          ownerPlayerId: 'p2',
          starType: StarType.YELLOW,
          activeShips: 10,
          damagedShips: 0,
          productionProgress: 0,
          currentOutgoingOrder: null
        },
        's3': {
          id: 's3',
          x: 250,
          y: 400,
          ownerPlayerId: null,
          starType: StarType.STANDARD,
          activeShips: 5,
          damagedShips: 0,
          productionProgress: 0,
          currentOutgoingOrder: null
        }
      },
      paths: {
        'p1_3': {
          id: 'p1_3',
          starA_id: 's1',
          starB_id: 's3'
        },
        'p2_3': {
          id: 'p2_3',
          starA_id: 's2',
          starB_id: 's3'
        }
      },
      players: {
        'p1': {
          id: 'p1',
          name: 'Player 1',
          color: '#FF0000',
          activeShipsTotal: 10,
          damagedShipsTotal: 0
        },
        'p2': {
          id: 'p2',
          name: 'Player 2',
          color: '#0000FF',
          activeShipsTotal: 10,
          damagedShipsTotal: 0
        }
      },
      gameSpeedMultiplier: 1.0,
      isPaused: false
    };

    // Send initial game state
    setTimeout(() => {
      if (this.mockGameState) {
        this.gameStateCallback?.(this.mockGameState);
      }
    }, 100);

    // Start mock game tick
    this.startGameTick();

    return this.matchId;
  }

  // Mock join match
  async joinMatch(matchId: string): Promise<void> {
    console.log('Mock joining match:', matchId);
    this.matchId = matchId;
    
    // For mock, just send the same game state
    if (this.mockGameState) {
      setTimeout(() => {
        if (this.mockGameState) {
          this.gameStateCallback?.(this.mockGameState);
        }
      }, 100);
    }
  }

  // Start mock game tick
  private startGameTick(): void {
    if (this.gameTickInterval) {
      clearInterval(this.gameTickInterval);
    }

    this.gameTickInterval = setInterval(() => {
      if (this.mockGameState && !this.mockGameState.isPaused) {
        // Increment tick
        this.mockGameState.tick++;

        // Mock production progress
        for (const star of Object.values(this.mockGameState.stars)) {
          if (star.ownerPlayerId) {
            star.productionProgress += 0.125; // 8 ticks per ship
            if (star.productionProgress >= 1.0) {
              star.productionProgress = 0;
              star.activeShips++;
              
              // Update player totals
              if (this.mockGameState.players[star.ownerPlayerId]) {
                this.mockGameState.players[star.ownerPlayerId].activeShipsTotal++;
              }
            }
          }
        }

        // Send updated game state
        this.gameStateCallback?.(this.mockGameState);
      }
    }, 1000 / (this.mockGameState?.gameSpeedMultiplier || 1));
  }

  // Mock leave match
  async leaveMatch(): Promise<void> {
    console.log('Mock leaving match');
    this.matchId = null;
    this.mockGameState = null;
    
    if (this.gameTickInterval) {
      clearInterval(this.gameTickInterval);
      this.gameTickInterval = null;
    }
  }

  // Mock send move order
  sendMoveOrder(fromStarId: string, toStarId: string, shipCount?: number): void {
    console.log('Mock move order:', { fromStarId, toStarId, shipCount });
    // TODO: Implement mock move logic
  }

  // Mock cancel order
  cancelOrder(starId: string): void {
    console.log('Mock cancel order:', starId);
    // TODO: Implement mock cancel logic
  }

  // Mock toggle pause
  togglePause(): void {
    if (this.mockGameState) {
      this.mockGameState.isPaused = !this.mockGameState.isPaused;
      console.log('Mock game paused:', this.mockGameState.isPaused);
      this.gameStateCallback?.(this.mockGameState);
    }
  }

  // Mock set game speed
  setGameSpeed(multiplier: number): void {
    if (this.mockGameState) {
      this.mockGameState.gameSpeedMultiplier = multiplier;
      console.log('Mock game speed set to:', multiplier);
      this.gameStateCallback?.(this.mockGameState);
      
      // Restart tick with new speed
      this.startGameTick();
    }
  }

  // Mock disconnect
  async disconnect(): Promise<void> {
    console.log('Mock disconnecting...');
    await this.leaveMatch();
    this.isSocketConnected = false;
    this.connectionStatusCallback?.(false);
  }

  // Get current match ID
  getCurrentMatchId(): string | null {
    return this.matchId;
  }

  // Check if connected
  isConnected(): boolean {
    return this.isSocketConnected;
  }

  // Check if in match
  isInMatch(): boolean {
    return this.matchId !== null;
  }
}
