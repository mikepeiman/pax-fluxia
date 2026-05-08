import { describe, expect, it } from 'vitest';

import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
    RegionLoop,
    SectionRef,
} from '../../contracts/FrontierTopologyContracts';
import type { OwnershipSnapshot } from '../../contracts/OwnershipContracts';
import type { TerritoryRegionShape } from '../../contracts/GeometryContracts';
import {
    getActiveFrontMonotonicCorrespondence,
    planActiveFrontTransition,
    sampleActiveFrontSectionGeometry,
    sampleActiveFrontTransition,
} from './ActiveFrontTransition';

type Vec2 = [number, number];

function makeVertex(
    id: string,
    point: Vec2,
    sectionIds: string[],
    ownerIds: string[],
): FrontierVertex {
    return {
        id,
        kind: 'world_intersection',
        point,
        incidentSectionIds: sectionIds,
        ownerIds,
    };
}

function makeSection(
    id: string,
    startVertexId: string,
    endVertexId: string,
    ownerId: string,
    points: Vec2[],
): FrontierSection {
    return {
        id,
        kind: 'world_border',
        startVertexId,
        endVertexId,
        leftOwnerId: ownerId,
        rightOwnerId: 'world',
        points,
        length: 1,
        ownerPairKey: `${ownerId}|world`,
        leftInfluence: {
            ownerId,
            primaryStarId: `star:${ownerId}`,
            primaryScore: 1,
        },
        rightInfluence: {
            ownerId: 'world',
            primaryStarId: 'world',
            primaryScore: 1,
        },
    };
}

function makeSquareTopology(
    version: string,
    ownerId: string,
    prefix: string,
    center: Vec2,
    radius: number,
): FrontierTopology {
    const [cx, cy] = center;
    const points: Vec2[] = [
        [cx - radius, cy - radius],
        [cx + radius, cy - radius],
        [cx + radius, cy + radius],
        [cx - radius, cy + radius],
    ];
    const vertexIds = ['A', 'B', 'C', 'D'].map((label) => `${prefix}:${label}`);
    const sectionIds = ['AB', 'BC', 'CD', 'DA'].map((label) => `${prefix}:${label}`);

    const vertices = new Map<string, FrontierVertex>([
        [
            vertexIds[0],
            makeVertex(vertexIds[0], points[0], [sectionIds[0], sectionIds[3]], [ownerId, 'world']),
        ],
        [
            vertexIds[1],
            makeVertex(vertexIds[1], points[1], [sectionIds[0], sectionIds[1]], [ownerId, 'world']),
        ],
        [
            vertexIds[2],
            makeVertex(vertexIds[2], points[2], [sectionIds[1], sectionIds[2]], [ownerId, 'world']),
        ],
        [
            vertexIds[3],
            makeVertex(vertexIds[3], points[3], [sectionIds[2], sectionIds[3]], [ownerId, 'world']),
        ],
    ]);

    const sections = new Map<string, FrontierSection>([
        [sectionIds[0], makeSection(sectionIds[0], vertexIds[0], vertexIds[1], ownerId, [points[0], points[1]])],
        [sectionIds[1], makeSection(sectionIds[1], vertexIds[1], vertexIds[2], ownerId, [points[1], points[2]])],
        [sectionIds[2], makeSection(sectionIds[2], vertexIds[2], vertexIds[3], ownerId, [points[2], points[3]])],
        [sectionIds[3], makeSection(sectionIds[3], vertexIds[3], vertexIds[0], ownerId, [points[3], points[0]])],
    ]);

    const loopSectionRefs: SectionRef[] = sectionIds.map((sectionId) => ({
        sectionId,
        direction: 'forward',
    }));
    const loops: RegionLoop[] = [
        {
            id: `${prefix}:loop`,
            ownerId,
            componentId: `${prefix}:component`,
            sectionRefs: loopSectionRefs,
            signedArea: radius * radius * 4,
        },
    ];

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 200, height: 200 },
        vertices,
        sections,
        loops,
        sectionsByOwnerPair: new Map([[`${ownerId}|world`, sectionIds]]),
        sectionsByVertex: new Map(
            vertexIds.map((vertexId) => [
                vertexId,
                [...(vertices.get(vertexId)?.incidentSectionIds ?? [])],
            ]),
        ),
        sectionsByOwner: new Map([[ownerId, sectionIds]]),
    };
}

function makeEmptyTopology(version: string): FrontierTopology {
    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 200, height: 200 },
        vertices: new Map(),
        sections: new Map(),
        loops: [],
        sectionsByOwnerPair: new Map(),
        sectionsByVertex: new Map(),
        sectionsByOwner: new Map(),
    };
}

