import { describe, expect, it } from 'vitest';
import type { StarConnection, StarState } from '../../types/game.types';
import { executeChainWalk, flattenLoopPoints } from './chainWalkCore';
import {
    buildTerritoryGeometryFingerprint,
    chainSharedEdgesIntoPolylines,
    constructFillsFromFrontierChain,
    mergeSameOwnerCells,
    type SharedBorderEdge,
    type SharedPolyline,
    type TerritoryCell,
    type TerritoryGeneratorSettings,
} from './powerVoronoiTerritoryGeometryGenerator';

const BASE_SETTINGS: TerritoryGeneratorSettings = {
    starCoreGuardRadius: 20,
    starMargin: 0,
    msrStarBias: 0,
    corridorEnabled: true,
    corridorSpacing: 10,
    cxCount: 0,
    cxWeight: 0.5,
    cxContestMidpointVstars: true,
    cxContestPairCount: 1,
    cxContestPairWeight: 0.5,
    cxContestPairSpacing: 75,
    disconnectEnabled: true,
    disconnectDistance: 295,
    dxWeight: 3,
    clusterSplit: false,
    chaikinPasses: 2,
    frontierResolution: 5,
    boundaryPad: 50,
    boundaryEps: 6,
    worldWidth: 100,
    worldHeight: 80,
};

const BASE_STARS = [
    {
        id: 'alpha',
        ownerId: 'red',
        x: 10,
        y: 20,
        radius: 18,
    },
    {
        id: 'beta',
        ownerId: 'blue',
        x: 80,
        y: 60,
        radius: 22,
    },
] as StarState[];

const BASE_LANES = [
    {
        sourceId: 'alpha',
        targetId: 'beta',
        distance: 92,
        lanePathKind: 'angular',
        laneConstraintStatus: 'reshaped_ok_angular',
        laneWaypoints: [
            [30, 35],
            [60, 45],
        ],
    },
] as StarConnection[];

function fingerprint(params: {
    readonly stars?: StarState[];
    readonly lanes?: StarConnection[];
    readonly settings?: TerritoryGeneratorSettings;
} = {}): string {
    return buildTerritoryGeometryFingerprint(
        params.stars ?? BASE_STARS,
        params.settings ?? BASE_SETTINGS,
        params.lanes ?? BASE_LANES,
    );
}

describe('buildTerritoryGeometryFingerprint', () => {
    it('changes when star spatial inputs change', () => {
        const movedStars = BASE_STARS.map((star) =>
            star.id === 'alpha' ? { ...star, x: star.x + 1 } : star,
        ) as StarState[];

        expect(fingerprint({ stars: movedStars })).not.toBe(fingerprint());
    });

    it('changes when lane constraint inputs change', () => {
        const movedLane = [
            {
                ...BASE_LANES[0]!,
                laneWaypoints: [
                    [31, 35],
                    [60, 45],
                ],
            },
        ] as StarConnection[];
        const statusChangedLane = [
            {
                ...BASE_LANES[0]!,
                laneConstraintStatus: 'constraint_unsatisfied_authored',
            },
        ] as StarConnection[];

        expect(fingerprint({ lanes: movedLane })).not.toBe(fingerprint());
        expect(fingerprint({ lanes: statusChangedLane })).not.toBe(fingerprint());
    });

    it('changes when world bounds or omitted geometry tunables change', () => {
        for (const settings of [
            { ...BASE_SETTINGS, worldWidth: BASE_SETTINGS.worldWidth + 1 },
            {
                ...BASE_SETTINGS,
                starCoreGuardRadius: BASE_SETTINGS.starCoreGuardRadius + 1,
            },
            {
                ...BASE_SETTINGS,
                frontierResolution: BASE_SETTINGS.frontierResolution + 1,
            },
            { ...BASE_SETTINGS, boundaryPad: BASE_SETTINGS.boundaryPad + 1 },
            { ...BASE_SETTINGS, boundaryEps: BASE_SETTINGS.boundaryEps + 1 },
        ]) {
            expect(fingerprint({ settings })).not.toBe(fingerprint());
        }
    });
});

describe('chainSharedEdgesIntoPolylines world borders', () => {
    const edge = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        ownerB: string,
    ): SharedBorderEdge => ({
        x1, y1, x2, y2,
        ownerA: 'red', ownerB,
        colorA: 0, colorB: 0,
        siteIdA: 'red', siteIdB: ownerB,
    });

    it('keeps world-border corners sharp (no Chaikin) while smoothing frontiers', () => {
        // World border around a map corner: two axis-aligned segments meeting at (10, 0).
        const worldOut = chainSharedEdgesIntoPolylines(
            [edge(0, 0, 10, 0, 'world'), edge(10, 0, 10, 10, 'world')],
            3,
        );
        expect(worldOut).toHaveLength(1);
        // The corner (10, 0) is preserved exactly — no Chaikin midpoints inserted.
        expect(worldOut[0]!.points).toEqual([
            [0, 0],
            [10, 0],
            [10, 10],
        ]);

        // The same shape as an inter-owner frontier IS smoothed (corner cut).
        const frontierOut = chainSharedEdgesIntoPolylines(
            [edge(0, 0, 10, 0, 'blue'), edge(10, 0, 10, 10, 'blue')],
            3,
        );
        expect(frontierOut).toHaveLength(1);
        expect(frontierOut[0]!.points).not.toEqual([
            [0, 0],
            [10, 0],
            [10, 10],
        ]);
        expect(frontierOut[0]!.points.length).toBeGreaterThan(3);
    });
});

