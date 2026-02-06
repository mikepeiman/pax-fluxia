export type StarId = string;
export type PlayerId = string;
export type StarType = 'grey' | 'yellow' | 'blue' | 'purple' | 'red' | 'green';
export type GameSpeed = 0 | 1 | 2 | 4 | 10;
export type AppView = 'menu' | 'settings' | 'mapEditor' | 'lobby' | 'playing' | 'results';
export interface Player {
    id: PlayerId;
    name: string;
    color: string;
    isAI: boolean;
    isEliminated: boolean;
    isConnected?: boolean;
    sessionId?: string;
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
    starType: StarType;
    activeShips: number;
    damagedShips: number;
    targetId: StarId | null;
    queuedOrderTargetId: StarId | null;
    productionRate: number;
    repairRate: number;
    transferRate: number;
    activationRate: number;
    defensivePosture: number;
    defenseStrength: number;
    icon?: string;
}
export interface Connection {
    sourceId: StarId;
    targetId: StarId;
    distance: number;
}
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
export interface GameSettings {
    playerCount: number;
    mapType?: 'standard' | 'debug';
    starSpacing?: number;
    minLinksPerStar?: number;
    maxLinksPerStar?: number;
    difficulty?: string;
    gameSpeed?: number;
}
export interface CombatResult {
    attackerKills: number;
    defenderKills: number;
    attackerDisabled: number;
    defenderDisabled: number;
}
export interface StarConfig {
    x: number;
    y: number;
    radius?: number;
    productionRate?: number;
    ownerId?: PlayerId;
    starType?: StarType;
    activeShips?: number;
    damagedShips?: number;
}
