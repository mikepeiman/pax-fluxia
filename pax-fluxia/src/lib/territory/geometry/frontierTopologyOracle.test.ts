import { describe, expect, it } from 'vitest';
import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type { SharedPolyline } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildPowerVoronoiFrontierTopology } from '../families/buildPowerVoronoiFrontierTopology';
import { validateFrontierTopologyInvariants } from './frontierTopologyOracle';

function squareWorldBorderPolylines(): SharedPolyline[] {
    return [
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
}

function buildHealthyTopology(): FrontierTopology {
    const result = buildPowerVoronoiFrontierTopology({
        sharedPolylines: [],
        worldBorderPolylines: squareWorldBorderPolylines(),
        ownershipVersion: 'test',
        worldWidth: 100,
        worldHeight: 100,
        fingerprint: 'oracle-square-world-border',
    });

    expect(result.topologyReliable).toBe(true);
    return result.topology;
}

function previousNonEmptyReliability(topology: FrontierTopology): boolean {
    return (
        topology.sections.size > 0 &&
        topology.vertices.size > 0 &&
        topology.loops.length > 0
    );
}

describe('validateFrontierTopologyInvariants', () => {
    it('accepts a healthy closed topology emitted by the Power Voronoi builder', () => {
        const topology = buildHealthyTopology();

        const report = validateFrontierTopologyInvariants(topology);

        expect(report).toEqual({
            ok: true,
            failureCount: 0,
            failures: [],
        });
    });

    it('detects stale endpoint indexes that non-empty reliability would accept', () => {
        const topology = buildHealthyTopology();
        const section = [...topology.sections.values()][0]!;
        const sectionsByVertex = new Map(topology.sectionsByVertex);
        sectionsByVertex.set(
            section.startVertexId,
            (sectionsByVertex.get(section.startVertexId) ?? []).filter(
                (sectionId) => sectionId !== section.id,
            ),
        );
        const invalidTopology: FrontierTopology = {
            ...topology,
            sectionsByVertex,
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            `section ${section.id}: missing from sectionsByVertex at start ${section.startVertexId}`,
        );
    });

    it('detects loop references that no longer reconstruct a closed point chain', () => {
        const topology = buildHealthyTopology();
        const loop = topology.loops[0]!;
        const invalidTopology: FrontierTopology = {
            ...topology,
            loops: [
                {
                    ...loop,
                    sectionRefs: loop.sectionRefs.slice(0, -1),
                },
            ],
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(
            report.failures.some((failure) =>
                failure.includes('reconstructed point chain is open'),
            ),
        ).toBe(true);
    });

    it('detects owner and owner-pair index entries that point at the wrong section', () => {
        const topology = buildHealthyTopology();
        const section = [...topology.sections.values()][0]!;
        const sectionsByOwner = new Map(topology.sectionsByOwner);
        const sectionsByOwnerPair = new Map(topology.sectionsByOwnerPair);
        sectionsByOwner.set('blue', [section.id]);
        sectionsByOwnerPair.set('blue|green', [section.id]);
        const invalidTopology: FrontierTopology = {
            ...topology,
            sectionsByOwner,
            sectionsByOwnerPair,
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            `sectionsByOwner blue: section ${section.id} does not include owner`,
        );
        expect(report.failures).toContain(
            `sectionsByOwnerPair blue|green: section ${section.id} belongs to red|world`,
        );
    });
});
