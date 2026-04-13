import { GAME_CONFIG } from '../../../config/game.config';
import { getLanePolyline } from '../../../lanes/lanePolylineCache';
import type { ColorUtils } from '../../../renderers/RenderContext';
import {
    coerceVsTransitionModeForRenderMode,
    type MetaballBurstBoundaryBasis,
    type MetaballTransitionModeId,
} from '../../transitions/territoryTransitionModes';
import type {
    RenderFamilyInput,
    RenderFamilyTransitionEvent,
} from '../RenderFamilyTypes';
import {
    buildMetaballBaseContext,
    clamp01,
    findNearestOwnedStarByOwner,
    readTunableNumber,
    type MetaballBaseContext,
    type MetaballInfluenceSample,
    type MetaballStarOverride,
} from './metaballSceneBase';

type Vec2 = { x: number; y: number };

const DENSE_RAY_COUNT = 72;

export interface MetaballConquestCacheEntry {
    key: string;
    starId: string;
    previousOwner: string;
    newOwner: string;
    startedAtMs: number;
    targetOrigin: Vec2;
    attackerSites: ReadonlyArray<{
        starId: string;
        x: number;
        y: number;
        strength: number;
    }>;
    targetStrength: number;
    primaryLaneRay: Vec2;
    loserRayDirections: ReadonlyArray<Vec2>;
    denseBoundaryDistancesPx: ReadonlyArray<number>;
    loserRayBoundaryDistancesPx: ReadonlyArray<number>;
    commonBurstDistancePx: number;
}

function normalize(vec: Vec2): Vec2 {
    const length = Math.hypot(vec.x, vec.y);
    if (length <= 1e-6) return { x: 1, y: 0 };
    return { x: vec.x / length, y: vec.y / length };
}

function rotate(vec: Vec2, angleRad: number): Vec2 {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
        x: vec.x * cos - vec.y * sin,
        y: vec.x * sin + vec.y * cos,
    };
}

function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * clamp01(t);
}

function buildTransitionKey(transition: RenderFamilyTransitionEvent): string {
    const conquest = transition.event;
    return [
        conquest.starId,
        conquest.previousOwner,
        conquest.newOwner,
        transition.startedAtMs,
    ].join(':');
}

function getMetaballTransitionMode(input: RenderFamilyInput): MetaballTransitionModeId {
    return coerceVsTransitionModeForRenderMode(
        'metaball',
        (input.tunables.get('VS_TRANSITION_MODE') as string | undefined) ??
            (GAME_CONFIG.VS_TRANSITION_MODE as string | undefined),
    ) as MetaballTransitionModeId;
}

function getBurstBoundaryBasis(input: RenderFamilyInput): MetaballBurstBoundaryBasis {
    const raw =
        (input.tunables.get('METABALL_BURST_BOUNDARY_BASIS') as
            | MetaballBurstBoundaryBasis
            | undefined) ??
        GAME_CONFIG.METABALL_BURST_BOUNDARY_BASIS ??
        't0_region_contour';
    if (
        raw === 't0_region_contour' ||
        raw === 'per_ray_contour_hits' ||
        raw === 'approximate_radius'
    ) {
        return raw;
    }
    return 't0_region_contour';
}

function readDurationMs(
    input: RenderFamilyInput,
    key: string,
    fallbackMs: number,
): number {
    const tickMs = Math.max(
        1,
        readTunableNumber(input, 'BASE_TICK_MS', GAME_CONFIG.BASE_TICK_MS ?? 1000),
    );
    const bindToTick =
        (input.tunables.get('VS_BIND_TO_TICK') as boolean | undefined) ??
        GAME_CONFIG.VS_BIND_TO_TICK ??
        true;
    let durationMs = readTunableNumber(input, key, 0);
    if (durationMs <= 0) {
        durationMs = fallbackMs;
    }
    durationMs = Math.max(1, durationMs);
    return bindToTick ? Math.min(durationMs, tickMs) : durationMs;
}

function readWeightMultiplier(rawValue: number, fallback: number): number {
    return rawValue > 0 ? rawValue / 100 : fallback;
}

