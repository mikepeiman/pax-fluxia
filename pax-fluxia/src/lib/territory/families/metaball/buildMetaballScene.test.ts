import { describe, expect, it } from 'vitest';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import { buildMetaballScene } from './buildMetaballScene';
import { reconcileMetaballConquestCache } from './metaballConquestTransitions';

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

function makeInput(params: {
    stars: StarState[];
    lanes?: StarConnection[];
    tunables?: Record<string, unknown>;
    activeTransition?: RenderFamilyActiveTransition | null;
}): RenderFamilyInput {
    return {
        ownership: null,
        nowMs: 1000,
        stars: params.stars,
        lanes: params.lanes ?? [],
        world: { width: 200, height: 200 },
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

function makeConquestTransition(): RenderFamilyActiveTransition {
    const conquestEvent = {
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

    return {
        conquestEvents: [conquestEvent],
        events: [
            {
                event: conquestEvent,
                startedAtMs: 500,
                durationMs: 1000,
                rawProgress: 0.5,
                progress: 0.5,
            },
        ],
        startedAtMs: 500,
        durationMs: 1000,
        rawProgress: 0.5,
        progress: 0.5,
    };
}

describe('buildMetaballScene', () => {
    it('includes paired DX samples without requiring a lane between same-owner stars', () => {
        const stars = [
            makeStar({ id: 'a', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'b', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'enemy-top', x: 50, y: 80, ownerId: 'red' }),
            makeStar({ id: 'enemy-bottom', x: 50, y: -70, ownerId: 'green' }),
        ];

        const scene = buildMetaballScene(
            makeInput({
                stars,
                tunables: {
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
                    MODIFIED_VORONOI_DISCONNECT_DISTANCE: 200,
                    TERRITORY_DX_WEIGHT: 0.5,
                },
            }),
            colorUtils,
        );

        const disconnectIds = scene.samples
            .map((sample) => sample.id ?? '')
            .filter((id) => id.startsWith('disconnect:'));
        expect(disconnectIds).toHaveLength(2);
    });

    it('honors contested midpoint-pair count and weight tunables in the metaball-family path', () => {
        const stars = [
            makeStar({ id: 'left', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'right', x: 120, y: 0, ownerId: 'red' }),
        ];
        const lanes = [{ sourceId: 'left', targetId: 'right', distance: 120 }];

        const base = buildMetaballScene(
            makeInput({
                stars,
                lanes,
                tunables: {
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    TERRITORY_CX_CONTEST_MIDPOINT_VSTARS: true,
                    TERRITORY_CX_CONTEST_PAIR_COUNT: 1,
                    TERRITORY_CX_CONTEST_PAIR_WEIGHT: 0.25,
                },
            }),
            colorUtils,
        );

        const amplified = buildMetaballScene(
            makeInput({
                stars,
                lanes,
                tunables: {
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    TERRITORY_CX_CONTEST_MIDPOINT_VSTARS: true,
                    TERRITORY_CX_CONTEST_PAIR_COUNT: 3,
                    TERRITORY_CX_CONTEST_PAIR_WEIGHT: 0.8,
                },
            }),
            colorUtils,
        );

        const baseCorridor = base.samples.filter((sample) =>
            (sample.id ?? '').startsWith('corridor:'),
        );
        const amplifiedCorridor = amplified.samples.filter((sample) =>
            (sample.id ?? '').startsWith('corridor:'),
        );

        expect(baseCorridor).toHaveLength(2);
        expect(amplifiedCorridor).toHaveLength(6);
        expect(
            Math.max(...amplifiedCorridor.map((sample) => sample.strength)),
        ).toBeGreaterThan(
            Math.max(...baseCorridor.map((sample) => sample.strength)),
        );
    });

    it('builds weight-only conquest transition samples without lane-tube samples', () => {
        const stars = [
            makeStar({ id: 'attacker', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'old-anchor', x: 100, y: 80, ownerId: 'red' }),
        ];

        const scene = buildMetaballScene(
            makeInput({
                stars,
                lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 100 }],
                activeTransition: makeConquestTransition(),
                tunables: {
                    VS_TRANSITION_MODE: 'metaball_lane_push',
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
                },
            }),
            colorUtils,
        );

        const ids = scene.samples.map((sample) => sample.id ?? '');
        const attackerBase = scene.samples.find((sample) => sample.id === 'star:attacker');
        const targetBase = scene.samples.find((sample) => sample.id === 'star:target');
        const advancingSample = scene.samples.find((sample) =>
            (sample.id ?? '').includes(':new:'),
        );
        expect(ids.some((id) => id.includes(':new:'))).toBe(true);
        expect(ids.some((id) => id.includes(':old:'))).toBe(true);
        expect(ids.some((id) => id.includes(':tube:'))).toBe(false);
        expect(attackerBase?.strength).toBeGreaterThan(0);
        expect(targetBase?.playerIdx).not.toBe(attackerBase?.playerIdx);
        expect(targetBase?.strength ?? 0).toBeLessThan(
            (attackerBase?.strength ?? 0) * 0.7,
        );
        expect(advancingSample?.playerIdx).toBe(attackerBase?.playerIdx);
        expect(advancingSample?.strength ?? 0).toBeGreaterThan(0);
    });

    it('builds hold-then-switch samples with a fading held target and full-strength victor travel', () => {
        const stars = [
            makeStar({ id: 'attacker', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'old-anchor', x: 100, y: 80, ownerId: 'red' }),
        ];

        const scene = buildMetaballScene(
            makeInput({
                stars,
                lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 100 }],
                activeTransition: makeConquestTransition(),
                tunables: {
                    VS_TRANSITION_MODE: 'metaball_hold_then_switch',
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
                },
            }),
            colorUtils,
        );

        const ids = scene.samples.map((sample) => sample.id ?? '');
        const attackerBase = scene.samples.find((sample) => sample.id === 'star:attacker');
        const targetBase = scene.samples.find((sample) => sample.id === 'star:target');
        const victorSample = scene.samples.find((sample) =>
            (sample.id ?? '').includes(':victor:'),
        );

        expect(ids.some((id) => id.includes(':victor:'))).toBe(true);
        expect(ids.some((id) => id.includes(':old:'))).toBe(false);
        expect(ids.some((id) => id.includes(':burst:'))).toBe(false);
        expect(targetBase?.playerIdx).not.toBe(attackerBase?.playerIdx);
        expect(targetBase?.strength ?? 0).toBeGreaterThan(0);
        expect(targetBase?.strength ?? 0).toBeLessThan(attackerBase?.strength ?? 0);
        expect(victorSample?.playerIdx).toBe(attackerBase?.playerIdx);
        expect(victorSample?.strength).toBeCloseTo(attackerBase?.strength ?? 0, 6);
        expect(victorSample?.x).toBeCloseTo(50, 6);
        expect(victorSample?.y).toBeCloseTo(0, 6);
    });

    it('builds instant-switch grow-in samples with new-owner target influence ramping from zero', () => {
        const stars = [
            makeStar({ id: 'attacker', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'old-anchor', x: 100, y: 80, ownerId: 'red' }),
        ];

        const scene = buildMetaballScene(
            makeInput({
                stars,
                lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 100 }],
                activeTransition: makeConquestTransition(),
                tunables: {
                    VS_TRANSITION_MODE: 'metaball_instant_switch_grow_in',
                    MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                    MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
                },
            }),
            colorUtils,
        );

        const ids = scene.samples.map((sample) => sample.id ?? '');
        const attackerBase = scene.samples.find((sample) => sample.id === 'star:attacker');
        const targetBase = scene.samples.find((sample) => sample.id === 'star:target');
        const victorSample = scene.samples.find((sample) =>
            (sample.id ?? '').includes(':victor:'),
        );

        expect(ids.some((id) => id.includes(':victor:'))).toBe(true);
        expect(ids.some((id) => id.includes(':old:'))).toBe(false);
        expect(ids.some((id) => id.includes(':burst:'))).toBe(false);
        expect(targetBase?.playerIdx).toBe(attackerBase?.playerIdx);
        expect(targetBase?.strength ?? 0).toBeGreaterThan(0);
        expect(targetBase?.strength ?? 0).toBeLessThan(attackerBase?.strength ?? 0);
        expect(victorSample?.playerIdx).toBe(attackerBase?.playerIdx);
        expect(victorSample?.strength ?? 0).toBeGreaterThan(0);
        expect(victorSample?.strength ?? 0).toBeLessThan(attackerBase?.strength ?? 0);
        expect(victorSample?.x).toBeCloseTo(50, 6);
        expect(victorSample?.y).toBeCloseTo(0, 6);
    });

    it('builds six-slice burst samples and suppresses the conquered base star until completion', () => {
        const stars = [
            makeStar({ id: 'attacker', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'old-north', x: 100, y: 110, ownerId: 'red' }),
            makeStar({ id: 'old-south', x: 115, y: -60, ownerId: 'red' }),
        ];

        const input = makeInput({
            stars,
            lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 100 }],
            activeTransition: makeConquestTransition(),
            tunables: {
                VS_TRANSITION_MODE: 'metaball_six_slice_burst',
                MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
                METABALL_BURST_BOUNDARY_BASIS: 't0_region_contour',
            },
        });
        const conquestCache = new Map();
        reconcileMetaballConquestCache({
            input,
            colorUtils,
            conquestCache,
        });

        const scene = buildMetaballScene(input, colorUtils, conquestCache);
        const ids = scene.samples.map((sample) => sample.id ?? '');

        expect(conquestCache.size).toBe(1);
        expect(ids.includes('star:target')).toBe(false);
        expect(ids.filter((id) => id.includes(':victor:'))).toHaveLength(1);
        expect(ids.filter((id) => id.includes(':burst:'))).toHaveLength(5);
    });

    it('caches different burst distances for different boundary basis modes', () => {
        const stars = [
            makeStar({ id: 'attacker', x: 0, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 100, y: 0, ownerId: 'blue' }),
            makeStar({ id: 'old-north', x: 100, y: 180, ownerId: 'red' }),
            makeStar({ id: 'old-east', x: 190, y: 20, ownerId: 'red' }),
        ];

        const contourInput = makeInput({
            stars,
            lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 100 }],
            activeTransition: makeConquestTransition(),
            tunables: {
                VS_TRANSITION_MODE: 'metaball_six_slice_burst',
                METABALL_BURST_BOUNDARY_BASIS: 't0_region_contour',
                MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
            },
        });
        const approximateInput = makeInput({
            stars,
            lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 100 }],
            activeTransition: makeConquestTransition(),
            tunables: {
                VS_TRANSITION_MODE: 'metaball_six_slice_burst',
                METABALL_BURST_BOUNDARY_BASIS: 'approximate_radius',
                MODIFIED_VORONOI_CORRIDOR_ENABLED: false,
                MODIFIED_VORONOI_DISCONNECT_ENABLED: false,
            },
        });
        const contourCache = new Map();
        const approximateCache = new Map();

        reconcileMetaballConquestCache({
            input: contourInput,
            colorUtils,
            conquestCache: contourCache,
        });
        reconcileMetaballConquestCache({
            input: approximateInput,
            colorUtils,
            conquestCache: approximateCache,
        });

        const contourDistance = [...contourCache.values()][0]?.commonBurstDistancePx ?? 0;
        const approximateDistance =
            [...approximateCache.values()][0]?.commonBurstDistancePx ?? 0;

        expect(contourDistance).toBeGreaterThan(0);
        expect(approximateDistance).toBeGreaterThan(0);
        expect(approximateDistance).not.toBe(contourDistance);
    });
});
