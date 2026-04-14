import { describe, expect, it } from 'vitest';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import { buildPerimeterFieldScene } from './buildPerimeterFieldScene';

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

function makeGeometry(params: {
    ownerId: string;
    loopId: string;
    points: [number, number][];
}): CanonicalGeometrySnapshot {
    return {
        version: `${params.ownerId}:${params.loopId}`,
        sourceMode: 'unified_vector',
        sourceStyle: 'canonical',
        ownershipVersion: 'test',
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [
            {
                regionId: `region:${params.ownerId}`,
                ownerId: params.ownerId,
                points: params.points,
                confidence: 1,
            },
        ],
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: 'topo',
            ownershipVersion: 'test',
            worldBounds: { width: 200, height: 200 },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells: [],
        shellLoops: [
            {
                shellLoopId: params.loopId,
                shellId: `shell:${params.ownerId}`,
                ownerId: params.ownerId,
                points: params.points,
                classification: 'outer',
                confidence: 1,
            },
        ],
        provenance: { derivedFromField: false, notes: [] },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    };
}

function makeInput(params: {
    stars: StarState[];
    tunables?: Record<string, unknown>;
    activeTransition?: RenderFamilyActiveTransition | null;
}): RenderFamilyInput {
    return {
        ownership: null,
        geometry: null,
        nowMs: 1000,
        stars: params.stars,
        lanes: [],
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
            default:
                return 0xffffff;
        }
    },
} as unknown as ColorUtils;

