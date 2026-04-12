// ============================================================================
// LaneRenderer — Connection lanes + order arrows
// ============================================================================
//
// Extracted from GameCanvas.svelte ~lines 892-1450.
// Renders:
//   1. Connection lanes (gap-aware, shadow + foreground 2-pass)
//   2. Order arrows (confirmed + pending, solid)
//   3. Deferred order arrows (dashed)
//
// Drawn into:
//   - ctx.containers.connectionGraphics (lanes)
//   - ctx.containers.linkGraphics (arrows)
// ============================================================================

import * as PIXI from 'pixi.js';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { ColorUtils } from './RenderContext';
import { getLanePolyline } from '$lib/lanes/lanePolylineCache';
import {
    polylineTotalLength,
    pointAtArcLength,
    slicePolylineBetweenDistances,
    tangentAtArcFraction,
    trimLanePolylineToStarRims,
} from '$lib/lanes/laneGeometry';

// ── Connection Lanes ────────────────────────────────────────────────────────

/**
 * Render lane connections between stars.
 * Gap-aware: lanes break around intervening stars. Two-pass: shadow → foreground.
 */
export function renderConnections(
    connectionGraphics: PIXI.Graphics,
    stars: StarState[],
    connections: StarConnection[],
    starsById: Map<string, StarState>,
    colorUtils: ColorUtils,
): void {
    connectionGraphics.clear();

    // Collect all lane segments (reused for both shadow and foreground passes)
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

    connections.forEach((conn) => {
        const source = starsById.get(conn.sourceId);
        const target = starsById.get(conn.targetId);
        if (!source || !target) return;

        const poly = getLanePolyline(conn.sourceId, conn.targetId);
        if (poly && poly.length > 2) {
            for (let i = 0; i < poly.length - 1; i++) {
                segments.push({
                    x1: poly[i][0],
                    y1: poly[i][1],
                    x2: poly[i + 1][0],
                    y2: poly[i + 1][1],
                });
            }
            return;
        }

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const laneDist = Math.sqrt(dx * dx + dy * dy);
        if (laneDist < 1) return;

        const ndx = dx / laneDist;
        const ndy = dy / laneDist;

        // Collect gap intervals [tStart, tEnd] along the lane (0..1 parameterization)
        const gaps: [number, number][] = [];

        // Gap at source and target — use visual ownership-ring radius for terminus blending
        const ringGap = GAME_CONFIG.STAR_RING_RADIUS + (GAME_CONFIG.STAR_RING_WIDTH ?? 2) * 0.5;
        const srcGap = ringGap / laneDist;
        const tgtGap = ringGap / laneDist;
        gaps.push([0, srcGap]);
        gaps.push([1 - tgtGap, 1]);

        // Check all other stars for proximity to this lane
        for (const star of stars) {
            if (star.id === conn.sourceId || star.id === conn.targetId) continue;

            const ax = star.x - source.x;
            const ay = star.y - source.y;
            const t = (ax * ndx + ay * ndy) / laneDist;

            if (t <= 0 || t >= 1) continue;

            const projX = source.x + ndx * t * laneDist;
            const projY = source.y + ndy * t * laneDist;
            const perpDist = Math.sqrt((star.x - projX) ** 2 + (star.y - projY) ** 2);

            // Use ownership-ring radius for intervening star clearance too
            const clearance = ringGap + 6;
            if (perpDist < clearance) {
                const halfChord = Math.sqrt(Math.max(0, clearance * clearance - perpDist * perpDist));
                const gapStart = Math.max(0, t - halfChord / laneDist);
                const gapEnd = Math.min(1, t + halfChord / laneDist);
                gaps.push([gapStart, gapEnd]);
            }
        }

        // Sort gaps by start and merge overlapping
        gaps.sort((a, b) => a[0] - b[0]);
        const merged: [number, number][] = [];
        for (const gap of gaps) {
            if (merged.length > 0 && gap[0] <= merged[merged.length - 1][1]) {
                merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], gap[1]);
            } else {
                merged.push([...gap]);
            }
        }

        // Collect segments between gaps
        let segStart = 0;
        for (const [gStart, gEnd] of merged) {
            if (segStart < gStart) {
                segments.push({
                    x1: source.x + ndx * segStart * laneDist,
                    y1: source.y + ndy * segStart * laneDist,
                    x2: source.x + ndx * gStart * laneDist,
                    y2: source.y + ndy * gStart * laneDist,
                });
            }
            segStart = gEnd;
        }
        if (segStart < 1) {
            segments.push({
                x1: source.x + ndx * segStart * laneDist,
                y1: source.y + ndy * segStart * laneDist,
                x2: target.x,
                y2: target.y,
            });
        }
    });

    // Pass 1: Dark shadow/border
    const shadowWidth = GAME_CONFIG.CONNECTION_WIDTH + GAME_CONFIG.CONNECTION_SHADOW_WIDTH;
    for (const seg of segments) {
        connectionGraphics.moveTo(seg.x1, seg.y1);
        connectionGraphics.lineTo(seg.x2, seg.y2);
    }
    connectionGraphics.stroke({
        color: 0x000000,
        width: shadowWidth,
        alpha: GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
        cap: 'round',
    });

    // Pass 2: Foreground lane stroke
    for (const seg of segments) {
        connectionGraphics.moveTo(seg.x1, seg.y1);
        connectionGraphics.lineTo(seg.x2, seg.y2);
    }
    connectionGraphics.stroke({
        color: colorUtils.parseColor(GAME_CONFIG.CONNECTION_COLOR),
        width: GAME_CONFIG.CONNECTION_WIDTH,
        alpha: GAME_CONFIG.CONNECTION_ALPHA,
        cap: 'round',
    });
}

