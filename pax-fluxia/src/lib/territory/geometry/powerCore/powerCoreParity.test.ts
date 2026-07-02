/**
 * powerCoreParity.test.ts — P1b-4: A/B parity between the 0319 authority path
 * and PowerCore on all five fixture maps, driven through the REAL entry
 * (buildPerimeterFieldRenderFamilyGeometry + PERIMETER_FIELD_GEOMETRY_SOURCE),
 * so the registration seam is exercised end-to-end.
 *
 * Parity scope: ownership structure (owners, region counts, real-star
 * membership, frontier pair sets) and gross area. Point-level geometry is
 * EXPECTED to differ — the assembly is what PowerCore replaces, and 0319
 * additionally runs a post-hoc MSR boundary-repair pass that PowerCore
 * intentionally omits. A structural mismatch here is a FINDING to investigate
 * (0319 carries a known junction-walk bug), never something to hide by
 * weakening an assertion.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import {
    buildGeometry0319SitesAndClip,
    resolveDisconnectCellOwner,
} from '../../compiler/Geometry_0319';
import { DISCONNECT_OWNER_ID } from '../../../renderers/territoryFeatures';
import {
    buildPerimeterFieldRenderFamilyGeometry,
    buildPowerVoronoi0319Settings,
} from '../../families/buildFamilyGeometry';
import { isVirtualSiteId } from '../regionIdentity';
import { buildPowerCellsFromSites } from './buildPowerCellsFromSites';
import type { PowerCell } from './powerCoreTypes';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps');

const FIXTURES = [
    'cross_owner_midpoint_corridor',
    'lane_clearance_triplet',
    'metaball_conquest_lane_push',
    'same_owner_disconnect_gap',
    'world_edge_frontier',
];

interface FixtureMap {
    readonly stars: Array<{ id: string; x: number; y: number; ownerId?: string }>;
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

function buildVia(
    fixtureName: string,
    source: 'power_voronoi_0319' | 'power_core',
): ResolvedGeometrySnapshot {
    const { stars, connections, worldWidth, worldHeight } =
        loadFixture(fixtureName);
    return buildPerimeterFieldRenderFamilyGeometry({
        stars,
        lanes: connections,
        worldWidth,
        worldHeight,
        nowMs: 0,
        configSource: {
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
            PERIMETER_FIELD_GEOMETRY_SOURCE: source,
        },
    });
}

function absArea(points: ReadonlyArray<[number, number]>): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return Math.abs(area * 0.5);
}

function ownerAreas(snapshot: ResolvedGeometrySnapshot): Map<string, number> {
    const areas = new Map<string, number>();
    for (const region of snapshot.territoryRegions) {
        areas.set(
            region.ownerId,
            (areas.get(region.ownerId) ?? 0) + absArea(region.points),
        );
    }
    return areas;
}

/** Region real-star membership as a sorted multiset signature per owner. */
function membershipSignature(snapshot: ResolvedGeometrySnapshot): string[] {
    return snapshot.territoryRegions
        .map((region) => {
            const realStars = (region.starIds ?? [])
                .filter((id) => !isVirtualSiteId(id))
                .sort();
            return `${region.ownerId}::${realStars.join(',')}`;
        })
        .sort();
}

/**
 * GROUND-TRUTH oracle: owner adjacency read directly off the raw power
 * diagram (a segment shared by cells of two different owners IS an
 * inter-owner frontier — no assembly involved). Pairs shorter than a sliver
 * threshold are ignored so quantization dust can't create phantom pairs.
 */
const ORACLE_MIN_PAIR_LENGTH_PX = 2;

