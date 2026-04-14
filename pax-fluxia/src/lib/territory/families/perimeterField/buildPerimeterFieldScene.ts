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

function findOwnerRegion(
    geometry: CanonicalGeometrySnapshot,
    ownerId: string,
    x: number,
    y: number,
): ReadonlyArray<[number, number]> | null {
    const regions = geometry.territoryRegions.filter((region) => region.ownerId === ownerId);
    for (const region of regions) {
        if (pointInPolygon(x, y, region.points)) {
            return region.points;
        }
    }
    let best: ReadonlyArray<[number, number]> | null = null;
    let bestDist = Infinity;
    for (const region of regions) {
        const [cx, cy] = regionCentroid(region.points);
        const dist = Math.hypot(cx - x, cy - y);
        if (dist < bestDist) {
            bestDist = dist;
            best = region.points;
        }
    }
    return best;
}

function raySegmentHit(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
): number | null {
    const sx = bx - ax;
    const sy = by - ay;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) <= 1e-9) return null;
    const rx = ax - ox;
    const ry = ay - oy;
    const t = (rx * sy - ry * sx) / denom;
    const u = (rx * dy - ry * dx) / denom;
    if (t < 0 || u < 0 || u > 1) return null;
    return t;
}

function rayPolygonHit(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    points: ReadonlyArray<[number, number]>,
): [number, number] | null {
    let bestT = Infinity;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        const hitT = raySegmentHit(ox, oy, dx, dy, ax, ay, bx, by);
        if (hitT !== null && hitT < bestT) {
            bestT = hitT;
        }
    }
    if (!Number.isFinite(bestT)) return null;
    return [ox + dx * bestT, oy + dy * bestT];
}

function offsetRayHitInside(
    hit: [number, number],
    origin: [number, number],
    offsetPx: number,
): [number, number] {
    if (offsetPx <= 0) return hit;
    const dx = hit[0] - origin[0];
    const dy = hit[1] - origin[1];
    const length = Math.hypot(dx, dy);
    if (length <= 1e-6) return hit;
    const inwardDistance = Math.max(0, length - offsetPx);
    const scale = inwardDistance / length;
    return [origin[0] + dx * scale, origin[1] + dy * scale];
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

function buildStaticPerimeterSamples(params: {
    geometry: CanonicalGeometrySnapshot;
    ownerToCluster: ReadonlyMap<string, number>;
    spacing: number;
    offsetPx: number;
    strength: number;
    debugState: 'static' | 'target';
    colorUtils: ColorUtils;
}): PerimeterFieldDebugSample[] {
    const loops = params.geometry.shellLoops
        .filter((loop) => loop.classification === 'outer' && Boolean(loop.ownerId))
        .sort((a, b) => {
            if (a.ownerId !== b.ownerId) return a.ownerId.localeCompare(b.ownerId);
            return a.shellLoopId.localeCompare(b.shellLoopId);
        });
    const perimeterSources =
        loops.length > 0
            ? loops.map((loop) => ({
                  ownerId: loop.ownerId,
                  sourceId: loop.shellLoopId,
                  points: loop.points,
              }))
            : [...params.geometry.territoryRegions]
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
                  }));

    const samples: PerimeterFieldDebugSample[] = [];
    for (const source of perimeterSources) {
        const playerIdx = params.ownerToCluster.get(source.ownerId);
        if (playerIdx === undefined || Math.abs(polygonArea(source.points)) <= 1e-3) continue;
        const sampled = sampleClosedLoop(source.points, params.spacing);
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
                sampleIndex: i,
                debugState: params.debugState,
            });
        }
    }
    return samples;
}

