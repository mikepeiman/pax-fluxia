import { GAME_CONFIG } from '../../../config/game.config';
import { getLanePolyline } from '../../../lanes/lanePolylineCache';
import type { ColorUtils } from '../../../renderers/RenderContext';
import type { StarConnection, StarState } from '../../../types/game.types';
import { buildCorridorVirtualSites } from '../../corridor/buildCorridorVirtualSites';
import { buildDisconnectVirtualSites } from '../../disconnect/buildDisconnectVirtualSites';
import type { RenderFamilyInput } from '../RenderFamilyTypes';

export type ClusterInfo = { clusterIdx: number; ownerId: string };

export interface MetaballStarOverride {
    ownerId?: string | null;
    omitFromTopology?: boolean;
    omitFromSamples?: boolean;
    sampleStrengthScale?: number;
}

export interface MetaballBaseContext {
    actualStars: ReadonlyArray<StarState>;
    actualStarsById: ReadonlyMap<string, StarState>;
    effectiveStars: ReadonlyArray<StarState>;
    ownedStars: ReadonlyArray<StarState>;
    clusterMap: ReadonlyMap<string, ClusterInfo>;
    starStrengthById: ReadonlyMap<string, number>;
    playerColors: ReadonlyArray<readonly [number, number, number]>;
    clusterShips: ReadonlyArray<number>;
    samples: ReadonlyArray<MetaballInfluenceSample>;
    ensureOwnerClusterIdx: (ownerId: string) => number;
}

export interface MetaballInfluenceSample {
    id?: string;
    x: number;
    y: number;
    playerIdx: number;
    strength: number;
    corridorVirtual?: boolean;
    disconnectVirtual?: boolean;
}

export function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function computeMetaballStarStrength(
    star: StarState,
    strengthMult: number,
): number {
    return (
        0.5 +
        Math.min(
            2.0,
            Math.log2(Math.max(1, star.activeShips + star.damagedShips)) * 0.2,
        )
    ) * strengthMult;
}