function resolvePrimaryLaneRay(
    attackerIds: ReadonlyArray<string>,
    target: { x: number; y: number; id: string },
    context: MetaballBaseContext,
): Vec2 {
    const primaryAttackerId = attackerIds[0];
    const primaryAttacker = primaryAttackerId
        ? context.actualStarsById.get(primaryAttackerId)
        : null;
    if (!primaryAttacker) return { x: 1, y: 0 };

    const polyline = getLanePolyline(primaryAttacker.id, target.id);
    if (polyline && polyline.length >= 2) {
        const first = polyline[0];
        const last = polyline[polyline.length - 1];
        const oriented =
            Math.hypot(last[0] - target.x, last[1] - target.y) <=
            Math.hypot(first[0] - target.x, first[1] - target.y)
                ? polyline
                : [...polyline].reverse();
        const prev = oriented[Math.max(0, oriented.length - 2)];
        const nearTarget = oriented[oriented.length - 1];
        return normalize({
            x: prev[0] - nearTarget[0],
            y: prev[1] - nearTarget[1],
        });
    }

    return normalize({
        x: primaryAttacker.x - target.x,
        y: primaryAttacker.y - target.y,
    });
}

function resolveWinnerClusterIdxAtPoint(
    samples: ReadonlyArray<MetaballInfluenceSample>,
    x: number,
    y: number,
    influenceRadius: number,
    falloff: 'inverse-square' | 'gaussian' | 'smoothstep',
): number | null {
    const perCluster = new Map<number, number>();
    for (const sample of samples) {
        const dist = Math.hypot(sample.x - x, sample.y - y);
        let value = 0;
        if (falloff === 'gaussian') {
            const sigma = influenceRadius / 1.2;
            const d = dist / sigma;
            value = Math.exp(-0.5 * d * d);
        } else if (falloff === 'smoothstep') {
            const effectiveRadius = influenceRadius * 1.5;
            const t = Math.max(0, Math.min(1, 1 - dist / effectiveRadius));
            value = t * t * (3 - 2 * t);
        } else {
            const d = dist / influenceRadius;
            value = 1 / (1 + d * d);
        }
        const contribution = sample.strength * value;
        if (contribution <= 1e-6) continue;
        perCluster.set(
            sample.playerIdx,
            (perCluster.get(sample.playerIdx) ?? 0) + contribution,
        );
    }

    let bestCluster: number | null = null;
    let bestValue = -Infinity;
    for (const [clusterIdx, value] of perCluster.entries()) {
        if (
            value > bestValue ||
            (Math.abs(value - bestValue) <= 1e-6 &&
                bestCluster != null &&
                clusterIdx < bestCluster)
        ) {
            bestCluster = clusterIdx;
            bestValue = value;
        }
    }
    return bestCluster;
}

function sampleBoundaryDistanceOnRay(params: {
    samples: ReadonlyArray<MetaballInfluenceSample>;
    targetClusterIdx: number;
    origin: Vec2;
    direction: Vec2;
    analysisLimitPx: number;
    influenceRadius: number;
    falloff: 'inverse-square' | 'gaussian' | 'smoothstep';
    stepPx: number;
}): number {
    let prevDistance = 0;
    for (
        let distance = params.stepPx;
        distance <= params.analysisLimitPx;
        distance += params.stepPx
    ) {
        const x = params.origin.x + params.direction.x * distance;
        const y = params.origin.y + params.direction.y * distance;
        const winner = resolveWinnerClusterIdxAtPoint(
            params.samples,
            x,
            y,
            params.influenceRadius,
            params.falloff,
        );
        if (winner !== params.targetClusterIdx) {
            let low = prevDistance;
            let high = distance;
            for (let i = 0; i < 5; i++) {
                const mid = (low + high) * 0.5;
                const mx = params.origin.x + params.direction.x * mid;
                const my = params.origin.y + params.direction.y * mid;
                const midWinner = resolveWinnerClusterIdxAtPoint(
                    params.samples,
                    mx,
                    my,
                    params.influenceRadius,
                    params.falloff,
                );
                if (midWinner === params.targetClusterIdx) {
                    low = mid;
                } else {
                    high = mid;
                }
            }
            return high;
        }
        prevDistance = distance;
    }
    return params.analysisLimitPx;
}

