/**
 * Nakama Client Manager for Pax Fluxia
 * Phase 1: Basic connection and match handling
 * Updated to use correct Nakama JS API
 */

import { Client, Session, Socket } from '@heroiclabs/nakama-js';
import type { ClientGameState } from '../types/index.js';
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

export class NakamaClient {
  private client: Client;
  private session: Session | null = null;
  private socket: Socket | null = null;
  private matchId: string | null = null;
  private gameStateCallback: ((state: ClientGameState) => void) | null = null;
  private connectionStatusCallback: ((connected: boolean) => void) | null = null;
  private isSocketConnected: boolean = false;

  constructor(config: NakamaConfig) {
    this.client = new Client(config.serverKey, config.host, config.port, config.useSSL);
  }

  // Set callback for game state updates
  setGameStateCallback(callback: (state: ClientGameState) => void) {
    this.gameStateCallback = callback;
  }

  // Set callback for connection status changes
  setConnectionStatusCallback(callback: (connected: boolean) => void) {
    this.connectionStatusCallback = callback;
  }

  // Authenticate and create session
  async authenticate(deviceId: string): Promise<void> {
    try {
      this.session = await this.client.authenticateDevice(deviceId, true);
      console.log('Authenticated with Nakama:', this.session.user_id);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  // Connect to realtime socket
  async connect(): Promise<void> {
    if (!this.session) {
      throw new Error('Must authenticate before connecting');
    }

    try {
      this.socket = this.client.createSocket();
      
      // Set up event handlers using the correct property assignment pattern
      this.socket.onconnect = () => {
        console.log('Connected to Nakama socket');
        this.isSocketConnected = true;
        this.connectionStatusCallback?.(true);
      };

      this.socket.ondisconnect = () => {
        console.log('Disconnected from Nakama socket');
        this.isSocketConnected = false;
        this.connectionStatusCallback?.(false);
        this.matchId = null;
      };

      this.socket.onmatchdata = (matchData) => {
        this.handleMatchData(matchData);
      };

      this.socket.onmatchpresence = (matchPresence) => {
        console.log('Match presence update:', matchPresence);
      };

      await this.socket.connect(this.session, true);
    } catch (error) {
      console.error('Socket connection failed:', error);
      throw error;
    }
  }

  // Handle incoming match data
  private handleMatchData(matchData: any) {
    switch (matchData.op_code) {
      case OPCODE_GAME_STATE_UPDATE:
        try {
          const gameState: ClientGameState = JSON.parse(matchData.data);
          this.gameStateCallback?.(gameState);
        } catch (error) {
          console.error('Failed to parse game state:', error);
        }
        break;
      
      default:
        console.log('Unhandled match data:', matchData);
    }
  }

  // Create a new match
  async createMatch(mapName: string = 'default_map'): Promise<string> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    try {
      const match = await this.socket.createMatch('pax_fluxia');
      this.matchId = match.match_id || null;
      console.log('Created match:', this.matchId);
      return this.matchId || '';
    } catch (error) {
      console.error('Failed to create match:', error);
      throw error;
    }
  }

  // Join an existing match
  async joinMatch(matchId: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    try {
      const match = await this.socket.joinMatch(matchId);
      this.matchId = match.match_id || null;
      console.log('Joined match:', this.matchId);
    } catch (error) {
      console.error('Failed to join match:', error);
      throw error;
    }
  }

  // Leave current match
  async leaveMatch(): Promise<void> {
    if (!this.socket || !this.matchId) {
      return;
    }

    try {
      await this.socket.leaveMatch(this.matchId);
      this.matchId = null;
      console.log('Left match');
    } catch (error) {
      console.error('Failed to leave match:', error);
    }
  }

  // Send move order intent
  sendMoveOrder(fromStarId: string, toStarId: string, shipCount?: number): void {
    if (!this.socket || !this.matchId) {
      console.warn('Cannot send move order: not in match');
      return;
    }

    const orderData = {
      fromStarId,
      toStarId,
      shipCount
    };

    this.socket.sendMatchState(this.matchId, OPCODE_PLAYER_MOVE_ORDER_INTENT, JSON.stringify(orderData));
  }

  // Send cancel order intent
  cancelOrder(starId: string): void {
    if (!this.socket || !this.matchId) {
      console.warn('Cannot cancel order: not in match');
      return;
    }

    const cancelData = { starId };
    this.socket.sendMatchState(this.matchId, OPCODE_PLAYER_CANCEL_ORDER_INTENT, JSON.stringify(cancelData));
  }

  // Toggle game pause
  togglePause(): void {
    if (!this.socket || !this.matchId) {
      console.warn('Cannot toggle pause: not in match');
      return;
    }

    this.socket.sendMatchState(this.matchId, OPCODE_TOGGLE_PAUSE, '{}');
  }

  // Set game speed
  setGameSpeed(multiplier: number): void {
    if (!this.socket || !this.matchId) {
      console.warn('Cannot set game speed: not in match');
      return;
    }

    const speedData = { multiplier };
    this.socket.sendMatchState(this.matchId, OPCODE_SET_GAME_SPEED, JSON.stringify(speedData));
  }

  // Disconnect from socket
  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.leaveMatch();
      this.socket.disconnect(false);
      this.socket = null;
      this.isSocketConnected = false;
    }
  }

  // Get current match ID
  getCurrentMatchId(): string | null {
    return this.matchId;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket !== null && this.isSocketConnected;
  }

  // Check if in match
  isInMatch(): boolean {
    return this.matchId !== null;
  }
}
