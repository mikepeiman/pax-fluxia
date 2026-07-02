/**
 * buildPowerCoreAuthoritySnapshot.test.ts — P1b: the full snapshot assembly on
 * real fixture maps, through the REAL shared Stage-0 (MSR weights + CX/DX
 * virtuals from live config defaults), pinning the contract + determinism.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { buildPowerVoronoi0319Settings } from '../../families/buildFamilyGeometry';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildPowerCoreAuthoritySnapshot } from './buildPowerCoreAuthoritySnapshot';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps');

interface FixtureMap {
    readonly metadata: { readonly name: string };
    readonly stars: Array<{
        id: string;
        x: number;
        y: number;
        ownerId?: string;
    }>;
    readonly connections: Array<{ sourceId: string; targetId: string }>;
}

function loadFixture(name: string): {
    stars: StarState[];
    connections: StarConnection[];
    worldWidth: number;
    worldHeight: number;
} {
    const raw = readFileSync(path.join(FIXTURE_DIR, `${name}.json`), 'utf-8');
    const fixture = JSON.parse(raw) as FixtureMap;
    let maxX = 0;
    let maxY = 0;
    for (const star of fixture.stars) {
        if (star.x > maxX) maxX = star.x;
        if (star.y > maxY) maxY = star.y;
    }
    return {
        stars: fixture.stars as unknown as StarState[],
        connections: fixture.connections as unknown as StarConnection[],
        worldWidth: maxX + 200,
        worldHeight: maxY + 200,
    };
}

function buildSnapshot(fixtureName: string): ResolvedGeometrySnapshot {
    const { stars, connections, worldWidth, worldHeight } =
        loadFixture(fixtureName);
    const config = buildPowerVoronoi0319Settings({
        lanes: connections,
        worldWidth,
        worldHeight,
        configSource: GAME_CONFIG as unknown as Record<string, unknown>,
    });
    const result = buildPowerCoreAuthoritySnapshot({
        stars,
        connections,
        config,
        ownershipVersion: 'test-ownership',
        sourceStyle: 'perimeter_field',
    });
    expect('kind' in result).toBe(false);
    return result as ResolvedGeometrySnapshot;
}

const FIXTURES = ['cross_owner_midpoint_corridor', 'world_edge_frontier'];

/** Serializable projection for determinism comparison (topology holds Maps). */
function project(snapshot: ResolvedGeometrySnapshot): string {
    return JSON.stringify({
        version: snapshot.version,
        regions: snapshot.territoryRegions,
        frontiers: snapshot.frontierPolylines,
        world: snapshot.worldBorderPolylines,
        shells: snapshot.shells,
    });
}

describe.each(FIXTURES)('buildPowerCoreAuthoritySnapshot (%s)', (fixture) => {
    const snapshot = buildSnapshot(fixture);

    it('satisfies the contract identity + provenance fields', () => {
        expect(snapshot.sourceMethod).toBe('power_voronoi');
        expect(snapshot.geometryFamily).toBe('vector-native');
        expect(snapshot.sourceMode).toBe('unified_vector');
        expect(snapshot.ownershipVersion).toBe('test-ownership');
        expect(snapshot.version).toContain(':pcore');
        expect(snapshot.diagnostics.identityReliable).toBe(true);
        expect(snapshot.frontierTopology).toBeTruthy();
    });

    it('produces non-empty closed regions for every fixture owner', () => {
        const { stars } = loadFixture(fixture);
        const owners = new Set(
            stars.filter((s) => s.ownerId).map((s) => s.ownerId!),
        );
        const regionOwners = new Set(
            snapshot.territoryRegions.map((r) => r.ownerId),
        );
        for (const owner of owners) expect(regionOwners.has(owner)).toBe(true);
        for (const region of snapshot.territoryRegions) {
            expect(region.points.length).toBeGreaterThanOrEqual(3);
            expect(region.regionId).toBeTruthy();
            expect(region.starIds!.length).toBeGreaterThan(0);
            // starIds sorted; contributors are exactly the virtual members.
            expect([...region.starIds!].sort()).toEqual(region.starIds);
            for (const id of region.contributingSiteIds!) {
                expect(region.starIds).toContain(id);
            }
        }
    });

    it('emits sorted pair keys and a consistent sharedFrontierMap', () => {
        for (const polyline of snapshot.frontierPolylines) {
            const [a, b] = polyline.ownerPairKey.split('|');
            expect(a! < b!).toBe(true);
            expect(polyline.ownerPairKey).toBe(
                `${polyline.ownerA}|${polyline.ownerB}`,
            );
            expect(polyline.points.length).toBeGreaterThanOrEqual(2);
        }
        for (const polyline of snapshot.worldBorderPolylines) {
            expect(polyline.ownerB).toBe('world');
            expect(polyline.ownerPairKey).toBe(`${polyline.ownerA}|world`);
        }
        let mapped = 0;
        for (const bucket of snapshot.sharedFrontierMap.values()) {
            mapped += bucket.length;
        }
        expect(mapped).toBe(snapshot.frontierPolylines.length);
    });

    it('keeps frontiers and fills single-source (every frontier point lies on a region boundary)', () => {
        const regionPointKeys = new Set<string>();
        for (const region of snapshot.territoryRegions) {
            for (const [x, y] of region.points) {
                regionPointKeys.add(
                    `${Math.round(x * 1000)},${Math.round(y * 1000)}`,
                );
            }
        }
        for (const polyline of snapshot.frontierPolylines) {
            for (const [x, y] of polyline.points) {
                expect(
                    regionPointKeys.has(
                        `${Math.round(x * 1000)},${Math.round(y * 1000)}`,
                    ),
                ).toBe(true);
            }
        }
    });

    it('builds shells 1:1 with regions', () => {
        expect(snapshot.shells.length).toBe(snapshot.territoryRegions.length);
        expect(snapshot.shellLoops.length).toBe(snapshot.shells.length);
    });

    it('is deterministic across rebuilds', () => {
        expect(project(buildSnapshot(fixture))).toBe(project(snapshot));
    });
});

describe('buildPowerCoreAuthoritySnapshot (world_edge_frontier)', () => {
    it('emits world-border polylines', () => {
        const snapshot = buildSnapshot('world_edge_frontier');
        expect(snapshot.worldBorderPolylines.length).toBeGreaterThan(0);
    });
});