function estimateEquivalentRadius(boundaryDistances: ReadonlyArray<number>): number {
    if (boundaryDistances.length === 0) return 0;
    const deltaAngle = (Math.PI * 2) / boundaryDistances.length;
    let area = 0;
    for (const distance of boundaryDistances) {
        area += 0.5 * distance * distance * deltaAngle;
    }
    return Math.sqrt(Math.max(0, area) / Math.PI);
}

function buildBurstDirections(primaryLaneRay: Vec2): {
    denseDirections: Vec2[];
    loserDirections: Vec2[];
} {
    const denseDirections = Array.from({ length: DENSE_RAY_COUNT }, (_, index) =>
        rotate(primaryLaneRay, (Math.PI * 2 * index) / DENSE_RAY_COUNT),
    );
    const loserDirections = Array.from({ length: 6 }, (_, index) =>
        rotate(primaryLaneRay, (Math.PI / 3) * index),
    ).slice(1);
    return { denseDirections, loserDirections };
}

function captureConquestCacheEntry(params: {
    input: RenderFamilyInput;
    colorUtils: ColorUtils;
    transition: RenderFamilyTransitionEvent;
}): MetaballConquestCacheEntry | null {
    const conquest = params.transition.event;
    const targetStar = params.input.stars.find((star) => star.id === conquest.starId);
    if (!targetStar || !conquest.previousOwner || !conquest.newOwner) return null;

    const overrides = new Map<string, MetaballStarOverride>([
        [targetStar.id, { ownerId: conquest.previousOwner }],
    ]);
    const t0Context = buildMetaballBaseContext(
        params.input,
        params.colorUtils,
        overrides,
    );
    const targetClusterIdx = t0Context.clusterMap.get(targetStar.id)?.clusterIdx;
    if (targetClusterIdx == null) return null;

    const attackerIds = [
        ...new Set(
            conquest.attackerStarIds?.length
                ? conquest.attackerStarIds
                : conquest.attackerStarId
                  ? [conquest.attackerStarId]
                  : [],
        ),
    ].filter((starId) => t0Context.actualStarsById.has(starId));
    const primaryLaneRay = resolvePrimaryLaneRay(attackerIds, targetStar, t0Context);
    const { denseDirections, loserDirections } = buildBurstDirections(primaryLaneRay);
    const influenceRadius = Math.max(
        1,
        readTunableNumber(
            params.input,
            'METABALL_INFLUENCE_RADIUS',
            GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 90,
        ),
    );
    const falloff = (
        params.input.tunables.get('METABALL_FALLOFF') ??
        GAME_CONFIG.METABALL_FALLOFF ??
        'gaussian'
    ) as 'inverse-square' | 'gaussian' | 'smoothstep';
    const stepPx = Math.max(
        4,
        readTunableNumber(
            params.input,
            'METABALL_CELL_SIZE',
            GAME_CONFIG.METABALL_CELL_SIZE ?? 10,
        ),
    );
    const analysisLimitPx = Math.max(
        Math.hypot(params.input.world.width, params.input.world.height),
        influenceRadius * 4,
    );

    const denseBoundaryDistances = denseDirections.map((direction) =>
        sampleBoundaryDistanceOnRay({
            samples: t0Context.samples,
            targetClusterIdx,
            origin: { x: targetStar.x, y: targetStar.y },
            direction,
            analysisLimitPx,
            influenceRadius,
            falloff,
            stepPx,
        }),
    );
    const loserRayBoundaryDistances = loserDirections.map((direction) =>
        sampleBoundaryDistanceOnRay({
            samples: t0Context.samples,
            targetClusterIdx,
            origin: { x: targetStar.x, y: targetStar.y },
            direction,
            analysisLimitPx,
            influenceRadius,
            falloff,
            stepPx,
        }),
    );

    const basis = getBurstBoundaryBasis(params.input);
    const contourDistance = Math.max(
        1,
        Math.min(...denseBoundaryDistances.filter((distance) => Number.isFinite(distance))),
    );
    const perRayDistance = Math.max(
        1,
        Math.min(
            ...loserRayBoundaryDistances.filter((distance) => Number.isFinite(distance)),
        ),
    );
    const approximateRadius = Math.max(
        1,
        estimateEquivalentRadius(denseBoundaryDistances),
    );
    const commonBurstDistancePx =
        basis === 'per_ray_contour_hits'
            ? perRayDistance
            : basis === 'approximate_radius'
              ? approximateRadius
              : contourDistance;

    const targetStrength = t0Context.starStrengthById.get(targetStar.id) ?? 0;
    const attackerSites = attackerIds
        .map((attackerId) => t0Context.actualStarsById.get(attackerId))
        .filter((star): star is NonNullable<typeof star> => Boolean(star))
        .map((star) => ({
            starId: star.id,
            x: star.x,
            y: star.y,
            strength: t0Context.starStrengthById.get(star.id) ?? 0,
        }));

    return {
        key: buildTransitionKey(params.transition),
        starId: targetStar.id,
        previousOwner: conquest.previousOwner,
        newOwner: conquest.newOwner,
        startedAtMs: params.transition.startedAtMs,
        targetOrigin: { x: targetStar.x, y: targetStar.y },
        attackerSites,
        targetStrength,
        primaryLaneRay,
        loserRayDirections: loserDirections,
        denseBoundaryDistancesPx: denseBoundaryDistances,
        loserRayBoundaryDistancesPx: loserRayBoundaryDistances,
        commonBurstDistancePx,
    };
}