function makeSingleSectionTopology(
    version: string,
    ownerA: string,
    ownerB: string,
    points: Vec2[],
    identityPrefix = version,
): FrontierTopology {
    const sectionId = `${identityPrefix}:section`;
    const startVertexId = `${identityPrefix}:start`;
    const endVertexId = `${identityPrefix}:end`;
    const vertices = new Map<string, FrontierVertex>([
        [
            startVertexId,
            {
                id: startVertexId,
                kind: 'world_intersection',
                point: points[0],
                incidentSectionIds: [sectionId],
                ownerIds: [ownerA, ownerB],
            },
        ],
        [
            endVertexId,
            {
                id: endVertexId,
                kind: 'world_intersection',
                point: points[points.length - 1],
                incidentSectionIds: [sectionId],
                ownerIds: [ownerA, ownerB],
            },
        ],
    ]);
    const sections = new Map<string, FrontierSection>([
        [
            sectionId,
            {
                id: sectionId,
                kind: 'owner_border',
                startVertexId,
                endVertexId,
                leftOwnerId: ownerA,
                rightOwnerId: ownerB,
                points,
                length: 100,
                ownerPairKey: `${ownerA}|${ownerB}`,
                leftInfluence: {
                    ownerId: ownerA,
                    primaryStarId: `${ownerA}:star`,
                    primaryScore: 1,
                },
                rightInfluence: {
                    ownerId: ownerB,
                    primaryStarId: `${ownerB}:star`,
                    primaryScore: 1,
                },
            },
        ],
    ]);

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 200, height: 200 },
        vertices,
        sections,
        loops: [],
        sectionsByOwnerPair: new Map([[`${ownerA}|${ownerB}`, [sectionId]]]),
        sectionsByVertex: new Map([
            [startVertexId, [sectionId]],
            [endVertexId, [sectionId]],
        ]),
        sectionsByOwner: new Map([
            [ownerA, [sectionId]],
            [ownerB, [sectionId]],
        ]),
    };
}

function makeParallelSplitTopology(params: {
    version: string;
    ownerA: string;
    ownerB: string;
    branchPoints: Vec2[][];
    identityPrefix?: string;
}): FrontierTopology {
    const identityPrefix = params.identityPrefix ?? params.version;
    const startVertexId = `${identityPrefix}:start`;
    const endVertexId = `${identityPrefix}:end`;
    const firstBranch = params.branchPoints[0] ?? [];
    const vertices = new Map<string, FrontierVertex>([
        [
            startVertexId,
            {
                id: startVertexId,
                kind: 'world_intersection',
                point: firstBranch[0] ?? [0, 0],
                incidentSectionIds: params.branchPoints.map((_, index) => `${identityPrefix}:section:${index}`),
                ownerIds: [params.ownerA, params.ownerB],
            },
        ],
        [
            endVertexId,
            {
                id: endVertexId,
                kind: 'world_intersection',
                point: firstBranch[firstBranch.length - 1] ?? [100, 0],
                incidentSectionIds: params.branchPoints.map((_, index) => `${identityPrefix}:section:${index}`),
                ownerIds: [params.ownerA, params.ownerB],
            },
        ],
    ]);
    const sections = new Map<string, FrontierSection>();
    const sectionIds: string[] = [];

    params.branchPoints.forEach((points, index) => {
        const sectionId = `${identityPrefix}:section:${index}`;
        sectionIds.push(sectionId);
        sections.set(sectionId, {
            id: sectionId,
            kind: 'owner_border',
            startVertexId,
            endVertexId,
            leftOwnerId: params.ownerA,
            rightOwnerId: params.ownerB,
            points,
            length: 100,
            ownerPairKey: `${params.ownerA}|${params.ownerB}`,
            leftInfluence: {
                ownerId: params.ownerA,
                primaryStarId: `${params.ownerA}:star`,
                primaryScore: 1,
            },
            rightInfluence: {
                ownerId: params.ownerB,
                primaryStarId: `${params.ownerB}:star`,
                primaryScore: 1,
            },
        });
    });

    return {
        version: params.version,
        ownershipVersion: `ownership:${params.version}`,
        worldBounds: { width: 200, height: 200 },
        vertices,
        sections,
        loops: [],
        sectionsByOwnerPair: new Map([[`${params.ownerA}|${params.ownerB}`, sectionIds]]),
        sectionsByVertex: new Map([
            [startVertexId, [...sectionIds]],
            [endVertexId, [...sectionIds]],
        ]),
        sectionsByOwner: new Map([
            [params.ownerA, [...sectionIds]],
            [params.ownerB, [...sectionIds]],
        ]),
    };
}

