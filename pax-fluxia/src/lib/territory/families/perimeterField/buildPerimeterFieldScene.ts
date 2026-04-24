import { GAME_CONFIG } from '../../../config/game.config';
import {
    logPipelineStage,
    summarizePerimeterSourceData,
    summarizePerimeterVSet,
    summarizeScene,
    summarizeTransitionPlan,
} from '$lib/perf/pipelineTelemetry';
import type { ColorUtils } from '../../../renderers/RenderContext';
import type {
    MetaballInfluenceSample,
    MetaballSceneInput,
} from '../../../renderers/MetaballRenderer';
import type { StarState } from '../../../types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import { buildSceneFingerprint } from '../metaball/metaballSceneBase';
import {
    hasUsableFrontierTopology,
    sampleVSetFromGeometry,
    evaluateTransitionMoverPosition,
} from './perimeterFieldPlanEngine';
import type {
    PerimeterV,
    TransitionPlan,
    TransitionRole,
} from './perimeterFieldTransitionTypes';

type OwnerClusterInfo = { clusterIdx: number; ownerId: string };

export interface PerimeterFieldDebugSample extends MetaballInfluenceSample {
    ownerId: string;
    ownerColor: number;
    sourceId?: string;
    starIds?: readonly string[];
    vId?: string;
    moverId?: string;
    transitionRole?: TransitionRole;
    label?: string;
    sampleIndex?: number;
    pathStartX?: number;
    pathStartY?: number;
    pathEndX?: number;
    pathEndY?: number;
    startFallback?: boolean;
    endFallback?: boolean;
    debugState:
        | 'static'
        | 'target'
        | 'transition-old'
        | 'transition-new'
        | 'preserved'
        | 'mover'
        | 'appearing'
        | 'disappearing';
}

export interface PerimeterFieldDebugSnapshot {
    displayGeometry: CanonicalGeometrySnapshot;
    transitionTargetGeometry: CanonicalGeometrySnapshot | null;
    playerColors: ReadonlyArray<readonly [number, number, number]>;
    staticSamples: ReadonlyArray<PerimeterFieldDebugSample>;
    targetStaticSamples: ReadonlyArray<PerimeterFieldDebugSample>;
    transitionSamples: ReadonlyArray<PerimeterFieldDebugSample>;
    effectiveProgress: number | null;
    transitionPlan?: TransitionPlan | null;
}

export interface PerimeterFieldBuiltScene {
    sceneInput: MetaballSceneInput;
    debug: PerimeterFieldDebugSnapshot;
}

interface PerimeterSource {
    ownerId: string;
    sourceId: string;
    points: ReadonlyArray<[number, number]>;
    starIds?: readonly string[];
}

interface PerimeterSourceSampleSet {
    source: PerimeterSource;
    samples: PerimeterFieldDebugSample[];
}

interface CachedPerimeterSourceData {
    sources: readonly PerimeterSource[];
    sampleSets: readonly PerimeterSourceSampleSet[];
    flattenedSamples: readonly PerimeterFieldDebugSample[];
}

const perimeterSourceCache = new Map<string, CachedPerimeterSourceData>();

function finalizeBuiltScene(
    builtScene: PerimeterFieldBuiltScene,
    detail?: Record<string, unknown>,
): PerimeterFieldBuiltScene {
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldScene',
        stage: 'scene_build',
        from: 'Perimeter samples + transition state',
        to: 'MetaballSceneInput',
        purpose: 'Assemble shared renderer scene for perimeter-field mode',
        summary: summarizeScene(builtScene.sceneInput),
        perfEventName: 'territory.perimeterField.sceneBuilt',
        detail,
    });
    return builtScene;
}

