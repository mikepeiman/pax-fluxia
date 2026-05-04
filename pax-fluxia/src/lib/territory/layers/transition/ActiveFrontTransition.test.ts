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
    sampleActiveFrontTransition,
} from './ActiveFrontTransition';

type Vec2 = [number, number];

function makeVertex(id: string, point: Vec2, sectionIds: string[]): FrontierVertex {
    return {
        id,
        kind: 'world_intersection',
        point,
        incidentSectionIds: sectionIds,
        ownerIds: ['world'],
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
        [vertexIds[0], makeVertex(vertexIds[0], points[0], [sectionIds[0], sectionIds[3]])],
        [vertexIds[1], makeVertex(vertexIds[1], points[1], [sectionIds[0], sectionIds[1]])],
        [vertexIds[2], makeVertex(vertexIds[2], points[2], [sectionIds[1], sectionIds[2]])],
        [vertexIds[3], makeVertex(vertexIds[3], points[3], [sectionIds[2], sectionIds[3]])],
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

describe('ActiveFrontTransition', () => {
    it('animates disappearing and appearing loops locally when no active front can be planned', () => {
        const previousOwner = 'ai-1';
        const nextOwner = 'ai-2';
        const starId = 'star-10';
        const prevCenter: Vec2 = [30, 30];
        const nextCenter: Vec2 = [110, 110];

        const prev = makeSquareTopology(
            'prev',
            previousOwner,
            'prev',
            prevCenter,
            12,
        );
        const next = makeSquareTopology(
            'next',
            nextOwner,
            'next',
            nextCenter,
            10,
        );

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
                makeVirtualStar('vs-next', starId, nextOwner, nextCenter),
            ],
        };

        const plan = planActiveFrontTransition(prev, next, ownership);
        expect(plan.fronts).toHaveLength(0);
        expect(plan.collapseTargets).toHaveLength(1);
        expect(plan.expandTargets).toHaveLength(1);
        expect(plan.diagnostics.summary.classification).toBe('loop_targets_only');
        expect(plan.diagnostics.summary.expandTargetCount).toBe(1);

        const frameAtStart = sampleActiveFrontTransition(plan, prev, next, 0);
        expect(frameAtStart.regions).toHaveLength(2);
        const startCollapse = frameAtStart.regions.find(
            (region) => region.ownerId === previousOwner,
        );
        const startExpand = frameAtStart.regions.find(
            (region) => region.ownerId === nextOwner,
        );
        expect(startCollapse?.points).toContainEqual([18, 18]);
        expect(startExpand?.points.every(([x, y]) => x === nextCenter[0] && y === nextCenter[1])).toBe(true);

        const frameAtEnd = sampleActiveFrontTransition(plan, prev, next, 1);
        expect(frameAtEnd.regions).toHaveLength(1);
        expect(frameAtEnd.regions[0]?.ownerId).toBe(nextOwner);
        expect(frameAtEnd.regions[0]?.points).toContainEqual([100, 100]);
        expect(frameAtEnd.regions[0]?.points).toContainEqual([120, 120]);
    });
});
