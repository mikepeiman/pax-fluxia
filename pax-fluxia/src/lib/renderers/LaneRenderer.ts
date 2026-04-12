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
import { getDirectedLanePolyline } from '$lib/lanes/lanePolylineCache';
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
    const smoothPaths: [number, number][][] = [];
    const ringGapForLane = GAME_CONFIG.STAR_RING_RADIUS + (GAME_CONFIG.STAR_RING_WIDTH ?? 2) * 0.5;

    function collectStraightSegments(source: StarState, target: StarState): void {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const laneDist = Math.sqrt(dx * dx + dy * dy);
        if (laneDist < 1) return;

        const ndx = dx / laneDist;
        const ndy = dy / laneDist;
        const gaps: [number, number][] = [];

        const srcGap = ringGapForLane / laneDist;
        const tgtGap = ringGapForLane / laneDist;
        gaps.push([0, srcGap]);
        gaps.push([1 - tgtGap, 1]);

        for (const star of stars) {
            if (star.id === source.id || star.id === target.id) continue;

            const ax = star.x - source.x;
            const ay = star.y - source.y;
            const t = (ax * ndx + ay * ndy) / laneDist;
            if (t <= 0 || t >= 1) continue;

            const projX = source.x + ndx * t * laneDist;
            const projY = source.y + ndy * t * laneDist;
            const perpDist = Math.sqrt((star.x - projX) ** 2 + (star.y - projY) ** 2);
            const clearance = ringGapForLane + 6;
            if (perpDist < clearance) {
                const halfChord = Math.sqrt(
                    Math.max(0, clearance * clearance - perpDist * perpDist),
                );
                const gapStart = Math.max(0, t - halfChord / laneDist);
                const gapEnd = Math.min(1, t + halfChord / laneDist);
                gaps.push([gapStart, gapEnd]);
            }
        }

        gaps.sort((a, b) => a[0] - b[0]);
        const merged: [number, number][] = [];
        for (const gap of gaps) {
            if (merged.length > 0 && gap[0] <= merged[merged.length - 1][1]) {
                merged[merged.length - 1][1] = Math.max(
                    merged[merged.length - 1][1],
                    gap[1],
                );
            } else {
                merged.push([...gap]);
            }
        }

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
    }

    connections.forEach((conn) => {
        const source = starsById.get(conn.sourceId);
        const target = starsById.get(conn.targetId);
        if (!source || !target) return;

        const trimPad = Math.max(
            0,
            ringGapForLane - Math.min(source.radius, target.radius),
        );
        const poly = getDirectedLanePolyline(conn.sourceId, conn.targetId);
        if (poly && poly.length > 2) {
            const trimmed = trimLanePolylineToStarRims(poly, source, target, trimPad);
            if (trimmed.length >= 2) {
                smoothPaths.push(trimmed);
                return;
            }
            collectStraightSegments(source, target);
            return;
        }
        collectStraightSegments(source, target);
    });

    // Pass 1: Dark shadow/border
    const shadowWidth = GAME_CONFIG.CONNECTION_WIDTH + GAME_CONFIG.CONNECTION_SHADOW_WIDTH;
    for (const seg of segments) {
        connectionGraphics.moveTo(seg.x1, seg.y1);
        connectionGraphics.lineTo(seg.x2, seg.y2);
    }
    for (const path of smoothPaths) {
        strokeSmoothLanePath(connectionGraphics, path, {
            color: 0x000000,
            width: shadowWidth,
            alpha: GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
            cap: 'round',
            join: 'round',
        });
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
    for (const path of smoothPaths) {
        strokeSmoothLanePath(connectionGraphics, path, {
            color: colorUtils.parseColor(GAME_CONFIG.CONNECTION_COLOR),
            width: GAME_CONFIG.CONNECTION_WIDTH,
            alpha: GAME_CONFIG.CONNECTION_ALPHA,
            cap: 'round',
            join: 'round',
        });
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

function strokeSmoothLanePath(
    graphics: PIXI.Graphics,
    pts: ReadonlyArray<readonly [number, number]>,
    stroke: PIXI.StrokeInput,
): void {
    if (pts.length < 2) return;
    graphics.beginPath();
    graphics.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 2) {
        graphics.lineTo(pts[1][0], pts[1][1]);
        graphics.stroke(stroke);
        return;
    }
    for (let i = 1; i < pts.length - 1; i++) {
        const [cx, cy] = pts[i];
        const [nx, ny] = pts[i + 1];
        const midX = (cx + nx) * 0.5;
        const midY = (cy + ny) * 0.5;
        graphics.quadraticCurveTo(cx, cy, midX, midY);
    }
    const penultimate = pts[pts.length - 2];
    const last = pts[pts.length - 1];
    graphics.quadraticCurveTo(
        penultimate[0],
        penultimate[1],
        last[0],
        last[1],
    );
    graphics.stroke(stroke);
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
        ? getDirectedLanePolyline(source.id, target.id)
        : undefined;
    const basePath: ReadonlyArray<readonly [number, number]> =
        rawPolyline && rawPolyline.length >= 2
            ? rawPolyline
            : [
                  [source.x, source.y],
                  [target.x, target.y],
              ];
    const trimmed = trimLanePolylineToStarRims(basePath, source, target, trimPad);
    if (trimmed.length >= 2) return trimmed;
    const straightFallback = trimLanePolylineToStarRims(
        [
            [source.x, source.y],
            [target.x, target.y],
        ],
        source,
        target,
        trimPad,
    );
    return straightFallback.length >= 2 ? straightFallback : undefined;
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

type ArrowPoint = { x: number; y: number };

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function pointFromTip(tipX: number, tipY: number, angle: number, distance: number): ArrowPoint {
    return {
        x: tipX - distance * Math.cos(angle),
        y: tipY - distance * Math.sin(angle),
    };
}

function computeArrowHeadPolygon(
    tipX: number,
    tipY: number,
    angle: number,
    headLen: number,
    spreadDeg: number,
): ArrowPoint[] {
    const { wing1X, wing1Y, wing2X, wing2Y } = computeArrowHeadPoints(
        tipX,
        tipY,
        angle,
        headLen,
        spreadDeg,
    );
    const notch = clamp01(GAME_CONFIG.ARROW_HEAD_NOTCH ?? 0.2);
    const style = GAME_CONFIG.ARROW_HEAD_STYLE ?? 'triangle';
    const spineBack = pointFromTip(
        tipX,
        tipY,
        angle,
        headLen * (0.62 + notch * 0.32),
    );
    const deepBack = pointFromTip(
        tipX,
        tipY,
        angle,
        headLen * (0.88 + notch * 0.22),
    );
    const leftInset = pointFromTip(
        tipX,
        tipY,
        angle - ((spreadDeg * Math.PI) / 180) * 0.4,
        headLen * 0.48,
    );
    const rightInset = pointFromTip(
        tipX,
        tipY,
        angle + ((spreadDeg * Math.PI) / 180) * 0.4,
        headLen * 0.48,
    );

    if (style === 'chevron') {
        return [
            { x: tipX, y: tipY },
            { x: wing1X, y: wing1Y },
            spineBack,
            { x: wing2X, y: wing2Y },
        ];
    }
    if (style === 'kite') {
        return [
            { x: tipX, y: tipY },
            { x: wing1X, y: wing1Y },
            deepBack,
            { x: wing2X, y: wing2Y },
        ];
    }
    if (style === 'spear') {
        return [
            { x: tipX, y: tipY },
            { x: wing1X, y: wing1Y },
            leftInset,
            deepBack,
            rightInset,
            { x: wing2X, y: wing2Y },
        ];
    }
    return [
        { x: tipX, y: tipY },
        { x: wing1X, y: wing1Y },
        { x: wing2X, y: wing2Y },
    ];
}

function tracePolygon(graphics: PIXI.Graphics, points: ArrowPoint[]): void {
    if (points.length < 3) return;
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
}

function getArrowForceFactor(source: StarState): number {
    const maxShips = Math.max(1, GAME_CONFIG.ARROW_FORCE_INTENSITY_MAX_SHIPS ?? 250);
    const intensity = clamp01(GAME_CONFIG.ARROW_FORCE_INTENSITY ?? 0);
    return clamp01((source.activeShips ?? 0) / maxShips) * intensity;
}

function drawArrowShaft(
    graphics: PIXI.Graphics,
    shaftPath: ReadonlyArray<readonly [number, number]>,
    colorUtils: ColorUtils,
    color: number,
    lineWidth: number,
    arrowAlpha: number,
    forceFactor: number,
): void {
    if (shaftPath.length < 2) return;

    const steps = Math.max(1, Math.round(GAME_CONFIG.ARROW_SHAFT_STEPS ?? 1));
    if (steps === 1) {
        strokePolyline(graphics, shaftPath, {
            color,
            width: lineWidth * (1 + forceFactor * 0.24),
            alpha: clamp01(arrowAlpha + forceFactor * 0.16),
            cap: 'round',
            join: 'round',
        });
        return;
    }

    const totalLen = polylineTotalLength(shaftPath as [number, number][]);
    if (totalLen <= 0) return;
    const flowSpeed = Math.max(0, GAME_CONFIG.ARROW_FLOW_SPEED ?? 0);
    const flowPhase = flowSpeed > 0 ? (performance.now() * 0.001 * flowSpeed) % 1 : 0;

    for (let stepIndex = 0; stepIndex < steps; stepIndex++) {
        const startDist = (totalLen * stepIndex) / steps;
        const endDist = (totalLen * (stepIndex + 1)) / steps;
        const segment = slicePolylineBetweenDistances(shaftPath, startDist, endDist);
        if (segment.length < 2) continue;

        const tipBias = (stepIndex + 1) / steps;
        const animatedPosition = (((stepIndex + 0.5) / steps) + flowPhase) % 1;
        const flowGlow = 1 - Math.min(Math.abs(animatedPosition - 0.82) / 0.24, 1);
        const lightBoost = clamp01(0.12 + tipBias * 0.34 + flowGlow * 0.24 + forceFactor * 0.28);
        const segmentColor = colorUtils.getLightenedColor(color, lightBoost);
        const segmentAlpha = clamp01(
            arrowAlpha * (0.5 + tipBias * 0.5) + flowGlow * 0.14 + forceFactor * 0.18,
        );
        strokePolyline(graphics, segment, {
            color: segmentColor,
            width: lineWidth * (0.82 + tipBias * 0.24 + forceFactor * 0.22),
            alpha: segmentAlpha,
            cap: 'round',
            join: 'round',
        });
    }
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

        const headLen = GAME_CONFIG.ARROW_HEAD_SIZE ?? 30;
        const lineWidth = GAME_CONFIG.ARROW_SHAFT_WIDTH ?? 6;
        const arrowAlpha = GAME_CONFIG.ARROW_ALPHA ?? 0.6;
        const color = colorUtils.getPlayerColor(source.ownerId);
        const forceFactor = getArrowForceFactor(source);
        const path = resolveArrowPath(source, target);
        if (!path) return;

        const totalLen = polylineTotalLength(path);
        if (totalLen <= 10) return;

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
        const headPoints = computeArrowHeadPolygon(
            tip.x,
            tip.y,
            angle,
            headLen,
            spreadDeg,
        );
        const headColor = colorUtils.getLightenedColor(
            color,
            clamp01(0.22 + forceFactor * 0.45),
        );

        const outlineW = GAME_CONFIG.ARROW_OUTLINE_WIDTH ?? 0;
        if (outlineW > 0) {
            const outlineColor = GAME_CONFIG.ARROW_OUTLINE_COLOR ?? 0x000000;
            const outlineAlpha = GAME_CONFIG.ARROW_OUTLINE_ALPHA ?? arrowAlpha;
            strokePolyline(linkGraphics, shaftPath, {
                color: outlineColor,
                width: (lineWidth * (1 + forceFactor * 0.24)) + outlineW * 2,
                alpha: clamp01(outlineAlpha + forceFactor * 0.12),
                cap: 'round',
                join: 'round',
            });
            tracePolygon(linkGraphics, headPoints);
            linkGraphics.stroke({
                color: outlineColor,
                width: outlineW,
                alpha: clamp01(outlineAlpha + forceFactor * 0.12),
                join: 'round',
            });
        }

        drawArrowShaft(
            linkGraphics,
            shaftPath,
            colorUtils,
            color,
            lineWidth,
            arrowAlpha,
            forceFactor,
        );

        tracePolygon(linkGraphics, headPoints);
        const headAlpha = clamp01((GAME_CONFIG.ARROW_HEAD_ALPHA ?? arrowAlpha) + forceFactor * 0.16);
        linkGraphics.fill({ color: headColor, alpha: headAlpha });

        const headVfxAlpha = clamp01(
            (GAME_CONFIG.ARROW_HEAD_VFX_ALPHA ?? 0) * (0.7 + forceFactor * 0.9),
        );
        if (headVfxAlpha > 0) {
            linkGraphics.circle(
                tip.x,
                tip.y,
                headLen * (0.42 + forceFactor * 0.18),
            );
            linkGraphics.fill({
                color: colorUtils.getLightenedColor(headColor, 0.4),
                alpha: headVfxAlpha,
            });
        }
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
        const headPoints = computeArrowHeadPolygon(
            tip.x,
            tip.y,
            angle,
            headLen,
            spreadDeg,
        );
        const headColor = colorUtils.getLightenedColor(humanColor, 0.2);

        tracePolygon(linkGraphics, headPoints);
        linkGraphics.fill({ color: headColor, alpha: arrowAlpha * 0.85 });

        const headVfxAlpha = clamp01((GAME_CONFIG.ARROW_HEAD_VFX_ALPHA ?? 0) * 0.7);
        if (headVfxAlpha > 0) {
            linkGraphics.circle(tip.x, tip.y, headLen * 0.34);
            linkGraphics.fill({
                color: colorUtils.getLightenedColor(headColor, 0.45),
                alpha: headVfxAlpha,
            });
        }
    });
}
