import { GAME_CONFIG } from '../../../config/game.config';
import type { ColorUtils } from '../../../renderers/RenderContext';
import type {
    MetaballInfluenceSample,
    MetaballSceneInput,
} from '../../../renderers/MetaballRenderer';
import type { StarState } from '../../../types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import { buildSceneFingerprint } from '../metaball/metaballSceneBase';

type OwnerClusterInfo = { clusterIdx: number; ownerId: string };

export interface PerimeterFieldDebugSample extends MetaballInfluenceSample {
    ownerId: string;
    ownerColor: number;
    sourceId?: string;
    starIds?: readonly string[];
    sampleIndex?: number;
    pathStartX?: number;
    pathStartY?: number;
    pathEndX?: number;
    pathEndY?: number;
    startFallback?: boolean;
    endFallback?: boolean;
    debugState: 'static' | 'target' | 'transition-old' | 'transition-new';
}

export interface PerimeterFieldDebugSnapshot {
    displayGeometry: CanonicalGeometrySnapshot;
    transitionTargetGeometry: CanonicalGeometrySnapshot | null;
    playerColors: ReadonlyArray<readonly [number, number, number]>;
    staticSamples: ReadonlyArray<PerimeterFieldDebugSample>;
    targetStaticSamples: ReadonlyArray<PerimeterFieldDebugSample>;
    transitionSamples: ReadonlyArray<PerimeterFieldDebugSample>;
    effectiveProgress: number | null;
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

function sampleClosedLoop(
    points: ReadonlyArray<[number, number]>,
    spacing: number,
    countPerLoop = 0,
): [number, number][] {
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
    const count =
        countPerLoop > 0
            ? Math.max(3, Math.round(countPerLoop))
            : Math.max(3, Math.round(total / Math.max(4, spacing)));
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
    const owners = [...new Set(ownedStars.map((star) => star.ownerId!))].sort();
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
    countPerLoop: number;
    offsetPx: number;
    strength: number;
    debugState: 'static' | 'target';
    colorUtils: ColorUtils;
}): PerimeterSourceSampleSet[] {
    const sampleSets: PerimeterSourceSampleSet[] = [];
    for (const source of params.sources) {
        const playerIdx = params.ownerToCluster.get(source.ownerId);
        if (playerIdx === undefined || Math.abs(polygonArea(source.points)) <= 1e-3) continue;
        const sampled = sampleClosedLoop(
            source.points,
            params.spacing,
            params.countPerLoop,
        );
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

export function buildPerimeterFieldScene(params: {
    input: RenderFamilyInput;
    starsForDisplay: ReadonlyArray<StarState>;
    geometry: CanonicalGeometrySnapshot;
    transitionTargetGeometry?: CanonicalGeometrySnapshot | null;
    colorUtils: ColorUtils;
}): PerimeterFieldBuiltScene {
    const spacing = readNumber(
        params.input,
        'PERIMETER_FIELD_SAMPLE_SPACING',
        GAME_CONFIG.PERIMETER_FIELD_SAMPLE_SPACING ?? 28,
    );
    const countPerLoop = Math.max(
        0,
        Math.round(
            readNumber(
                params.input,
                'PERIMETER_FIELD_SAMPLE_COUNT_PER_LOOP',
                GAME_CONFIG.PERIMETER_FIELD_SAMPLE_COUNT_PER_LOOP ?? 0,
            ),
        ),
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

    const clusterScene = buildOwnerClusterScene(params.starsForDisplay, params.colorUtils);
    const displaySources = listPerimeterSources(params.geometry);
    const displaySampleSets = buildPerimeterSourceSampleSets({
        sources: displaySources,
        ownerToCluster: clusterScene.ownerToCluster,
        spacing,
        countPerLoop,
        offsetPx,
        strength,
        debugState: 'static',
        colorUtils: params.colorUtils,
    });
    const targetSources = params.transitionTargetGeometry
        ? listPerimeterSources(params.transitionTargetGeometry)
        : [];
    const targetSampleSets = params.transitionTargetGeometry
        ? buildPerimeterSourceSampleSets({
              sources: targetSources,
              ownerToCluster: clusterScene.ownerToCluster,
              spacing,
              countPerLoop,
              offsetPx,
              strength,
              debugState: 'target',
              colorUtils: params.colorUtils,
          })
        : [];
    const {
        transitionSamples,
        excludedStaticSampleIds,
    } =
        params.input.activeTransition && params.transitionTargetGeometry
            ? buildTransitionSamples({
                  input: params.input,
                  oldSources: displaySources,
                  newSources: targetSources,
                  oldSourceSampleSets: displaySampleSets,
                  newSourceSampleSets: targetSampleSets,
                  oldFade,
                  newGrow,
              })
            : {
                  transitionSamples: [],
                  excludedStaticSampleIds: new Set<string>(),
              };

    const staticSamples = flattenPerimeterSampleSets(displaySampleSets).filter(
        (sample) => !sample.id || !excludedStaticSampleIds.has(sample.id),
    );
    const targetStaticSamples = flattenPerimeterSampleSets(targetSampleSets);

    const samples = [...staticSamples, ...transitionSamples].sort((a, b) => {
        const idA = a.id ?? '';
        const idB = b.id ?? '';
        if (idA !== idB) return idA.localeCompare(idB);
        if (a.playerIdx !== b.playerIdx) return a.playerIdx - b.playerIdx;
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
    });

    return {
        sceneInput: {
            ownedStars: clusterScene.ownedStars,
            clusterMap: clusterScene.clusterMap,
            playerColors: clusterScene.playerColors,
            clusterShips: clusterScene.clusterShips,
            samples,
            fingerprint: `${geometrySource}:${freezeBase ? 1 : 0}:${buildSceneFingerprint(
                samples,
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
            transitionTargetGeometry: params.transitionTargetGeometry ?? null,
            playerColors: clusterScene.playerColors,
            staticSamples,
            targetStaticSamples,
            transitionSamples,
            effectiveProgress: params.input.activeTransition?.progress ?? null,
        },
    };
}
