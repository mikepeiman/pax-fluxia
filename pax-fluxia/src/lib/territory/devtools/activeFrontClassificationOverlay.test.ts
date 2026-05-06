import { describe, expect, it } from 'vitest';

import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
} from '../contracts/FrontierTopologyContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import { planActiveFrontTransition } from '../layers/transition/ActiveFrontTransition';
import { buildActiveFrontClassificationOverlayModel } from './activeFrontClassificationOverlay';

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
            makeVertex(startVertexId, points[0], [sectionId], [ownerA, ownerB]),
        ],
        [
            endVertexId,
            makeVertex(endVertexId, points[points.length - 1], [sectionId], [ownerA, ownerB]),
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

describe('activeFrontClassificationOverlay', () => {
    it('classifies active sections and front anchors from a planned local front', () => {
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
        const overlay = buildActiveFrontClassificationOverlayModel(prev, next, plan);
        const nextSection = overlay.nextSections.get('stable:section');
        const prevSection = overlay.prevSections.get('stable:section');
        const startVertex = overlay.nextVertices.get('stable:start');
        const endVertex = overlay.nextVertices.get('stable:end');

        expect(nextSection?.role).toBe('active_section');
        expect(nextSection?.subSections.some((sub) => sub.role === 'active_subsection')).toBe(true);
        expect(prevSection?.role).toBe('source_section');
        expect(startVertex?.role).toBe('front_anchor');
        expect(endVertex?.role).toBe('front_anchor');
    });
});
