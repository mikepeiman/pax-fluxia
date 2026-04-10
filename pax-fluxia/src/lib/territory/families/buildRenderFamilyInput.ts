import type { StarState, StarConnection } from '$lib/types/game.types';
import type { RenderFamilyInput } from './RenderFamilyTypes';

export function buildRenderFamilyInput(params: {
    stars: StarState[];
    lanes: StarConnection[];
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    gameTick?: number;
}): RenderFamilyInput {
    return {
        ownership: null,
        nowMs: params.nowMs,
        gameTick: params.gameTick,
        stars: params.stars,
        lanes: params.lanes,
        world: { width: params.worldWidth, height: params.worldHeight },
        tunables: new Map(),
        activeTransition: null,
    };
}