// ── Order Arrows ────────────────────────────────────────────────────────────

export interface OrderArrowState {
    /** Pending orders (optimistic, not yet confirmed by server) */
    pendingOrders: Set<string>;
    /** Deferred orders (queued through enemy stars) */
    deferredOrders: Set<string>;
    /** Check if star is owned by local player */
    isLocalPlayerStar: (star: StarState) => boolean;
    /** Get all stars for deferred order cleanup */
    snapshotStars: StarState[];
}

function strokePolyline(
    graphics: PIXI.Graphics,
    pts: ReadonlyArray<readonly [number, number]>,
    stroke: PIXI.StrokeInput,
): void {
    if (pts.length < 2) return;
    graphics.beginPath();
    graphics.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
        graphics.lineTo(pts[i][0], pts[i][1]);
    }
    graphics.stroke(stroke);
}

function resolveArrowPath(
    source: StarState,
    target: StarState,
): [number, number][] | undefined {
    const extraPad = GAME_CONFIG.ARROW_PATH_PADDING ?? 0;
    const trimPad = 10 + extraPad;
    const rawPolyline = (GAME_CONFIG.ORDER_ARROWS_FOLLOW_LANE_PATHS ?? false)
        ? getLanePolyline(source.id, target.id)
        : undefined;
    const basePath: ReadonlyArray<readonly [number, number]> =
        rawPolyline && rawPolyline.length >= 2
            ? rawPolyline
            : [
                  [source.x, source.y],
                  [target.x, target.y],
              ];
    const trimmed = trimLanePolylineToStarRims(basePath, source, target, trimPad);
    return trimmed.length >= 2 ? trimmed : undefined;
}

function computeArrowHeadPoints(
    tipX: number,
    tipY: number,
    angle: number,
    headLen: number,
    spreadDeg: number,
): { wing1X: number; wing1Y: number; wing2X: number; wing2Y: number } {
    const spread = (spreadDeg * Math.PI) / 180;
    return {
        wing1X: tipX - headLen * Math.cos(angle - spread),
        wing1Y: tipY - headLen * Math.sin(angle - spread),
        wing2X: tipX - headLen * Math.cos(angle + spread),
        wing2Y: tipY - headLen * Math.sin(angle + spread),
    };
}