export function reconcileMetaballConquestCache(params: {
    input: RenderFamilyInput;
    colorUtils: ColorUtils;
    conquestCache: Map<string, MetaballConquestCacheEntry>;
}): void {
    const mode = getMetaballTransitionMode(params.input);
    if (mode !== 'metaball_six_slice_burst') {
        params.conquestCache.clear();
        return;
    }

    const activeKeys = new Set<string>();
    for (const transition of params.input.activeTransition?.events ?? []) {
        if (clamp01(transition.progress) >= 1) continue;
        const key = buildTransitionKey(transition);
        activeKeys.add(key);
        if (!params.conquestCache.has(key)) {
            const entry = captureConquestCacheEntry({
                input: params.input,
                colorUtils: params.colorUtils,
                transition,
            });
            if (entry) {
                params.conquestCache.set(key, entry);
            }
        }
    }

    for (const key of [...params.conquestCache.keys()]) {
        if (!activeKeys.has(key)) {
            params.conquestCache.delete(key);
        }
    }
}

export function buildMetaballTransitionStarOverrides(
    input: RenderFamilyInput,
): ReadonlyMap<string, MetaballStarOverride> {
    const mode = getMetaballTransitionMode(input);
    const overrides = new Map<string, MetaballStarOverride>();
    for (const transition of input.activeTransition?.events ?? []) {
        const conquest = transition.event;
        const progress = clamp01(transition.progress);
        if (progress >= 1 || !conquest.previousOwner) continue;

        if (mode === 'metaball_six_slice_burst') {
            overrides.set(conquest.starId, {
                ownerId: null,
                omitFromTopology: true,
                omitFromSamples: true,
            });
        } else {
            overrides.set(conquest.starId, {
                ownerId: conquest.previousOwner,
                sampleStrengthScale: Math.max(0, 1 - progress),
            });
        }
    }
    return overrides;
}

