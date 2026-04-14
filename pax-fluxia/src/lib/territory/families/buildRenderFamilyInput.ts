import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../contracts/GeometryContracts';
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
    nowMs: number;
    paused?: boolean;
    gameTick?: number;
    ownership?: RenderFamilyInput['ownership'];
    geometry?: CanonicalGeometrySnapshot | null;
    renderer?: RenderFamilyInput['renderer'];
    activeTransition?: RenderFamilyInput['activeTransition'];
    tunableKeys?: readonly string[];
    configSource?: Record<string, unknown>;
}): RenderFamilyInput {
    return {
        ownership: params.ownership ?? null,
        geometry: params.geometry ?? null,
        nowMs: params.nowMs,
        paused: params.paused ?? false,
        gameTick: params.gameTick,
        stars: params.stars,
        lanes: params.lanes,
        world: { width: params.worldWidth, height: params.worldHeight },
        tunables: collectRenderFamilyTunables({
            tunableKeys: params.tunableKeys,
            configSource: params.configSource,
        }),
        renderer: params.renderer,
        activeTransition: params.activeTransition ?? null,
    };
}
