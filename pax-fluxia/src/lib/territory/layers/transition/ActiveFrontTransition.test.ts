import { describe, expect, it } from 'vitest';

import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
} from '../../contracts/FrontierTopologyContracts';
import type { OwnershipSnapshot } from '../../contracts/OwnershipContracts';
import {
    planActiveFrontTransition,
    sampleActiveFrontSectionGeometry,
} from './ActiveFrontTransition';

type Vec2 = [number, number];

const OWNER_LEFT = 'ai-5';
const OWNER_RIGHT = 'human-player';
const SECTION_ID = 'A->B:ai-5|human-player';

function makeVertex(id: string, point: Vec2): FrontierVertex {
    return {
        id,
        kind: 'world_intersection',
        point,
        incidentSectionIds: [SECTION_ID],
        ownerIds: [OWNER_LEFT, OWNER_RIGHT],
    };
}

function makeSection(points: Vec2[]): FrontierSection {
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

function makeTopology(version: string, points: Vec2[]): FrontierTopology {
    const section = makeSection(points);
    const vertices = new Map<string, FrontierVertex>([
        ['A', makeVertex('A', points[0])],
        ['B', makeVertex('B', points[points.length - 1])],
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

const ownership: OwnershipSnapshot = {
    version: 'ownership:test',
    starOwners: new Map(),
    contestedLaneIds: [],
    conquestEvents: [],
    virtualStars: [],
};

describe('ActiveFrontTransition', () => {
    it('pins unchanged tails inside a long active section', () => {
        const prev = makeTopology('prev', [
            [0, 0],
            [2, 0.8],
            [4, 0],
            [6, 0],
            [8, 0.8],
            [10, 0],
        ]);
        const next = makeTopology('next', [
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
        expect(sampledSection?.[2]?.[1]).toBe(2);
        expect(sampledSection?.[3]?.[1]).toBe(2);
    });
});