/**
 * Render order arrows (confirmed + pending + deferred).
 * Mutates pendingOrders and deferredOrders to clean up stale entries.
 */
export function renderOrderArrows(
    linkGraphics: PIXI.Graphics,
    stars: StarState[],
    starsById: Map<string, StarState>,
    orderState: OrderArrowState,
    colorUtils: ColorUtils,
): void {
    linkGraphics.clear();

    const { pendingOrders, deferredOrders, isLocalPlayerStar, snapshotStars } = orderState;

    // Build confirmed orders from star snapshot
    const confirmedOrders = new Map<string, string>();
    stars.forEach((s) => {
        if (s.targetId) {
            confirmedOrders.set(s.id, s.targetId);
        }
    });

    // Clean up stale pending orders
    pendingOrders.forEach((key) => {
        const [sourceId] = key.split('|');
        const source = starsById.get(sourceId);
        if (!source || !isLocalPlayerStar(source)) {
            pendingOrders.delete(key);
            return;
        }
        if (confirmedOrders.has(sourceId)) {
            pendingOrders.delete(key);
        }
    });

    // Merge confirmed + pending
    const allLinks = new Set<string>();
    confirmedOrders.forEach((targetId, sourceId) => {
        allLinks.add(`${sourceId}|${targetId}`);
    });
    pendingOrders.forEach((key) => allLinks.add(key));

    // Render solid arrows
    allLinks.forEach((linkKey) => {
        const [sId, tId] = linkKey.split('|');
        const source = stars.find((s) => s.id === sId);
        const target = stars.find((s) => s.id === tId);
        if (!source || !target) return;

        const padding = 10;
        const headLen = GAME_CONFIG.ARROW_HEAD_SIZE ?? 30;
        const lineWidth = GAME_CONFIG.ARROW_SHAFT_WIDTH ?? 6;
        const arrowAlpha = GAME_CONFIG.ARROW_ALPHA ?? 0.6;
        const color = colorUtils.getPlayerColor(source.ownerId);
        const path = resolveArrowPath(source, target);
        if (!path) return;

        const totalLen = polylineTotalLength(path);
        if (totalLen <= padding) return;

        const tipDist = totalLen * (GAME_CONFIG.ARROW_LENGTH_FRACTION ?? 0.5);
        const baseDist = Math.max(0, tipDist - headLen);
        const shaftPath = slicePolylineBetweenDistances(path, 0, baseDist);
        const tip = pointAtArcLength(path, tipDist);
        const tangent = tangentAtArcFraction(
            path,
            totalLen > 0 ? tipDist / totalLen : 1,
        );
        const angle = Math.atan2(tangent.ty, tangent.tx);
        const spreadDeg = GAME_CONFIG.ARROW_HEAD_SPREAD_DEG ?? 30;
        const { wing1X, wing1Y, wing2X, wing2Y } = computeArrowHeadPoints(
            tip.x,
            tip.y,
            angle,
            headLen,
            spreadDeg,
        );

        const outlineW = GAME_CONFIG.ARROW_OUTLINE_WIDTH ?? 0;
        if (outlineW > 0) {
            const outlineColor = GAME_CONFIG.ARROW_OUTLINE_COLOR ?? 0x000000;
            const outlineAlpha = GAME_CONFIG.ARROW_OUTLINE_ALPHA ?? arrowAlpha;
            strokePolyline(linkGraphics, shaftPath, {
                color: outlineColor,
                width: lineWidth + outlineW * 2,
                alpha: outlineAlpha,
                cap: 'round',
                join: 'round',
            });
            linkGraphics.beginPath();
            linkGraphics.moveTo(tip.x, tip.y);
            linkGraphics.lineTo(wing1X, wing1Y);
            linkGraphics.lineTo(wing2X, wing2Y);
            linkGraphics.closePath();
            linkGraphics.stroke({
                color: outlineColor,
                width: outlineW,
                alpha: outlineAlpha,
                join: 'round',
            });
        }

        strokePolyline(linkGraphics, shaftPath, {
            color,
            width: lineWidth,
            alpha: arrowAlpha,
            cap: 'round',
            join: 'round',
        });

        linkGraphics.beginPath();
        linkGraphics.moveTo(tip.x, tip.y);
        linkGraphics.lineTo(wing1X, wing1Y);
        linkGraphics.lineTo(wing2X, wing2Y);
        linkGraphics.closePath();
        const headAlpha = GAME_CONFIG.ARROW_HEAD_ALPHA ?? arrowAlpha;
        linkGraphics.fill({ color, alpha: headAlpha });
    });

    // ── Deferred Orders (dashed) ─────────────────────────────────────────

    // Clean up deferred orders for stars captured by local player
    deferredOrders.forEach((key) => {
        const [sourceId] = key.split('|');
        const source = starsById.get(sourceId);
        if (source && isLocalPlayerStar(source)) {
            deferredOrders.delete(key);
        }
    });

    // Sync with server queuedOrderTargetId
    deferredOrders.forEach((key) => {
        const [sourceId, targetId] = key.split('|');
        const star = snapshotStars.find((s) => s.id === sourceId);
        if (star && star.queuedOrderTargetId && star.queuedOrderTargetId !== targetId) {
            deferredOrders.delete(key);
        }
    });

    // Render dashed arrows
    deferredOrders.forEach((linkKey) => {
        const [sId, tId] = linkKey.split('|');
        const source = stars.find((s) => s.id === sId);
        const target = stars.find((s) => s.id === tId);
        if (!source || !target) return;

        const headLen = Math.round((GAME_CONFIG.ARROW_HEAD_SIZE ?? 30) * 0.67);
        const lineWidth = Math.round((GAME_CONFIG.ARROW_SHAFT_WIDTH ?? 6) * 0.67);
        const arrowAlpha = (GAME_CONFIG.ARROW_ALPHA ?? 0.6) * 0.67;
        const path = resolveArrowPath(source, target);
        if (!path) return;
        const totalLen = polylineTotalLength(path);
        if (totalLen <= 1) return;
        const tipDist = totalLen * (GAME_CONFIG.ARROW_LENGTH_FRACTION ?? 0.5);
        const baseDist = Math.max(0, tipDist - headLen);

        // Dashed line segments
        const dashLen = GAME_CONFIG.ARROW_DASH_LENGTH ?? 15;
        const gapLen = GAME_CONFIG.ARROW_DASH_GAP ?? 10;
        let currentDist = 0;
        const humanColor = 0x4488ff;

        while (currentDist < baseDist) {
            const segEnd = Math.min(currentDist + dashLen, baseDist);
            const segment = slicePolylineBetweenDistances(path, currentDist, segEnd);
            strokePolyline(linkGraphics, segment, {
                color: humanColor,
                width: lineWidth,
                alpha: arrowAlpha,
                cap: 'round',
                join: 'round',
            });
            currentDist += dashLen + gapLen;
        }

        // Small arrowhead
        const tip = pointAtArcLength(path, tipDist);
        const tangent = tangentAtArcFraction(
            path,
            totalLen > 0 ? tipDist / totalLen : 1,
        );
        const angle = Math.atan2(tangent.ty, tangent.tx);
        const spreadDeg = GAME_CONFIG.ARROW_HEAD_SPREAD_DEG ?? 30;
        const { wing1X, wing1Y, wing2X, wing2Y } = computeArrowHeadPoints(
            tip.x,
            tip.y,
            angle,
            headLen,
            spreadDeg,
        );

        linkGraphics.beginPath();
        linkGraphics.moveTo(tip.x, tip.y);
        linkGraphics.lineTo(wing1X, wing1Y);
        linkGraphics.lineTo(wing2X, wing2Y);
        linkGraphics.closePath();
        linkGraphics.fill({ color: humanColor, alpha: arrowAlpha * 0.85 });
    });
}
