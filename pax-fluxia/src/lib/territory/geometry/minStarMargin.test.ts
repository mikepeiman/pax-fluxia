import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '$lib/config/game.config';
import { computeGeometry0319 } from '$lib/territory/compiler/Geometry_0319';
import { buildTerritoryGeneratorSettingsFromTunables, readNormalizedTerritoryGeometryTunables } from '$lib/territory/geometry/geometryTuning';
import { pointInPolygon } from '$lib/territory/geometry/geometryUtils';
import {
    applyExplicitMinStarMargin,
    resolveAppliedMinStarMarginPx,
    resolvePerStarMinStarMarginPx,
} from './minStarMargin';

function summarizeOwnerCounts(
    regions: ReadonlyArray<{ ownerId: string }>,
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const region of regions) {
        counts.set(region.ownerId, (counts.get(region.ownerId) ?? 0) + 1);
    }
    return counts;
}

function countStarsOutsideOwnerRegions(params: {
    stars: ReadonlyArray<{ id: string; x: number; y: number; ownerId?: string | null }>;
    regions: ReadonlyArray<{ ownerId: string; points: [number, number][] }>;
}): number {
    let failures = 0;
    for (const star of params.stars) {
        if (!star.ownerId) continue;
        const inside = params.regions
            .filter((region) => region.ownerId === star.ownerId)
            .some((region) => pointInPolygon(star.x, star.y, region.points));
        if (!inside) failures++;
    }
    return failures;
}

describe('resolvePerStarMinStarMarginPx', () => {
    it('caps each star against the nearest different-owner star, not same-owner neighbors', () => {
        const radii = resolvePerStarMinStarMarginPx({
            stars: [
                { id: 'a1', x: 120, y: 120, ownerId: 'A' } as any,
                { id: 'a2', x: 140, y: 120, ownerId: 'A' } as any,
                { id: 'b1', x: 320, y: 120, ownerId: 'B' } as any,
            ],
            requestedMarginPx: 60,
            worldWidth: 1000,
            worldHeight: 1000,
        });

        expect(radii.get('a1')).toBe(60);
        expect(radii.get('a2')).toBe(60);
        expect(radii.get('b1')).toBe(60);
    });

    it('caps against the nearest enemy star and the world edge locally', () => {
        const radii = resolvePerStarMinStarMarginPx({
            stars: [
                { id: 'a', x: 20, y: 120, ownerId: 'A' } as any,
                { id: 'b', x: 100, y: 120, ownerId: 'B' } as any,
            ],
            requestedMarginPx: 75,
            worldWidth: 500,
            worldHeight: 500,
        });

        expect(radii.get('a')).toBe(20);
        expect(radii.get('b')).toBe(40);
    });
});

describe('resolveAppliedMinStarMarginPx', () => {
    it('returns the tightest local effective radius', () => {
        expect(
            resolveAppliedMinStarMarginPx(
                [
                    { id: 'a', x: 20, y: 120, ownerId: 'A' } as any,
                    { id: 'b', x: 100, y: 120, ownerId: 'B' } as any,
                ],
                75,
                500,
                500,
            ),
        ).toBe(20);
    });
});

