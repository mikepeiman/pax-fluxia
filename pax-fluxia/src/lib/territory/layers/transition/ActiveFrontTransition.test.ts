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
    type ActiveFrontTransitionPlan,
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

function makeTwoSectionTopology(
    version: string,
    ownerA: string,
    ownerB: string,
    firstPoints: Vec2[],
    secondPoints: Vec2[],
    identityPrefix = version,
): FrontierTopology {
    const startVertexId = `${identityPrefix}:start`;
    const middleVertexId = `${identityPrefix}:middle`;
    const endVertexId = `${identityPrefix}:end`;
    const firstSectionId = `${identityPrefix}:section:0`;
    const secondSectionId = `${identityPrefix}:section:1`;
    const makeOwnerSection = (
        id: string,
        startId: string,
        endId: string,
        points: Vec2[],
    ): FrontierSection => ({
        id,
        kind: 'owner_border',
        startVertexId: startId,
        endVertexId: endId,
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
    });

    const vertices = new Map<string, FrontierVertex>([
        [
            startVertexId,
            {
                id: startVertexId,
                kind: 'world_intersection',
                point: firstPoints[0],
                incidentSectionIds: [firstSectionId],
                ownerIds: [ownerA, ownerB],
            },
        ],
        [
            middleVertexId,
            {
                id: middleVertexId,
                kind: 'lane_anchor',
                point: firstPoints[firstPoints.length - 1],
                incidentSectionIds: [firstSectionId, secondSectionId],
                ownerIds: [ownerA, ownerB],
            },
        ],
        [
            endVertexId,
            {
                id: endVertexId,
                kind: 'world_intersection',
                point: secondPoints[secondPoints.length - 1],
                incidentSectionIds: [secondSectionId],
                ownerIds: [ownerA, ownerB],
            },
        ],
    ]);
    const sections = new Map<string, FrontierSection>([
        [
            firstSectionId,
            makeOwnerSection(firstSectionId, startVertexId, middleVertexId, firstPoints),
        ],
        [
            secondSectionId,
            makeOwnerSection(secondSectionId, middleVertexId, endVertexId, secondPoints),
        ],
    ]);

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 200, height: 200 },
        vertices,
        sections,
        loops: [],
        sectionsByOwnerPair: new Map([[`${ownerA}|${ownerB}`, [firstSectionId, secondSectionId]]]),
        sectionsByVertex: new Map([
            [startVertexId, [firstSectionId]],
            [middleVertexId, [firstSectionId, secondSectionId]],
            [endVertexId, [secondSectionId]],
        ]),
        sectionsByOwner: new Map([
            [ownerA, [firstSectionId, secondSectionId]],
            [ownerB, [firstSectionId, secondSectionId]],
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

function makeGapTopology(
    version: string,
    sectionSpecs: readonly {
        id: string;
        startVertexId: string;
        endVertexId: string;
        leftOwnerId: string;
        rightOwnerId: string;
        leftStarId: string;
        rightStarId: string;
    }[],
): FrontierTopology {
    const vertexPoints = new Map<string, Vec2>([
        ['A', [0, 0]],
        ['B', [100, 0]],
        ['C', [0, 100]],
        ['D', [100, 100]],
    ]);
    const sections = new Map<string, FrontierSection>();
    const sectionsByVertex = new Map<string, string[]>();
    const sectionsByOwnerPair = new Map<string, string[]>();
    const sectionsByOwner = new Map<string, string[]>();

    for (const spec of sectionSpecs) {
        const start = vertexPoints.get(spec.startVertexId)!;
        const end = vertexPoints.get(spec.endVertexId)!;
        const ownerPairKey = `${spec.leftOwnerId}|${spec.rightOwnerId}`;
        sections.set(spec.id, {
            id: spec.id,
            kind: 'owner_border',
            startVertexId: spec.startVertexId,
            endVertexId: spec.endVertexId,
            leftOwnerId: spec.leftOwnerId,
            rightOwnerId: spec.rightOwnerId,
            points: [start, end],
            length: 100,
            ownerPairKey,
            leftInfluence: {
                ownerId: spec.leftOwnerId,
                primaryStarId: spec.leftStarId,
                primaryScore: 1,
            },
            rightInfluence: {
                ownerId: spec.rightOwnerId,
                primaryStarId: spec.rightStarId,
                primaryScore: 1,
            },
        });
        for (const vertexId of [spec.startVertexId, spec.endVertexId]) {
            const list = sectionsByVertex.get(vertexId) ?? [];
            list.push(spec.id);
            sectionsByVertex.set(vertexId, list);
        }
        const pairSections = sectionsByOwnerPair.get(ownerPairKey) ?? [];
        pairSections.push(spec.id);
        sectionsByOwnerPair.set(ownerPairKey, pairSections);
        for (const ownerId of [spec.leftOwnerId, spec.rightOwnerId]) {
            const ownerSections = sectionsByOwner.get(ownerId) ?? [];
            ownerSections.push(spec.id);
            sectionsByOwner.set(ownerId, ownerSections);
        }
    }

    const vertices = new Map<string, FrontierVertex>();
    for (const [vertexId, point] of vertexPoints) {
        vertices.set(vertexId, {
            id: vertexId,
            kind: 'world_intersection',
            point,
            incidentSectionIds: sectionsByVertex.get(vertexId) ?? [],
            ownerIds: [],
        });
    }

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 200, height: 200 },
        vertices,
        sections,
        loops: [],
        sectionsByOwnerPair,
        sectionsByVertex,
        sectionsByOwner,
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

    it('distributes TVs across the full active section, not the narrow raw change span', () => {
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
        expect(correspondence?.prevFront).toHaveLength(68);
        expect(correspondence?.postFront).toHaveLength(68);
        expect([
            correspondence?.changeAnchors.startPoint,
            correspondence?.changeAnchors.endPoint,
        ]).toEqual(expect.arrayContaining([
            [0, 0],
            [100, 0],
        ]));

        const sectionGeometry = sampleActiveFrontSectionGeometry(plan, prev, next, 0.5, 6);
        const sampled = sectionGeometry.get('stable:section');
        expect(sampled).toBeTruthy();
        expect(sampled).toHaveLength(6);
        expect(sampled?.[0]?.[0]).toBeCloseTo(0, 6);
        expect(sampled?.[0]?.[1]).toBeCloseTo(0, 6);
        expect(sampled?.[5]?.[0]).toBeCloseTo(100, 6);
        expect(sampled?.[5]?.[1]).toBeCloseTo(0, 6);
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
            [0, 0],
            [100, 0],
        ]));

        const sectionGeometry = sampleActiveFrontSectionGeometry(plan, prev, next, 0.5, 4);
        const sampled = sectionGeometry.get('stable:section');
        expect(sampled).toBeTruthy();
        expect(sampled).toHaveLength(4);
        expect(sampled?.[0]).toEqual([0, 0]);
        expect(sampled?.[sampled.length - 1]).toEqual([100, 0]);
        expect(sampled?.[1]?.[1]).toBeLessThan(0);
        expect(sampled?.[2]?.[1]).toBeLessThan(0);
    });

    it('rebuilds active section geometry from the full CA-to-CA TV interval', () => {
        const ownerA = 'red';
        const ownerB = 'blue';
        const prevPath: Vec2[] = [
            [0, 0],
            [25, 0],
            [50, 0],
            [75, 0],
            [100, 0],
        ];
        const postPath: Vec2[] = [
            [0, -20],
            [25, -20],
            [50, -20],
            [75, -20],
            [100, -20],
        ];
        const middleSection = makeSingleSectionTopology(
            'next',
            ownerA,
            ownerB,
            postPath.slice(1, 4),
            'middle',
        ).sections.get('middle:section')!;
        const next: FrontierTopology = {
            ...makeSingleSectionTopology('next', ownerA, ownerB, postPath, 'whole'),
            sections: new Map([['middle:section', middleSection]]),
        };
        const prev = {
            ...next,
            version: 'prev',
        };
        const plan: ActiveFrontTransitionPlan = {
            prevVersion: 'prev',
            nextVersion: 'next',
            collapseTargets: [],
            diagnostics: {
                tunables: {
                    transitionVertexCount: 7,
                    stableAnchorEps: 2,
                    changeSpanEps: 2,
                    changeSpanPadPoints: 0,
                },
                stableAnchorIds: ['A', 'B'],
                pairDiagnostics: [],
                summary: {
                    classification: 'animated_fronts',
                    hasClassificationDefect: false,
                    stableAnchorCount: 2,
                    prevChainCount: 1,
                    nextChainCount: 1,
                    pairCount: 1,
                    plannedPairCount: 1,
                    defectPairCount: 0,
                    noChangePairCount: 0,
                    defectTopologyGapCount: 0,
                    defectUnsupportedSplitCount: 0,
                    frontCount: 1,
                    activeSectionCount: 1,
                    defectSectionCount: 0,
                    collapseTargetCount: 0,
                },
            },
            fronts: [
                {
                    anchorStartId: 'A',
                    anchorEndId: 'B',
                    splitMode: 'none',
                    prevPaths: [
                        {
                            anchorStartId: 'A',
                            anchorEndId: 'B',
                            sectionIds: ['middle:section'],
                            points: prevPath,
                            sectionSpans: new Map(),
                            sectionReversed: new Map(),
                        },
                    ],
                    nextPaths: [
                        {
                            anchorStartId: 'A',
                            anchorEndId: 'B',
                            sectionIds: ['middle:section'],
                            points: postPath,
                            sectionSpans: new Map([
                                [
                                    'middle:section',
                                    {
                                        startIndex: 1,
                                        endIndex: 3,
                                        pathPointOffset: 0,
                                    },
                                ],
                            ]),
                            sectionReversed: new Map([['middle:section', false]]),
                        },
                    ],
                    changeSpan: { base: 'next', startIndex: 2, endIndex: 2 },
                    localChangeWindow: {
                        nextAnchorStartIndex: 1,
                        nextAnchorEndIndex: 3,
                        nextStartParam: 0.25,
                        nextEndParam: 0.75,
                        prevStartParam: 0.25,
                        prevEndParam: 0.75,
                    },
                    sectionSpans: new Map([
                        [
                            'middle:section',
                            {
                                startIndex: 1,
                                endIndex: 3,
                                pathPointOffset: 0,
                                pathIndex: 0,
                                activeStartIndex: 2,
                                activeEndIndex: 2,
                            },
                        ],
                    ]),
                    activeSectionIds: new Set(['middle:section']),
                    defectSectionIds: new Set(),
                    sectionReversed: new Map([['middle:section', false]]),
                },
            ],
        };

        const sectionGeometry = sampleActiveFrontSectionGeometry(plan, prev, next, 0.5, 7);
        const sampled = sectionGeometry.get('middle:section');
        const correspondence = getActiveFrontMonotonicCorrespondence(plan.fronts[0]!, 0.5, 7);

        expect(sampled).toBeTruthy();
        expect(correspondence).toBeTruthy();
        expect(sampled).toHaveLength(7);
        for (let i = 0; i < 7; i += 1) {
            expect(sampled?.[i]?.[0]).toBeCloseTo(correspondence?.activeFront[i]?.[0] ?? 0, 6);
            expect(sampled?.[i]?.[1]).toBeCloseTo(correspondence?.activeFront[i]?.[1] ?? 0, 6);
        }
    });

    it('keeps the shared vertex inside a deduped section span', () => {
        const prev = makeTwoSectionTopology(
            'prev',
            'red',
            'blue',
            [
                [0, 0],
                [50, 0],
            ],
            [
                [50, 0],
                [100, 0],
            ],
            'stable',
        );
        const next = makeTwoSectionTopology(
            'next',
            'red',
            'blue',
            [
                [0, 0],
                [50, -20],
            ],
            [
                [50, -20],
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

        const plan = planActiveFrontTransition(prev, next, ownership, {
            changeSpanPadPoints: 0,
        });
        const front = plan.fronts[0];
        const secondSpan = front?.sectionSpans.get('stable:section:1');

        expect(secondSpan).toBeTruthy();
        expect((secondSpan?.endIndex ?? 0) - (secondSpan?.startIndex ?? 0)).toBe(1);
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

    it('plans multiple region-level active fronts when dual conquest rewires anchor pairs', () => {
        const previousOwner = 'human-player';
        const newOwner = 'ai-3';
        const prev = makeGapTopology('prev', [
            {
                id: 'prev:top',
                startVertexId: 'A',
                endVertexId: 'B',
                leftOwnerId: previousOwner,
                rightOwnerId: newOwner,
                leftStarId: 'star-2',
                rightStarId: 'star-3',
            },
            {
                id: 'prev:bottom',
                startVertexId: 'C',
                endVertexId: 'D',
                leftOwnerId: previousOwner,
                rightOwnerId: newOwner,
                leftStarId: 'star-5',
                rightStarId: 'star-4',
            },
        ]);
        const next = makeGapTopology('next', [
            {
                id: 'next:left',
                startVertexId: 'A',
                endVertexId: 'C',
                leftOwnerId: newOwner,
                rightOwnerId: previousOwner,
                leftStarId: 'star-2',
                rightStarId: 'star-9',
            },
            {
                id: 'next:right',
                startVertexId: 'B',
                endVertexId: 'D',
                leftOwnerId: newOwner,
                rightOwnerId: previousOwner,
                leftStarId: 'star-5',
                rightStarId: 'star-11',
            },
        ]);
        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map([
                ['star-2', newOwner],
                ['star-5', newOwner],
            ]),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId: 'star-2',
                    previousOwner,
                    newOwner,
                    attackerStarId: 'star-3',
                    attackerStarIds: ['star-3'],
                    atMs: 100,
                },
                {
                    starId: 'star-5',
                    previousOwner,
                    newOwner,
                    attackerStarId: 'star-4',
                    attackerStarIds: ['star-4'],
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership, {
            transitionVertexCount: 5,
        });

        expect(plan.diagnostics.summary.classification).toBe('animated_fronts');
        expect(plan.diagnostics.summary.hasClassificationDefect).toBe(false);
        expect(plan.fronts).toHaveLength(2);
        expect(plan.fronts.map((front) => [...front.activeSectionIds]).flat().sort()).toEqual([
            'next:left',
            'next:right',
        ]);

        const correspondences = plan.fronts.map((front) =>
            getActiveFrontMonotonicCorrespondence(front, 0.5, 5),
        );
        expect(correspondences[0]?.activeFront).toHaveLength(5);
        expect(correspondences[1]?.activeFront).toHaveLength(5);
        expect(correspondences.map((item) => item?.changeAnchors)).toEqual(
            expect.arrayContaining([
                { startPoint: [0, 0], endPoint: [0, 100] },
                { startPoint: [100, 0], endPoint: [100, 100] },
            ]),
        );
    });

    it('plans a next-only changed-region front from the nearest conquest-local PRE front', () => {
        const previousOwner = 'human-player';
        const newOwner = 'ai-3';
        const prev = makeGapTopology('prev', [
            {
                id: 'prev:source',
                startVertexId: 'A',
                endVertexId: 'B',
                leftOwnerId: previousOwner,
                rightOwnerId: newOwner,
                leftStarId: 'star-captured',
                rightStarId: 'star-attacker',
            },
        ]);
        const next = makeGapTopology('next', [
            {
                id: 'next:source-still-present',
                startVertexId: 'A',
                endVertexId: 'B',
                leftOwnerId: previousOwner,
                rightOwnerId: newOwner,
                leftStarId: 'star-captured',
                rightStarId: 'star-attacker',
            },
            {
                id: 'next:new-region-front',
                startVertexId: 'C',
                endVertexId: 'D',
                leftOwnerId: newOwner,
                rightOwnerId: previousOwner,
                leftStarId: 'star-captured',
                rightStarId: 'star-survivor',
            },
        ]);
        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map([
                ['star-captured', newOwner],
            ]),
            contestedLaneIds: [],
            conquestEvents: [
                {
                    starId: 'star-captured',
                    previousOwner,
                    newOwner,
                    attackerStarId: 'star-attacker',
                    attackerStarIds: ['star-attacker'],
                    atMs: 100,
                },
            ],
            virtualStars: [],
        };

        const plan = planActiveFrontTransition(prev, next, ownership, {
            transitionVertexCount: 6,
        });

        expect(plan.diagnostics.summary.classification).toBe('animated_fronts');
        expect(plan.diagnostics.summary.hasClassificationDefect).toBe(false);
        expect(plan.fronts).toHaveLength(1);
        expect([...plan.fronts[0]!.activeSectionIds]).toEqual(['next:new-region-front']);
        expect(
            plan.diagnostics.pairDiagnostics.find(
                (pair) => pair.nextPathSectionIds.flat().includes('next:new-region-front'),
            )?.outcome,
        ).toBe('planned_region_front');

        const correspondence = getActiveFrontMonotonicCorrespondence(plan.fronts[0]!, 0.5, 6);
        expect(correspondence?.activeFront).toHaveLength(6);
        expect(correspondence?.changeAnchors).toEqual({
            startPoint: [0, 100],
            endPoint: [100, 100],
        });
    });
});
