import type { StarConnection, StarState } from '$lib/types/game.types';
import type { TerritoryModeSelection } from './TerritoryModeSelection';
import type { TerritoryGeometryTunables } from '../geometry/geometryTuning';

export interface TerritoryWorldBounds {
    width: number;
    height: number;
}

export type Pvv4ProgressProfileId =
    | 'linear'
    | 'smoothstep'
    | 'ease_in_out_quad'
    | 'ease_in_out_cubic';

export interface TerritoryTunables extends TerritoryGeometryTunables {
    // --- Transition timing ---
    transitionDurationMs: number;
    pvv4ProgressProfile: Pvv4ProgressProfileId;
    pvv4ProgressBlend: number;
    pvv4StableAnchorEps: number;
    pvv4ChangeSpanEps: number;
    pvv4ChangeSpanPadPoints: number;

    // --- Presentation ---
    borderWidth: number;
    fillAlpha: number;
    borderAlpha: number;
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
