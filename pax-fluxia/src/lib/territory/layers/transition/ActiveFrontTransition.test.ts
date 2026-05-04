import { describe, expect, it } from 'vitest';

import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
    RegionLoop,
    SectionRef,
} from '../../contracts/FrontierTopologyContracts';
import type { OwnershipSnapshot, VirtualStar } from '../../contracts/OwnershipContracts';
import {
    planActiveFrontTransition,
    sampleActiveFrontSectionGeometry,
    sampleActiveFrontTransition,
} from './ActiveFrontTransition';

type Vec2 = [number, number];

const OWNER_LEFT = 'ai-5';
const OWNER_RIGHT = 'human-player';
const SECTION_ID = 'A->B:ai-5|human-player';

function makeVertex(
    id: string,
    point: Vec2,
    sectionIds: string[],
    ownerIds: string[] = [OWNER_LEFT, OWNER_RIGHT],
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
        [vertexIds[0], makeVertex(vertexIds[0], points[0], [sectionIds[0], sectionIds[3]], [ownerId, 'world'])],
        [vertexIds[1], makeVertex(vertexIds[1], points[1], [sectionIds[0], sectionIds[1]], [ownerId, 'world'])],
        [vertexIds[2], makeVertex(vertexIds[2], points[2], [sectionIds[1], sectionIds[2]], [ownerId, 'world'])],
        [vertexIds[3], makeVertex(vertexIds[3], points[3], [sectionIds[2], sectionIds[3]], [ownerId, 'world'])],
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

function makeVirtualStar(
    id: string,
    starId: string,
    ownerId: string,
    pos: Vec2,
): VirtualStar {
    return {
        id,
        starId,
        ownerId,
        pos: { x: pos[0], y: pos[1] },
        weight: 1,
        conquestEventAtMs: 100,
    };
}

function makeLongSection(points: Vec2[]): FrontierSection {
    return {
        id: SECTION_ID,
        kind: 'owner_border',
        startVertexId: 'A',
        endVertexId: 'B',
        leftOwnerId: OWNER_LEFT,
        rightOwnerId: OWNER_RIGHT,
        points,
        length: 10,
        ownerPairKey: `${OWNER_LEFT}|${OWNER_RIGHT}`,
        leftInfluence: {
            ownerId: OWNER_LEFT,
            primaryStarId: 'star-left',
            primaryScore: 1,
        },
        rightInfluence: {
            ownerId: OWNER_RIGHT,
            primaryStarId: 'star-right',
            primaryScore: 1,
        },
    };
}

function makeLongSectionTopology(version: string, points: Vec2[]): FrontierTopology {
    const section = makeLongSection(points);
    const vertices = new Map<string, FrontierVertex>([
        ['A', makeVertex('A', points[0], [SECTION_ID])],
        ['B', makeVertex('B', points[points.length - 1], [SECTION_ID])],
    ]);
    const sections = new Map<string, FrontierSection>([[SECTION_ID, section]]);

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 100, height: 100 },
        vertices,
        sections,
        loops: [],
        sectionsByOwnerPair: new Map([[`${OWNER_LEFT}|${OWNER_RIGHT}`, [SECTION_ID]]]),
        sectionsByVertex: new Map([
            ['A', [SECTION_ID]],
            ['B', [SECTION_ID]],
        ]),
        sectionsByOwner: new Map([
            [OWNER_LEFT, [SECTION_ID]],
            [OWNER_RIGHT, [SECTION_ID]],
        ]),
    };
}