function readNumber(input: RenderFamilyInput, key: string, fallback: number): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readString(input: RenderFamilyInput, key: string, fallback: string): string {
    const value = input.tunables.get(key);
    return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readBoolean(input: RenderFamilyInput, key: string, fallback: boolean): boolean {
    const value = input.tunables.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function sortSamplesByStableKey<T extends MetaballInfluenceSample>(samples: readonly T[]): T[] {
    return [...samples].sort((a, b) => {
        const idA = a.id ?? '';
        const idB = b.id ?? '';
        if (idA !== idB) return idA.localeCompare(idB);
        if (a.playerIdx !== b.playerIdx) return a.playerIdx - b.playerIdx;
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
    });
}

function buildOwnerClusterKey(ownerToCluster: ReadonlyMap<string, number>): string {
    return [...ownerToCluster.entries()]
        .sort(([ownerA], [ownerB]) => ownerA.localeCompare(ownerB))
        .map(([ownerId, clusterIdx]) => `${ownerId}:${clusterIdx}`)
        .join('|');
}

function buildGeometryCacheKey(geometry: CanonicalGeometrySnapshot): string {
    const shellLoopKey = geometry.shellLoops
        .map(
            (loop) =>
                `${loop.shellLoopId}:${loop.ownerId}:${loop.points
                    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
                    .join(';')}`,
        )
        .join('|');
    const regionKey = geometry.territoryRegions
        .map(
            (region) =>
                `${region.regionId}:${region.ownerId}:${region.points
                    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
                    .join(';')}`,
        )
        .join('|');
    return `${geometry.version}::${shellLoopKey}::${regionKey}`;
}

function polygonArea(points: ReadonlyArray<[number, number]>): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return area * 0.5;
}

function rotateLoopToAnchor(points: ReadonlyArray<[number, number]>): [number, number][] {
    if (points.length <= 1) return [...points];
    let bestIndex = 0;
    for (let i = 1; i < points.length; i++) {
        const [bestX, bestY] = points[bestIndex]!;
        const [x, y] = points[i]!;
        if (y < bestY || (y === bestY && x < bestX)) {
            bestIndex = i;
        }
    }
    return [...points.slice(bestIndex), ...points.slice(0, bestIndex)];
}

function sampleClosedLoop(points: ReadonlyArray<[number, number]>, spacing: number): [number, number][] {
    if (points.length < 3) return [...points];
    const loop = rotateLoopToAnchor(points);
    const closed = [...loop, loop[0]!];
    const cumulative = [0];
    let total = 0;
    for (let i = 0; i < closed.length - 1; i++) {
        const [ax, ay] = closed[i]!;
        const [bx, by] = closed[i + 1]!;
        total += Math.hypot(bx - ax, by - ay);
        cumulative.push(total);
    }
    if (total <= 1e-6) return [...loop];
    const count = Math.max(3, Math.round(total / Math.max(4, spacing)));
    const samples: [number, number][] = [];
    for (let i = 0; i < count; i++) {
        const target = (i / count) * total;
        let seg = 0;
        while (seg < cumulative.length - 2 && cumulative[seg + 1]! < target) {
            seg += 1;
        }
        const spanStart = cumulative[seg]!;
        const spanEnd = cumulative[seg + 1]!;
        const t = spanEnd > spanStart ? (target - spanStart) / (spanEnd - spanStart) : 0;
        const [ax, ay] = closed[seg]!;
        const [bx, by] = closed[seg + 1]!;
        samples.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    return samples;
}

function pointInPolygon(x: number, y: number, points: ReadonlyArray<[number, number]>): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]!;
        const [xj, yj] = points[j]!;
        const intersects =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

function regionCentroid(points: ReadonlyArray<[number, number]>): [number, number] {
    let x = 0;
    let y = 0;
    for (const [px, py] of points) {
        x += px;
        y += py;
    }
    const count = Math.max(1, points.length);
    return [x / count, y / count];
}

function offsetSampleInsideLoop(params: {
    point: [number, number];
    prevPoint: [number, number];
    nextPoint: [number, number];
    polygon: ReadonlyArray<[number, number]>;
    offsetPx: number;
}): [number, number] {
    if (params.offsetPx <= 0) return params.point;

    const tangentX = params.nextPoint[0] - params.prevPoint[0];
    const tangentY = params.nextPoint[1] - params.prevPoint[1];
    const tangentLength = Math.hypot(tangentX, tangentY);
    if (tangentLength <= 1e-6) return params.point;

    const normalX = -tangentY / tangentLength;
    const normalY = tangentX / tangentLength;
    const candidateA: [number, number] = [
        params.point[0] + normalX * params.offsetPx,
        params.point[1] + normalY * params.offsetPx,
    ];
    const candidateB: [number, number] = [
        params.point[0] - normalX * params.offsetPx,
        params.point[1] - normalY * params.offsetPx,
    ];
    const insideA = pointInPolygon(candidateA[0], candidateA[1], params.polygon);
    const insideB = pointInPolygon(candidateB[0], candidateB[1], params.polygon);

    if (insideA && !insideB) return candidateA;
    if (insideB && !insideA) return candidateB;
    if (insideA && insideB) {
        const [cx, cy] = regionCentroid(params.polygon);
        const distA = Math.hypot(candidateA[0] - cx, candidateA[1] - cy);
        const distB = Math.hypot(candidateB[0] - cx, candidateB[1] - cy);
        return distA <= distB ? candidateA : candidateB;
    }
    return params.point;
}

function listPerimeterSources(
    geometry: CanonicalGeometrySnapshot,
): PerimeterSource[] {
    const shellStarIdsById = new Map(
        geometry.shells.map((shell) => [shell.shellId, shell.starIds] as const),
    );
    const shellLoops = geometry.shellLoops
        .filter((loop) => loop.classification === 'outer' && Boolean(loop.ownerId))
        .sort((a, b) => {
            if (a.ownerId !== b.ownerId) return a.ownerId.localeCompare(b.ownerId);
            return a.shellLoopId.localeCompare(b.shellLoopId);
        });

    if (shellLoops.length > 0) {
        return shellLoops.map((loop) => ({
            ownerId: loop.ownerId,
            sourceId: loop.shellLoopId,
            points: loop.points,
            starIds: loop.starIds ?? (loop.shellId ? shellStarIdsById.get(loop.shellId) : undefined),
        }));
    }

    return [...geometry.territoryRegions]
        .filter((region) => Boolean(region.ownerId))
        .sort((a, b) => {
            if (a.ownerId !== b.ownerId) {
                return a.ownerId.localeCompare(b.ownerId);
            }
            return a.regionId.localeCompare(b.regionId);
        })
        .map((region) => ({
            ownerId: region.ownerId,
            sourceId: region.regionId,
            points: region.points,
            starIds: region.starIds,
        }));
}

function findStarAnchoredPerimeterSource(
    sources: readonly PerimeterSource[],
    ownerId: string,
    starId: string,
    x: number,
    y: number,
): PerimeterSource | null {
    const ownerSources = sources.filter((source) => source.ownerId === ownerId);
    const starAnchoredSources = ownerSources.filter((source) =>
        source.starIds?.includes(starId),
    );
    for (const source of starAnchoredSources) {
        if (pointInPolygon(x, y, source.points)) {
            return source;
        }
    }
    if (starAnchoredSources.length === 1) {
        return starAnchoredSources[0]!;
    }
    if (starAnchoredSources.length > 1) {
        return starAnchoredSources[0]!;
    }
    for (const source of ownerSources) {
        if (pointInPolygon(x, y, source.points)) {
            return source;
        }
    }
    return null;
}

function buildOwnerClusterScene(
    stars: ReadonlyArray<StarState>,
    colorUtils: ColorUtils,
    extraOwners: ReadonlyArray<string> = [],
): {
    ownedStars: ReadonlyArray<StarState>;
    clusterMap: ReadonlyMap<string, OwnerClusterInfo>;
    playerColors: ReadonlyArray<readonly [number, number, number]>;
    clusterShips: ReadonlyArray<number>;
    ownerToCluster: ReadonlyMap<string, number>;
} {
    const ownedStars = stars
        .filter((star) => Boolean(star.ownerId))
        .sort((a, b) => a.id.localeCompare(b.id));
    const owners = [...new Set([
        ...ownedStars.map((star) => star.ownerId!),
        ...extraOwners.filter(Boolean),
    ])].sort();
    const ownerToCluster = new Map<string, number>();
    const playerColors: [number, number, number][] = [];
    const clusterShips: number[] = [];
    const clusterMap = new Map<string, OwnerClusterInfo>();

    owners.forEach((ownerId, index) => {
        ownerToCluster.set(ownerId, index);
        const color = colorUtils.getPlayerColor(ownerId);
        playerColors[index] = [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
        clusterShips[index] = 0;
    });

    for (const star of ownedStars) {
        const clusterIdx = ownerToCluster.get(star.ownerId!) ?? 0;
        clusterMap.set(star.id, { clusterIdx, ownerId: star.ownerId! });
        clusterShips[clusterIdx] += (star.activeShips ?? 0) + (star.damagedShips ?? 0);
    }

    return { ownedStars, clusterMap, playerColors, clusterShips, ownerToCluster };
}

function buildPerimeterSourceSampleSets(params: {
    sources: readonly PerimeterSource[];
    ownerToCluster: ReadonlyMap<string, number>;
    spacing: number;
    offsetPx: number;
    strength: number;
    debugState: 'static' | 'target';
    colorUtils: ColorUtils;
}): PerimeterSourceSampleSet[] {
    const sampleSets: PerimeterSourceSampleSet[] = [];
    for (const source of params.sources) {
        const playerIdx = params.ownerToCluster.get(source.ownerId);
        if (playerIdx === undefined || Math.abs(polygonArea(source.points)) <= 1e-3) continue;
        const sampled = sampleClosedLoop(source.points, params.spacing);
        const samples: PerimeterFieldDebugSample[] = [];
        for (let i = 0; i < sampled.length; i++) {
            const [x, y] = offsetSampleInsideLoop({
                point: sampled[i]!,
                prevPoint: sampled[(i + sampled.length - 1) % sampled.length]!,
                nextPoint: sampled[(i + 1) % sampled.length]!,
                polygon: source.points,
                offsetPx: params.offsetPx,
            });
            samples.push({
                id: `perimeter:${source.sourceId}:${i}`,
                x,
                y,
                playerIdx,
                strength: params.strength,
                ownerId: source.ownerId,
                ownerColor: params.colorUtils.getPlayerColor(source.ownerId),
                sourceId: source.sourceId,
                starIds: source.starIds,
                sampleIndex: i,
                debugState: params.debugState,
            });
        }
        sampleSets.push({ source, samples });
    }
    return sampleSets;
}

function flattenPerimeterSampleSets(
    sampleSets: readonly PerimeterSourceSampleSet[],
): PerimeterFieldDebugSample[] {
    return sampleSets.flatMap((sampleSet) => sampleSet.samples);
}

function buildPerimeterSourceCacheKey(params: {
    geometry: CanonicalGeometrySnapshot;
    ownerToCluster: ReadonlyMap<string, number>;
    spacing: number;
    offsetPx: number;
    strength: number;
    debugState: 'static' | 'target';
}): string {
    return [
        buildGeometryCacheKey(params.geometry),
        params.spacing.toFixed(3),
        params.offsetPx.toFixed(3),
        params.strength.toFixed(3),
        params.debugState,
        buildOwnerClusterKey(params.ownerToCluster),
    ].join('::');
}

function getCachedPerimeterSourceData(params: {
    geometry: CanonicalGeometrySnapshot;
    ownerToCluster: ReadonlyMap<string, number>;
    spacing: number;
    offsetPx: number;
    strength: number;
    debugState: 'static' | 'target';
    colorUtils: ColorUtils;
}): CachedPerimeterSourceData {
    const cacheKey = buildPerimeterSourceCacheKey(params);
    const cached = perimeterSourceCache.get(cacheKey);
    if (cached) {
        logPipelineStage({
            channel: 'renderer',
            context: 'PerimeterFieldScene',
            stage: 'source_cache_hit',
            from: 'Geometry + perimeter sampling tunables',
            to: 'Cached perimeter source samples',
            purpose: 'Reuse stable perimeter sampling output when geometry and tunables are unchanged',
            summary: summarizePerimeterSourceData(cached),
            perfEventName: 'territory.perimeterField.sourceCacheHit',
            detail: {
                cacheKey,
                geometryVersion: params.geometry.version,
                debugState: params.debugState,
            },
            logDetail: {
                cacheKey,
                geometry: params.geometry,
                ownerToCluster: Object.fromEntries(params.ownerToCluster.entries()),
                spacing: params.spacing,
                offsetPx: params.offsetPx,
                strength: params.strength,
                debugState: params.debugState,
                cachedSources: cached.sources,
                cachedSampleSets: cached.sampleSets,
                cachedFlattenedSamples: cached.flattenedSamples,
            },
        });
        return cached;
    }

    const sources = listPerimeterSources(params.geometry);
    const sampleSets = buildPerimeterSourceSampleSets({
        sources,
        ownerToCluster: params.ownerToCluster,
        spacing: params.spacing,
        offsetPx: params.offsetPx,
        strength: params.strength,
        debugState: params.debugState,
        colorUtils: params.colorUtils,
    });
    const built: CachedPerimeterSourceData = {
        sources,
        sampleSets,
        flattenedSamples: flattenPerimeterSampleSets(sampleSets),
    };
    perimeterSourceCache.set(cacheKey, built);
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldScene',
        stage: 'source_cache_miss',
        from: 'Geometry + perimeter sampling tunables',
        to: 'New perimeter source samples',
        purpose: 'Sample perimeter-field region loops into reusable source sets for scene construction',
        summary: summarizePerimeterSourceData(built),
        perfEventName: 'territory.perimeterField.sourceCacheMiss',
        detail: {
            cacheKey,
            geometryVersion: params.geometry.version,
            debugState: params.debugState,
        },
        logDetail: {
            cacheKey,
            geometry: params.geometry,
            ownerToCluster: Object.fromEntries(params.ownerToCluster.entries()),
            spacing: params.spacing,
            offsetPx: params.offsetPx,
            strength: params.strength,
            debugState: params.debugState,
            sources,
            sampleSets,
            flattenedSamples: built.flattenedSamples,
        },
    });
    return built;
}

