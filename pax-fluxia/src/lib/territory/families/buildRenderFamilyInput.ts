import { GAME_CONFIG } from '$lib/config/game.config';

import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ResolvedGeometrySnapshot } from '../contracts/GeometryContracts';
import type {
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from './RenderFamilyTypes';

function collectRenderFamilyTunables(params: {
    tunableKeys?: readonly string[];
    configSource?: Record<string, unknown>;
}): ReadonlyMap<string, RenderFamilyTunableValue> {
    if (!params.tunableKeys?.length) {
        return new Map();
    }

    const configSource =
        params.configSource ??
        (GAME_CONFIG as unknown as Record<string, unknown>);
    const tunables = new Map<string, RenderFamilyTunableValue>();

    for (const key of params.tunableKeys) {
        tunables.set(key, configSource[key] as RenderFamilyTunableValue);
    }

    return tunables;
}

export function buildRenderFamilyInput(params: {
    stars: StarState[];
    lanes: StarConnection[];
    worldWidth: number;
    worldHeight: number;
    worldMinX?: number;
    worldMinY?: number;
    nowMs: number;
    paused?: boolean;
    gameTick?: number;
    ownership?: RenderFamilyInput['ownership'];
    geometry?: ResolvedGeometrySnapshot | null;
    prevGeometry?: ResolvedGeometrySnapshot | null;
    renderer?: RenderFamilyInput['renderer'];
    activeTransition?: RenderFamilyInput['activeTransition'];
    transitionSessions?: RenderFamilyInput['transitionSessions'];
    kineticFrame?: RenderFamilyInput['kineticFrame'];
    tunableKeys?: readonly string[];
    configSource?: Record<string, unknown>;
}): RenderFamilyInput {
    const tunables = collectRenderFamilyTunables({
        tunableKeys: params.tunableKeys,
        configSource: params.configSource,
    });
    const input = {
        ownership: params.ownership ?? null,
        geometry: params.geometry ?? null,
        prevGeometry: params.prevGeometry ?? null,
        nowMs: params.nowMs,
        paused: params.paused ?? false,
        gameTick: params.gameTick,
        stars: params.stars,
        lanes: params.lanes,
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
            minX: params.worldMinX ?? 0,
            minY: params.worldMinY ?? 0,
        },
        tunables,
        configSource:
            params.configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>),
        renderer: params.renderer,
        activeTransition: params.activeTransition ?? null,
        transitionSessions: params.transitionSessions ?? null,
        kineticFrame: params.kineticFrame ?? null,
    };

    return input;
}
