/**
 * powerCoreParity.test.ts — UNIFIED-geometry oracle suite (was the P1b-4 A/B).
 *
 * The 0319-vs-PowerCore A/B is RETIRED (2026-07-08, user-directed): geometry is
 * unified on PowerCore, every source value normalizes to power_core, and the
 * 0319 assembly is unreachable through the public entry. What remains is the
 * part of this suite that never depended on 0319: PowerCore validated against
 * the GROUND-TRUTH oracle (owner adjacency read directly off the raw power
 * diagram, no assembly involved) on all five fixture maps, driven through the
 * REAL entry (buildPerimeterFieldRenderFamilyGeometry) so the unified routing
 * is exercised end-to-end. Historical finding preserved below: 0319's
 * extraction DROPPED thin contested-lane frontiers (siteId-deduped edge sides);
 * PowerCore must always equal the oracle exactly.
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
import { DISCONNECT_OWNER_ID } from '../regionIdentity';
import {
    buildPerimeterFieldRenderFamilyGeometry,
    buildPowerVoronoi0319Settings,
} from '../../families/buildFamilyGeometry';
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

function buildUnified(fixtureName: string): ResolvedGeometrySnapshot {
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
            // Legacy persisted value — must auto-migrate to PowerCore.
            PERIMETER_FIELD_GEOMETRY_SOURCE: 'power_voronoi_0319',
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

describe.each(FIXTURES)('unified PowerCore vs ground-truth oracle (%s)', (fixture) => {
    const snapCore = buildUnified(fixture);

    it('routes through the unified PowerCore source (legacy value auto-migrates)', () => {
        // buildUnified passes the OLD persisted value — it must land on PowerCore.
        expect(snapCore.version).toContain(':pcore');
    });

    it('covers every owned real star exactly once, in a region of its owner', () => {
        const { stars } = loadFixture(fixture);
        for (const star of stars) {
            if (!star.ownerId) continue;
            const containing = snapCore.territoryRegions.filter((r) =>
                (r.starIds ?? []).includes(star.id),
            );
            expect(containing.length, `star ${star.id}`).toBe(1);
            expect(containing[0]!.ownerId).toBe(star.ownerId);
        }
    });

    it('owner areas are sane (each owner with stars has positive area)', () => {
        const areas = ownerAreas(snapCore);
        const { stars } = loadFixture(fixture);
        for (const star of stars) {
            if (!star.ownerId) continue;
            expect(areas.get(star.ownerId) ?? 0).toBeGreaterThan(0);
        }
    });

    it('matches the raw-diagram adjacency oracle exactly (frontier pair set)', () => {
        const pairs = [
            ...new Set(snapCore.frontierPolylines.map((p) => p.ownerPairKey)),
        ].sort();
        const oracle = groundTruthPairSet(fixture);
        // PowerCore must report EXACTLY the adjacencies present in the diagram.
        // (Historical: the retired 0319 extraction dropped thin contested-lane
        // frontiers — contest virtuals share one siteId and its edge-side dedup
        // keyed by siteId lost the second owner's side. PowerCore equals the
        // oracle; that correctness is one reason 0319 was retired.)
        expect(pairs).toEqual(oracle);
    });
});