function normalizeAngle(value: number): number {
    const twoPi = Math.PI * 2;
    let angle = value % twoPi;
    if (angle < 0) angle += twoPi;
    return angle;
}

function circularAngleDistance(a: number, b: number): number {
    const delta = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return Math.min(delta, Math.PI * 2 - delta);
}

function sampleAngleAboutPoint(
    sample: { x: number; y: number },
    originX: number,
    originY: number,
): number {
    return normalizeAngle(Math.atan2(sample.y - originY, sample.x - originX));
}

function findClosestSampleByAngle(params: {
    candidates: readonly PerimeterFieldDebugSample[];
    originX: number;
    originY: number;
    targetSample: PerimeterFieldDebugSample;
}): PerimeterFieldDebugSample | null {
    const targetAngle = sampleAngleAboutPoint(
        params.targetSample,
        params.originX,
        params.originY,
    );
    let bestSample: PerimeterFieldDebugSample | null = null;
    let bestDistance = Infinity;
    for (const candidate of params.candidates) {
        const angleDistance = circularAngleDistance(
            targetAngle,
            sampleAngleAboutPoint(candidate, params.originX, params.originY),
        );
        if (
            angleDistance < bestDistance - 1e-6 ||
            (Math.abs(angleDistance - bestDistance) <= 1e-6 &&
                (bestSample == null ||
                    (candidate.sampleIndex ?? 0) < (bestSample.sampleIndex ?? 0)))
        ) {
            bestSample = candidate;
            bestDistance = angleDistance;
        }
    }
    return bestSample;
}

