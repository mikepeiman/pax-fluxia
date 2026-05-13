import type { StarState } from '$lib/types/game.types';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import { buildGridClassification } from '../metaballGrid/buildGridClassification';
import type {
    GridClassification,
    GridOwnedStar,
    GridWavePlan,
} from '../metaballGrid/metaballGridTypes';
import { planGridWave } from '../metaballGrid/planGridWave';
import type { GridGradientSettings } from './settings';

export interface CachedGridGradientPlan {
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly classificationBuildMs: number;
    readonly wavePlanBuildMs: number;
}

function toOwnedStars(stars: ReadonlyArray<StarState>): GridOwnedStar[] {
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

function toPreviousOwnedStars(input: RenderFamilyInput): GridOwnedStar[] {
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
}): CachedGridGradientPlan {
    const starById = new Map<string, StarState>();
    for (const star of params.input.stars) starById.set(star.id, star);
    const resolveStarPosition = (starId: string) => {
        const star = starById.get(starId);
        return star ? { x: star.x, y: star.y } : null;
    };
    const ownedStars = toOwnedStars(params.input.stars);
    const previousOwnedStars = params.input.activeTransition
        ? toPreviousOwnedStars(params.input)
        : ownedStars;
    const conquestEvents = params.input.activeTransition?.conquestEvents ?? [];

    const classificationStartMs = performance.now();
    const classification = buildGridClassification({
        world: params.input.world,
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
    });
    const classificationBuildMs = performance.now() - classificationStartMs;

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

    return {
        planKey: params.planKey,
        classification,
        wavePlan,
        classificationBuildMs,
        wavePlanBuildMs,
    };
}
