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

// ════════════════════════════════════════════════════════════════════════════
// DEPART BEHAVIORS
// ════════════════════════════════════════════════════════════════════════════

/** ORB depart: converge to lane start, fade alpha for merge into orb */
export const orbDepart: DepartBehavior = {
    name: 'orb',
    interpolate(ship: VisualShipState, elapsed: number, _ctx: PhaseContext): PhaseResult {
        const departProgress = Math.min(1, elapsed / (ship.departDuration || SHIP_ANIM.DEPART_DURATION));
        const eased = easeInOutQuad(departProgress);

        const x = ship.departFromX + (ship.laneStartX - ship.departFromX) * eased;
        const y = ship.departFromY + (ship.laneStartY - ship.departFromY) * eased;
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
    interpolate(ship: VisualShipState, elapsed: number, _ctx: PhaseContext): PhaseResult {
        const departProgress = Math.min(1, elapsed / (ship.departDuration || SHIP_ANIM.DEPART_DURATION));
        const eased = easeInOutQuad(departProgress);

        const x = ship.departFromX + (ship.laneStartX - ship.departFromX) * eased;
        const y = ship.departFromY + (ship.laneStartY - ship.departFromY) * eased;
        const scale = 0.8 + 0.1 * eased;

        return { x, y, scale, alpha: 1, done: departProgress >= 1 };
    },
};

// ════════════════════════════════════════════════════════════════════════════
// TRAVEL BEHAVIORS
// ════════════════════════════════════════════════════════════════════════════

/** Compute wobble offset common to both ORB and LANE travel */
function computeWobble(
    ship: VisualShipState,
    travelProgress: number,
    wobbleAmp: number,
): { perpX: number; perpY: number; edgeFade: number; wobble: number } {
    const laneNdx = ship.laneEndX - ship.laneStartX;
    const laneNdy = ship.laneEndY - ship.laneStartY;
    const laneDist = Math.sqrt(laneNdx * laneNdx + laneNdy * laneNdy) || 1;
    const perpX = -laneNdy / laneDist;
    const perpY = laneNdx / laneDist;
    const edgeFade = Math.min(travelProgress * 4, (1 - travelProgress) * 4, 1);

    const wobbleFreq = 2.5 + (ship.id % 7) * 0.3;
    const wobblePhase = ((ship.id % 13) / 13) * Math.PI * 2;
    const wobble = wobbleAmp > 0
        ? Math.sin(travelProgress * wobbleFreq * Math.PI * 2 + wobblePhase) * wobbleAmp * edgeFade
        : 0;

    return { perpX, perpY, edgeFade, wobble };
}

function computeWobbleWithPerp(
    ship: VisualShipState,
    travelProgress: number,
    wobbleAmp: number,
    perpX: number,
    perpY: number,
): { edgeFade: number; wobble: number } {
    const edgeFade = Math.min(travelProgress * 4, (1 - travelProgress) * 4, 1);
    const wobbleFreq = 2.5 + (ship.id % 7) * 0.3;
    const wobblePhase = ((ship.id % 13) / 13) * Math.PI * 2;
    const wobble = wobbleAmp > 0
        ? Math.sin(travelProgress * wobbleFreq * Math.PI * 2 + wobblePhase) * wobbleAmp * edgeFade
        : 0;
    return { edgeFade, wobble };
}

/** ORB travel: straight lane interpolation with configurable easing + wobble */
export const orbTravel: TravelBehavior = {
    name: 'orb',
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult {
        const travelProgress = Math.min(1, elapsed / (ship.travelDuration * ctx.travelDurationMult));
        // Use configurable easing (same as lane travel) instead of hardcoded cubic
        const eased = applyTravelEasing(travelProgress, ctx.travelEasing as any, ctx.travelEasingPower);

        const poly = ship.lanePolyline;
        let baseX: number;
        let baseY: number;
        let perpX: number;
        let perpY: number;
        let edgeFade: number;
        let wobble: number;
        if (poly && poly.length >= 2) {
            const p = pointAtArcFraction(poly, eased);
            baseX = p.x;
            baseY = p.y;
            const { tx, ty } = tangentAtArcFraction(poly, eased);
            const len = Math.hypot(tx, ty) || 1;
            perpX = -ty / len;
            perpY = tx / len;
            const w = computeWobbleWithPerp(ship, travelProgress, ctx.wobbleAmp, perpX, perpY);
            edgeFade = w.edgeFade;
            wobble = w.wobble;
        } else {
            baseX = ship.laneStartX + (ship.laneEndX - ship.laneStartX) * eased;
            baseY = ship.laneStartY + (ship.laneEndY - ship.laneStartY) * eased;
            const w = computeWobble(ship, travelProgress, ctx.wobbleAmp);
            perpX = w.perpX;
            perpY = w.perpY;
            edgeFade = w.edgeFade;
            wobble = w.wobble;
        }

        const x = baseX + perpX * (ship.laneOffset * edgeFade + wobble);
        const y = baseY + perpY * (ship.laneOffset * edgeFade + wobble);

        return { x, y, scale: 0.9, alpha: 1, done: travelProgress >= 1 };
    },
};

/** LANE travel: straight-line with configurable easing + wobble */
export const laneTravel: TravelBehavior = {
    name: 'lane',
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult {
        const travelProgress = Math.min(1, elapsed / (ship.travelDuration * ctx.travelDurationMult));
        const laneEased = applyTravelEasing(travelProgress, ctx.travelEasing as any, ctx.travelEasingPower);

        const poly = ship.lanePolyline;
        let baseX: number;
        let baseY: number;
        let perpX: number;
        let perpY: number;
        let edgeFade: number;
        let wobble: number;
        if (poly && poly.length >= 2) {
            const p = pointAtArcFraction(poly, laneEased);
            baseX = p.x;
            baseY = p.y;
            const { tx, ty } = tangentAtArcFraction(poly, laneEased);
            const len = Math.hypot(tx, ty) || 1;
            perpX = -ty / len;
            perpY = tx / len;
            const w = computeWobbleWithPerp(ship, travelProgress, ctx.wobbleAmp, perpX, perpY);
            edgeFade = w.edgeFade;
            wobble = w.wobble;
        } else {
            baseX = ship.laneStartX + (ship.laneEndX - ship.laneStartX) * laneEased;
            baseY = ship.laneStartY + (ship.laneEndY - ship.laneStartY) * laneEased;
            const w = computeWobble(ship, travelProgress, ctx.wobbleAmp);
            perpX = w.perpX;
            perpY = w.perpY;
            edgeFade = w.edgeFade;
            wobble = w.wobble;
        }

        const x = baseX + perpX * (ship.laneOffset * edgeFade + wobble);
        const y = baseY + perpY * (ship.laneOffset * edgeFade + wobble);

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