function hexToRgb(hex: number): [number, number, number] {
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function roundCoord(value: number): number {
    return Math.round(value * 10);
}

function roundStrength(value: number): number {
    return Math.round(value * 1000);
}

export function readTunableNumber(
    input: RenderFamilyInput,
    key: string,
    fallback: number,
): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readTunableBoolean(
    input: RenderFamilyInput,
    key: string,
    fallback: boolean,
): boolean {
    const value = input.tunables.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

function sortStarsById(stars: ReadonlyArray<StarState>): StarState[] {
    return [...stars].sort((a, b) => a.id.localeCompare(b.id));
}

function findConnectedClusters(
    stars: ReadonlyArray<StarState>,
    lanes: ReadonlyArray<StarConnection>,
): Map<string, ClusterInfo> {
    const clusters = new Map<string, ClusterInfo>();
    const starById = new Map(stars.map((star) => [star.id, star] as const));
    const adjacency = new Map<string, string[]>();

    for (const star of stars) {
        adjacency.set(star.id, []);
    }

    for (const lane of lanes) {
        const source = starById.get(lane.sourceId);
        const target = starById.get(lane.targetId);
        if (!source || !target || source.ownerId !== target.ownerId) continue;
        adjacency.get(source.id)?.push(target.id);
        adjacency.get(target.id)?.push(source.id);
    }

    let nextClusterIdx = 0;
    for (const star of stars) {
        if (clusters.has(star.id)) continue;
        const stack = [star.id];
        while (stack.length > 0) {
            const starId = stack.pop()!;
            if (clusters.has(starId)) continue;
            const current = starById.get(starId);
            if (!current || current.ownerId !== star.ownerId) continue;
            clusters.set(starId, {
                clusterIdx: nextClusterIdx,
                ownerId: current.ownerId,
            });
            for (const neighborId of adjacency.get(starId) ?? []) {
                if (!clusters.has(neighborId)) {
                    stack.push(neighborId);
                }
            }
        }
        nextClusterIdx += 1;
    }

    return clusters;
}

export function averageStrength(
    starStrengthById: ReadonlyMap<string, number>,
    starAId: string,
    starBId: string,
): number {
    const a = starStrengthById.get(starAId) ?? 0;
    const b = starStrengthById.get(starBId) ?? a;
    return (a + b) / 2;
}

export function findNearestOwnedStarByOwner(
    ownedStars: ReadonlyArray<StarState>,
    ownerId: string,
    x: number,
    y: number,
    excludeStarId?: string,
): StarState | null {
    let best: StarState | null = null;
    let bestDist = Infinity;
    for (const star of ownedStars) {
        if (star.ownerId !== ownerId || star.id === excludeStarId) continue;
        const dist = Math.hypot(star.x - x, star.y - y);
        if (
            dist < bestDist ||
            (Math.abs(dist - bestDist) <= 1e-6 &&
                best != null &&
                star.id.localeCompare(best.id) < 0)
        ) {
            best = star;
            bestDist = dist;
        }
    }
    return best;
}

export function buildSceneFingerprint(
    samples: ReadonlyArray<MetaballInfluenceSample>,
    playerColors: ReadonlyArray<readonly [number, number, number]>,
    clusterShips: ReadonlyArray<number>,
): string {
    let fingerprint = '';
    for (let i = 0; i < playerColors.length; i++) {
        const color = playerColors[i] ?? [0, 0, 0];
        fingerprint += `c${i}:${color[0]}:${color[1]}:${color[2]}:${Math.round(
            clusterShips[i] ?? 0,
        )}|`;
    }
    for (const sample of samples) {
        fingerprint += `${sample.id ?? ''}:${sample.playerIdx}:${roundCoord(
            sample.x,
        )}:${roundCoord(sample.y)}:${roundStrength(sample.strength)}:${
            sample.corridorVirtual ? 1 : 0
        }:${sample.disconnectVirtual ? 1 : 0}|`;
    }
    return fingerprint;
}

export function buildMetaballBaseContext(
    input: RenderFamilyInput,
    colorUtils: ColorUtils,
    overrides?: ReadonlyMap<string, MetaballStarOverride>,
): MetaballBaseContext {
    const actualStars = sortStarsById(input.stars);
    const actualStarsById = new Map(
        actualStars.map((star) => [star.id, star] as const),
    );
    const effectiveStars = actualStars.map((star) => {
        const override = overrides?.get(star.id);
        if (!override) return star;
        if (override.omitFromTopology) {
            return {
                ...star,
                ownerId: '',
            };
        }
        if (override.ownerId === undefined) return star;
        return {
            ...star,
            ownerId: override.ownerId ?? '',
        };
    });
    const ownedStars = effectiveStars.filter((star) => Boolean(star.ownerId));
    const clusterMap = findConnectedClusters(ownedStars, [...input.lanes]);

    const strengthMult = readTunableNumber(
        input,
        'METABALL_STRENGTH_MULT',
        GAME_CONFIG.METABALL_STRENGTH_MULT ?? 1,
    );
    const corridorEnabled = readTunableBoolean(
        input,
        'MODIFIED_VORONOI_CORRIDOR_ENABLED',
        GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ?? true,
    );
    const contestMidpointEnabled = readTunableBoolean(
        input,
        'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS',
        GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS ?? true,
    );
    const disconnectEnabled = readTunableBoolean(
        input,
        'MODIFIED_VORONOI_DISCONNECT_ENABLED',
        GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ?? false,
    );

    let nextClusterIdx = 0;
    for (const info of clusterMap.values()) {
        nextClusterIdx = Math.max(nextClusterIdx, info.clusterIdx + 1);
    }

    const playerColors: [number, number, number][] = new Array(nextClusterIdx);
    const clusterShips: number[] = new Array(nextClusterIdx).fill(0);
    const ownerDefaultCluster = new Map<string, number>();
    const syntheticOwnerClusters = new Map<string, number>();

    for (const star of ownedStars) {
        const clusterInfo = clusterMap.get(star.id);
        if (!clusterInfo) continue;
        if (!ownerDefaultCluster.has(clusterInfo.ownerId)) {
            ownerDefaultCluster.set(clusterInfo.ownerId, clusterInfo.clusterIdx);
        }
        if (!playerColors[clusterInfo.clusterIdx]) {
            playerColors[clusterInfo.clusterIdx] = hexToRgb(
                colorUtils.getPlayerColor(clusterInfo.ownerId),
            );
        }
        clusterShips[clusterInfo.clusterIdx] +=
            (star.activeShips ?? 0) + (star.damagedShips ?? 0);
    }

    const ensureOwnerClusterIdx = (ownerId: string): number => {
        const existing = ownerDefaultCluster.get(ownerId);
        if (existing !== undefined) return existing;

        const synthetic = syntheticOwnerClusters.get(ownerId);
        if (synthetic !== undefined) return synthetic;

        const clusterIdx = nextClusterIdx++;
        syntheticOwnerClusters.set(ownerId, clusterIdx);
        ownerDefaultCluster.set(ownerId, clusterIdx);
        playerColors[clusterIdx] = hexToRgb(colorUtils.getPlayerColor(ownerId));
        clusterShips[clusterIdx] = 0;
        return clusterIdx;
    };

    const starStrengthById = new Map<string, number>();
    for (const star of ownedStars) {
        starStrengthById.set(
            star.id,
            computeMetaballStarStrength(star, strengthMult),
        );
    }

    const samples: MetaballInfluenceSample[] = [];
    for (const star of ownedStars) {
        const clusterInfo = clusterMap.get(star.id);
        if (!clusterInfo) continue;
        const override = overrides?.get(star.id);
        if (override?.omitFromSamples) continue;
        samples.push({
            id: `star:${star.id}`,
            x: star.x,
            y: star.y,
            playerIdx: clusterInfo.clusterIdx,
            strength:
                (starStrengthById.get(star.id) ?? 0) *
                Math.max(0, override?.sampleStrengthScale ?? 1),
        });
    }

    const corridorSpacing = readTunableNumber(
        input,
        'MODIFIED_VORONOI_CORRIDOR_SPACING',
        GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60,
    );
    const cxWeight = readTunableNumber(
        input,
        'TERRITORY_CX_WEIGHT',
        GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5,
    );
    const cxContestPairCount = readTunableNumber(
        input,
        'TERRITORY_CX_CONTEST_PAIR_COUNT',
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT ?? 1,
    );
    const cxContestPairWeight = readTunableNumber(
        input,
        'TERRITORY_CX_CONTEST_PAIR_WEIGHT',
        GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT ?? 0.5,
    );
    const cxCount = readTunableNumber(
        input,
        'TERRITORY_CX_COUNT',
        GAME_CONFIG.TERRITORY_CX_COUNT ?? 0,
    );
    const starMargin = readTunableNumber(
        input,
        'MODIFIED_VORONOI_STAR_MARGIN',
        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
    );

    const corridorSites = buildCorridorVirtualSites(
        ownedStars,
        [...input.lanes],
        Math.max(12, corridorSpacing),
        Math.max(0, cxWeight),
        cxCount > 0 ? Math.floor(cxCount) : undefined,
        getLanePolyline,
        contestMidpointEnabled,
        corridorEnabled,
        corridorEnabled,
        Math.max(0, cxContestPairWeight),
        Math.max(1, Math.round(cxContestPairCount)),
        Math.max(0, starMargin),
    );
    for (let i = 0; i < corridorSites.length; i++) {
        const site = corridorSites[i];
        const playerIdx =
            clusterMap.get(site.anchorStarId)?.clusterIdx ??
            ensureOwnerClusterIdx(site.ownerId);
        samples.push({
            id: `corridor:${site.sourceStarA}:${site.sourceStarB}:${site.anchorStarId}:${i}`,
            x: site.x,
            y: site.y,
            playerIdx,
            strength:
                averageStrength(
                    starStrengthById,
                    site.sourceStarA,
                    site.sourceStarB,
                ) * site.weight,
            corridorVirtual: true,
        });
    }

    if (disconnectEnabled) {
        const disconnectSites = buildDisconnectVirtualSites(
            ownedStars,
            effectiveStars,
            [...input.lanes],
            readTunableNumber(
                input,
                'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
                GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
            ),
            Math.max(
                0,
                readTunableNumber(
                    input,
                    'TERRITORY_DX_WEIGHT',
                    GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3,
                ),
            ),
        );
        for (const site of disconnectSites) {
            samples.push({
                id: site.id,
                x: site.x,
                y: site.y,
                playerIdx:
                    clusterMap.get(site.anchorStarId)?.clusterIdx ??
                    ensureOwnerClusterIdx(site.ownerId),
                strength:
                    averageStrength(
                        starStrengthById,
                        site.sourceStarA,
                        site.sourceStarB,
                    ) * site.weight,
                disconnectVirtual: true,
            });
        }
    }

    return {
        actualStars,
        actualStarsById,
        effectiveStars,
        ownedStars,
        clusterMap,
        starStrengthById,
        playerColors,
        clusterShips,
        samples,
        ensureOwnerClusterIdx,
    };
}
