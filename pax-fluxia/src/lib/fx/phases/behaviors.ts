// ============================================================================
// FX Phases — Depart + Travel Behaviors
// ============================================================================
// Named behavior implementations for each travel mode: ORB, BEZIER, LANE.
// Each export is a DepartBehavior or TravelBehavior that can be looked up
// by name from the registry.
// ============================================================================

import type { VisualShipState } from '$lib/utils/render.utils';
import { SHIP_ANIM } from '$lib/utils/render.utils';
import type { DepartBehavior, TravelBehavior, PhaseResult, PhaseContext } from './travelTypes';
import { easeInOutQuad, applyTravelEasing } from './easing';
import { pointAtArcFraction, tangentAtArcFraction } from '$lib/lanes/laneGeometry';

function getOffsetSeed(ship: VisualShipState, fallback = 6): number {
    if (Math.abs(ship.laneOffset) > 1e-3) return ship.laneOffset;
    return (ship.id % 2 === 0 ? 1 : -1) * fallback;
}

function buildFullJourneyPolyline(ship: VisualShipState): [number, number][] | undefined {
    const poly = ship.lanePolyline;
    if (!poly || poly.length < 2) return undefined;
    const out: [number, number][] = [[ship.departFromX, ship.departFromY]];
    for (const point of poly) {
        const prev = out[out.length - 1];
        if (
            prev &&
            Math.hypot(prev[0] - point[0], prev[1] - point[1]) < 1e-6
        ) {
            continue;
        }
        out.push([point[0], point[1]]);
    }
    return out.length >= 2 ? out : undefined;
}

function sampleSpine(
    ship: VisualShipState,
    progress: number,
    followLanePath: boolean,
): { x: number; y: number; perpX: number; perpY: number } {
    const poly = followLanePath ? ship.lanePolyline : undefined;
    if (poly && poly.length >= 2) {
        const p = pointAtArcFraction(poly, progress);
        const { tx, ty } = tangentAtArcFraction(poly, progress);
        const len = Math.hypot(tx, ty) || 1;
        return {
            x: p.x,
            y: p.y,
            perpX: -ty / len,
            perpY: tx / len,
        };
    }

    const x = ship.laneStartX + (ship.laneEndX - ship.laneStartX) * progress;
    const y = ship.laneStartY + (ship.laneEndY - ship.laneStartY) * progress;
    const laneNdx = ship.laneEndX - ship.laneStartX;
    const laneNdy = ship.laneEndY - ship.laneStartY;
    const laneDist = Math.sqrt(laneNdx * laneNdx + laneNdy * laneNdy) || 1;
    return {
        x,
        y,
        perpX: -laneNdy / laneDist,
        perpY: laneNdx / laneDist,
    };
}

// ════════════════════════════════════════════════════════════════════════════
// DEPART BEHAVIORS
// ════════════════════════════════════════════════════════════════════════════

/** ORB depart: converge to lane start, fade alpha for merge into orb */
export const orbDepart: DepartBehavior = {
    name: 'orb',
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult {
        const departProgress = Math.min(1, elapsed / (ship.departDuration || SHIP_ANIM.DEPART_DURATION));
        const eased = easeInOutQuad(departProgress);

        const dx = ship.laneStartX - ship.departFromX;
        const dy = ship.laneStartY - ship.departFromY;
        const dist = Math.hypot(dx, dy) || 1;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const departBulge =
            Math.sin(eased * Math.PI) *
            ctx.departArcIntensity *
            getOffsetSeed(ship, 8);
        const x =
            ship.departFromX +
            dx * eased +
            perpX * departBulge;
        const y =
            ship.departFromY +
            dy * eased +
            perpY * departBulge;
        const scale = 0.8 + 0.1 * eased;

        let alpha = 1;
        if (departProgress > 0.7) {
            alpha = 1 - (departProgress - 0.7) / 0.3;
        }

        return { x, y, scale, alpha, done: departProgress >= 1 };
    },
};

/** BEZIER depart: single-pass quadratic bezier arc from orbit directly to destination */
export const bezierDepart: DepartBehavior = {
    name: 'bezier',
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult {
        const totalDuration =
            ((ship.departDuration || SHIP_ANIM.DEPART_DURATION) + ship.travelDuration) *
            ctx.travelDurationMult;
        const rawProgress = Math.min(1, elapsed / totalDuration);

        const eased = applyTravelEasing(
            rawProgress,
            ctx.travelEasing as any,
            ctx.travelEasingPower,
        );

        const journeyPolyline = ctx.followLanePath
            ? buildFullJourneyPolyline(ship)
            : undefined;
        if (journeyPolyline && journeyPolyline.length >= 2) {
            const p = pointAtArcFraction(journeyPolyline, eased);
            const { tx, ty } = tangentAtArcFraction(journeyPolyline, eased);
            const len = Math.hypot(tx, ty) || 1;
            const perpX = -ty / len;
            const perpY = tx / len;
            const bulge =
                Math.sin(rawProgress * Math.PI) *
                ctx.travelArcIntensity *
                getOffsetSeed(ship, 8);
            const scale = 0.8 + 0.1 * Math.min(rawProgress * 3, 1);
            return {
                x: p.x + perpX * bulge,
                y: p.y + perpY * bulge,
                scale,
                alpha: 1,
                done: rawProgress >= 1,
            };
        }

        // Bezier control point for curved arc
        const dx = ship.laneEndX - ship.departFromX;
        const dy = ship.laneEndY - ship.departFromY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const arcOffset = ship.laneOffset * 2 * ctx.travelArcIntensity;
        const midX = (ship.departFromX + ship.laneEndX) * 0.5 + perpX * arcOffset;
        const midY = (ship.departFromY + ship.laneEndY) * 0.5 + perpY * arcOffset;

        // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)t·CP + t²P1
        const t = eased;
        const mt = 1 - t;
        const x = mt * mt * ship.departFromX + 2 * mt * t * midX + t * t * ship.laneEndX;
        const y = mt * mt * ship.departFromY + 2 * mt * t * midY + t * t * ship.laneEndY;
        const scale = 0.8 + 0.1 * Math.min(rawProgress * 3, 1);

        return { x, y, scale, alpha: 1, done: rawProgress >= 1 };
    },
};

