import { describe, expect, it } from 'vitest';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import { buildMetaballStaticScene } from './buildMetaballScene';
import {
    reconcileMetaballConquestCache,
    type MetaballConquestCacheEntry,
} from './metaballConquestTransitions';
import {
    buildLocalizedMetaballSceneInput,
    buildMetaballTransitionSolveBounds,
} from './metaballLocalOverlay';

function makeStar(params: {
    id: string;
    x: number;
    y: number;
    ownerId: string;
}): StarState {
    return {
        id: params.id,
        x: params.x,
        y: params.y,
        ownerId: params.ownerId,
        activeShips: 12,
        damagedShips: 0,
        radius: 20,
        starType: 'blue',
    } as StarState;
}

function makeConquestEvent() {
    return {
        tick: 10,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [5],
        previousOwner: 'red',
        newOwner: 'blue',
        shipsCaptured: 5,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 5,
        conquestType: 'complete' as const,
    };
}

function makeConquestTransition(params?: {
    progress?: number;
    durationMs?: number;
    startedAtMs?: number;
}): RenderFamilyActiveTransition {
    const conquestEvent = makeConquestEvent();
    const progress = params?.progress ?? 0.4;
    const durationMs = params?.durationMs ?? 1000;
    const startedAtMs = params?.startedAtMs ?? 500;

    return {
        conquestEvents: [conquestEvent],
        events: [
            {
                event: conquestEvent,
                startedAtMs,
                durationMs,
                rawProgress: progress,
                progress: Math.max(0, Math.min(1, progress)),
            },
        ],
        startedAtMs,
        durationMs,
        rawProgress: progress,
        progress: Math.max(0, Math.min(1, progress)),
    };
}

function makeInput(params: {
    stars: StarState[];
    lanes?: StarConnection[];
    tunables?: Record<string, unknown>;
    activeTransition?: RenderFamilyActiveTransition | null;
    nowMs?: number;
}): RenderFamilyInput {
    return {
        ownership: null,
        nowMs: params.nowMs ?? 1000,
        stars: params.stars,
        lanes: params.lanes ?? [],
        world: { width: 300, height: 220 },
        tunables: new Map<string, RenderFamilyTunableValue>(
            Object.entries(params.tunables ?? {}) as Array<
                [string, RenderFamilyTunableValue]
            >,
        ),
        activeTransition: params.activeTransition ?? null,
    };
}

const colorUtils = {
    getPlayerColor(ownerId: string): number {
        switch (ownerId) {
            case 'blue':
                return 0x3366ff;
            case 'red':
                return 0xff5533;
            case 'green':
                return 0x33bb55;
            default:
                return 0xffffff;
        }
    },
} as unknown as ColorUtils;

function getOnlyConquestCacheEntry(
    conquestCache: ReadonlyMap<string, MetaballConquestCacheEntry>,
): MetaballConquestCacheEntry {
    const entry = [...conquestCache.values()][0];
    if (!entry) {
        throw new Error('expected conquest cache entry');
    }
    return entry;
}

describe('metaballLocalOverlay', () => {
    it('builds stable transition bounds that include burst radius and travel endpoints', () => {
        const stars = [
            makeStar({ id: 'attacker', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'old-north', x: 100, y: 110, ownerId: 'red' }),
            makeStar({ id: 'old-south', x: 115, y: -60, ownerId: 'red' }),
        ];
        const activeTransition = makeConquestTransition();
        const input = makeInput({
            stars,
            nowMs:
                activeTransition.startedAtMs +
                activeTransition.rawProgress * activeTransition.durationMs,
            activeTransition,
            tunables: {
                VS_TRANSITION_MODE: 'metaball_six_slice_burst',
                MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
            },
        });
        const conquestCache = new Map<string, MetaballConquestCacheEntry>();
        reconcileMetaballConquestCache({
            input,
            colorUtils,
            conquestCache,
        });
        const staticScene = buildMetaballStaticScene(input, colorUtils);
        const cacheEntry = getOnlyConquestCacheEntry(conquestCache);
        const padding = Math.max(6 * 2, 14 * 2 + 3 * 6 + 2 * 2);

        const solveBounds = buildMetaballTransitionSolveBounds({
            input,
            baseContext: staticScene.baseContext,
            conquestCache,
            influenceRadiusPx: 14,
            blurPx: 3,
            borderWidth: 2,
            cellSize: 6,
        });

        expect(solveBounds).not.toBeNull();
        expect(solveBounds!.minX).toBeLessThanOrEqual(-padding);
        expect(solveBounds!.maxY).toBeGreaterThanOrEqual(110 + padding);
        expect(solveBounds!.minY).toBeLessThanOrEqual(
            cacheEntry.targetOrigin.y - cacheEntry.commonBurstDistancePx - padding,
        );
        expect(solveBounds!.maxX).toBeGreaterThanOrEqual(
            cacheEntry.targetOrigin.x + cacheEntry.commonBurstDistancePx + padding,
        );
    });

    it('localizes a scene input to nearby static and dynamic samples', () => {
        const localized = buildLocalizedMetaballSceneInput({
            sceneInput: {
                ownedStars: [],
                clusterMap: new Map(),
                playerColors: [[0x33, 0x66, 0xff] as const],
                clusterShips: [12],
                staticSamples: [
                    { id: 'keep-static', x: 20, y: 25, playerIdx: 0, strength: 1 },
                    { id: 'drop-static', x: 220, y: 25, playerIdx: 0, strength: 1 },
                ],
                dynamicSamples: [
                    { id: 'keep-dynamic', x: 30, y: 35, playerIdx: 0, strength: 1 },
                    { id: 'drop-dynamic', x: -150, y: 35, playerIdx: 0, strength: 1 },
                ],
                samples: [],
                staticFingerprint: 'static',
                dynamicFingerprint: 'dynamic',
                sceneFingerprint: 'scene',
                fingerprint: 'scene',
            },
            solveBounds: {
                minX: 0,
                minY: 0,
                maxX: 80,
                maxY: 80,
            },
            sampleMarginPx: 12,
            sceneTag: 'testOverlay',
        });

        expect(localized.solveBounds).toEqual({
            minX: 0,
            minY: 0,
            maxX: 80,
            maxY: 80,
        });
        expect(localized.staticSamples?.map((sample) => sample.id)).toEqual([
            'keep-static',
        ]);
        expect(localized.dynamicSamples?.map((sample) => sample.id)).toEqual([
            'keep-dynamic',
        ]);
        expect(localized.samples.map((sample) => sample.id)).toEqual([
            'keep-static',
            'keep-dynamic',
        ]);
        expect(localized.sceneFingerprint).toContain('testOverlay');
    });
});