function buildTransitionSamples(params: {
    input: RenderFamilyInput;
    oldSources: readonly PerimeterSource[];
    newSources: readonly PerimeterSource[];
    oldSourceSampleSets: readonly PerimeterSourceSampleSet[];
    newSourceSampleSets: readonly PerimeterSourceSampleSet[];
    oldFade: number;
    newGrow: number;
}): {
    transitionSamples: PerimeterFieldDebugSample[];
    excludedStaticSampleIds: ReadonlySet<string>;
} {
    const activeTransition = params.input.activeTransition;
    if (!activeTransition) {
        return {
            transitionSamples: [],
            excludedStaticSampleIds: new Set<string>(),
        };
    }
    const transitionSamples: PerimeterFieldDebugSample[] = [];
    const excludedStaticSampleIds = new Set<string>();
    const progress = clamp01(activeTransition.progress);

    for (const eventEntry of activeTransition.events) {
        const conquest = eventEntry.event;
        const targetStar = params.input.stars.find((star) => star.id === conquest.starId);
        if (!targetStar || !conquest.previousOwner || !conquest.newOwner) continue;
        const oldSource = findStarAnchoredPerimeterSource(
            params.oldSources,
            conquest.previousOwner,
            conquest.starId,
            targetStar.x,
            targetStar.y,
        );
        const newSource = findStarAnchoredPerimeterSource(
            params.newSources,
            conquest.newOwner,
            conquest.starId,
            targetStar.x,
            targetStar.y,
        );
        if (!oldSource || !newSource) {
            continue;
        }

        const oldSampleSet = params.oldSourceSampleSets.find(
            (sampleSet) =>
                sampleSet.source.ownerId === oldSource.ownerId &&
                sampleSet.source.sourceId === oldSource.sourceId,
        );
        const newSampleSet = params.newSourceSampleSets.find(
            (sampleSet) =>
                sampleSet.source.ownerId === newSource.ownerId &&
                sampleSet.source.sourceId === newSource.sourceId,
        );
        if (!oldSampleSet || !newSampleSet) continue;

        for (const sample of oldSampleSet.samples) {
            if (sample.id) excludedStaticSampleIds.add(sample.id);
        }

        for (const oldSample of oldSampleSet.samples) {
            const matchedNewSample = findClosestSampleByAngle({
                candidates: newSampleSet.samples,
                originX: targetStar.x,
                originY: targetStar.y,
                targetSample: oldSample,
            });
            if (!matchedNewSample) continue;

            transitionSamples.push({
                ...oldSample,
                id: `transition:old:${conquest.previousOwner}:${conquest.starId}:${oldSource.sourceId}:${oldSample.sampleIndex ?? 0}`,
                x:
                    oldSample.x +
                    (matchedNewSample.x - oldSample.x) * progress,
                y:
                    oldSample.y +
                    (matchedNewSample.y - oldSample.y) * progress,
                strength:
                    oldSample.strength *
                    Math.max(0, params.oldFade) *
                    (1 - progress),
                pathStartX: oldSample.x,
                pathStartY: oldSample.y,
                pathEndX: matchedNewSample.x,
                pathEndY: matchedNewSample.y,
                debugState: 'transition-old',
                startFallback: false,
                endFallback: false,
            });
        }

        for (const newSample of newSampleSet.samples) {
            const matchedOldSample = findClosestSampleByAngle({
                candidates: oldSampleSet.samples,
                originX: targetStar.x,
                originY: targetStar.y,
                targetSample: newSample,
            });
            if (!matchedOldSample) continue;

            transitionSamples.push({
                ...newSample,
                id: `transition:new:${conquest.newOwner}:${conquest.starId}:${newSource.sourceId}:${newSample.sampleIndex ?? 0}`,
                x:
                    matchedOldSample.x +
                    (newSample.x - matchedOldSample.x) * progress,
                y:
                    matchedOldSample.y +
                    (newSample.y - matchedOldSample.y) * progress,
                strength:
                    newSample.strength *
                    Math.max(0, params.newGrow) *
                    progress,
                pathStartX: matchedOldSample.x,
                pathStartY: matchedOldSample.y,
                pathEndX: newSample.x,
                pathEndY: newSample.y,
                debugState: 'transition-new',
                startFallback: false,
                endFallback: false,
            });
        }
    }

    return { transitionSamples, excludedStaticSampleIds };
}