function makeInfluencedSingleSectionTopology(params: {
    version: string;
    ownerA: string;
    ownerB: string;
    points: Vec2[];
    leftStarId: string;
    rightStarId: string;
    identityPrefix?: string;
}): FrontierTopology {
    const identityPrefix = params.identityPrefix ?? params.version;
    const sectionId = `${identityPrefix}:section`;
    const startVertexId = `${identityPrefix}:start`;
    const endVertexId = `${identityPrefix}:end`;
    const vertices = new Map<string, FrontierVertex>([
        [
            startVertexId,
            {
                id: startVertexId,
                kind: 'world_intersection',
                point: params.points[0],
                incidentSectionIds: [sectionId],
                ownerIds: [params.ownerA, params.ownerB],
            },
        ],
        [
            endVertexId,
            {
                id: endVertexId,
                kind: 'world_intersection',
                point: params.points[params.points.length - 1],
                incidentSectionIds: [sectionId],
                ownerIds: [params.ownerA, params.ownerB],
            },
        ],
    ]);
    const sections = new Map<string, FrontierSection>([
        [
            sectionId,
            {
                id: sectionId,
                kind: 'owner_border',
                startVertexId,
                endVertexId,
                leftOwnerId: params.ownerA,
                rightOwnerId: params.ownerB,
                points: params.points,
                length: 100,
                ownerPairKey: `${params.ownerA}|${params.ownerB}`,
                leftInfluence: {
                    ownerId: params.ownerA,
                    primaryStarId: params.leftStarId,
                    primaryScore: 1,
                },
                rightInfluence: {
                    ownerId: params.ownerB,
                    primaryStarId: params.rightStarId,
                    primaryScore: 1,
                },
            },
        ],
    ]);

    return {
        version: params.version,
        ownershipVersion: `ownership:${params.version}`,
        worldBounds: { width: 400, height: 400 },
        vertices,
        sections,
        loops: [],
        sectionsByOwnerPair: new Map([[`${params.ownerA}|${params.ownerB}`, [sectionId]]]),
        sectionsByVertex: new Map([
            [startVertexId, [sectionId]],
            [endVertexId, [sectionId]],
        ]),
        sectionsByOwner: new Map([
            [params.ownerA, [sectionId]],
            [params.ownerB, [sectionId]],
        ]),
    };
}

function makeDirectionalDuplicateTopology(params: {
    version: string;
    ownerA: string;
    ownerB: string;
    points: Vec2[];
    leftStarId: string;
    rightStarId: string;
    identityPrefix?: string;
}): FrontierTopology {
    const identityPrefix = params.identityPrefix ?? params.version;
    const forwardSectionId = `${identityPrefix}:section:fwd`;
    const reverseSectionId = `${identityPrefix}:section:rev`;
    const startVertexId = `${identityPrefix}:start`;
    const endVertexId = `${identityPrefix}:end`;
    const vertices = new Map<string, FrontierVertex>([
        [
            startVertexId,
            {
                id: startVertexId,
                kind: 'world_intersection',
                point: params.points[0],
                incidentSectionIds: [forwardSectionId, reverseSectionId],
                ownerIds: [params.ownerA, params.ownerB],
            },
        ],
        [
            endVertexId,
            {
                id: endVertexId,
                kind: 'world_intersection',
                point: params.points[params.points.length - 1],
                incidentSectionIds: [forwardSectionId, reverseSectionId],
                ownerIds: [params.ownerA, params.ownerB],
            },
        ],
    ]);
    const sections = new Map<string, FrontierSection>([
        [
            forwardSectionId,
            {
                id: forwardSectionId,
                kind: 'owner_border',
                startVertexId,
                endVertexId,
                leftOwnerId: params.ownerA,
                rightOwnerId: params.ownerB,
                points: params.points,
                length: 100,
                ownerPairKey: `${params.ownerA}|${params.ownerB}`,
                leftInfluence: {
                    ownerId: params.ownerA,
                    primaryStarId: params.leftStarId,
                    primaryScore: 1,
                },
                rightInfluence: {
                    ownerId: params.ownerB,
                    primaryStarId: params.rightStarId,
                    primaryScore: 1,
                },
            },
        ],
        [
            reverseSectionId,
            {
                id: reverseSectionId,
                kind: 'owner_border',
                startVertexId: endVertexId,
                endVertexId: startVertexId,
                leftOwnerId: params.ownerA,
                rightOwnerId: params.ownerB,
                points: [...params.points].reverse(),
                length: 100,
                ownerPairKey: `${params.ownerA}|${params.ownerB}`,
                leftInfluence: {
                    ownerId: params.ownerA,
                    primaryStarId: params.leftStarId,
                    primaryScore: 1,
                },
                rightInfluence: {
                    ownerId: params.ownerB,
                    primaryStarId: params.rightStarId,
                    primaryScore: 1,
                },
            },
        ],
    ]);
    const sectionIds = [forwardSectionId, reverseSectionId];

    return {
        version: params.version,
        ownershipVersion: `ownership:${params.version}`,
        worldBounds: { width: 400, height: 400 },
        vertices,
        sections,
        loops: [],
        sectionsByOwnerPair: new Map([[`${params.ownerA}|${params.ownerB}`, sectionIds]]),
        sectionsByVertex: new Map([
            [startVertexId, [...sectionIds]],
            [endVertexId, [...sectionIds]],
        ]),
        sectionsByOwner: new Map([
            [params.ownerA, [...sectionIds]],
            [params.ownerB, [...sectionIds]],
        ]),
    };
}

