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
import {
    hasUsableFrontierTopology,
    sampleVSetFromGeometry,
    evaluateTransitionMoverPosition,
} from './perimeterFieldPlanEngine';
import {
    listPerimeterGeometryLoops,
    type PerimeterGeometryLoop,
} from './perimeterFieldGeometryLoops';
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
    renderedSamples: ReadonlyArray<PerimeterFieldDebugSample>;
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

function readNumber(input: RenderFamilyInput, key: string, fallback: number): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readString(input: RenderFamilyInput, key: string, fallback: string): string {
    const value = input.tunables.get(key);
    return typeof value === 'string' && value.length > 0 ? value : fallback;
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

function listPerimeterSources(
    geometry: CanonicalGeometrySnapshot,
): PerimeterSource[] {
    return listPerimeterGeometryLoops(geometry).map((loop) => ({
        ownerId: loop.ownerId,
        sourceId: loop.loopId,
        points: loop.points,
        starIds: loop.starIds,
    }));
}

export { listPerimeterGeometryLoops } from './perimeterFieldGeometryLoops';
export type { PerimeterGeometryLoop } from './perimeterFieldGeometryLoops';

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

    if (!params.transitionPlan) {
        const canUsePlanSampler = hasUsableFrontierTopology(params.geometry);
        const staticSamples =
            params.geometry.sourceMethod === 'power_voronoi' && !canUsePlanSampler
                ? flattenPerimeterSampleSets(
                      buildPerimeterSourceSampleSets({
                          sources: listPerimeterSources(params.geometry),
                          ownerToCluster: clusterScene.ownerToCluster,
                          spacing: params.spacing,
                          offsetPx: params.offsetPx,
                          strength: params.strength,
                          debugState: 'static',
                          colorUtils: params.colorUtils,
                      }),
                  )
                : sampleVSetFromGeometry({
                      geometry: params.geometry,
                      options: {
                          spacing: params.spacing,
                          offsetPx: params.offsetPx,
                          strength: params.strength,
                          ownerToCluster: clusterScene.ownerToCluster,
                      },
                  }).map((v, index) =>
                      buildPerimeterDebugSampleFromV({
                          v,
                          colorUtils: params.colorUtils,
                          debugState: 'static',
                          transitionRole: 'static',
                          label: `S${String(index).padStart(2, '0')}`,
                      }),
                  );
        const visibleSamples = staticSamples.filter((sample) => sample.strength > 1e-6);
        return {
            sceneInput: {
                ownedStars: clusterScene.ownedStars,
                clusterMap: clusterScene.clusterMap,
                playerColors: clusterScene.playerColors,
                clusterShips: clusterScene.clusterShips,
                samples: visibleSamples,
                fingerprint: `${params.geometrySource}:${buildSceneFingerprint(
                    visibleSamples,
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
                renderedSamples: staticSamples,
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
    const selectedPrevSectionIds = plan.changedSections.selectedPrevSectionIds;
    const selectedNextSectionIds = plan.changedSections.selectedNextSectionIds;
    const preservedPrevIds = new Set(plan.preserved.map((pair) => pair.prevV.id));
    const preservedNextIds = new Set(plan.preserved.map((pair) => pair.nextV.id));
    const appearingIds = new Set(plan.appearing.map((entry) => entry.v.id));
    const disappearingIds = new Set(plan.disappearing.map((entry) => entry.v.id));

    const staticSamples = plan.nextVSet
        .filter((v) => !selectedNextSectionIds.has(v.sectionId))
        .map((v, index) => {
            return buildPerimeterDebugSampleFromV({
                v,
                colorUtils: params.colorUtils,
                debugState: 'static',
                transitionRole: 'static',
                label: `S${String(index).padStart(2, '0')}`,
            });
        });

    const targetStaticSamples = plan.nextVSet.map((v, index) =>
        buildPerimeterDebugSampleFromV({
            v,
            colorUtils: params.colorUtils,
            debugState: 'target',
            transitionRole: !selectedNextSectionIds.has(v.sectionId)
                ? 'static'
                : preservedNextIds.has(v.id)
                  ? 'preserved'
                  : appearingIds.has(v.id)
                    ? 'appearing'
                    : 'mover',
            label: `T${String(index).padStart(2, '0')}`,
        }),
    );

    const transitionSamples: PerimeterFieldDebugSample[] = [];
    for (const pair of plan.preserved) {
        const ownerId =
            pair.prevV.ownerId === pair.nextV.ownerId || progress >= 0.5
                ? pair.nextV.ownerId
                : pair.prevV.ownerId;
        const playerIdx =
            pair.prevV.playerIdx === pair.nextV.playerIdx || progress >= 0.5
                ? pair.nextV.playerIdx
                : pair.prevV.playerIdx;
        transitionSamples.push({
            id: `preserved:${pair.preservedId}`,
            x: pair.prevV.x + (pair.nextV.x - pair.prevV.x) * progress,
            y: pair.prevV.y + (pair.nextV.y - pair.prevV.y) * progress,
            playerIdx,
            strength:
                pair.prevV.strength +
                (pair.nextV.strength - pair.prevV.strength) * progress,
            ownerId,
            ownerColor: params.colorUtils.getPlayerColor(ownerId),
            sourceId: pair.nextV.loopId,
            vId: pair.nextV.id,
            transitionRole: 'preserved',
            label: pair.preservedId,
            pathStartX: pair.prevV.x,
            pathStartY: pair.prevV.y,
            pathEndX: pair.nextV.x,
            pathEndY: pair.nextV.y,
            debugState: 'preserved',
        });
    }
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
                      transitionRole: !selectedPrevSectionIds.has(v.sectionId)
                          ? 'static'
                          : preservedPrevIds.has(v.id)
                            ? 'preserved'
                            : disappearingIds.has(v.id)
                              ? 'disappearing'
                              : 'mover',
                      label: `O${String(index).padStart(2, '0')}`,
                  }),
              )
            : progress >= 1 - 1e-6
              ? plan.nextVSet.map((v, index) =>
                    buildPerimeterDebugSampleFromV({
                        v,
                        colorUtils: params.colorUtils,
                        debugState: 'transition-new',
                        transitionRole: !selectedNextSectionIds.has(v.sectionId)
                            ? 'static'
                            : preservedNextIds.has(v.id)
                              ? 'preserved'
                              : appearingIds.has(v.id)
                                ? 'appearing'
                                : 'mover',
                        label: `N${String(index).padStart(2, '0')}`,
                    }),
                )
              : null;

    const samples = (endpointSamples ?? [...staticSamples, ...transitionSamples])
        .filter((sample) => sample.strength > 1e-6)
        .sort((a, b) => {
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
            fingerprint: `${params.geometrySource}:${buildSceneFingerprint(
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
            transitionTargetGeometry: plan.nextGeometry,
            playerColors: clusterScene.playerColors,
            renderedSamples: samples,
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
    previousStarsForDisplay?: ReadonlyArray<StarState> | null;
    geometry: CanonicalGeometrySnapshot;
    previousGeometry?: CanonicalGeometrySnapshot | null;
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
    const geometrySource = readString(
        params.input,
        'PERIMETER_FIELD_GEOMETRY_SOURCE',
        GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ?? 'power_voronoi_0319',
    );
    return buildPlanScene({
        input: params.input,
        starsForDisplay: params.starsForDisplay,
        geometry: params.geometry,
        transitionPlan: params.transitionPlan ?? null,
        colorUtils: params.colorUtils,
        spacing,
        offsetPx,
        strength,
        geometrySource,
    });
}