function buildLanePushTransitionSamples(params: {
    input: RenderFamilyInput;
    context: MetaballBaseContext;
}): MetaballInfluenceSample[] {
    const out: MetaballInfluenceSample[] = [];

    for (const transition of params.input.activeTransition?.events ?? []) {
        const conquest = transition.event;
        const targetStar = params.context.actualStarsById.get(conquest.starId);
        if (!targetStar || !conquest.newOwner) continue;

        const elapsedMs = Math.max(0, params.input.nowMs - transition.startedAtMs);
        const victorTravelMs = readDurationMs(
            params.input,
            'VS_VICTOR_TRAVEL_MS',
            transition.durationMs,
        );
        const loserTravelMs = readDurationMs(
            params.input,
            'VS_LOSER_TRAVEL_MS',
            transition.durationMs,
        );
        const powerLerpMs = readDurationMs(
            params.input,
            'VS_POWER_LERP_DURATION_MS',
            Math.max(victorTravelMs, loserTravelMs),
        );
        const victorTravelT = clamp01(elapsedMs / victorTravelMs);
        const loserTravelT = clamp01(elapsedMs / loserTravelMs);
        const powerT = clamp01(elapsedMs / powerLerpMs);
        const rawStart = readTunableNumber(
            params.input,
            'VS_POWER_LERP_START',
            GAME_CONFIG.VS_POWER_LERP_START ?? 0,
        );
        const rawEnd = readTunableNumber(
            params.input,
            'VS_POWER_LERP_END',
            GAME_CONFIG.VS_POWER_LERP_END ?? 0,
        );
        const victorStartMultiplier = readWeightMultiplier(rawStart, 0);
        const victorEndMultiplier = readWeightMultiplier(rawEnd, 0.9);
        const loserStartMultiplier = readWeightMultiplier(rawStart, 0.6);
        const victorWeightMultiplier = lerp(
            victorStartMultiplier,
            victorEndMultiplier,
            powerT,
        );
        const loserWeightMultiplier = lerp(loserStartMultiplier, 0, powerT);

        const targetStrength =
            params.context.starStrengthById.get(targetStar.id) ?? 0;
        const attackerIds = [
            ...new Set(
                conquest.attackerStarIds?.length
                    ? conquest.attackerStarIds
                    : conquest.attackerStarId
                      ? [conquest.attackerStarId]
                      : [],
            ),
        ];
        const targetClusterIdx = params.context.ensureOwnerClusterIdx(conquest.newOwner);

        for (const attackerId of attackerIds) {
            const attackerStar = params.context.actualStarsById.get(attackerId);
            if (!attackerStar) continue;
            const attackerClusterIdx =
                params.context.clusterMap.get(attackerStar.id)?.clusterIdx ??
                targetClusterIdx;
            const attackerStrength =
                params.context.starStrengthById.get(attackerStar.id) ?? 0;
            const pairStrength = (attackerStrength + targetStrength) / 2;

            out.push({
                id: `transition:${conquest.starId}:${transition.startedAtMs}:new:${attackerId}`,
                x:
                    attackerStar.x +
                    (targetStar.x - attackerStar.x) * victorTravelT,
                y:
                    attackerStar.y +
                    (targetStar.y - attackerStar.y) * victorTravelT,
                playerIdx: attackerClusterIdx,
                strength: pairStrength * victorWeightMultiplier,
            });
        }

        if (!conquest.previousOwner) continue;
        const retreatAnchor = findNearestOwnedStarByOwner(
            params.context.ownedStars,
            conquest.previousOwner,
            targetStar.x,
            targetStar.y,
            targetStar.id,
        );
        const retreatClusterIdx = retreatAnchor
            ? (params.context.clusterMap.get(retreatAnchor.id)?.clusterIdx ??
              params.context.ensureOwnerClusterIdx(conquest.previousOwner))
            : params.context.ensureOwnerClusterIdx(conquest.previousOwner);
        const retreatX = retreatAnchor
            ? targetStar.x + (retreatAnchor.x - targetStar.x) * loserTravelT
            : targetStar.x;
        const retreatY = retreatAnchor
            ? targetStar.y + (retreatAnchor.y - targetStar.y) * loserTravelT
            : targetStar.y;

        out.push({
            id: `transition:${conquest.starId}:${transition.startedAtMs}:old:${retreatAnchor?.id ?? conquest.previousOwner}`,
            x: retreatX,
            y: retreatY,
            playerIdx: retreatClusterIdx,
            strength: targetStrength * loserWeightMultiplier,
        });
    }

    return out;
}