describe('ActiveFrontTransition', () => {
    it('shrinks disappearing solo-owner loops to nothing without inventing a replacement loop', () => {
        const previousOwner = 'ai-1';
        const nextOwner = 'ai-2';
        const starId = 'star-10';
        const prevCenter: Vec2 = [30, 30];

        const prev = makeSquareTopology('prev', previousOwner, 'prev', prevCenter, 12);
        const next = makeEmptyTopology('next');

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
            virtualStars: [
                makeVirtualStar('vs-prev', starId, previousOwner, prevCenter),
            ],
        };

        const plan = planActiveFrontTransition(prev, next, ownership);
        expect(plan.fronts).toHaveLength(0);
        expect(plan.collapseTargets).toHaveLength(1);
        expect(plan.diagnostics.summary.classification).toBe('collapse_only');

        const frameAtStart = sampleActiveFrontTransition(plan, prev, next, 0);
        expect(frameAtStart.regions).toHaveLength(1);
        expect(frameAtStart.regions[0]?.ownerId).toBe(previousOwner);

        const frameAtEnd = sampleActiveFrontTransition(plan, prev, next, 1);
        expect(frameAtEnd.regions).toHaveLength(0);
    });

    it('pins unchanged tails inside a long active section', () => {
        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        };

        const prev = makeLongSectionTopology('prev', [
            [0, 0],
            [2, 0.8],
            [4, 0],
            [6, 0],
            [8, 0.8],
            [10, 0],
        ]);
        const next = makeLongSectionTopology('next', [
            [0, 0],
            [2, 0],
            [4, 4],
            [6, 4],
            [8, 0],
            [10, 0],
        ]);

        const plan = planActiveFrontTransition(prev, next, ownership, {
            stableAnchorEps: 2,
            changeSpanEps: 2,
            changeSpanPadPoints: 0,
        });
        expect(plan.fronts).toHaveLength(1);
        expect(plan.fronts[0].changeSpan).toEqual({
            base: 'next',
            startIndex: 2,
            endIndex: 3,
        });

        const sampled = sampleActiveFrontSectionGeometry(plan, prev, next, 0.5);
        const sampledSection = sampled.get(SECTION_ID);
        expect(sampledSection).toBeDefined();
        expect(sampledSection?.slice(0, 2)).toEqual([
            [0, 0],
            [2, 0],
        ]);
        expect(sampledSection?.slice(-2)).toEqual([
            [8, 0],
            [10, 0],
        ]);
        expect(sampledSection?.[2]?.[1]).toBeGreaterThan(1.8);
        expect(sampledSection?.[2]?.[1]).toBeLessThan(2.2);
        expect(sampledSection?.[3]?.[1]).toBeGreaterThan(1.8);
        expect(sampledSection?.[3]?.[1]).toBeLessThan(2.2);
    });

    it('interpolates from the local change-anchor window instead of the full stable-anchor chain', () => {
        const ownership: OwnershipSnapshot = {
            version: 'ownership:test',
            starOwners: new Map(),
            contestedLaneIds: [],
            conquestEvents: [],
            virtualStars: [],
        };

        const prev = makeLongSectionTopology('prev', [
            [0, 0],
            [1, 1],
            [2, -1],
            [3, 1],
            [4, 0],
            [6, 0],
            [8, 0],
            [10, 0],
        ]);
        const next = makeLongSectionTopology('next', [
            [0, 0],
            [2, 0],
            [4, 0],
            [6, 4],
            [8, 4],
            [10, 0],
        ]);

        const plan = planActiveFrontTransition(prev, next, ownership, {
            stableAnchorEps: 2,
            changeSpanEps: 1.1,
            changeSpanPadPoints: 0,
        });
        expect(plan.fronts).toHaveLength(1);
        expect(plan.fronts[0].changeSpan).toEqual({
            base: 'next',
            startIndex: 3,
            endIndex: 4,
        });
        expect(plan.fronts[0].localChangeWindow).toEqual({
            nextAnchorStartIndex: 2,
            nextAnchorEndIndex: 5,
            prevStartParam: expect.any(Number),
            prevEndParam: expect.any(Number),
        });

        const sampled = sampleActiveFrontSectionGeometry(plan, prev, next, 0.5);
        const sampledSection = sampled.get(SECTION_ID);
        expect(sampledSection).toBeDefined();
        expect(sampledSection?.[2]).toEqual([4, 0]);
        expect(sampledSection?.[5]).toEqual([10, 0]);
        expect(sampledSection?.[3]?.[0]).toBeCloseTo(6, 5);
        expect(sampledSection?.[4]?.[0]).toBeCloseTo(8, 5);
        expect(sampledSection?.[3]?.[1]).toBeCloseTo(2, 5);
        expect(sampledSection?.[4]?.[1]).toBeCloseTo(2, 5);
    });
});
