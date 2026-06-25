import { describe, expect, it } from 'vitest';
import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type { SharedPolyline } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildPowerVoronoiFrontierTopology } from './buildPowerVoronoiFrontierTopology';

function splitWorldSharedPolylines(): SharedPolyline[] {
    return [
        {
            ownerPairKey: 'blue|red',
            color: 0,
            points: [
                [50, 0],
                [50, 100],
            ],
        },
    ];
}

function splitWorldBorderPolylines(): SharedPolyline[] {
    return [
        {
            ownerPairKey: 'red|world',
            color: 0,
            points: [
                [0, 0],
                [50, 0],
            ],
        },
        {
            ownerPairKey: 'blue|world',
            color: 0,
            points: [
                [50, 0],
                [100, 0],
            ],
        },
        {
            ownerPairKey: 'blue|world',
            color: 0,
            points: [
                [100, 0],
                [100, 100],
            ],
        },
        {
            ownerPairKey: 'blue|world',
            color: 0,
            points: [
                [100, 100],
                [50, 100],
            ],
        },
        {
            ownerPairKey: 'red|world',
            color: 0,
            points: [
                [50, 100],
                [0, 100],
            ],
        },
        {
            ownerPairKey: 'red|world',
            color: 0,
            points: [
                [0, 100],
                [0, 0],
            ],
        },
    ];
}

function serializeIndexMap(map: ReadonlyMap<string, readonly string[]>): unknown {
    return [...map.entries()];
}

function serializeTopologyIdentity(topology: FrontierTopology): unknown {
    return {
        vertices: [...topology.vertices.values()].map((vertex) => ({
            id: vertex.id,
            kind: vertex.kind,
            incidentSectionIds: vertex.incidentSectionIds,
            ownerIds: vertex.ownerIds,
            semanticKey: vertex.semanticKey,
        })),
        sections: [...topology.sections.values()].map((section) => ({
            id: section.id,
            kind: section.kind,
            startVertexId: section.startVertexId,
            endVertexId: section.endVertexId,
            leftOwnerId: section.leftOwnerId,
            rightOwnerId: section.rightOwnerId,
            ownerPairKey: section.ownerPairKey,
            pointKey: section.points.map(([x, y]) => `${x},${y}`).join('>'),
        })),
        loops: topology.loops.map((loop) => ({
            id: loop.id,
            ownerId: loop.ownerId,
            componentId: loop.componentId,
            sectionRefs: loop.sectionRefs,
        })),
        sectionsByOwnerPair: serializeIndexMap(topology.sectionsByOwnerPair),
        sectionsByVertex: serializeIndexMap(topology.sectionsByVertex),
        sectionsByOwner: serializeIndexMap(topology.sectionsByOwner),
    };
}

function ownerBorderSectionIdentity(topology: FrontierTopology): unknown {
    return [...topology.sections.values()]
        .filter((section) => section.kind === 'owner_border')
        .map((section) => ({
            id: section.id,
            ownerPairKey: section.ownerPairKey,
            pointKey: section.points.map(([x, y]) => `${x},${y}`).join('>'),
        }));
}

describe('buildPowerVoronoiFrontierTopology', () => {
    it('builds a reliable owner-world loop from closed world-border polylines', () => {
        const worldBorderPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 0],
                    [100, 0],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [100, 0],
                    [100, 100],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [100, 100],
                    [0, 100],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 100],
                    [0, 0],
                ],
            },
        ];

        const result = buildPowerVoronoiFrontierTopology({
            sharedPolylines: [],
            worldBorderPolylines,
            ownershipVersion: 'test',
            worldWidth: 100,
            worldHeight: 100,
            fingerprint: 'square-world-border',
        });

        expect(result.topologyReliable).toBe(true);
        expect(result.notes).toEqual([]);
        expect(result.topology.sections.size).toBe(4);
        expect(result.topology.vertices.size).toBe(4);
        expect(result.topology.loops).toHaveLength(1);
        expect(result.topology.loops[0]?.ownerId).toBe('red');
        expect(
            [...result.topology.sections.values()].every(
                (section) => section.ownerPairKey === 'red|world',
            ),
        ).toBe(true);
    });

    it('emits stable topology identity when equivalent input polylines are reordered', () => {
        const sharedPolylines = splitWorldSharedPolylines();
        const worldBorderPolylines = splitWorldBorderPolylines();

        const ordered = buildPowerVoronoiFrontierTopology({
            sharedPolylines,
            worldBorderPolylines,
            ownershipVersion: 'test',
            worldWidth: 100,
            worldHeight: 100,
            fingerprint: 'split-world-ordered',
        });
        const reordered = buildPowerVoronoiFrontierTopology({
            sharedPolylines: [sharedPolylines[0]!],
            worldBorderPolylines: [
                worldBorderPolylines[3]!,
                worldBorderPolylines[5]!,
                worldBorderPolylines[1]!,
                worldBorderPolylines[4]!,
                worldBorderPolylines[0]!,
                worldBorderPolylines[2]!,
            ],
            ownershipVersion: 'test',
            worldWidth: 100,
            worldHeight: 100,
            fingerprint: 'split-world-reordered',
        });

        expect(ordered.topologyReliable).toBe(true);
        expect(reordered.topologyReliable).toBe(true);
        expect(reordered.notes).toEqual(ordered.notes);
        expect(serializeTopologyIdentity(reordered.topology)).toEqual(
            serializeTopologyIdentity(ordered.topology),
        );
    });

    it('uses canonical duplicate section suffixes instead of input indexes', () => {
        const worldBorderPolylines = splitWorldBorderPolylines();
        const ownerBorderA: SharedPolyline = {
            ownerPairKey: 'blue|red',
            color: 0,
            points: [
                [50, 0],
                [48, 50],
                [50, 100],
            ],
        };
        const ownerBorderB: SharedPolyline = {
            ownerPairKey: 'blue|red',
            color: 0,
            points: [
                [50, 0],
                [52, 50],
                [50, 100],
            ],
        };

        const ordered = buildPowerVoronoiFrontierTopology({
            sharedPolylines: [ownerBorderA, ownerBorderB],
            worldBorderPolylines,
            ownershipVersion: 'test',
            worldWidth: 100,
            worldHeight: 100,
            fingerprint: 'duplicate-section-ordered',
        });
        const reordered = buildPowerVoronoiFrontierTopology({
            sharedPolylines: [ownerBorderB, ownerBorderA],
            worldBorderPolylines,
            ownershipVersion: 'test',
            worldWidth: 100,
            worldHeight: 100,
            fingerprint: 'duplicate-section-reordered',
        });

        expect(ordered.notes).toContain('section-id collisions disambiguated: 1');
        expect(reordered.notes).toContain('section-id collisions disambiguated: 1');
        expect(ownerBorderSectionIdentity(reordered.topology)).toEqual(
            ownerBorderSectionIdentity(ordered.topology),
        );
    });
});