function buildSixSliceBurstSamples(params: {
    input: RenderFamilyInput;
    context: MetaballBaseContext;
    conquestCache: ReadonlyMap<string, MetaballConquestCacheEntry>;
}): MetaballInfluenceSample[] {
    const out: MetaballInfluenceSample[] = [];

    for (const transition of params.input.activeTransition?.events ?? []) {
        const cache = params.conquestCache.get(buildTransitionKey(transition));
        if (!cache) continue;

        const elapsedMs = Math.max(0, params.input.nowMs - transition.startedAtMs);
        const victorTravelMs = readDurationMs(
            params.input,
            'VS_VICTOR_TRAVEL_MS',
            transition.durationMs,
        );
        const loserTravelMs = readDurationMs(
            params.input,
            'VS_LOSER_TRAVEL_MS',
            transition.durationMs,
        );
        const powerLerpMs = readDurationMs(
            params.input,
            'VS_POWER_LERP_DURATION_MS',
            Math.max(victorTravelMs, loserTravelMs),
        );
        const victorTravelT = clamp01(elapsedMs / victorTravelMs);
        const loserTravelT = clamp01(elapsedMs / loserTravelMs);
        const powerT = clamp01(elapsedMs / powerLerpMs);
        const rawStart = readTunableNumber(
            params.input,
            'VS_POWER_LERP_START',
            GAME_CONFIG.VS_POWER_LERP_START ?? 0,
        );
        const rawEnd = readTunableNumber(
            params.input,
            'VS_POWER_LERP_END',
            GAME_CONFIG.VS_POWER_LERP_END ?? 0,
        );
        const victorStartMultiplier = readWeightMultiplier(rawStart, 1);
        const victorEndMultiplier = readWeightMultiplier(rawEnd, 1);
        const loserStartMultiplier = readWeightMultiplier(rawStart, 1);
        const victorWeightMultiplier = lerp(
            victorStartMultiplier,
            victorEndMultiplier,
            powerT,
        );
        const loserWeightMultiplier = lerp(loserStartMultiplier, 0, powerT);
        const victorPlayerIdx = params.context.ensureOwnerClusterIdx(cache.newOwner);
        const loserPlayerIdx = params.context.ensureOwnerClusterIdx(
            cache.previousOwner,
        );

        for (const attacker of cache.attackerSites) {
            out.push({
                id: `transition:${cache.starId}:${cache.startedAtMs}:victor:${attacker.starId}`,
                x:
                    attacker.x +
                    (cache.targetOrigin.x - attacker.x) * victorTravelT,
                y:
                    attacker.y +
                    (cache.targetOrigin.y - attacker.y) * victorTravelT,
                playerIdx: victorPlayerIdx,
                strength: attacker.strength * victorWeightMultiplier,
            });
        }

        const loserBaseStrength =
            cache.targetStrength /
            Math.max(1, cache.loserRayDirections.length);
        const travelDistance = cache.commonBurstDistancePx * loserTravelT;

        cache.loserRayDirections.forEach((direction, index) => {
            out.push({
                id: `transition:${cache.starId}:${cache.startedAtMs}:burst:${index}`,
                x: cache.targetOrigin.x + direction.x * travelDistance,
                y: cache.targetOrigin.y + direction.y * travelDistance,
                playerIdx: loserPlayerIdx,
                strength: loserBaseStrength * loserWeightMultiplier,
            });
        });
    }

    return out;
}

export function buildMetaballTransitionSamples(params: {
    input: RenderFamilyInput;
    context: MetaballBaseContext;
    conquestCache: ReadonlyMap<string, MetaballConquestCacheEntry>;
}): MetaballInfluenceSample[] {
    const mode = getMetaballTransitionMode(params.input);
    if (mode === 'metaball_six_slice_burst') {
        return buildSixSliceBurstSamples(params);
    }
    return buildLanePushTransitionSamples(params);
}