function mergeTopologies(version: string, topologies: FrontierTopology[]): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>();
    const sections = new Map<string, FrontierSection>();
    const loops: RegionLoop[] = [];
    const sectionsByOwnerPair = new Map<string, string[]>();
    const sectionsByVertex = new Map<string, string[]>();
    const sectionsByOwner = new Map<string, string[]>();

    for (const topology of topologies) {
        for (const [vertexId, vertex] of topology.vertices) {
            vertices.set(vertexId, vertex);
        }
        for (const [sectionId, section] of topology.sections) {
            sections.set(sectionId, section);
        }
        loops.push(...topology.loops);
        for (const [ownerPairKey, sectionIds] of topology.sectionsByOwnerPair) {
            const existing = sectionsByOwnerPair.get(ownerPairKey) ?? [];
            existing.push(...sectionIds);
            sectionsByOwnerPair.set(ownerPairKey, existing);
        }
        for (const [vertexId, sectionIds] of topology.sectionsByVertex) {
            const existing = sectionsByVertex.get(vertexId) ?? [];
            existing.push(...sectionIds);
            sectionsByVertex.set(vertexId, existing);
        }
        for (const [ownerId, sectionIds] of topology.sectionsByOwner) {
            const existing = sectionsByOwner.get(ownerId) ?? [];
            existing.push(...sectionIds);
            sectionsByOwner.set(ownerId, existing);
        }
    }

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 400, height: 400 },
        vertices,
        sections,
        loops,
        sectionsByOwnerPair,
        sectionsByVertex,
        sectionsByOwner,
    };
}

function setLoopPrimaryStarId(
    topology: FrontierTopology,
    ownerId: string,
    starId: string,
): FrontierTopology {
    for (const section of topology.sections.values()) {
        if (section.leftOwnerId === ownerId) {
            section.leftInfluence.primaryStarId = starId;
            section.leftInfluence.primaryScore = 1;
            delete section.leftInfluence.secondaryStarId;
            delete section.leftInfluence.secondaryScore;
        }
        if (section.rightOwnerId === ownerId) {
            section.rightInfluence.primaryStarId = starId;
            section.rightInfluence.primaryScore = 1;
            delete section.rightInfluence.secondaryStarId;
            delete section.rightInfluence.secondaryScore;
        }
    }
    return topology;
}

function setLoopSecondaryStarId(
    topology: FrontierTopology,
    starId: string,
    ownerId: string,
): FrontierTopology {
    for (const section of topology.sections.values()) {
        if (section.leftOwnerId === ownerId) {
            section.leftInfluence.secondaryStarId = starId;
            section.leftInfluence.secondaryScore = 0.5;
        }
        if (section.rightOwnerId === ownerId) {
            section.rightInfluence.secondaryStarId = starId;
            section.rightInfluence.secondaryScore = 0.5;
        }
    }
    return topology;
}

function setLoopComponentId(
    topology: FrontierTopology,
    componentId: string,
): FrontierTopology {
    topology.loops = topology.loops.map((loop) => ({
        ...loop,
        componentId,
    }));
    return topology;
}

function makeRegion(
    regionId: string,
    ownerId: string,
    center: Vec2,
    radius: number,
    anchorStarIds: string[],
): TerritoryRegionShape {
    const [cx, cy] = center;
    return {
        regionId,
        ownerId,
        anchorStarIds,
        points: [
            [cx - radius, cy - radius],
            [cx + radius, cy - radius],
            [cx + radius, cy + radius],
            [cx - radius, cy + radius],
        ],
        confidence: 1,
    };
}

