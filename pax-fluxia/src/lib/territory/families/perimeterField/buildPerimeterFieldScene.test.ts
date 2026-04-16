import { describe, expect, it } from 'vitest';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
    RegionLoop,
    SectionRef,
} from '../../contracts/FrontierTopologyContracts';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import {
    buildPerimeterFieldScene,
    listPerimeterGeometryLoops,
} from './buildPerimeterFieldScene';
import {
    buildTransitionPlan,
    sampleVSetFromGeometry,
} from './perimeterFieldPlanEngine';

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
    starIds?: string[];
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
                regionId: `region:${params.loopId}`,
                ownerId: params.ownerId,
                starIds: params.starIds,
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
                shellId: `shell:${params.loopId}`,
                ownerId: params.ownerId,
                starIds: params.starIds,
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

function makeTransition(progress = 0.5): RenderFamilyActiveTransition {
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
                rawProgress: progress,
                progress,
            },
        ],
        startedAtMs: 500,
        durationMs: 1000,
        rawProgress: progress,
        progress,
    };
}

function pointKey(x: number, y: number): string {
    return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function makeSquareTopology(params: {
    ownerId: string;
    loopId: string;
    bounds: [number, number, number, number];
}): FrontierTopology {
    const [left, top, right, bottom] = params.bounds;
    const ownerPairKey = `${params.ownerId}|world`;
    const tl = `${left.toFixed(2)},${top.toFixed(2)}`;
    const tr = `${right.toFixed(2)},${top.toFixed(2)}`;
    const br = `${right.toFixed(2)},${bottom.toFixed(2)}`;
    const bl = `${left.toFixed(2)},${bottom.toFixed(2)}`;

    const sectionIds = {
        top: `section:${ownerPairKey}:${tl}:${tr}`,
        right: `section:${ownerPairKey}:${tr}:${br}`,
        bottom: `section:${ownerPairKey}:${bl}:${br}`,
        left: `section:${ownerPairKey}:${tl}:${bl}`,
    } as const;

    const vertices = new Map<string, FrontierVertex>([
        [
            tl,
            {
                id: tl,
                kind: 'world_corner',
                point: [left, top],
                incidentSectionIds: [sectionIds.left, sectionIds.top],
                ownerIds: [params.ownerId, 'world'],
                semanticKey: 'world:corner:top-left',
            },
        ],
        [
            tr,
            {
                id: tr,
                kind: 'world_corner',
                point: [right, top],
                incidentSectionIds: [sectionIds.top, sectionIds.right],
                ownerIds: [params.ownerId, 'world'],
                semanticKey: 'world:corner:top-right',
            },
        ],
        [
            br,
            {
                id: br,
                kind: 'world_corner',
                point: [right, bottom],
                incidentSectionIds: [sectionIds.right, sectionIds.bottom],
                ownerIds: [params.ownerId, 'world'],
                semanticKey: 'world:corner:bottom-right',
            },
        ],
        [
            bl,
            {
                id: bl,
                kind: 'world_corner',
                point: [left, bottom],
                incidentSectionIds: [sectionIds.bottom, sectionIds.left],
                ownerIds: [params.ownerId, 'world'],
                semanticKey: 'world:corner:bottom-left',
            },
        ],
    ]);

    function makeSection(
        id: string,
        startVertexId: string,
        endVertexId: string,
        points: [number, number][],
    ): FrontierSection {
        const length = points.reduce((total, point, index) => {
            if (index === 0) return total;
            const prev = points[index - 1]!;
            return total + Math.hypot(point[0] - prev[0], point[1] - prev[1]);
        }, 0);
        return {
            id,
            kind: 'world_border',
            startVertexId,
            endVertexId,
            leftOwnerId: params.ownerId,
            rightOwnerId: 'world',
            points,
            length,
            ownerPairKey,
            leftInfluence: {
                ownerId: params.ownerId,
                primaryStarId: params.ownerId,
                primaryScore: 1,
            },
            rightInfluence: {
                ownerId: 'world',
                primaryStarId: 'world',
                primaryScore: 1,
            },
        };
    }

    const sections = new Map<string, FrontierSection>([
        [sectionIds.top, makeSection(sectionIds.top, tl, tr, [[left, top], [right, top]])],
        [sectionIds.right, makeSection(sectionIds.right, tr, br, [[right, top], [right, bottom]])],
        [sectionIds.bottom, makeSection(sectionIds.bottom, bl, br, [[left, bottom], [right, bottom]])],
        [sectionIds.left, makeSection(sectionIds.left, tl, bl, [[left, top], [left, bottom]])],
    ]);

    const sectionRefs: SectionRef[] = [
        { sectionId: sectionIds.top, direction: 'forward' },
        { sectionId: sectionIds.right, direction: 'forward' },
        { sectionId: sectionIds.bottom, direction: 'reverse' },
        { sectionId: sectionIds.left, direction: 'reverse' },
    ];
    const loops: RegionLoop[] = [
        {
            id: params.loopId,
            ownerId: params.ownerId,
            componentId: `comp:${params.loopId}`,
            sectionRefs,
            signedArea: Math.abs((right - left) * (bottom - top)),
        },
    ];

    return {
        version: `topology:${params.loopId}`,
        ownershipVersion: 'test',
        worldBounds: { width: 200, height: 200 },
        vertices,
        sections,
        loops,
        sectionsByOwnerPair: new Map([[ownerPairKey, [...sections.keys()]]]),
        sectionsByVertex: new Map([
            [tl, [sectionIds.top, sectionIds.left]],
            [tr, [sectionIds.top, sectionIds.right]],
            [br, [sectionIds.right, sectionIds.bottom]],
            [bl, [sectionIds.bottom, sectionIds.left]],
        ]),
        sectionsByOwner: new Map([
            [params.ownerId, [...sections.keys()]],
            ['world', [...sections.keys()]],
        ]),
    };
}

function makeTopologyGeometry(params: {
    ownerId: string;
    loopId: string;
    bounds: [number, number, number, number];
    starIds?: string[];
    sourceMethod?: CanonicalGeometrySnapshot['sourceMethod'];
}): CanonicalGeometrySnapshot {
    const [left, top, right, bottom] = params.bounds;
    const points: [number, number][] = [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
    ];
    const topology = makeSquareTopology({
        ownerId: params.ownerId,
        loopId: params.loopId,
        bounds: params.bounds,
    });
    return {
        version: `${params.ownerId}:${params.loopId}`,
        sourceMode: 'unified_vector',
        sourceStyle: 'canonical',
        ownershipVersion: 'test',
        geometryFamily: 'vector-native',
        sourceMethod: params.sourceMethod ?? 'power_voronoi',
        territoryRegions: [
            {
                regionId: `region:${params.loopId}`,
                ownerId: params.ownerId,
                starIds: params.starIds,
                points,
                confidence: 1,
            },
        ],
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: topology,
        shells: [
            {
                shellId: `shell:${params.loopId}`,
                ownerId: params.ownerId,
                starIds: params.starIds,
                points,
                area: Math.abs((right - left) * (bottom - top)),
                absArea: Math.abs((right - left) * (bottom - top)),
                confidence: 1,
                holeLoopIds: [],
            },
        ],
        shellLoops: [
            {
                shellLoopId: params.loopId,
                shellId: `shell:${params.loopId}`,
                ownerId: params.ownerId,
                starIds: params.starIds,
                points,
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

function sampleSignature(
    samples: ReadonlyArray<{
        x: number;
        y: number;
        strength: number;
        playerIdx: number;
    }>,
): Array<{
    playerIdx: number;
    x: string;
    y: string;
    strength: string;
}> {
    return [...samples]
        .filter((sample) => sample.strength > 1e-6)
        .map((sample) => ({
            playerIdx: sample.playerIdx,
            x: sample.x.toFixed(2),
            y: sample.y.toFixed(2),
            strength: sample.strength.toFixed(4),
        }))
        .sort((a, b) =>
            a.playerIdx - b.playerIdx ||
            a.x.localeCompare(b.x) ||
            a.y.localeCompare(b.y) ||
            a.strength.localeCompare(b.strength),
        );
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
            starIds: ['target'],
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
                starIds: ['target'],
            }),
            shellLoops: [],
        } as CanonicalGeometrySnapshot;

        const scene = buildPerimeterFieldScene({
            input: makeInput({
                stars,
                tunables: { PERIMETER_FIELD_SAMPLE_SPACING: 20 },
            }),
            starsForDisplay: stars,
            geometry,
            colorUtils,
        });

        expect(scene.sceneInput.samples.length).toBeGreaterThan(0);
        expect(
            scene.sceneInput.samples[0]?.id?.startsWith('perimeter:region:red-loop'),
        ).toBe(true);
    });

    it('prefers authoritative power-voronoi source loops over reconstructed topology loops', () => {
        const geometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop',
            bounds: [20, 20, 80, 80],
            starIds: ['target'],
        });
        geometry.shellLoops = [
            {
                shellLoopId: 'stale-shell-loop',
                shellId: 'stale-shell',
                ownerId: 'red',
                starIds: ['wrong-star'],
                points: [
                    [0, 0],
                    [180, 0],
                    [180, 180],
                    [0, 180],
                ],
                classification: 'outer',
                confidence: 1,
            },
        ];

        const loops = listPerimeterGeometryLoops(geometry);

        expect(loops).toHaveLength(1);
        expect(loops[0]?.loopId).toBe('stale-shell-loop');
        expect(loops[0]?.starIds).toEqual(['wrong-star']);
        expect(loops[0]?.points).toEqual([
            [0, 0],
            [180, 0],
            [180, 180],
            [0, 180],
        ]);
    });

    it('uses authoritative power-voronoi loop geometry for sample coordinates while keeping plan ids', () => {
        const stars = [makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' })];
        const geometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop',
            bounds: [20, 20, 80, 80],
            starIds: ['target'],
        });
        geometry.shellLoops = [
            {
                shellLoopId: 'authoritative-shell',
                shellId: 'shell:red-loop',
                ownerId: 'red',
                starIds: ['target'],
                points: [
                    [10, 10],
                    [90, 10],
                    [90, 90],
                    [10, 90],
                ],
                classification: 'outer',
                confidence: 1,
            },
        ];

        const scene = buildPerimeterFieldScene({
            input: makeInput({
                stars,
                tunables: {
                    PERIMETER_FIELD_SAMPLE_SPACING: 20,
                    PERIMETER_FIELD_TRANSITION_ENGINE: 'plan',
                },
            }),
            starsForDisplay: stars,
            geometry,
            colorUtils,
        });

        expect(scene.sceneInput.samples.length).toBeGreaterThan(0);
        expect(
            scene.sceneInput.samples.every((sample) => sample.id?.startsWith('v:red-loop:')),
        ).toBe(true);
        expect(
            scene.sceneInput.samples.some(
                (sample) =>
                    sample.x < 20 ||
                    sample.x > 80 ||
                    sample.y < 20 ||
                    sample.y > 80,
            ),
        ).toBe(true);
    });

    it('keeps power-voronoi perimeter samples strictly inside the authoritative loop when inward offset is positive', () => {
        const stars = [makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' })];
        const geometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop-offset',
            bounds: [20, 20, 80, 80],
            starIds: ['target'],
            sourceMethod: 'power_voronoi',
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

    it('does not drop a valid power-voronoi region when the topology loop orientation is negative', () => {
        const stars = [makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' })];
        const geometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop-negative-orientation',
            bounds: [20, 20, 80, 80],
            starIds: ['target'],
            sourceMethod: 'power_voronoi',
        });
        geometry.frontierTopology.loops = geometry.frontierTopology.loops.map((loop) => ({
            ...loop,
            signedArea: -Math.abs(loop.signedArea),
        }));

        expect(listPerimeterGeometryLoops(geometry)).toHaveLength(1);

        const scene = buildPerimeterFieldScene({
            input: makeInput({
                stars,
                tunables: {
                    PERIMETER_FIELD_SAMPLE_SPACING: 20,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
                },
            }),
            starsForDisplay: stars,
            geometry,
            colorUtils,
        });

        expect(scene.sceneInput.samples.length).toBeGreaterThan(0);
        expect(
            scene.sceneInput.samples.every((sample) =>
                sample.id?.startsWith('v:red-loop-negative-orientation:'),
            ),
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
            starIds: ['target'],
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
        expect(scene.debug.staticSamples.every((sample) => sample.ownerId === 'red')).toBe(true);
        expect(scene.debug.staticSamples.every((sample) => sample.ownerColor === 0xff5533)).toBe(true);
        expect(scene.debug.staticSamples.every((sample) => sample.debugState === 'static')).toBe(true);
        for (const sample of scene.sceneInput.samples) {
            expect(sample.x).toBeGreaterThan(20);
            expect(sample.x).toBeLessThan(80);
            expect(sample.y).toBeGreaterThan(20);
            expect(sample.y).toBeLessThan(80);
        }
    });

    it('uses actual PREV sample coordinates as vector starts and NEXT sample coordinates as vector ends', () => {
        const displayStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' }),
        ];
        const oldGeometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop',
            bounds: [25, 25, 75, 75],
            starIds: ['target'],
            sourceMethod: 'power_voronoi',
        });
        const newGeometry = makeTopologyGeometry({
            ownerId: 'blue',
            loopId: 'blue-loop',
            bounds: [15, 15, 85, 85],
            starIds: ['target'],
            sourceMethod: 'power_voronoi',
        });
        const nextStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'blue' }),
        ];
        const ownerToCluster = new Map<string, number>([
            ['blue', 0],
            ['red', 1],
        ]);
        const plan = buildTransitionPlan({
            conquestKey: 'test:vector-paths-resolve-to-prev-and-next',
            prevVSet: sampleVSetFromGeometry({
                geometry: oldGeometry,
                options: {
                    spacing: 20,
                    offsetPx: 0,
                    strength: 2,
                    ownerToCluster,
                },
            }),
            nextVSet: sampleVSetFromGeometry({
                geometry: newGeometry,
                options: {
                    spacing: 20,
                    offsetPx: 0,
                    strength: 2,
                    ownerToCluster,
                },
            }),
            conquestEvents: makeTransition().events,
            prevGeometry: oldGeometry,
            nextGeometry: newGeometry,
        });

        const scene = buildPerimeterFieldScene({
            input: makeInput({
                stars: nextStars,
                activeTransition: makeTransition(0.5),
                tunables: {
                    PERIMETER_FIELD_SAMPLE_SPACING: 20,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
                    PERIMETER_FIELD_INFLUENCE_WEIGHT: 2,
                    PERIMETER_FIELD_INFLUENCE_RADIUS: 44,
                },
            }),
            starsForDisplay: nextStars,
            geometry: newGeometry,
            transitionPlan: plan,
            colorUtils,
        });

        const prevScene = buildPerimeterFieldScene({
            input: makeInput({
                stars: [displayStars[1]!],
                tunables: {
                    PERIMETER_FIELD_SAMPLE_SPACING: 20,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
                    PERIMETER_FIELD_INFLUENCE_WEIGHT: 2,
                },
            }),
            starsForDisplay: [displayStars[1]!],
            geometry: oldGeometry,
            colorUtils,
        });
        const nextScene = buildPerimeterFieldScene({
            input: makeInput({
                stars: nextStars,
                tunables: {
                    PERIMETER_FIELD_SAMPLE_SPACING: 20,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
                    PERIMETER_FIELD_INFLUENCE_WEIGHT: 2,
                },
            }),
            starsForDisplay: nextStars,
            geometry: newGeometry,
            colorUtils,
        });

        const prevKeys = new Set(
            prevScene.sceneInput.samples.map((sample) => pointKey(sample.x, sample.y)),
        );
        const nextKeys = new Set(
            nextScene.sceneInput.samples.map((sample) => pointKey(sample.x, sample.y)),
        );

        const vectorSamples = scene.debug.transitionSamples.filter(
            (sample) =>
                sample.pathStartX != null &&
                sample.pathStartY != null &&
                sample.pathEndX != null &&
                sample.pathEndY != null,
        );

        expect(vectorSamples.length).toBeGreaterThan(0);
        expect(
            vectorSamples.every(
                (sample) =>
                    sample.pathStartX != null &&
                    sample.pathStartY != null &&
                    prevKeys.has(pointKey(sample.pathStartX, sample.pathStartY)),
            ),
        ).toBe(true);
        expect(
            vectorSamples.every(
                (sample) =>
                    sample.pathEndX != null &&
                    sample.pathEndY != null &&
                    nextKeys.has(pointKey(sample.pathEndX, sample.pathEndY)),
            ),
        ).toBe(true);
        expect(
            scene.debug.transitionSamples.some(
                (sample) =>
                    sample.transitionRole === 'mover' ||
                    sample.transitionRole === 'preserved',
            ),
        ).toBe(true);
        expect(scene.sceneInput.influenceRadiusPx).toBe(44);
    });

    it('uses exact PREV at frame 0 and exact NEXT at frame 1 for raw power_voronoi geometry', () => {
        const prevStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' }),
        ];
        const nextStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'blue' }),
        ];
        const prevGeometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop',
            bounds: [25, 25, 75, 75],
            starIds: ['target'],
            sourceMethod: 'power_voronoi',
        });
        const nextGeometry = makeTopologyGeometry({
            ownerId: 'blue',
            loopId: 'blue-loop',
            bounds: [15, 15, 85, 85],
            starIds: ['target'],
            sourceMethod: 'power_voronoi',
        });
        const tunables = {
            PERIMETER_FIELD_SAMPLE_SPACING: 20,
            PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
            PERIMETER_FIELD_INFLUENCE_WEIGHT: 1.5,
            PERIMETER_FIELD_INFLUENCE_RADIUS: 44,
        } satisfies Record<string, RenderFamilyTunableValue>;
        const ownerToCluster = new Map<string, number>([
            ['blue', 0],
            ['red', 1],
        ]);
        const prevVSet = sampleVSetFromGeometry({
            geometry: prevGeometry,
            options: {
                spacing: 20,
                offsetPx: 0,
                strength: 1.5,
                ownerToCluster,
            },
        });
        const nextVSet = sampleVSetFromGeometry({
            geometry: nextGeometry,
            options: {
                spacing: 20,
                offsetPx: 0,
                strength: 1.5,
                ownerToCluster,
            },
        });
        const plan = buildTransitionPlan({
            conquestKey: 'test:raw-power-voronoi-frame-invariants',
            prevVSet,
            nextVSet,
            conquestEvents: makeTransition().events,
            prevGeometry,
            nextGeometry,
        });

        const prevScene = buildPerimeterFieldScene({
            input: makeInput({ stars: prevStars, tunables }),
            starsForDisplay: prevStars,
            geometry: prevGeometry,
            colorUtils,
        });
        const nextScene = buildPerimeterFieldScene({
            input: makeInput({ stars: nextStars, tunables }),
            starsForDisplay: nextStars,
            geometry: nextGeometry,
            colorUtils,
        });
        const frame0Scene = buildPerimeterFieldScene({
            input: makeInput({
                stars: nextStars,
                activeTransition: makeTransition(0),
                tunables,
            }),
            starsForDisplay: nextStars,
            geometry: nextGeometry,
            transitionPlan: plan,
            colorUtils,
        });
        const frame1Scene = buildPerimeterFieldScene({
            input: makeInput({
                stars: nextStars,
                activeTransition: makeTransition(1),
                tunables,
            }),
            starsForDisplay: nextStars,
            geometry: nextGeometry,
            transitionPlan: plan,
            colorUtils,
        });

        expect(sampleSignature(frame0Scene.sceneInput.samples)).toEqual(
            sampleSignature(prevScene.sceneInput.samples),
        );
        expect(sampleSignature(frame1Scene.sceneInput.samples)).toEqual(
            sampleSignature(nextScene.sceneInput.samples),
        );
    });

    it('never emits legacy synthetic transition sample ids on the active path', () => {
        const prevGeometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop-topology',
            bounds: [25, 25, 75, 75],
            starIds: ['target'],
            sourceMethod: 'fg2_enriched',
        });
        const nextGeometry = makeTopologyGeometry({
            ownerId: 'blue',
            loopId: 'blue-loop-topology',
            bounds: [15, 15, 85, 85],
            starIds: ['target'],
            sourceMethod: 'fg2_enriched',
        });
        const ownerToCluster = new Map<string, number>([
            ['blue', 0],
            ['red', 1],
        ]);
        const plan = buildTransitionPlan({
            conquestKey: 'test:no-legacy-transition-ids',
            prevVSet: sampleVSetFromGeometry({
                geometry: prevGeometry,
                options: {
                    spacing: 20,
                    offsetPx: 0,
                    strength: 1.5,
                    ownerToCluster,
                },
            }),
            nextVSet: sampleVSetFromGeometry({
                geometry: nextGeometry,
                options: {
                    spacing: 20,
                    offsetPx: 0,
                    strength: 1.5,
                    ownerToCluster,
                },
            }),
            conquestEvents: makeTransition().events,
            prevGeometry,
            nextGeometry,
        });

        const scene = buildPerimeterFieldScene({
            input: makeInput({
                stars: [
                    makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
                    makeStar({ id: 'target', x: 50, y: 50, ownerId: 'blue' }),
                ],
                activeTransition: makeTransition(0.5),
                tunables: {
                    PERIMETER_FIELD_SAMPLE_SPACING: 20,
                    PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
                    PERIMETER_FIELD_INFLUENCE_WEIGHT: 1.5,
                },
            }),
            starsForDisplay: [
                makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
                makeStar({ id: 'target', x: 50, y: 50, ownerId: 'blue' }),
            ],
            geometry: nextGeometry,
            transitionPlan: plan,
            colorUtils,
        });

        expect(
            scene.debug.transitionSamples.every(
                (sample) =>
                    sample.debugState !== 'transition-old' &&
                    sample.debugState !== 'transition-new',
            ),
        ).toBe(true);
        expect(scene.debug.transitionPlan?.conquestKey).toBe(
            'test:no-legacy-transition-ids',
        );
        expect(
            scene.debug.transitionSamples.some(
                (sample) =>
                    sample.transitionRole === 'mover' ||
                    sample.transitionRole === 'preserved',
            ),
        ).toBe(true);
    });

    it('makes topology-plan frame 0 equal PREV and frame 1 equal NEXT', () => {
        const prevStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'red' }),
        ];
        const nextStars = [
            makeStar({ id: 'attacker', x: 20, y: 50, ownerId: 'blue' }),
            makeStar({ id: 'target', x: 50, y: 50, ownerId: 'blue' }),
        ];
        const prevGeometry = makeTopologyGeometry({
            ownerId: 'red',
            loopId: 'red-loop-topology',
            bounds: [25, 25, 75, 75],
            starIds: ['target'],
            sourceMethod: 'fg2_enriched',
        });
        const nextGeometry = makeTopologyGeometry({
            ownerId: 'blue',
            loopId: 'blue-loop-topology',
            bounds: [15, 15, 85, 85],
            starIds: ['target'],
            sourceMethod: 'fg2_enriched',
        });
        const tunables = {
            PERIMETER_FIELD_TRANSITION_ENGINE: 'plan',
            PERIMETER_FIELD_SAMPLE_SPACING: 20,
            PERIMETER_FIELD_INWARD_OFFSET_PX: 0,
            PERIMETER_FIELD_INFLUENCE_WEIGHT: 1.5,
            PERIMETER_FIELD_INFLUENCE_RADIUS: 44,
        } satisfies Record<string, RenderFamilyTunableValue>;
        const ownerToCluster = new Map<string, number>([
            ['blue', 0],
            ['red', 1],
        ]);
        const prevVSet = sampleVSetFromGeometry({
            geometry: prevGeometry,
            options: {
                spacing: 20,
                offsetPx: 0,
                strength: 1.5,
                ownerToCluster,
            },
        });
        const nextVSet = sampleVSetFromGeometry({
            geometry: nextGeometry,
            options: {
                spacing: 20,
                offsetPx: 0,
                strength: 1.5,
                ownerToCluster,
            },
        });
        const plan = buildTransitionPlan({
            conquestKey: 'test:plan-frame-invariants',
            prevVSet,
            nextVSet,
            conquestEvents: makeTransition().events,
            prevGeometry,
            nextGeometry,
        });

        const prevScene = buildPerimeterFieldScene({
            input: makeInput({
                stars: prevStars,
                tunables,
            }),
            starsForDisplay: prevStars,
            geometry: prevGeometry,
            colorUtils,
        });
        const nextScene = buildPerimeterFieldScene({
            input: makeInput({
                stars: nextStars,
                tunables,
            }),
            starsForDisplay: nextStars,
            geometry: nextGeometry,
            colorUtils,
        });
        const frame0Scene = buildPerimeterFieldScene({
            input: makeInput({
                stars: nextStars,
                activeTransition: makeTransition(0),
                tunables,
            }),
            starsForDisplay: prevStars,
            geometry: prevGeometry,
            transitionPlan: plan,
            colorUtils,
        });
        const frame1Scene = buildPerimeterFieldScene({
            input: makeInput({
                stars: nextStars,
                activeTransition: makeTransition(1),
                tunables,
            }),
            starsForDisplay: prevStars,
            geometry: prevGeometry,
            transitionPlan: plan,
            colorUtils,
        });

        expect(plan.movers.length).toBeGreaterThan(0);
        expect(frame0Scene.debug.transitionPlan?.conquestKey).toBe(plan.conquestKey);
        expect(sampleSignature(frame0Scene.sceneInput.samples)).toEqual(
            sampleSignature(prevScene.sceneInput.samples),
        );
        expect(sampleSignature(frame1Scene.sceneInput.samples)).toEqual(
            sampleSignature(nextScene.sceneInput.samples),
        );
    });
});
