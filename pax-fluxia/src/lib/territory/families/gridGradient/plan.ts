import type { StarState } from '$lib/types/game.types';
import type { ConquestEvent } from '@pax/common';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import type {
    GridClassification,
    GridOwnedStar,
    GridWavePlan,
} from '../metaballGrid/metaballGridTypes';
import { planGridWave } from '../metaballGrid/planGridWave';
import type { GridGradientSettings } from './settings';
import {
    buildGridGradientTypedClassification,
    type GridGradientClassificationAlgorithm,
    type GridGradientOwnerGridCache,
    type GridGradientTypedClassification,
} from './typedClassification';

export interface CachedGridGradientPlan {
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly typed: GridGradientTypedClassification;
    readonly flipTimeByteByCell: Uint8Array;
    readonly wavePlan: GridWavePlan;
    readonly classificationBuildMs: number;
    readonly ownerGridBuildMs: number;
    readonly classificationMaterializeMs: number;
    readonly wavePlanBuildMs: number;
    readonly planBuildMs: number;
    readonly classificationAlgorithm: GridGradientClassificationAlgorithm;
    readonly prevOwnerGridCacheHit: boolean;
    readonly nextOwnerGridCacheHit: boolean;
}

export interface GridGradientPlanBuildParts {
    readonly world: RenderFamilyInput['world'];
    readonly stars: ReadonlyArray<Pick<StarState, 'id' | 'x' | 'y' | 'ownerId'>>;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
    readonly planKey: string;
    readonly activeTransition: RenderFamilyInput['activeTransition'];
    readonly ownerGridCache?: GridGradientOwnerGridCache;
}

export function toGridGradientOwnedStars(
    stars: ReadonlyArray<Pick<StarState, 'id' | 'ownerId' | 'x' | 'y'>>,
): GridOwnedStar[] {
    const out: GridOwnedStar[] = [];
    for (const star of stars) {
        if (star.ownerId) {
            out.push({
                id: star.id,
                ownerId: star.ownerId,
                x: star.x,
                y: star.y,
            });
        }
    }
    return out;
}

export function toGridGradientPreviousOwnedStars(
    input: RenderFamilyInput,
): GridOwnedStar[] {
    const previousOwnerByStarId = new Map<string, string>();
    for (const entry of input.activeTransition?.events ?? []) {
        previousOwnerByStarId.set(entry.event.starId, entry.event.previousOwner);
    }
    const out: GridOwnedStar[] = [];
    for (const star of input.stars) {
        const ownerId = previousOwnerByStarId.get(star.id) ?? star.ownerId;
        if (ownerId) {
            out.push({
                id: star.id,
                ownerId,
                x: star.x,
                y: star.y,
            });
        }
    }
    return out;
}

function buildTransitionKey(input: RenderFamilyInput): string {
    const events = input.activeTransition?.events ?? [];
    if (events.length === 0) return 'steady';
    return events
        .map((entry) =>
            [
                entry.event.tick,
                entry.event.starId,
                entry.event.previousOwner,
                entry.event.newOwner,
                Math.round(entry.startedAtMs),
                Math.round(entry.durationMs),
            ].join(':'),
        )
        .sort()
        .join('|');
}

export function buildGridGradientPlanKey(params: {
    readonly input: RenderFamilyInput;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
}): string {
    const { input, geometry, prevGeometry, settings } = params;
    return [
        geometry.version,
        prevGeometry.version,
        buildTransitionKey(input),
        input.world.minX ?? 0,
        input.world.minY ?? 0,
        input.world.width,
        input.world.height,
        settings.spacingPx,
        settings.maxCells,
        settings.originMode,
        settings.distribution,
        settings.positionJitter,
        settings.adjacency,
        settings.waveGeometry,
        settings.waveSeeding,
    ].join('|');
}

export function buildGridGradientPlan(params: {
    readonly input: RenderFamilyInput;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
    readonly planKey: string;
    readonly ownerGridCache?: GridGradientOwnerGridCache;
}): CachedGridGradientPlan {
    return buildGridGradientPlanFromParts({
        world: params.input.world,
        stars: params.input.stars,
        prevGeometry: params.prevGeometry,
        geometry: params.geometry,
        settings: params.settings,
        planKey: params.planKey,
        activeTransition: params.input.activeTransition,
        ownerGridCache: params.ownerGridCache,
    });
}

