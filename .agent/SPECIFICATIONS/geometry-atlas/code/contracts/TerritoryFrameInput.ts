import type { StarConnection, StarState } from '$lib/types/game.types';
import type { TerritoryModeSelection } from './TerritoryModeSelection';

export interface TerritoryWorldBounds {
    width: number;
    height: number;
}

export interface TerritoryTunables {
    // --- Transition timing ---
    transitionDurationMs: number;

    // --- Presentation ---
    borderWidth: number;
    fillAlpha: number;
    borderAlpha: number;

    // --- Geometry: smoothing ---
    geometrySmoothingPasses: number;
    frontierResolution: number;
    boundaryPad: number;
    boundaryEps: number;

    // --- Geometry: MSR (Minimum Star Radius) ---
    starMargin: number;

    // --- Geometry: CX (Corridor Connection) ---
    corridorEnabled: boolean;
    corridorSpacing: number;
    corridorCount: number;
    corridorWeight: number;

    // --- Geometry: DX (Disconnect Zones) ---
    disconnectEnabled: boolean;
    disconnectDistance: number;
    disconnectWeight: number;

    // --- Geometry: Cluster splitting ---
    clusterSplitThreshold: number;
}

export interface TerritoryFrameInput {
    tickId: number;
    nowMs: number;
    stars: readonly StarState[];
    lanes: readonly StarConnection[];
    players: readonly { id: string }[];
    world: TerritoryWorldBounds;
    selection: TerritoryModeSelection;
    tunables: TerritoryTunables;
}