function buildPerimeterDebugSampleFromV(params: {
    v: PerimeterV;
    colorUtils: ColorUtils;
    debugState: PerimeterFieldDebugSample['debugState'];
    transitionRole?: TransitionRole;
    label?: string;
    strength?: number;
}): PerimeterFieldDebugSample {
    return {
        id: params.v.id,
        x: params.v.x,
        y: params.v.y,
        playerIdx: params.v.playerIdx,
        strength: params.strength ?? params.v.strength,
        ownerId: params.v.ownerId,
        ownerColor: params.colorUtils.getPlayerColor(params.v.ownerId),
        sourceId: params.v.loopId,
        vId: params.v.id,
        transitionRole: params.transitionRole,
        label: params.label,
        debugState: params.debugState,
    };
}

function collectGeometryOwners(geometry: CanonicalGeometrySnapshot): string[] {
    return [...new Set([
        ...geometry.territoryRegions.map((region) => region.ownerId),
        ...geometry.shellLoops.map((loop) => loop.ownerId),
    ])].filter(Boolean);
}

function collectPlanOwners(plan: TransitionPlan | null | undefined): string[] {
    if (!plan) return [];
    return [...new Set([
        ...plan.prevVSet.map((v) => v.ownerId),
        ...plan.nextVSet.map((v) => v.ownerId),
        ...plan.movers.flatMap((mover) => [mover.prevOwnerId, mover.nextOwnerId]),
    ])].filter(Boolean);
}