function groundTruthPairSet(fixtureName: string): string[] {
    const { stars, connections, worldWidth, worldHeight } =
        loadFixture(fixtureName);
    const config = buildPowerVoronoi0319Settings({
        lanes: connections,
        worldWidth,
        worldHeight,
        configSource: GAME_CONFIG as unknown as Record<string, unknown>,
    });
    const stage0 = buildGeometry0319SitesAndClip(
        [...stars],
        [...connections],
        config,
    );
    if ('kind' in stage0) throw new Error(stage0.message);
    const siteById = new Map(stage0.sites.map((site) => [site.starId, site]));
    const raw = buildPowerCellsFromSites(stage0.sites, stage0.clip);
    const cells: PowerCell[] = [];
    for (const cell of raw) {
        if (cell.ownerId !== DISCONNECT_OWNER_ID) {
            cells.push(cell);
            continue;
        }
        const site = siteById.get(cell.siteId);
        const resolved = site
            ? resolveDisconnectCellOwner(site, stage0.ownedStars)
            : null;
        if (resolved) cells.push({ ...cell, ownerId: resolved });
    }
    const segOwners = new Map<string, Set<string>>();
    const segLen = new Map<string, number>();
    for (const cell of cells) {
        const n = cell.points.length;
        for (let i = 0; i < n; i++) {
            const a = cell.points[i]!;
            const b = cell.points[(i + 1) % n]!;
            const ka = `${Math.round(a[0] * 1000)},${Math.round(a[1] * 1000)}`;
            const kb = `${Math.round(b[0] * 1000)},${Math.round(b[1] * 1000)}`;
            const key = ka < kb ? `${ka}>${kb}` : `${kb}>${ka}`;
            (segOwners.get(key) ?? segOwners.set(key, new Set()).get(key)!).add(
                cell.ownerId,
            );
            segLen.set(key, Math.hypot(b[0] - a[0], b[1] - a[1]));
        }
    }
    const pairLength = new Map<string, number>();
    for (const [key, owners] of segOwners) {
        if (owners.size !== 2) continue;
        const pair = [...owners].sort().join('|');
        pairLength.set(pair, (pairLength.get(pair) ?? 0) + (segLen.get(key) ?? 0));
    }
    return [...pairLength.entries()]
        .filter(([, length]) => length >= ORACLE_MIN_PAIR_LENGTH_PX)
        .map(([pair]) => pair)
        .sort();
}

describe.each(FIXTURES)('powerCore vs 0319 parity (%s)', (fixture) => {
    const snap0319 = buildVia(fixture, 'power_voronoi_0319');
    const snapCore = buildVia(fixture, 'power_core');

    it('routes each request to the intended source', () => {
        expect(snap0319.version).not.toContain(':pcore');
        expect(snapCore.version).toContain(':pcore');
    });

    it('agrees on the owner set', () => {
        const owners0319 = new Set(
            snap0319.territoryRegions.map((r) => r.ownerId),
        );
        const ownersCore = new Set(
            snapCore.territoryRegions.map((r) => r.ownerId),
        );
        expect([...ownersCore].sort()).toEqual([...owners0319].sort());
    });

    it('agrees on region count per owner', () => {
        const count = (snapshot: ResolvedGeometrySnapshot) => {
            const counts = new Map<string, number>();
            for (const region of snapshot.territoryRegions) {
                counts.set(
                    region.ownerId,
                    (counts.get(region.ownerId) ?? 0) + 1,
                );
            }
            return [...counts.entries()].sort();
        };
        expect(count(snapCore)).toEqual(count(snap0319));
    });

    it('agrees on real-star membership per region', () => {
        expect(membershipSignature(snapCore)).toEqual(
            membershipSignature(snap0319),
        );
    });

    it('matches the raw-diagram adjacency oracle exactly (frontier pair set)', () => {
        const pairs = (snapshot: ResolvedGeometrySnapshot) =>
            [...new Set(snapshot.frontierPolylines.map((p) => p.ownerPairKey))].sort();
        const oracle = groundTruthPairSet(fixture);
        // PowerCore must report EXACTLY the adjacencies present in the diagram.
        expect(pairs(snapCore)).toEqual(oracle);
        // FINDING (P1b-4, refined 2026-07-02 after user challenge): on 2 of the
        // 5 fixtures 0319 drops a real-but-thin frontier — the contested-lane
        // midpoint seam between corridor-CONTEST virtual cells. Root cause:
        // contest virtuals share ONE siteId (`corridor_A_B`), and
        // extractSharedEdges (generator :591) dedups edge sides BY siteId, so
        // the second owner's side is never recorded and the frontier drops.
        // Cell-level diff proved both pipelines see identical cells; the loss
        // is purely 0319's extraction. Visual severity: a thin lane-corridor
        // seam without a border (largely invisible in rasterized lattice
        // modes), NOT a gross hole — but gameplay-wise it is exactly the
        // contested-midpoint frontier the CX-contest feature exists to draw.
        // Hence: PowerCore must equal the oracle; 0319 only a SUBSET of it.
        for (const pair of pairs(snap0319)) {
            expect(oracle).toContain(pair);
        }
    });

    it('agrees on gross owner area within 20%', () => {
        const areas0319 = ownerAreas(snap0319);
        const areasCore = ownerAreas(snapCore);
        for (const [owner, area0319] of areas0319) {
            const areaCore = areasCore.get(owner) ?? 0;
            const ratio = areaCore / area0319;
            expect(
                ratio,
                `${owner}: powerCore ${Math.round(areaCore)} vs 0319 ${Math.round(area0319)}`,
            ).toBeGreaterThan(0.8);
            expect(ratio).toBeLessThan(1.25);
        }
    });
});