/** LANE depart: classic convergence to lane start point */
export const laneDepart: DepartBehavior = {
    name: 'lane',
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult {
        const departProgress = Math.min(1, elapsed / (ship.departDuration || SHIP_ANIM.DEPART_DURATION));
        const eased = easeInOutQuad(departProgress);

        const dx = ship.laneStartX - ship.departFromX;
        const dy = ship.laneStartY - ship.departFromY;
        const dist = Math.hypot(dx, dy) || 1;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const departBulge =
            Math.sin(eased * Math.PI) *
            ctx.departArcIntensity *
            getOffsetSeed(ship, 6);
        const x =
            ship.departFromX +
            dx * eased +
            perpX * departBulge;
        const y =
            ship.departFromY +
            dy * eased +
            perpY * departBulge;
        const scale = 0.8 + 0.1 * eased;

        return { x, y, scale, alpha: 1, done: departProgress >= 1 };
    },
};

// ════════════════════════════════════════════════════════════════════════════
// TRAVEL BEHAVIORS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Per-ship sinusoidal wobble on the travel/orb path. The frequency BASE + per-
 * ship frequency SPREAD and PHASE spread are configurable so the orb path's
 * character (speed, and how staggered/chaotic the members are) can be tuned —
 * previously the 2.5 / 0.3 / full-circle constants were hardcoded, so the orb's
 * judder could only be zeroed via wobbleAmp, never shaped. Defaults reproduce
 * the original constants exactly.
 */
function computeWobbleWithPerp(
    ship: VisualShipState,
    travelProgress: number,
    wobbleAmp: number,
    freqBase: number,
    freqSpread: number,
    phaseSpread: number,
): { edgeFade: number; wobble: number } {
    const edgeFade = Math.min(travelProgress * 4, (1 - travelProgress) * 4, 1);
    const wobbleFreq = freqBase + (ship.id % 7) * freqSpread;
    const wobblePhase = ((ship.id % 13) / 13) * Math.PI * 2 * phaseSpread;
    const wobble = wobbleAmp > 0
        ? Math.sin(travelProgress * wobbleFreq * Math.PI * 2 + wobblePhase) * wobbleAmp * edgeFade
        : 0;
    return { edgeFade, wobble };
}

function computeLaneTravelOffset(
    ship: VisualShipState,
    travelProgress: number,
    edgeFade: number,
    wobble: number,
    travelArcIntensity: number,
): number {
    const spread = ship.laneOffset * edgeFade;
    const arcBulge =
        Math.sin(travelProgress * Math.PI) *
        travelArcIntensity *
        getOffsetSeed(ship, 6);
    return spread + arcBulge + wobble;
}

/** ORB travel: straight lane interpolation with configurable easing + wobble */
export const orbTravel: TravelBehavior = {
    name: 'orb',
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult {
        const travelProgress = Math.min(1, elapsed / (ship.travelDuration * ctx.travelDurationMult));
        // Use configurable easing (same as lane travel) instead of hardcoded cubic
        const eased = applyTravelEasing(travelProgress, ctx.travelEasing as any, ctx.travelEasingPower);

        const spine = sampleSpine(ship, eased, ctx.followLanePath);
        const w = computeWobbleWithPerp(
            ship,
            travelProgress,
            ctx.wobbleAmp,
            ctx.wobbleFreq,
            ctx.wobbleFreqSpread,
            ctx.wobblePhaseSpread,
        );
        const lateralOffset = computeLaneTravelOffset(
            ship,
            travelProgress,
            w.edgeFade,
            w.wobble,
            ctx.travelArcIntensity,
        );

        const x = spine.x + spine.perpX * lateralOffset;
        const y = spine.y + spine.perpY * lateralOffset;

        return { x, y, scale: 0.9, alpha: 1, done: travelProgress >= 1 };
    },
};

/** LANE travel: straight-line with configurable easing + wobble */
export const laneTravel: TravelBehavior = {
    name: 'lane',
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult {
        const travelProgress = Math.min(1, elapsed / (ship.travelDuration * ctx.travelDurationMult));
        const laneEased = applyTravelEasing(travelProgress, ctx.travelEasing as any, ctx.travelEasingPower);

        const spine = sampleSpine(ship, laneEased, ctx.followLanePath);
        const w = computeWobbleWithPerp(
            ship,
            travelProgress,
            ctx.wobbleAmp,
            ctx.wobbleFreq,
            ctx.wobbleFreqSpread,
            ctx.wobblePhaseSpread,
        );
        const lateralOffset = computeLaneTravelOffset(
            ship,
            travelProgress,
            w.edgeFade,
            w.wobble,
            ctx.travelArcIntensity,
        );

        const x = spine.x + spine.perpX * lateralOffset;
        const y = spine.y + spine.perpY * lateralOffset;

        return { x, y, scale: 0.9, alpha: 1, done: travelProgress >= 1 };
    },
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY — named lookup for behaviors
// ════════════════════════════════════════════════════════════════════════════

export const DEPART_BEHAVIORS: Record<string, DepartBehavior> = {
    orb: orbDepart,
    bezier: bezierDepart,
    lane: laneDepart,
};

export const TRAVEL_BEHAVIORS: Record<string, TravelBehavior> = {
    orb: orbTravel,
    lane: laneTravel,
};