function buildPlanScene(params: {
    input: RenderFamilyInput;
    starsForDisplay: ReadonlyArray<StarState>;
    geometry: CanonicalGeometrySnapshot;
    transitionPlan: TransitionPlan | null;
    colorUtils: ColorUtils;
    spacing: number;
    offsetPx: number;
    strength: number;
    geometrySource: string;
    freezeBase: boolean;
}): PerimeterFieldBuiltScene {
    const extraOwners = [
        ...collectGeometryOwners(params.geometry),
        ...collectPlanOwners(params.transitionPlan),
    ];
    const clusterScene = buildOwnerClusterScene(
        params.starsForDisplay,
        params.colorUtils,
        extraOwners,
    );

    const currentVs = sampleVSetFromGeometry({
        geometry: params.geometry,
        options: {
            spacing: params.spacing,
            offsetPx: params.offsetPx,
            strength: params.strength,
            ownerToCluster: clusterScene.ownerToCluster,
        },
    });
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldScene',
        stage: 'plan_scene_input',
        from: 'Geometry + transition plan',
        to: 'Perimeter plan-scene sampling',
        purpose: 'Assemble plan-engine V-set inputs before shared renderer scene construction',
        summary:
            `${summarizePerimeterVSet(currentVs)} ` +
            summarizeTransitionPlan(params.transitionPlan ?? {}),
        perfEventName: 'territory.perimeterField.planSceneInputBuilt',
        detail: {
            geometryVersion: params.geometry.version,
            hasTransitionPlan: Boolean(params.transitionPlan),
            freezeBase: params.freezeBase,
            geometrySource: params.geometrySource,
        },
        logDetail: {
            geometry: params.geometry,
            geometrySource: params.geometrySource,
            freezeBase: params.freezeBase,
            transitionPlan: params.transitionPlan,
            currentVs,
            clusterScene: {
                ownedStars: clusterScene.ownedStars,
                clusterMap: Object.fromEntries(clusterScene.clusterMap.entries()),
                ownerToCluster: Object.fromEntries(clusterScene.ownerToCluster.entries()),
                playerColors: clusterScene.playerColors,
                clusterShips: clusterScene.clusterShips,
            },
        },
    });

    if (!params.transitionPlan) {
        const staticSamples = currentVs.map((v, index) =>
            buildPerimeterDebugSampleFromV({
                v,
                colorUtils: params.colorUtils,
                debugState: 'static',
                transitionRole: 'static',
                label: `S${String(index).padStart(2, '0')}`,
            }),
        );
        const visibleStaticSamples = sortSamplesByStableKey(
            staticSamples.filter((sample) => sample.strength > 1e-6),
        );
        return {
            sceneInput: {
                ownedStars: clusterScene.ownedStars,
                clusterMap: clusterScene.clusterMap,
                playerColors: clusterScene.playerColors,
                clusterShips: clusterScene.clusterShips,
                staticSamples: visibleStaticSamples,
                dynamicSamples: [],
                samples: visibleStaticSamples,
                staticFingerprint: buildSceneFingerprint(
                    visibleStaticSamples,
                    clusterScene.playerColors,
                    clusterScene.clusterShips,
                ),
                dynamicFingerprint: '',
                sceneFingerprint: `${params.geometrySource}:${params.freezeBase ? 1 : 0}:${buildSceneFingerprint(
                    visibleStaticSamples,
                    clusterScene.playerColors,
                    clusterScene.clusterShips,
                )}`,
                fingerprint: `${params.geometrySource}:${params.freezeBase ? 1 : 0}:${buildSceneFingerprint(
                    visibleStaticSamples,
                    clusterScene.playerColors,
                    clusterScene.clusterShips,
                )}`,
                influenceRadiusPx: readNumber(
                    params.input,
                    'PERIMETER_FIELD_INFLUENCE_RADIUS',
                    GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_RADIUS ?? 52,
                ),
                ownershipMarginPx: 0,
            },
            debug: {
                displayGeometry: params.geometry,
                transitionTargetGeometry: null,
                playerColors: clusterScene.playerColors,
                staticSamples,
                targetStaticSamples: [],
                transitionSamples: [],
                effectiveProgress: null,
                transitionPlan: null,
            },
        };
    }

    const plan = params.transitionPlan;
    const progress = clamp01(params.input.activeTransition?.progress ?? 0);
    const changedLoopIds = new Set<string>([
        ...plan.prevVSet
            .filter((v) => plan.changedSections.removedSectionIds.has(v.sectionId))
            .map((v) => v.loopId),
        ...plan.nextVSet
            .filter((v) => plan.changedSections.addedSectionIds.has(v.sectionId))
            .map((v) => v.loopId),
    ]);

    const staticSamples = plan.nextVSet
        .filter((v) => plan.changedSections.unchangedSectionIds.has(v.sectionId))
        .map((v, index) => {
            const role: TransitionRole = changedLoopIds.has(v.loopId) ? 'preserved' : 'static';
            return buildPerimeterDebugSampleFromV({
                v,
                colorUtils: params.colorUtils,
                debugState: role === 'preserved' ? 'preserved' : 'static',
                transitionRole: role,
                label: `${role === 'preserved' ? 'K' : 'S'}${String(index).padStart(2, '0')}`,
            });
        });

    const targetStaticSamples = plan.nextVSet.map((v, index) =>
        buildPerimeterDebugSampleFromV({
            v,
            colorUtils: params.colorUtils,
            debugState: 'target',
            transitionRole: plan.changedSections.unchangedSectionIds.has(v.sectionId)
                ? changedLoopIds.has(v.loopId)
                    ? 'preserved'
                    : 'static'
                : 'appearing',
            label: `T${String(index).padStart(2, '0')}`,
        }),
    );

    const transitionSamples: PerimeterFieldDebugSample[] = [];
    for (const mover of plan.movers) {
        const position = evaluateTransitionMoverPosition(mover, progress);
        const useNextOwner =
            mover.prevOwnerId === mover.nextOwnerId ? true : progress >= 0.5;
        const ownerId = useNextOwner ? mover.nextOwnerId : mover.prevOwnerId;
        const playerIdx = useNextOwner ? mover.nextPlayerIdx : mover.prevPlayerIdx;
        transitionSamples.push({
            id: `transition:${mover.moverId}`,
            x: position.x,
            y: position.y,
            playerIdx,
            strength: mover.strength,
            ownerId,
            ownerColor: params.colorUtils.getPlayerColor(ownerId),
            moverId: mover.moverId,
            transitionRole: 'mover',
            label: mover.moverId,
            pathStartX: mover.prevPos.x,
            pathStartY: mover.prevPos.y,
            pathEndX: mover.nextPos.x,
            pathEndY: mover.nextPos.y,
            debugState: 'mover',
        });
    }
    for (const [index, appearing] of plan.appearing.entries()) {
        transitionSamples.push({
            ...buildPerimeterDebugSampleFromV({
                v: appearing.v,
                colorUtils: params.colorUtils,
                debugState: 'appearing',
                transitionRole: 'appearing',
                label: `A${String(index).padStart(2, '0')}`,
                strength: appearing.v.strength * progress,
            }),
            id: `appearing:${appearing.v.id}`,
        });
    }
    for (const [index, disappearing] of plan.disappearing.entries()) {
        transitionSamples.push({
            ...buildPerimeterDebugSampleFromV({
                v: disappearing.v,
                colorUtils: params.colorUtils,
                debugState: 'disappearing',
                transitionRole: 'disappearing',
                label: `D${String(index).padStart(2, '0')}`,
                strength: disappearing.v.strength * (1 - progress),
            }),
            id: `disappearing:${disappearing.v.id}`,
        });
    }

    const endpointSamples =
        progress <= 1e-6
            ? plan.prevVSet.map((v, index) =>
                  buildPerimeterDebugSampleFromV({
                      v,
                      colorUtils: params.colorUtils,
                      debugState: 'transition-old',
                      transitionRole: plan.changedSections.unchangedSectionIds.has(v.sectionId)
                          ? changedLoopIds.has(v.loopId)
                              ? 'preserved'
                              : 'static'
                          : 'disappearing',
                      label: `O${String(index).padStart(2, '0')}`,
                  }),
              )
            : progress >= 1 - 1e-6
              ? plan.nextVSet.map((v, index) =>
                    buildPerimeterDebugSampleFromV({
                        v,
                        colorUtils: params.colorUtils,
                        debugState: 'transition-new',
                        transitionRole: plan.changedSections.unchangedSectionIds.has(v.sectionId)
                            ? changedLoopIds.has(v.loopId)
                                ? 'preserved'
                                : 'static'
                            : 'appearing',
                        label: `N${String(index).padStart(2, '0')}`,
                    }),
                )
              : null;

    const visibleStaticSamples = sortSamplesByStableKey(
        staticSamples.filter((sample) => sample.strength > 1e-6),
    );
    const visibleTransitionSamples = sortSamplesByStableKey(
        transitionSamples.filter((sample) => sample.strength > 1e-6),
    );
    const endpointVisibleSamples = endpointSamples
        ? sortSamplesByStableKey(
              endpointSamples.filter((sample) => sample.strength > 1e-6),
          )
        : null;
    const samples =
        endpointVisibleSamples ??
        sortSamplesByStableKey([
            ...visibleStaticSamples,
            ...visibleTransitionSamples,
        ]);
    const staticSceneSamples = endpointVisibleSamples ?? visibleStaticSamples;
    const dynamicSceneSamples = endpointVisibleSamples ? [] : visibleTransitionSamples;
    const staticFingerprint = buildSceneFingerprint(
        staticSceneSamples,
        clusterScene.playerColors,
        clusterScene.clusterShips,
    );
    const dynamicFingerprint =
        dynamicSceneSamples.length > 0
            ? buildSceneFingerprint(
                  dynamicSceneSamples,
                  clusterScene.playerColors,
                  clusterScene.clusterShips,
              )
            : '';

    return {
        sceneInput: {
            ownedStars: clusterScene.ownedStars,
            clusterMap: clusterScene.clusterMap,
            playerColors: clusterScene.playerColors,
            clusterShips: clusterScene.clusterShips,
            staticSamples: staticSceneSamples,
            dynamicSamples: dynamicSceneSamples,
            samples,
            staticFingerprint,
            dynamicFingerprint,
            sceneFingerprint: `${params.geometrySource}:${params.freezeBase ? 1 : 0}:${staticFingerprint}::${dynamicFingerprint}`,
            fingerprint: `${params.geometrySource}:${params.freezeBase ? 1 : 0}:${staticFingerprint}::${dynamicFingerprint}`,
            influenceRadiusPx: readNumber(
                params.input,
                'PERIMETER_FIELD_INFLUENCE_RADIUS',
                GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_RADIUS ?? 52,
            ),
            ownershipMarginPx: 0,
        },
        debug: {
            displayGeometry: params.geometry,
            transitionTargetGeometry: plan.nextGeometry,
            playerColors: clusterScene.playerColors,
            staticSamples,
            targetStaticSamples,
            transitionSamples,
            effectiveProgress: progress,
            transitionPlan: plan,
        },
    };
}