describe('ActiveFrontTransition', () => {
    it('shrinks disappearing solo-owner loops to nothing without inventing a replacement loop', () => {
        const previousOwner = 'ai-1';
        const nextOwner = 'ai-2';
        const starId = 'star-10';
        const prevCenter: Vec2 = [30, 30];

        const prev = setLoopPrimaryStarId(
            makeSquareTopology('prev', previousOwner, 'prev', prevCenter, 12),
            previousOwner,
            starId,
        );
        const next = makeEmptyTopology('next');
        const previousRegions: TerritoryRegionShape[] = [
            makeRegion('region:prev', previousOwner, prevCenter, 12, [starId]),
        ];

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map([[starId, nextOwner]]),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId,
                    previousOwner,
                    newOwner: nextOwner,
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership, {}, [
            { id: starId, x: prevCenter[0], y: prevCenter[1] },
        ], previousRegions, []);
        expect(plan.fronts).toHaveLength(0);
        expect(plan.collapseTargets).toHaveLength(1);
        expect(plan.diagnostics.summary.classification).toBe('collapse_only');
        expect(plan.collapseTargets[0]?.regionId).toBe('region:prev');
        expect(plan.collapseTargets[0]?.center).toEqual(prevCenter);

        const frameAtStart = sampleActiveFrontTransition(plan, prev, next, 0);
        expect(frameAtStart.regions).toHaveLength(1);
        expect(frameAtStart.regions[0]?.ownerId).toBe(previousOwner);

        const frameAtEnd = sampleActiveFrontTransition(plan, prev, next, 1);
        expect(frameAtEnd.regions).toHaveLength(0);
    });

    it('does not treat stable loops as disappearing when only loop ids churn', () => {
        const prev = makeSquareTopology('prev', 'ai-1', 'stable', [30, 30], 12);
        const next: FrontierTopology = {
            ...prev,
            version: 'next',
            ownershipVersion: 'ownership:next',
            loops: prev.loops.map((loop, index) => ({
                ...loop,
                id: `stable:loop:${index + 1}`,
            })),
        };

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership);
        expect(plan.fronts).toHaveLength(0);
        expect(plan.collapseTargets).toHaveLength(0);
        expect(plan.diagnostics.summary.collapseTargetCount).toBe(0);
    });

    it('does not collapse an unrelated mainland when only a single-star island is conquered', () => {
        const previousOwner = 'ai-1';
        const nextOwner = 'ai-2';
        const mainlandStarId = 'star-mainland';
        const islandStarId = 'star-island';
        const sharedComponentId = `${previousOwner}:0`;

        const prevMainland = setLoopComponentId(
            setLoopPrimaryStarId(
                makeSquareTopology('prev-main', previousOwner, 'prev-main', [40, 40], 18),
                previousOwner,
                mainlandStarId,
            ),
            sharedComponentId,
        );
        const prevIsland = setLoopComponentId(
            setLoopPrimaryStarId(
                makeSquareTopology('prev-island', previousOwner, 'prev-island', [140, 140], 8),
                previousOwner,
                islandStarId,
            ),
            sharedComponentId,
        );
        const nextMainland = setLoopComponentId(
            setLoopPrimaryStarId(
                makeSquareTopology('next-main', previousOwner, 'next-main', [88, 40], 18),
                previousOwner,
                mainlandStarId,
            ),
            sharedComponentId,
        );

        const prev = mergeTopologies('prev', [prevMainland, prevIsland]);
        const next = mergeTopologies('next', [nextMainland]);
        const previousRegions: TerritoryRegionShape[] = [
            makeRegion('region:prev-main', previousOwner, [40, 40], 18, [mainlandStarId]),
            makeRegion('region:prev-island', previousOwner, [140, 140], 8, [islandStarId]),
        ];
        const nextRegions: TerritoryRegionShape[] = [
            makeRegion('region:next-main', previousOwner, [88, 40], 18, [mainlandStarId]),
        ];

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map([
                [mainlandStarId, previousOwner],
                [islandStarId, nextOwner],
            ]),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId: islandStarId,
                    previousOwner,
                    newOwner: nextOwner,
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership, {}, [
            { id: mainlandStarId, x: 40, y: 40 },
            { id: islandStarId, x: 140, y: 140 },
        ], previousRegions, nextRegions);

        expect(plan.collapseTargets).toHaveLength(1);
        expect(plan.collapseTargets[0]?.regionId).toBe('region:prev-island');
        expect(plan.collapseTargets[0]?.center).toEqual([140, 140]);
    });

    it('still collapses a true single-star island when same-owner mainland appears only as secondary influence', () => {
        const previousOwner = 'ai-1';
        const nextOwner = 'ai-2';
        const mainlandStarId = 'star-mainland';
        const islandStarId = 'star-island';

        const prevIsland = setLoopSecondaryStarId(
            setLoopPrimaryStarId(
                makeSquareTopology('prev-island', previousOwner, 'prev-island', [140, 140], 8),
                previousOwner,
                islandStarId,
            ),
            mainlandStarId,
            previousOwner,
        );
        const next = makeEmptyTopology('next');
        const previousRegions: TerritoryRegionShape[] = [
            makeRegion('region:prev-island', previousOwner, [140, 140], 8, [islandStarId]),
        ];

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map([
                [mainlandStarId, previousOwner],
                [islandStarId, nextOwner],
            ]),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId: islandStarId,
                    previousOwner,
                    newOwner: nextOwner,
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prevIsland, next, ownership, {}, [
            { id: mainlandStarId, x: 40, y: 40 },
            { id: islandStarId, x: 140, y: 140 },
        ], previousRegions, []);

        expect(plan.collapseTargets).toHaveLength(1);
        expect(plan.collapseTargets[0]?.regionId).toBe('region:prev-island');
        expect(plan.collapseTargets[0]?.center).toEqual([140, 140]);
    });

    it('keeps a 2-star region conquest local by including the surviving star in conquest gating', () => {
        const previousOwner = 'red';
        const nextOwner = 'blue';
        const capturedStarId = 'red-captured';
        const survivingStarId = 'red-surviving';
        const unrelatedBlueStarId = 'blue-other';

        const prev = makeInfluencedSingleSectionTopology({
            version: 'prev',
            ownerA: previousOwner,
            ownerB: nextOwner,
            identityPrefix: 'stable',
            points: [
                [0, 0],
                [20, 0],
                [40, 0],
                [60, 12],
                [80, 0],
                [100, 0],
            ],
            leftStarId: survivingStarId,
            rightStarId: unrelatedBlueStarId,
        });
        const next = makeInfluencedSingleSectionTopology({
            version: 'next',
            ownerA: previousOwner,
            ownerB: nextOwner,
            identityPrefix: 'stable',
            points: [
                [0, 0],
                [20, 0],
                [40, 0],
                [60, -12],
                [80, 0],
                [100, 0],
            ],
            leftStarId: survivingStarId,
            rightStarId: unrelatedBlueStarId,
        });
        const previousRegions: TerritoryRegionShape[] = [
            makeRegion('region:prev-two-star', previousOwner, [50, 20], 20, [
                capturedStarId,
                survivingStarId,
            ]),
        ];
        const nextRegions: TerritoryRegionShape[] = [
            makeRegion('region:next-survivor', previousOwner, [60, 10], 16, [
                survivingStarId,
            ]),
        ];

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map([
                [capturedStarId, nextOwner],
                [survivingStarId, previousOwner],
            ]),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId: capturedStarId,
                    previousOwner,
                    newOwner: nextOwner,
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(
            prev,
            next,
            ownership,
            { changeSpanPadPoints: 0 },
            [],
            previousRegions,
            nextRegions,
        );

        expect(plan.diagnostics.summary.classification).toBe('animated_fronts');
        expect(plan.fronts).toHaveLength(1);
        expect([...plan.fronts[0]!.activeSectionIds]).toContain('stable:section');
    });

    it('moves only the local changed interval inside a single active section', () => {
        const prev = makeSingleSectionTopology('prev', 'red', 'blue', [
            [0, 0],
            [20, 0],
            [40, 0],
            [60, 12],
            [80, 0],
            [100, 0],
        ], 'stable');
        const next = makeSingleSectionTopology('next', 'red', 'blue', [
            [0, 0],
            [20, 0],
            [40, 0],
            [60, -12],
            [80, 0],
            [100, 0],
        ], 'stable');

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership, {
            changeSpanPadPoints: 0,
        });
        expect(plan.diagnostics.summary.classification).toBe('animated_fronts');
        const front = plan.fronts[0];
        expect(front).toBeTruthy();

        const correspondence = getActiveFrontMonotonicCorrespondence(front!);
        expect(correspondence).toBeTruthy();
        expect(correspondence?.prevFront).toHaveLength(1);
        expect(correspondence?.postFront).toHaveLength(1);
        expect(correspondence?.changeAnchors.startPoint).toEqual([60, -12]);
        expect(correspondence?.changeAnchors.endPoint).toEqual([60, -12]);

        const sectionGeometry = sampleActiveFrontSectionGeometry(plan, prev, next, 0.5, 1);
        const sampled = sectionGeometry.get('stable:section');
        expect(sampled).toBeTruthy();
        expect(sampled?.[0]).toEqual([0, 0]);
        expect(sampled?.[1]).toEqual([20, 0]);
        expect(sampled?.[2]).toEqual([40, 0]);
        expect(sampled?.[4]).toEqual([80, 0]);
        expect(sampled?.[5]).toEqual([100, 0]);
        expect(sampled?.[3]?.[1]).toBeCloseTo(0, 6);
    });

    it('builds equal-number monotonic change vertices from PRE front to POST front', () => {
        const prev = makeSingleSectionTopology('prev', 'red', 'blue', [
            [0, 0],
            [20, 0],
            [40, 0],
            [60, 0],
            [80, 0],
            [100, 0],
        ], 'stable');
        const next = makeSingleSectionTopology('next', 'red', 'blue', [
            [0, 0],
            [20, -4],
            [40, -10],
            [60, -10],
            [80, -4],
            [100, 0],
        ], 'stable');

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership, {
            changeSpanPadPoints: 0,
        });
        const front = plan.fronts[0];
        expect(front).toBeTruthy();

        const correspondence = getActiveFrontMonotonicCorrespondence(front!, 1, 4);
        expect(correspondence).toBeTruthy();
        expect(correspondence?.postFront).toHaveLength(4);
        expect(correspondence?.prevFront).toHaveLength(4);
        expect([
            correspondence?.changeAnchors.startPoint,
            correspondence?.changeAnchors.endPoint,
        ]).toEqual(expect.arrayContaining([
            [20, -4],
            [80, -4],
        ]));

        const sectionGeometry = sampleActiveFrontSectionGeometry(plan, prev, next, 0.5, 4);
        const sampled = sectionGeometry.get('stable:section');
        expect(sampled).toBeTruthy();
        expect(sampled?.[0]).toEqual([0, 0]);
        expect(sampled?.[5]).toEqual([100, 0]);
        expect(sampled?.[1]?.[1]).toBeLessThan(0);
        expect(sampled?.[2]?.[1]).toBeLessThan(sampled?.[1]?.[1] ?? 0);
        expect(sampled?.[3]?.[1]).toBeCloseTo(sampled?.[2]?.[1] ?? 0, 6);
        expect(sampled?.[4]?.[1]).toBeCloseTo(sampled?.[1]?.[1] ?? 0, 6);
    });

    it('supports bounded 1to2 split fronts without classification defects', () => {
        const prev = makeSingleSectionTopology(
            'prev',
            'red',
            'blue',
            [
                [0, 0],
                [25, 0],
                [50, 0],
                [75, 0],
                [100, 0],
            ],
            'stable',
        );
        const next = makeParallelSplitTopology({
            version: 'next',
            ownerA: 'red',
            ownerB: 'blue',
            identityPrefix: 'stable',
            branchPoints: [
                [
                    [0, 0],
                    [25, -10],
                    [50, -18],
                    [75, -10],
                    [100, 0],
                ],
                [
                    [0, 0],
                    [25, 10],
                    [50, 18],
                    [75, 10],
                    [100, 0],
                ],
            ],
        });

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership);
        expect(plan.diagnostics.summary.classification).toBe('animated_fronts');
        expect(plan.diagnostics.summary.hasClassificationDefect).toBe(false);
        expect(plan.diagnostics.summary.defectUnsupportedSplitCount).toBe(0);
        expect(plan.fronts).toHaveLength(1);
        expect(plan.fronts[0]?.splitMode).toBe('1to2');
        expect([...plan.fronts[0]!.activeSectionIds].sort()).toEqual([
            'stable:section:0',
            'stable:section:1',
        ]);
    });

    it('supports bounded 2to1 merge fronts without classification defects', () => {
        const prev = makeParallelSplitTopology({
            version: 'prev',
            ownerA: 'red',
            ownerB: 'blue',
            identityPrefix: 'stable',
            branchPoints: [
                [
                    [0, 0],
                    [25, -10],
                    [50, -18],
                    [75, -10],
                    [100, 0],
                ],
                [
                    [0, 0],
                    [25, 10],
                    [50, 18],
                    [75, 10],
                    [100, 0],
                ],
            ],
        });
        const next = makeSingleSectionTopology(
            'next',
            'red',
            'blue',
            [
                [0, 0],
                [25, 0],
                [50, 0],
                [75, 0],
                [100, 0],
            ],
            'stable',
        );

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership);
        expect(plan.diagnostics.summary.classification).toBe('animated_fronts');
        expect(plan.diagnostics.summary.hasClassificationDefect).toBe(false);
        expect(plan.diagnostics.summary.defectUnsupportedSplitCount).toBe(0);
        expect(plan.fronts).toHaveLength(1);
        expect(plan.fronts[0]?.splitMode).toBe('2to1');
        expect([...plan.fronts[0]!.activeSectionIds]).toEqual(['stable:section']);
    });

    it('limits active-front planning to conquest-local anchor pairs', () => {
        const prev = mergeTopologies('prev', [
            makeInfluencedSingleSectionTopology({
                version: 'prev:changed',
                ownerA: 'red',
                ownerB: 'blue',
                identityPrefix: 'changed',
                leftStarId: 'star-attacker',
                rightStarId: 'star-captured',
                points: [
                    [0, 0],
                    [25, 0],
                    [50, 12],
                    [75, 0],
                    [100, 0],
                ],
            }),
            makeInfluencedSingleSectionTopology({
                version: 'prev:unrelated',
                ownerA: 'green',
                ownerB: 'yellow',
                identityPrefix: 'unrelated',
                leftStarId: 'star-green',
                rightStarId: 'star-yellow',
                points: [
                    [0, 120],
                    [25, 120],
                    [50, 120],
                    [75, 120],
                    [100, 120],
                ],
            }),
        ]);
        const next = mergeTopologies('next', [
            makeInfluencedSingleSectionTopology({
                version: 'next:changed',
                ownerA: 'red',
                ownerB: 'blue',
                identityPrefix: 'changed',
                leftStarId: 'star-attacker',
                rightStarId: 'star-captured',
                points: [
                    [0, 0],
                    [25, 0],
                    [50, -12],
                    [75, 0],
                    [100, 0],
                ],
            }),
            makeInfluencedSingleSectionTopology({
                version: 'next:unrelated',
                ownerA: 'green',
                ownerB: 'yellow',
                identityPrefix: 'unrelated',
                leftStarId: 'star-green',
                rightStarId: 'star-yellow',
                points: [
                    [0, 120],
                    [25, 120],
                    [50, 120],
                    [75, 120],
                    [100, 120],
                ],
            }),
        ]);

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId: 'star-captured',
                    previousOwner: 'blue',
                    newOwner: 'red',
                    attackerStarId: 'star-attacker',
                    attackerStarIds: ['star-attacker'],
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership);
        expect(plan.diagnostics.summary.pairCount).toBe(1);
        expect(plan.diagnostics.summary.frontCount).toBe(1);
        expect(plan.diagnostics.summary.noChangePairCount).toBe(0);
        expect(plan.fronts).toHaveLength(1);
        expect(plan.fronts[0]?.anchorStartId).toBe('changed:end');
        expect(plan.fronts[0]?.anchorEndId).toBe('changed:start');
    });

    it('dedupes forward and reverse copies of the same border before split classification', () => {
        const prev = makeDirectionalDuplicateTopology({
            version: 'prev',
            ownerA: 'red',
            ownerB: 'blue',
            identityPrefix: 'stable',
            leftStarId: 'star-attacker',
            rightStarId: 'star-captured',
            points: [
                [0, 0],
                [25, 0],
                [50, 12],
                [75, 0],
                [100, 0],
            ],
        });
        const next = makeDirectionalDuplicateTopology({
            version: 'next',
            ownerA: 'red',
            ownerB: 'blue',
            identityPrefix: 'stable',
            leftStarId: 'star-attacker',
            rightStarId: 'star-captured',
            points: [
                [0, 0],
                [25, 0],
                [50, -12],
                [75, 0],
                [100, 0],
            ],
        });

        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId: 'star-captured',
                    previousOwner: 'blue',
                    newOwner: 'red',
                    attackerStarId: 'star-attacker',
                    attackerStarIds: ['star-attacker'],
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership);
        expect(plan.diagnostics.summary.pairCount).toBe(1);
        expect(plan.diagnostics.summary.defectUnsupportedSplitCount).toBe(0);
        expect(plan.fronts).toHaveLength(1);
        expect(plan.diagnostics.pairDiagnostics[0]?.prevPathCount).toBe(1);
        expect(plan.diagnostics.pairDiagnostics[0]?.nextPathCount).toBe(1);
    });
});