describe('applyExplicitMinStarMargin', () => {
    it('orders anchors by arc length and splits intervals at midpoints', () => {
        const result = applyExplicitMinStarMargin({
            sharedPolylines: [
                {
                    ownerPairKey: 'A|B',
                    points: [
                        [50, 0],
                        [50, 100],
                    ] as [number, number][],
                },
            ],
            worldBorderPolylines: [],
            stars: [
                { id: 'a1', x: 35, y: 25, ownerId: 'A' } as any,
                { id: 'a2', x: 35, y: 75, ownerId: 'A' } as any,
                { id: 'b1', x: 70, y: 50, ownerId: 'B' } as any,
            ],
            requestedMarginPx: 20,
            worldWidth: 500,
            worldHeight: 500,
        });

        const aAnchors = result.diagnostics.anchors.filter(
            (anchor) => anchor.ownerId === 'A',
        );
        expect(aAnchors).toHaveLength(2);
        expect(aAnchors[0]!.anchorArcLengthPx).toBeLessThan(
            aAnchors[1]!.anchorArcLengthPx,
        );

        const aIntervals = result.diagnostics.intervals.filter(
            (interval) => interval.ownerId === 'A',
        );
        expect(aIntervals).toHaveLength(2);
        expect(aIntervals[0]!.intervalStartPx).toBeCloseTo(0, 4);
        expect(aIntervals[0]!.intervalEndPx).toBeCloseTo(37.5, 4);
        expect(aIntervals[1]!.intervalStartPx).toBeCloseTo(62.5, 4);
        expect(aIntervals[1]!.intervalEndPx).toBeCloseTo(100, 4);
    });

    it('keeps frontier changes inside the assigned local interval', () => {
        const result = applyExplicitMinStarMargin({
            sharedPolylines: [
                {
                    ownerPairKey: 'A|B',
                    points: [
                        [50, 0],
                        [50, 50],
                        [50, 100],
                    ] as [number, number][],
                },
            ],
            worldBorderPolylines: [],
            stars: [
                { id: 'a1', x: 40, y: 25, ownerId: 'A' } as any,
                { id: 'a2', x: 29, y: 75, ownerId: 'A' } as any,
                { id: 'b1', x: 70, y: 50, ownerId: 'B' } as any,
            ],
            requestedMarginPx: 20,
            worldWidth: 500,
            worldHeight: 500,
        });

        const repaired = result.sharedPolylines[0]!.points;
        expect(repaired.some((point) => point[0] === 50 && point[1] === 50)).toBe(
            true,
        );
        expect(repaired.some((point) => point[0] === 50 && point[1] === 100)).toBe(
            true,
        );
        const firstInterval = result.diagnostics.intervals.find(
            (interval) => interval.starId === 'a1',
        );
        const secondInterval = result.diagnostics.intervals.find(
            (interval) => interval.starId === 'a2',
        );
        expect(firstInterval?.intervalEndPx).toBeCloseTo(37.5, 4);
        expect(secondInterval?.violated).toBe(false);
        expect(secondInterval?.intervalStartPx).toBeCloseTo(62.5, 4);
    });

    it('rebuilds a simple frontier polyline to stay outside the owner star margin', () => {
        const result = applyExplicitMinStarMargin({
            sharedPolylines: [
                {
                    ownerPairKey: 'A|B',
                    points: [
                        [55, 80],
                        [55, 120],
                    ] as [number, number][],
                },
            ],
            worldBorderPolylines: [],
            stars: [
                { id: 'a', x: 50, y: 100, ownerId: 'A' } as any,
                { id: 'b', x: 150, y: 100, ownerId: 'B' } as any,
            ],
            requestedMarginPx: 20,
            worldWidth: 500,
            worldHeight: 500,
        });

        const points = result.sharedPolylines[0]!.points;
        const minDistance = Math.min(
            ...points.map((point) => Math.hypot(point[0] - 50, point[1] - 100)),
        );
        expect(minDistance).toBeGreaterThanOrEqual(19.9);
    });
});