export function buildPerimeterFieldScene(params: {
    input: RenderFamilyInput;
    starsForDisplay: ReadonlyArray<StarState>;
    geometry: CanonicalGeometrySnapshot;
    transitionTargetGeometry?: CanonicalGeometrySnapshot | null;
    transitionPlan?: TransitionPlan | null;
    colorUtils: ColorUtils;
}): PerimeterFieldBuiltScene {
    const spacing = readNumber(
        params.input,
        'PERIMETER_FIELD_SAMPLE_SPACING',
        GAME_CONFIG.PERIMETER_FIELD_SAMPLE_SPACING ?? 28,
    );
    const offsetPx = Math.max(
        0,
        readNumber(
            params.input,
            'PERIMETER_FIELD_INWARD_OFFSET_PX',
            GAME_CONFIG.PERIMETER_FIELD_INWARD_OFFSET_PX ?? 10,
        ),
    );
    const strength = readNumber(
        params.input,
        'PERIMETER_FIELD_INFLUENCE_WEIGHT',
        GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_WEIGHT ?? 1.35,
    );
    const oldFade = readNumber(
        params.input,
        'PERIMETER_FIELD_OLD_BOUNDARY_FADE',
        GAME_CONFIG.PERIMETER_FIELD_OLD_BOUNDARY_FADE ?? 1,
    );
    const newGrow = readNumber(
        params.input,
        'PERIMETER_FIELD_NEW_BOUNDARY_GROW',
        GAME_CONFIG.PERIMETER_FIELD_NEW_BOUNDARY_GROW ?? 1,
    );
    const freezeBase = readBoolean(
        params.input,
        'PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION',
        GAME_CONFIG.PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION ?? true,
    );
    const geometrySource = readString(
        params.input,
        'PERIMETER_FIELD_GEOMETRY_SOURCE',
        GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ?? 'power_voronoi_0319',
    );
    const transitionEngine = readString(
        params.input,
        'PERIMETER_FIELD_TRANSITION_ENGINE',
        GAME_CONFIG.PERIMETER_FIELD_TRANSITION_ENGINE,
    );

    const canUsePlanEngine =
        transitionEngine === 'plan' &&
        (params.transitionPlan != null ||
            (!params.input.activeTransition && hasUsableFrontierTopology(params.geometry)));
    if (canUsePlanEngine) {
        return finalizeBuiltScene(buildPlanScene({
            input: params.input,
            starsForDisplay: params.starsForDisplay,
            geometry: params.geometry,
            transitionPlan: params.transitionPlan ?? null,
            colorUtils: params.colorUtils,
            spacing,
            offsetPx,
            strength,
            geometrySource,
            freezeBase,
        }), {
            transitionEngine,
            geometrySource,
            freezeBase,
        });
    }

    const clusterScene = buildOwnerClusterScene(params.starsForDisplay, params.colorUtils);
    const displaySourceData = getCachedPerimeterSourceData({
        geometry: params.geometry,
        ownerToCluster: clusterScene.ownerToCluster,
        spacing,
        offsetPx,
        strength,
        debugState: 'static',
        colorUtils: params.colorUtils,
    });
    const targetSourceData = params.transitionTargetGeometry
        ? getCachedPerimeterSourceData({
              geometry: params.transitionTargetGeometry,
              ownerToCluster: clusterScene.ownerToCluster,
              spacing,
              offsetPx,
              strength,
              debugState: 'target',
              colorUtils: params.colorUtils,
          })
        : null;
    const {
        transitionSamples,
        excludedStaticSampleIds,
    } =
        params.input.activeTransition && params.transitionTargetGeometry
            ? buildTransitionSamples({
                  input: params.input,
                  oldSources: displaySourceData.sources,
                  newSources: targetSourceData?.sources ?? [],
                  oldSourceSampleSets: displaySourceData.sampleSets,
                  newSourceSampleSets: targetSourceData?.sampleSets ?? [],
                  oldFade,
                  newGrow,
              })
            : {
                  transitionSamples: [],
                  excludedStaticSampleIds: new Set<string>(),
              };

    const staticSamples = displaySourceData.flattenedSamples.filter(
        (sample) => !sample.id || !excludedStaticSampleIds.has(sample.id),
    );
    const targetStaticSamples = targetSourceData?.flattenedSamples ?? [];
    const visibleStaticSamples = sortSamplesByStableKey(
        staticSamples.filter((sample) => sample.strength > 1e-6),
    );
    const visibleTransitionSamples = sortSamplesByStableKey(
        transitionSamples.filter((sample) => sample.strength > 1e-6),
    );
    const samples = sortSamplesByStableKey([
        ...visibleStaticSamples,
        ...visibleTransitionSamples,
    ]);
    const staticFingerprint = buildSceneFingerprint(
        visibleStaticSamples,
        clusterScene.playerColors,
        clusterScene.clusterShips,
    );
    const dynamicFingerprint =
        visibleTransitionSamples.length > 0
            ? buildSceneFingerprint(
                  visibleTransitionSamples,
                  clusterScene.playerColors,
                  clusterScene.clusterShips,
              )
            : '';

    return finalizeBuiltScene({
        sceneInput: {
            ownedStars: clusterScene.ownedStars,
            clusterMap: clusterScene.clusterMap,
            playerColors: clusterScene.playerColors,
            clusterShips: clusterScene.clusterShips,
            staticSamples: visibleStaticSamples,
            dynamicSamples: visibleTransitionSamples,
            samples,
            staticFingerprint,
            dynamicFingerprint,
            sceneFingerprint: `${geometrySource}:${freezeBase ? 1 : 0}:${staticFingerprint}::${dynamicFingerprint}`,
            fingerprint: `${geometrySource}:${freezeBase ? 1 : 0}:${staticFingerprint}::${dynamicFingerprint}`,
            influenceRadiusPx: readNumber(
                params.input,
                'PERIMETER_FIELD_INFLUENCE_RADIUS',
                GAME_CONFIG.PERIMETER_FIELD_INFLUENCE_RADIUS ?? 52,
            ),
            ownershipMarginPx: 0,
        },
        debug: {
            displayGeometry: params.geometry,
            transitionTargetGeometry: params.transitionTargetGeometry ?? null,
            playerColors: clusterScene.playerColors,
            staticSamples,
            targetStaticSamples,
            transitionSamples,
            effectiveProgress: params.input.activeTransition?.progress ?? null,
            transitionPlan: null,
        },
    }, {
        transitionEngine,
        geometrySource,
        freezeBase,
    });
}
