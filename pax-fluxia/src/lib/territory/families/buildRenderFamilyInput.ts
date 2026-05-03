import { GAME_CONFIG } from '$lib/config/game.config';
import {
    logPipelineStage,
    summarizeConnections,
    summarizeGeometry,
    summarizeOwnership,
    summarizeStars,
} from '$lib/perf/pipelineTelemetry';
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

function summarizeTunables(
    tunables: ReadonlyMap<string, RenderFamilyTunableValue>,
): string {
    const preview = [...tunables.entries()]
        .slice(0, 4)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(',');
    return `tunables=${tunables.size}${preview ? ` preview=${preview}` : ''}`;
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
    geometry?: CanonicalGeometrySnapshot | null;
    prevGeometry?: CanonicalGeometrySnapshot | null;
    renderer?: RenderFamilyInput['renderer'];
    activeTransition?: RenderFamilyInput['activeTransition'];
    transitionSessions?: RenderFamilyInput['transitionSessions'];
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
    };
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyInput',
        stage: 'family_input',
        from: 'GameCanvas frame state',
        to: 'Render-family contract',
        purpose: 'Freeze stars, lanes, ownership, geometry, and tunables into a single family update payload',
        summary:
            `${summarizeStars(input.stars)} ${summarizeConnections(input.lanes)} ` +
            `${input.ownership ? summarizeOwnership(input.ownership) : 'ownership=null'} ` +
            `${summarizeGeometry(input.geometry)} prev=${summarizeGeometry(input.prevGeometry ?? null)} ` +
            `${summarizeTunables(tunables)}`,
        perfEventName: 'territory.renderFamily.inputBuilt',
        detail: {
            nowMs: input.nowMs,
            paused: input.paused,
            gameTick: input.gameTick ?? null,
            activeTransitionEvents: input.activeTransition?.events.length ?? 0,
            transitionSessions: input.transitionSessions?.length ?? 0,
        },
        logDetail: {
            nowMs: input.nowMs,
            paused: input.paused,
            gameTick: input.gameTick ?? null,
            world: input.world,
            stars: input.stars,
            lanes: input.lanes,
            ownership: input.ownership,
            geometry: input.geometry,
            prevGeometry: input.prevGeometry,
            tunables: Object.fromEntries(tunables.entries()),
            configSource: input.configSource,
            renderer: input.renderer,
            activeTransition: input.activeTransition,
            transitionSessions: input.transitionSessions,
        },
    });
    return input;
}
