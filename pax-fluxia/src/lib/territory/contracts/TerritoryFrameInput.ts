import type { StarConnection, StarState } from '$lib/types/game.types';
import type { TerritoryModeSelection } from './TerritoryModeSelection';

export interface TerritoryWorldBounds {
    width: number;
    height: number;
}

export interface TerritoryTunables {
    transitionDurationMs: number;
    borderWidth: number;
    fillAlpha: number;
    borderAlpha: number;
    geometrySmoothingPasses: number;
    frontierResolution: number;
    boundaryPad: number;
    boundaryEps: number;
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