describe('constructFillsFromFrontierChain', () => {
    it('drops clearly open chain-walk loops instead of emitting bogus fill chords', () => {
        const sharedPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|blue',
                color: 0,
                points: [
                    [0, 0],
                    [10, 0],
                ],
            },
            {
                ownerPairKey: 'red|blue',
                color: 0,
                points: [
                    [10, 0],
                    [10, 10],
                ],
            },
        ];

        expect(constructFillsFromFrontierChain(sharedPolylines, [])).toEqual([]);
    });

    it('repairs near-closed loops by explicitly closing them', () => {
        const worldBorderPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 0],
                    [10, 0],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [10, 0],
                    [10, 10],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [10, 10],
                    [0, 0.5],
                ],
            },
        ];

        const fills = constructFillsFromFrontierChain([], worldBorderPolylines);

        expect(fills).toHaveLength(1);
        expect(fills[0]?.ownerId).toBe('red');
        expect(fills[0]?.points[0]).toEqual(fills[0]?.points.at(-1));
    });

    it('walks the clockwise-adjacent owner boundary at a junction instead of taking the first spur', () => {
        const base: SharedPolyline = {
            ownerPairKey: 'red|blue',
            color: 0,
            points: [
                [0, 0],
                [10, 0],
            ],
        };
        const spur: SharedPolyline = {
            ownerPairKey: 'red|cyan',
            color: 0,
            points: [
                [10, 0],
                [20, 0],
            ],
        };
        const adjacent: SharedPolyline = {
            ownerPairKey: 'red|yellow',
            color: 0,
            points: [
                [10, 0],
                [10, 10],
            ],
        };
        const top: SharedPolyline = {
            ownerPairKey: 'red|green',
            color: 0,
            points: [
                [10, 10],
                [0, 10],
            ],
        };
        const worldBorderPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 10],
                    [0, 0],
                ],
            },
        ];

        for (const sharedPolylines of [
            [base, spur, adjacent, top],
            [base, adjacent, spur, top],
        ]) {
            const fills = constructFillsFromFrontierChain(
                sharedPolylines,
                worldBorderPolylines,
            );

            expect(fills).toHaveLength(1);
            expect(fills[0]?.ownerId).toBe('red');
            expect(fills[0]?.points).toEqual([
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
            ]);
        }
    });
});

describe('executeChainWalk', () => {
    it('selects the same clockwise-adjacent segments across junction insertion orders', () => {
        const base: SharedPolyline = {
            ownerPairKey: 'red|blue',
            color: 0,
            points: [
                [0, 0],
                [10, 0],
            ],
        };
        const spur: SharedPolyline = {
            ownerPairKey: 'red|cyan',
            color: 0,
            points: [
                [10, 0],
                [20, 0],
            ],
        };
        const adjacent: SharedPolyline = {
            ownerPairKey: 'red|yellow',
            color: 0,
            points: [
                [10, 0],
                [10, 10],
            ],
        };
        const top: SharedPolyline = {
            ownerPairKey: 'red|green',
            color: 0,
            points: [
                [10, 10],
                [0, 10],
            ],
        };
        const worldBorderPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 10],
                    [0, 0],
                ],
            },
        ];

        const closedLoopSignatures = [
            [base, spur, adjacent, top],
            [base, adjacent, spur, top],
        ].map((sharedPolylines) => {
            const walk = executeChainWalk(sharedPolylines, worldBorderPolylines);
            const closedRedLoops = walk.loops.filter(
                (loop) => loop.ownerId === 'red' && loop.closed,
            );

            expect(closedRedLoops).toHaveLength(1);
            const loop = closedRedLoops[0]!;
            expect(flattenLoopPoints(loop)).toEqual([
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
            ]);

            return loop.segments.map(
                (segment) => `${segment.ownerPairKey}:${segment.direction}`,
            );
        });

        expect(closedLoopSignatures[0]).toEqual(closedLoopSignatures[1]);
    });
});

describe('chainSharedEdgesIntoPolylines', () => {
    it('keeps a closed loop intact instead of crossing into the first spur by insertion order', () => {
        const edges: SharedBorderEdge[] = [
            {
                x1: 0,
                y1: 0,
                x2: 10,
                y2: 0,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 10,
                y1: 0,
                x2: 20,
                y2: 0,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 10,
                y1: 0,
                x2: 10,
                y2: 10,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 10,
                y1: 10,
                x2: 0,
                y2: 10,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
            {
                x1: 0,
                y1: 10,
                x2: 0,
                y2: 0,
                ownerA: 'red',
                ownerB: 'blue',
                colorA: 0,
                colorB: 0,
                siteIdA: 'a',
                siteIdB: 'b',
            },
        ];

        const polylines = chainSharedEdgesIntoPolylines(edges, 0);

        expect(polylines).toHaveLength(2);
        expect(polylines[0]?.points).toEqual([
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
        ]);
        expect(polylines[1]?.points).toEqual([
            [10, 0],
            [20, 0],
        ]);
    });
});

describe('mergeSameOwnerCells', () => {
    it('repairs near-closed owner shells instead of dropping them', () => {
        const cells: TerritoryCell[] = [
            {
                ownerId: 'red',
                siteId: 'star-0',
                points: [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                    [0, 10],
                    [0, 0.5],
                ],
            },
            {
                ownerId: 'blue',
                siteId: 'star-1',
                points: [
                    [10, 0],
                    [20, 0],
                    [20, 20],
                    [10, 20],
                    [10, 10],
                    [10, 0],
                ],
            },
        ];

        const merged = mergeSameOwnerCells(cells, false, new Map());
        const red = merged.find((territory) => territory.ownerId === 'red');

        expect(red).toBeDefined();
        expect(red?.points[0]).toEqual(red?.points.at(-1));
    });
});
