import { GAME_CONFIG } from '$lib/config/game.config';
import { getLanePolyline } from '$lib/lanes/lanePolylineCache';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import {
    computeMetaballStarStrength,
    type MetaballInfluenceSample,
    type MetaballSceneInput,
} from '$lib/renderers/MetaballRenderer';
import { findConnectedClustersOptimized } from '$lib/renderers/territoryUtils';
import type { StarState } from '$lib/types/game.types';
import { buildCorridorVirtualSites } from '$lib/territory/corridor/buildCorridorVirtualSites';
import { buildDisconnectVirtualSites } from '$lib/territory/disconnect/buildDisconnectVirtualSites';
import type { RenderFamilyInput } from '../RenderFamilyTypes';

type ClusterInfo = { clusterIdx: number; ownerId: string };

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
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

function readTunableNumber(
    input: RenderFamilyInput,
    key: string,
    fallback: number,
): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readTunableBoolean(
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

function averageStrength(
    starStrengthById: ReadonlyMap<string, number>,
    starAId: string,
    starBId: string,
): number {
    const a = starStrengthById.get(starAId) ?? 0;
    const b = starStrengthById.get(starBId) ?? a;
    return (a + b) / 2;
}

function findNearestOwnedStarByOwner(
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

function buildSceneFingerprint(
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

function buildConquestTransitionSamples(params: {
    input: RenderFamilyInput;
    ownedStars: ReadonlyArray<StarState>;
    allStarsById: ReadonlyMap<string, StarState>;
    clusterMap: ReadonlyMap<string, ClusterInfo>;
    starStrengthById: ReadonlyMap<string, number>;
    ensureOwnerClusterIdx: (ownerId: string) => number;
}): MetaballInfluenceSample[] {
    const out: MetaballInfluenceSample[] = [];
    const transitionEvents = params.input.activeTransition?.events ?? [];
    for (const transition of transitionEvents) {
        const progress = clamp01(transition.progress);
        if (progress >= 1) continue;

        const conquest = transition.event;
        const targetStar = params.allStarsById.get(conquest.starId);
        if (!targetStar || !conquest.newOwner) continue;

        const transitionIdPrefix = `transition:${conquest.starId}:${transition.startedAtMs}`;
        const travel = progress;
        const oldEnvelope = Math.max(0, 1 - progress);
        const newEnvelope = progress;
        const targetStrength =
            params.starStrengthById.get(targetStar.id) ??
            computeMetaballStarStrength(
                targetStar,
                readTunableNumber(
                    params.input,
                    'METABALL_STRENGTH_MULT',
                    GAME_CONFIG.METABALL_STRENGTH_MULT ?? 1,
                ),
            );

        const attackerIds = [
            ...new Set(
                conquest.attackerStarIds?.length
                    ? conquest.attackerStarIds
                    : conquest.attackerStarId
                      ? [conquest.attackerStarId]
                      : [],
            ),
        ].sort((a, b) => a.localeCompare(b));

        const targetClusterIdx = params.ensureOwnerClusterIdx(conquest.newOwner);

        for (const attackerId of attackerIds) {
            const attackerStar = params.allStarsById.get(attackerId);
            if (!attackerStar) continue;

            const attackerClusterIdx =
                params.clusterMap.get(attackerStar.id)?.clusterIdx ??
                targetClusterIdx;
            const attackerStrength =
                params.starStrengthById.get(attackerStar.id) ??
                computeMetaballStarStrength(
                    attackerStar,
                    readTunableNumber(
                        params.input,
                        'METABALL_STRENGTH_MULT',
                        GAME_CONFIG.METABALL_STRENGTH_MULT ?? 1,
                    ),
                );
            const pairStrength = (attackerStrength + targetStrength) / 2;

            out.push({
                id: `${transitionIdPrefix}:new:${attackerId}`,
                x:
                    attackerStar.x +
                    (targetStar.x - attackerStar.x) * travel,
                y:
                    attackerStar.y +
                    (targetStar.y - attackerStar.y) * travel,
                playerIdx: attackerClusterIdx,
                strength: pairStrength * 0.9 * newEnvelope,
            });
        }

        if (!conquest.previousOwner) continue;
        const retreatAnchor = findNearestOwnedStarByOwner(
            params.ownedStars,
            conquest.previousOwner,
            targetStar.x,
            targetStar.y,
            targetStar.id,
        );
        const retreatClusterIdx = retreatAnchor
            ? (params.clusterMap.get(retreatAnchor.id)?.clusterIdx ??
              params.ensureOwnerClusterIdx(conquest.previousOwner))
            : params.ensureOwnerClusterIdx(conquest.previousOwner);
        const retreatX = retreatAnchor
            ? targetStar.x + (retreatAnchor.x - targetStar.x) * travel
            : targetStar.x;
        const retreatY = retreatAnchor
            ? targetStar.y + (retreatAnchor.y - targetStar.y) * travel
            : targetStar.y;

        out.push({
            id: `${transitionIdPrefix}:old:${retreatAnchor?.id ?? conquest.previousOwner}`,
            x: retreatX,
            y: retreatY,
            playerIdx: retreatClusterIdx,
            strength: targetStrength * 0.6 * oldEnvelope * travel,
        });
    }

    return out;
}

export function buildMetaballScene(
    input: RenderFamilyInput,
    colorUtils: ColorUtils,
): MetaballSceneInput {
    const allStars = sortStarsById(input.stars);
    const allStarsById = new Map(allStars.map((star) => [star.id, star] as const));
    const effectiveOwnerByStarId = new Map<string, string>();
    const transitionProgressByStarId = new Map<string, number>();
    for (const transition of input.activeTransition?.events ?? []) {
        const conquest = transition.event;
        const targetStar = allStarsById.get(conquest.starId);
        if (
            !targetStar ||
            !conquest.previousOwner ||
            targetStar.ownerId !== conquest.newOwner
        ) {
            continue;
        }
        effectiveOwnerByStarId.set(conquest.starId, conquest.previousOwner);
        transitionProgressByStarId.set(
            conquest.starId,
            clamp01(transition.progress),
        );
    }
    const effectiveStars = allStars.map((star) => {
        const effectiveOwner = effectiveOwnerByStarId.get(star.id);
        if (!effectiveOwner) return star;
        return {
            ...star,
            ownerId: effectiveOwner,
        };
    });
    const ownedStars = effectiveStars.filter((star) => Boolean(star.ownerId));
    const starById = new Map(ownedStars.map((star) => [star.id, star] as const));
    const clusterMap = findConnectedClustersOptimized(
        ownedStars,
        [...input.lanes],
        starById,
    );

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
        const baseStrength = starStrengthById.get(star.id) ?? 0;
        const transitionScale = transitionProgressByStarId.has(star.id)
            ? Math.max(0, 1 - (transitionProgressByStarId.get(star.id) ?? 0))
            : 1;
        samples.push({
            id: `star:${star.id}`,
            x: star.x,
            y: star.y,
            playerIdx: clusterInfo.clusterIdx,
            strength: baseStrength * transitionScale,
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
    const cxCount = readTunableNumber(
        input,
        'TERRITORY_CX_COUNT',
        GAME_CONFIG.TERRITORY_CX_COUNT ?? 0,
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
            allStars,
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

    samples.push(
        ...buildConquestTransitionSamples({
            input,
            ownedStars,
            allStarsById,
            clusterMap,
            starStrengthById,
            ensureOwnerClusterIdx,
        }),
    );

    samples.sort((a, b) => {
        const idA = a.id ?? '';
        const idB = b.id ?? '';
        if (idA !== idB) return idA.localeCompare(idB);
        if (a.playerIdx !== b.playerIdx) return a.playerIdx - b.playerIdx;
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
    });

    return {
        ownedStars,
        clusterMap,
        playerColors,
        clusterShips,
        samples,
        fingerprint: buildSceneFingerprint(samples, playerColors, clusterShips),
    };
}
