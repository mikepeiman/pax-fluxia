// ============================================================================
// Assign lane endpoints + optional polyline on a visual ship (transfer / conquest).
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';
import type { VisualShipState } from '$lib/utils/render.utils';
import { getDirectedLanePolyline } from './lanePolylineCache';
import { pointAtArcFraction, trimLanePolylineToStarRims } from './laneGeometry';

function resolveTrimmedPolyline(
    source: StarLaneRef,
    target: StarLaneRef,
    pretrimmed?: [number, number][],
): [number, number][] | undefined {
    if (pretrimmed && pretrimmed.length >= 2) return pretrimmed;
    const rawPoly = getDirectedLanePolyline(source.id, target.id);
    if (!rawPoly || rawPoly.length < 2) return undefined;
    const t = trimLanePolylineToStarRims(rawPoly, source, target, 5);
    return t.length >= 2 ? t : undefined;
}

export interface StarLaneRef {
    id: string;
    x: number;
    y: number;
    radius: number;
}

export function computeLaneHeadingForNearside(
    source: StarLaneRef,
    target: StarLaneRef,
    trimmed: [number, number][] | undefined,
): { ndx: number; ndy: number } {
    if (trimmed && trimmed.length >= 2) {
        let dx = trimmed[1][0] - trimmed[0][0];
        let dy = trimmed[1][1] - trimmed[0][1];
        if (Math.hypot(dx, dy) < 1e-3 && trimmed.length > 2) {
            dx = trimmed[2][0] - trimmed[0][0];
            dy = trimmed[2][1] - trimmed[0][1];
        }
        const len = Math.hypot(dx, dy) || 1;
        return { ndx: dx / len, ndy: dy / len };
    }
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy) || 1;
    return { ndx: dx / dist, ndy: dy / dist };
}

/**
 * Sets `laneStart` / `laneEnd` / optional `lanePolyline` on `ship`.
 * Returns chord direction for nearside depart sorting when no polyline.
 */
export function assignShipLaneGeometry(
    ship: VisualShipState,
    source: StarLaneRef,
    target: StarLaneRef,
    pretrimmed?: [number, number][],
): {
    ndx: number;
    ndy: number;
} {
    const convergence = GAME_CONFIG.LANE_CONVERGENCE ?? 1.0;
    const convergencePoint = (GAME_CONFIG.LANE_CONVERGENCE_POINT ?? 0) / 100;

    const trimmed = resolveTrimmedPolyline(source, target, pretrimmed);

    const { ndx, ndy } = computeLaneHeadingForNearside(source, target, trimmed);

    let baseLaneStartX: number;
    let baseLaneStartY: number;
    let baseLaneEndX: number;
    let baseLaneEndY: number;
    let effectiveLaneStartX: number;
    let effectiveLaneStartY: number;

    if (trimmed && trimmed.length >= 2) {
        ship.lanePolyline = trimmed.map((p) => [p[0], p[1]] as [number, number]);
        baseLaneStartX = trimmed[0][0];
        baseLaneStartY = trimmed[0][1];
        baseLaneEndX = trimmed[trimmed.length - 1][0];
        baseLaneEndY = trimmed[trimmed.length - 1][1];
        const arc = pointAtArcFraction(trimmed, convergencePoint);
        effectiveLaneStartX = arc.x;
        effectiveLaneStartY = arc.y;
    } else {
        ship.lanePolyline = undefined;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ndx0 = dx / dist;
        const ndy0 = dy / dist;
        baseLaneStartX = source.x + ndx0 * (source.radius + 5);
        baseLaneStartY = source.y + ndy0 * (source.radius + 5);
        baseLaneEndX = target.x - ndx0 * (target.radius + 5);
        baseLaneEndY = target.y - ndy0 * (target.radius + 5);
        const convStartX = source.x + (target.x - source.x) * convergencePoint;
        const convStartY = source.y + (target.y - source.y) * convergencePoint;
        effectiveLaneStartX = baseLaneStartX + (convStartX - baseLaneStartX) * convergencePoint;
        effectiveLaneStartY = baseLaneStartY + (convStartY - baseLaneStartY) * convergencePoint;
    }

    if (convergence >= 1) {
        ship.laneStartX = effectiveLaneStartX;
        ship.laneStartY = effectiveLaneStartY;
        ship.laneEndX = baseLaneEndX;
        ship.laneEndY = baseLaneEndY;
    } else {
        const spreadAngle = ((ship.id % 12) / 12) * Math.PI * 2;
        const spreadEndX = target.x + Math.cos(spreadAngle) * (target.radius + 5);
        const spreadEndY = target.y + Math.sin(spreadAngle) * (target.radius + 5);
        ship.laneStartX = effectiveLaneStartX * convergence + ship.departFromX * (1 - convergence);
        ship.laneStartY = effectiveLaneStartY * convergence + ship.departFromY * (1 - convergence);
        ship.laneEndX = baseLaneEndX * convergence + spreadEndX * (1 - convergence);
        ship.laneEndY = baseLaneEndY * convergence + spreadEndY * (1 - convergence);
    }

    return { ndx, ndy };
}