function buildTransitionSamples(params: {
    input: RenderFamilyInput;
    oldGeometry: CanonicalGeometrySnapshot;
    newGeometry: CanonicalGeometrySnapshot;
    ownerToCluster: ReadonlyMap<string, number>;
    offsetPx: number;
    strength: number;
    oldFade: number;
    newGrow: number;
    rayCount: number;
    colorUtils: ColorUtils;
}): PerimeterFieldDebugSample[] {
    const activeTransition = params.input.activeTransition;
    if (!activeTransition) return [];
    const samples: PerimeterFieldDebugSample[] = [];
    const progress = clamp01(activeTransition.progress);

    for (const eventEntry of activeTransition.events) {
        const conquest = eventEntry.event;
        const targetStar = params.input.stars.find((star) => star.id === conquest.starId);
        if (!targetStar || !conquest.previousOwner || !conquest.newOwner) continue;
        const oldRegion = findOwnerRegion(
            params.oldGeometry,
            conquest.previousOwner,
            targetStar.x,
            targetStar.y,
        );
        const newRegion = findOwnerRegion(
            params.newGeometry,
            conquest.newOwner,
            targetStar.x,
            targetStar.y,
        );
        const oldCluster = params.ownerToCluster.get(conquest.previousOwner);
        const newCluster = params.ownerToCluster.get(conquest.newOwner);
        if (!oldRegion || !newRegion || oldCluster === undefined || newCluster === undefined) {
            continue;
        }

        const rayCount = Math.max(8, Math.round(params.rayCount));
        for (let i = 0; i < rayCount; i++) {
            const theta = (Math.PI * 2 * i) / rayCount;
            const dx = Math.cos(theta);
            const dy = Math.sin(theta);
            const oldHitCandidate = rayPolygonHit(
                targetStar.x,
                targetStar.y,
                dx,
                dy,
                oldRegion,
            );
            const newHitCandidate = rayPolygonHit(
                targetStar.x,
                targetStar.y,
                dx,
                dy,
                newRegion,
            );
            const oldHit = oldHitCandidate ?? [targetStar.x, targetStar.y];
            const newHit = newHitCandidate ?? [targetStar.x, targetStar.y];
            const oldPoint = offsetRayHitInside(
                oldHit,
                [targetStar.x, targetStar.y],
                params.offsetPx,
            );
            const newPoint = offsetRayHitInside(
                newHit,
                [targetStar.x, targetStar.y],
                params.offsetPx,
            );
            const x = oldPoint[0] + (newPoint[0] - oldPoint[0]) * progress;
            const y = oldPoint[1] + (newPoint[1] - oldPoint[1]) * progress;

            samples.push({
                id: `transition:old:${conquest.previousOwner}:${conquest.starId}:${i}`,
                x,
                y,
                playerIdx: oldCluster,
                strength: params.strength * Math.max(0, params.oldFade) * (1 - progress),
                ownerId: conquest.previousOwner,
                ownerColor: params.colorUtils.getPlayerColor(conquest.previousOwner),
                sampleIndex: i,
                pathStartX: oldPoint[0],
                pathStartY: oldPoint[1],
                pathEndX: newPoint[0],
                pathEndY: newPoint[1],
                startFallback: oldHitCandidate == null,
                endFallback: newHitCandidate == null,
                debugState: 'transition-old',
            });
            samples.push({
                id: `transition:new:${conquest.newOwner}:${conquest.starId}:${i}`,
                x,
                y,
                playerIdx: newCluster,
                strength: params.strength * Math.max(0, params.newGrow) * progress,
                ownerId: conquest.newOwner,
                ownerColor: params.colorUtils.getPlayerColor(conquest.newOwner),
                sampleIndex: i,
                pathStartX: oldPoint[0],
                pathStartY: oldPoint[1],
                pathEndX: newPoint[0],
                pathEndY: newPoint[1],
                startFallback: oldHitCandidate == null,
                endFallback: newHitCandidate == null,
                debugState: 'transition-new',
            });
        }
    }

    return samples;
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
    const rayCount = readNumber(
        params.input,
        'PERIMETER_FIELD_TRANSITION_RAY_COUNT',
        GAME_CONFIG.PERIMETER_FIELD_TRANSITION_RAY_COUNT ?? 60,
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
    const staticSamples = buildStaticPerimeterSamples({
        geometry: params.geometry,
        ownerToCluster: clusterScene.ownerToCluster,
        spacing,
        offsetPx,
        strength,
        debugState: 'static',
        colorUtils: params.colorUtils,
    });
    const targetStaticSamples = params.transitionTargetGeometry
        ? buildStaticPerimeterSamples({
              geometry: params.transitionTargetGeometry,
              ownerToCluster: clusterScene.ownerToCluster,
              spacing,
              offsetPx,
              strength,
              debugState: 'target',
              colorUtils: params.colorUtils,
          })
        : [];
    const transitionSamples =
        params.input.activeTransition && params.transitionTargetGeometry
            ? buildTransitionSamples({
                  input: params.input,
                  oldGeometry: params.geometry,
                  newGeometry: params.transitionTargetGeometry,
                  ownerToCluster: clusterScene.ownerToCluster,
                  offsetPx,
                  strength,
                  oldFade,
                  newGrow,
                  rayCount,
                  colorUtils: params.colorUtils,
              })
            : [];

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