describe('Geometry_0319 MSR hardening', () => {
    it('preserves region connectivity on arena-further when MSR increases', () => {
        const arenaFurther = JSON.parse(
            readFileSync(
                resolve(
                    process.cwd(),
                    '../common/resources/saved-maps/arena-further.json',
                ),
                'utf8',
            ),
        ) as {
            stars: any[];
            connections: any[];
        };
        const tunables = readNormalizedTerritoryGeometryTunables(
            DEFAULT_GAME_CONFIG as unknown as Record<string, unknown>,
        );
        const baseSettings = buildTerritoryGeneratorSettingsFromTunables({
            world: { width: 1920, height: 1080 },
            tunables: {
                ...tunables,
                starMargin: 0,
                msrStarBias: 0,
            },
        });
        const msrSettings = buildTerritoryGeneratorSettingsFromTunables({
            world: { width: 1920, height: 1080 },
            tunables: {
                ...tunables,
                starMargin: 75,
                msrStarBias: 0,
            },
        });

        const baseline = computeGeometry0319(
            arenaFurther.stars as any,
            arenaFurther.connections as any,
            baseSettings,
        );
        const msr = computeGeometry0319(
            arenaFurther.stars as any,
            arenaFurther.connections as any,
            msrSettings,
        );

        expect('kind' in baseline).toBe(false);
        expect('kind' in msr).toBe(false);
        if ('kind' in baseline || 'kind' in msr) {
            return;
        }

        expect(msr.mergedTerritories.length).toBe(baseline.mergedTerritories.length);
        expect(summarizeOwnerCounts(msr.mergedTerritories)).toEqual(
            summarizeOwnerCounts(baseline.mergedTerritories),
        );
        expect(
            msr.minStarMarginDiagnostics?.summary.acceptedRepairCount ?? 0,
        ).toBeGreaterThan(0);
    });

    it('keeps low MSR values topology-safe on arena-further with zero star bias', () => {
        const arenaFurther = JSON.parse(
            readFileSync(
                resolve(
                    process.cwd(),
                    '../common/resources/saved-maps/arena-further.json',
                ),
                'utf8',
            ),
        ) as {
            stars: any[];
            connections: any[];
        };
        const tunables = readNormalizedTerritoryGeometryTunables(
            DEFAULT_GAME_CONFIG as unknown as Record<string, unknown>,
        );
        const baseline = computeGeometry0319(
            arenaFurther.stars as any,
            arenaFurther.connections as any,
            buildTerritoryGeneratorSettingsFromTunables({
                world: { width: 1920, height: 1080 },
                tunables: {
                    ...tunables,
                    starMargin: 0,
                    msrStarBias: 0,
                },
            }),
        );

        expect('kind' in baseline).toBe(false);
        if ('kind' in baseline) {
            return;
        }

        for (const margin of [5, 10]) {
            const adjusted = computeGeometry0319(
                arenaFurther.stars as any,
                arenaFurther.connections as any,
                buildTerritoryGeneratorSettingsFromTunables({
                    world: { width: 1920, height: 1080 },
                    tunables: {
                        ...tunables,
                        starMargin: margin,
                        msrStarBias: 0,
                    },
                }),
            );

            expect('kind' in adjusted).toBe(false);
            if ('kind' in adjusted) {
                continue;
            }

            expect(adjusted.mergedTerritories.length).toBe(
                baseline.mergedTerritories.length,
            );
            expect(summarizeOwnerCounts(adjusted.mergedTerritories)).toEqual(
                summarizeOwnerCounts(baseline.mergedTerritories),
            );
        }
    });

    it('keeps every owned star inside an owner-matching region on arena-further', () => {
        const arenaFurther = JSON.parse(
            readFileSync(
                resolve(
                    process.cwd(),
                    '../common/resources/saved-maps/arena-further.json',
                ),
                'utf8',
            ),
        ) as {
            stars: any[];
            connections: any[];
        };
        const tunables = readNormalizedTerritoryGeometryTunables(
            DEFAULT_GAME_CONFIG as unknown as Record<string, unknown>,
        );

        const geometry = computeGeometry0319(
            arenaFurther.stars as any,
            arenaFurther.connections as any,
            buildTerritoryGeneratorSettingsFromTunables({
                world: { width: 1920, height: 1080 },
                tunables,
            }),
        );

        expect('kind' in geometry).toBe(false);
        if ('kind' in geometry) {
            return;
        }

        expect(
            countStarsOutsideOwnerRegions({
                stars: arenaFurther.stars as any,
                regions: geometry.mergedTerritories,
            }),
        ).toBe(0);
    });
});