export function buildGridGradientPlanFromParts(
    params: GridGradientPlanBuildParts,
): CachedGridGradientPlan {
    const starById = new Map<string, Pick<StarState, 'id' | 'x' | 'y' | 'ownerId'>>();
    for (const star of params.stars) starById.set(star.id, star);
    const resolveStarPosition = (starId: string) => {
        const star = starById.get(starId);
        return star ? { x: star.x, y: star.y } : null;
    };
    const ownedStars = toGridGradientOwnedStars(params.stars);
    const previousOwnedStars = params.activeTransition
        ? toGridGradientPreviousOwnedStarsFromParts({
            stars: params.stars,
            conquestEvents: params.activeTransition.events.map((entry) => entry.event),
        })
        : ownedStars;
    const conquestEvents = params.activeTransition?.conquestEvents ?? [];

    const classificationStartMs = performance.now();
    const classificationResult = buildGridGradientTypedClassification({
        world: params.world,
        spacingPx: params.settings.spacingPx,
        originMode: params.settings.originMode,
        prevGeometry: params.prevGeometry,
        nextGeometry: params.geometry,
        conquestEvents,
        resolveStarPosition,
        prevOwnedStars: previousOwnedStars,
        nextOwnedStars: ownedStars,
        maxCells: params.settings.maxCells,
        distribution: params.settings.distribution,
        positionJitter: params.settings.positionJitter,
        ownerGridCache: params.ownerGridCache,
    });
    const classificationBuildMs = performance.now() - classificationStartMs;
    const { classification, typed } = classificationResult;

    const wavePlanStartMs = performance.now();
    const wavePlan = planGridWave({
        classification,
        seeding: params.settings.waveSeeding,
        geometry: params.settings.waveGeometry,
        adjacency: params.settings.adjacency,
        conquestEvents,
        resolveStarPosition,
    });
    const wavePlanBuildMs = performance.now() - wavePlanStartMs;
    const planBuildMs = classificationBuildMs + wavePlanBuildMs;
    const flipTimeByteByCell = buildFlipTimeByteByCell({
        classification,
        wavePlan,
    });

    return {
        planKey: params.planKey,
        classification,
        typed,
        flipTimeByteByCell,
        wavePlan,
        classificationBuildMs,
        ownerGridBuildMs: classificationResult.ownerGridBuildMs,
        classificationMaterializeMs:
            classificationResult.classificationMaterializeMs,
        wavePlanBuildMs,
        planBuildMs,
        classificationAlgorithm: classificationResult.algorithm,
        prevOwnerGridCacheHit: classificationResult.prevOwnerGridCacheHit,
        nextOwnerGridCacheHit: classificationResult.nextOwnerGridCacheHit,
    };
}

function buildFlipTimeByteByCell(params: {
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
}): Uint8Array {
    const out = new Uint8Array(
        params.classification.cols * params.classification.rows,
    );
    for (const v of params.classification.vstars) {
        const cellIndex = v.iy * params.classification.cols + v.ix;
        const fallback = v.role === 'native' ? 1 : 0;
        const flipTime = params.wavePlan.flipTimeByVId.get(v.id) ?? fallback;
        out[cellIndex] = Math.round(Math.max(0, Math.min(1, flipTime)) * 255);
    }
    return out;
}

function toGridGradientPreviousOwnedStarsFromParts(params: {
    readonly stars: ReadonlyArray<Pick<StarState, 'id' | 'x' | 'y' | 'ownerId'>>;
    readonly conquestEvents: readonly ConquestEvent[];
}): GridOwnedStar[] {
    const previousOwnerByStarId = new Map<string, string>();
    for (const event of params.conquestEvents) {
        previousOwnerByStarId.set(event.starId, event.previousOwner);
    }
    const out: GridOwnedStar[] = [];
    for (const star of params.stars) {
        const ownerId = previousOwnerByStarId.get(star.id) ?? star.ownerId;
        if (ownerId) {
            out.push({
                id: star.id,
                ownerId,
                x: star.x,
                y: star.y,
            });
        }
    }
    return out;
}