function makeTransition(): RenderFamilyActiveTransition {
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

describe('buildPerimeterFieldScene', () => {
    it('builds deterministic perimeter sample ids from the same geometry', () => {
        const stars = [makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' })];
        const geometry = makeGeometry({
            ownerId: 'red',
            loopId: 'red-loop',
            points: [
                [20, 20],
                [80, 20],
                [80, 80],
                [20, 80],
            ],
        });
        const input = makeInput({
            stars,
            tunables: {
                PERIMETER_FIELD_SAMPLE_SPACING: 20,
                PERIMETER_FIELD_INFLUENCE_WEIGHT: 1.5,
            },
        });

        const sceneA = buildPerimeterFieldScene({
            input,
            starsForDisplay: stars,
            geometry,
            colorUtils,
        });
        const sceneB = buildPerimeterFieldScene({
            input,
            starsForDisplay: stars,
            geometry,
            colorUtils,
        });

        expect(sceneA.sceneInput.samples.map((sample) => sample.id)).toEqual(
            sceneB.sceneInput.samples.map((sample) => sample.id),
        );
        expect(sceneA.sceneInput.fingerprint).toBe(sceneB.sceneInput.fingerprint);
    });

    it('falls back to territory regions when no outer shell loops are available', () => {
        const stars = [makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' })];
        const geometry = {
            ...makeGeometry({
                ownerId: 'red',
                loopId: 'red-loop',
                points: [
                    [20, 20],
                    [80, 20],
                    [80, 80],
                    [20, 80],
                ],
            }),
            shellLoops: [
                {
                    shellLoopId: 'red-hole-like-loop',
                    shellId: 'shell:red',
                    ownerId: 'red',
                    points: [
                        [20, 20],
                        [80, 20],
                        [80, 80],
                        [20, 80],
                    ] as [number, number][],
                    classification: 'hole' as const,
                    confidence: 1,
                },
            ],
        } as CanonicalGeometrySnapshot;
        const input = makeInput({
            stars,
            tunables: {
                PERIMETER_FIELD_SAMPLE_SPACING: 20,
            },
        });

        const scene = buildPerimeterFieldScene({
            input,
            starsForDisplay: stars,
            geometry,
            colorUtils,
        });

        expect(scene.sceneInput.samples.length).toBeGreaterThan(0);
        expect(
            scene.sceneInput.samples[0]?.id?.startsWith('perimeter:region:red'),
        ).toBe(true);
    });

    it('offsets static perimeter samples inside the source boundary', () => {
        const stars = [makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' })];
        const geometry = makeGeometry({
            ownerId: 'red',
            loopId: 'red-loop',
            points: [
                [20, 20],
                [80, 20],
                [80, 80],
                [20, 80],
            ],
        });
        const scene = buildPerimeterFieldScene({
            input: makeInput({
                stars,
                tunables: {
                    PERIMETER_FIELD_SAMPLE_SPACING: 20,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 10,
                },
            }),
            starsForDisplay: stars,
            geometry,
            colorUtils,
        });

        expect(scene.sceneInput.samples.length).toBeGreaterThan(0);
        for (const sample of scene.sceneInput.samples) {
            expect(sample.x).toBeGreaterThan(20);
            expect(sample.x).toBeLessThan(80);
            expect(sample.y).toBeGreaterThan(20);
            expect(sample.y).toBeLessThan(80);
        }
    });

    it('adds conquest-local radial transition samples without star-margin fallback', () => {
        const displayStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' }),
        ];
        const oldGeometry = {
            ...makeGeometry({
                ownerId: 'red',
                loopId: 'red-loop',
                points: [
                    [25, 25],
                    [75, 25],
                    [75, 75],
                    [25, 75],
                ],
            }),
            territoryRegions: [
                {
                    regionId: 'region:red',
                    ownerId: 'red',
                    points: [
                        [25, 25],
                        [75, 25],
                        [75, 75],
                        [25, 75],
                    ] as [number, number][],
                    confidence: 1,
                },
            ],
        } as CanonicalGeometrySnapshot;
        const newGeometry = {
            ...makeGeometry({
                ownerId: 'blue',
                loopId: 'blue-loop',
                points: [
                    [15, 15],
                    [85, 15],
                    [85, 85],
                    [15, 85],
                ],
            }),
            territoryRegions: [
                {
                    regionId: 'region:blue',
                    ownerId: 'blue',
                    points: [
                        [15, 15],
                        [85, 15],
                        [85, 85],
                        [15, 85],
                    ] as [number, number][],
                    confidence: 1,
                },
            ],
        } as CanonicalGeometrySnapshot;
        const input = makeInput({
            stars: displayStars,
            activeTransition: makeTransition(),
            tunables: {
                PERIMETER_FIELD_SAMPLE_SPACING: 24,
                PERIMETER_FIELD_INFLUENCE_WEIGHT: 2,
                PERIMETER_FIELD_TRANSITION_RAY_COUNT: 12,
                PERIMETER_FIELD_INFLUENCE_RADIUS: 44,
            },
        });

        const scene = buildPerimeterFieldScene({
            input,
            starsForDisplay: displayStars,
            geometry: oldGeometry,
            transitionTargetGeometry: newGeometry,
            colorUtils,
        });

        expect(
            scene.sceneInput.samples.filter((sample) =>
                (sample.id ?? '').startsWith('transition:old:'),
            ),
        ).toHaveLength(12);
        expect(
            scene.sceneInput.samples.filter((sample) =>
                (sample.id ?? '').startsWith('transition:new:'),
            ),
        ).toHaveLength(12);
        expect(scene.sceneInput.influenceRadiusPx).toBe(44);
        expect(scene.sceneInput.ownershipMarginPx).toBe(0);
    });

    it('offsets transition override samples inward from the raw boundary hits', () => {
        const displayStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' }),
        ];
        const oldGeometry = {
            ...makeGeometry({
                ownerId: 'red',
                loopId: 'red-loop',
                points: [
                    [25, 25],
                    [75, 25],
                    [75, 75],
                    [25, 75],
                ],
            }),
            territoryRegions: [
                {
                    regionId: 'region:red',
                    ownerId: 'red',
                    points: [
                        [25, 25],
                        [75, 25],
                        [75, 75],
                        [25, 75],
                    ] as [number, number][],
                    confidence: 1,
                },
            ],
        } as CanonicalGeometrySnapshot;
        const newGeometry = {
            ...makeGeometry({
                ownerId: 'blue',
                loopId: 'blue-loop',
                points: [
                    [15, 15],
                    [85, 15],
                    [85, 85],
                    [15, 85],
                ],
            }),
            territoryRegions: [
                {
                    regionId: 'region:blue',
                    ownerId: 'blue',
                    points: [
                        [15, 15],
                        [85, 15],
                        [85, 85],
                        [15, 85],
                    ] as [number, number][],
                    confidence: 1,
                },
            ],
        } as CanonicalGeometrySnapshot;

        const noOffset = buildPerimeterFieldScene({
            input: makeInput({
                stars: displayStars,
                activeTransition: makeTransition(),
                tunables: {
                    PERIMETER_FIELD_TRANSITION_RAY_COUNT: 4,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
                },
            }),
            starsForDisplay: displayStars,
            geometry: oldGeometry,
            transitionTargetGeometry: newGeometry,
            colorUtils,
        });

        const offset = buildPerimeterFieldScene({
            input: makeInput({
                stars: displayStars,
                activeTransition: makeTransition(),
                tunables: {
                    PERIMETER_FIELD_TRANSITION_RAY_COUNT: 4,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 10,
                },
            }),
            starsForDisplay: displayStars,
            geometry: oldGeometry,
            transitionTargetGeometry: newGeometry,
            colorUtils,
        });

        const targetX = 50;
        const targetY = 50;
        const noOffsetSample = noOffset.sceneInput.samples.find(
            (sample) => sample.id === 'transition:new:target:0',
        );
        const offsetSample = offset.sceneInput.samples.find(
            (sample) => sample.id === 'transition:new:target:0',
        );

        expect(noOffsetSample).toBeTruthy();
        expect(offsetSample).toBeTruthy();
        const noOffsetDistance = Math.hypot(
            noOffsetSample!.x - targetX,
            noOffsetSample!.y - targetY,
        );
        const offsetDistance = Math.hypot(
            offsetSample!.x - targetX,
            offsetSample!.y - targetY,
        );
        expect(offsetDistance).toBeLessThan(noOffsetDistance);
    });
});
