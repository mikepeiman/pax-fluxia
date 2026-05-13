// Territory Transition Frame Renderer
// Renders debug frames at progress t: polylines, structural vertices, change
// anchors, active-front bridge, and evenly sampled morph points along active
// sections. No territory fills or swept motion-trail fills.

import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type { ActiveFrontTransitionPlan } from '../layers/transition/ActiveFrontTransition';
import {
    getActiveFrontChangeAnchors,
    getActiveFrontMonotonicCorrespondence,
    sampleActiveFrontSectionGeometry,
    sampleActiveFrontTransition,
} from '../layers/transition/ActiveFrontTransition';
import {
    ACTIVE_FRONT_DEBUG_COLORS,
    ACTIVE_FRONT_LEGEND_ITEMS,
    activeFrontColorToCssHex,
} from './activeFrontDebugStyle';
import type { OwnerColorResolver } from './TransitionGeometryRenderer';

export const FRAME_PROGRESS_VALUES = [0.0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0] as const;

export interface FrameRenderOptions {
    width: number;
    height: number;
    resolveColor?: OwnerColorResolver;
    fillAlpha?: number;
    showVertexLabels?: boolean;
    showAllVertices?: boolean;
    transitionVertexCount?: number;
    /** @deprecated Use transitionVertexCount. Kept for older package callers. */
    morphSamplesPerSection?: number;
}

const C = {
    bg: '#111111',
    staticSection: 'rgba(110, 110, 140, 0.6)',
    activeSection: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.activeSection),
    vertex: 'rgba(160, 160, 210, 0.85)',
    anchorFill: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.changeAnchor),
    anchorStroke: '#ffffff',
    afBridge: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.activeFront),
    collapseLine: 'rgba(255, 80, 80, 0.85)',
    collapseCenter: 'rgba(255, 80, 80, 0.9)',
    labelNormal: '#9999cc',
    labelAnchor: '#00ffff',
    labelCollapse: 'rgba(255, 160, 160, 1)',
    labelAf: '#66ff88',
    prevFront: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.prevFront),
    postFront: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.activeSection),
    activeFront: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.activeFront),
    tv: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.transitionVertex),
    defectMissing: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.defectMissingFrontier),
    defectSplit: activeFrontColorToCssHex(ACTIVE_FRONT_DEBUG_COLORS.defectSplitMerge),
} as const;

function drawPolyline(
    ctx: CanvasRenderingContext2D,
    pts: readonly [number, number][],
    style: string,
    width: number,
    dashed = false,
): void {
    if (pts.length < 2) return;
    ctx.save();
    if (dashed) ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
}

function drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    fill: string,
): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
}

function drawDiamond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    fill: string,
    stroke?: string,
): void {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color = '#ffffff',
    fontSize = 9,
): void {
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function drawFrameLegend(
    ctx: CanvasRenderingContext2D,
    lines: readonly string[],
): void {
    const x = 12;
    const y = 12;
    const width = 372;
    const rowStartY = y + 24 + lines.length * 14 + 10;
    const height = 28 + lines.length * 14 + ACTIVE_FRONT_LEGEND_ITEMS.length * 16 + 12;

    ctx.save();
    ctx.fillStyle = 'rgba(4, 18, 24, 0.84)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(80, 220, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    drawLabel(ctx, 'AF Diagnostics', x + 10, y + 8, '#bdf8ff', 12);
    ctx.font = 'bold 12px monospace';
    lines.forEach((line, index) => {
        drawLabel(ctx, line, x + 10, y + 24 + index * 14, '#d8eef8', 10);
    });

    ACTIVE_FRONT_LEGEND_ITEMS.forEach((item, index) => {
        const rowY = rowStartY + index * 16;
        const color = activeFrontColorToCssHex(item.color);
        if (item.kind === 'ring') {
            ctx.beginPath();
            ctx.arc(x + 20, rowY + 6, 4.5, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (item.kind === 'square') {
            ctx.fillStyle = color;
            ctx.fillRect(x + 15.5, rowY + 1.5, 9, 9);
        } else if (item.kind === 'diamond') {
            drawDiamond(ctx, x + 20, rowY + 6, 5, color, '#ffffff');
        } else if (item.kind === 'dot') {
            drawCircle(ctx, x + 20, rowY + 6, 3.2, color);
        } else {
            drawPolyline(
                ctx,
                [
                    [x + 8, rowY + 6],
                    [x + 32, rowY + 6],
                ],
                color,
                item.kind === 'thick' ? 5 : 3,
                item.kind === 'dashed',
            );
        }
        drawLabel(ctx, item.label, x + 42, rowY, '#e7f8ff', 10);
    });
    ctx.restore();
}

export function renderTransitionFrame(
    prevTopo: FrontierTopology,
    nextTopo: FrontierTopology,
    plan: ActiveFrontTransitionPlan,
    progress: number,
    options: FrameRenderOptions,
): HTMLCanvasElement {
    const {
        width,
        height,
        showVertexLabels = true,
        showAllVertices = true,
        transitionVertexCount,
        morphSamplesPerSection,
    } = options;
    const tvCount =
        transitionVertexCount ??
        morphSamplesPerSection ??
        plan.diagnostics.tunables.transitionVertexCount;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, width, height);

    const { resolveColor, fillAlpha = 0.35 } = options;
    if (resolveColor) {
        try {
            const fillFrame = sampleActiveFrontTransition(plan, prevTopo, nextTopo, progress);
            for (const region of fillFrame.regions) {
                if (region.points.length < 3) continue;
                const hex = resolveColor(region.ownerId);
                const r = (hex >> 16) & 0xff;
                const g = (hex >> 8) & 0xff;
                const b = hex & 0xff;
                ctx.beginPath();
                ctx.moveTo(region.points[0][0], region.points[0][1]);
                for (let i = 1; i < region.points.length; i += 1) {
                    ctx.lineTo(region.points[i][0], region.points[i][1]);
                }
                ctx.closePath();
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;
                ctx.fill();
            }
        } catch {
            // Fill sampling failed; keep drawing diagnostic overlays.
        }
    }

    const activeSectionIds = new Set<string>();
    const anchorIds = new Set<string>();
    const anchorLabel = new Map<string, string>();
    const sampledSectionGeometry = sampleActiveFrontSectionGeometry(
        plan,
        prevTopo,
        nextTopo,
        progress,
    );

    plan.fronts.forEach((front, fi) => {
        for (const id of front.activeSectionIds) {
            activeSectionIds.add(id);
        }
        anchorIds.add(front.anchorStartId);
        anchorIds.add(front.anchorEndId);
        anchorLabel.set(front.anchorStartId, `CA${fi}-start`);
        anchorLabel.set(front.anchorEndId, `CA${fi}-end`);
    });

    for (const [sectionId, section] of nextTopo.sections) {
        if (activeSectionIds.has(sectionId)) continue;
        drawPolyline(ctx, section.points, C.staticSection, 1.5);
    }

    for (const sectionId of activeSectionIds) {
        const nextSec = nextTopo.sections.get(sectionId);
        const curr = sampledSectionGeometry.get(sectionId) ?? nextSec?.points;
        if (!curr) continue;
        drawPolyline(ctx, curr, C.activeSection, 3.5);
    }

    plan.fronts.forEach((front, fi) => {
        const a =
            nextTopo.vertices.get(front.anchorStartId) ??
            prevTopo.vertices.get(front.anchorStartId);
        const b =
            nextTopo.vertices.get(front.anchorEndId) ??
            prevTopo.vertices.get(front.anchorEndId);
        if (!a || !b) return;

        drawPolyline(ctx, [a.point, b.point], C.afBridge, 1.5, true);

        const mx = (a.point[0] + b.point[0]) / 2;
        const my = (a.point[1] + b.point[1]) / 2;
        drawLabel(ctx, `front ${fi}  (${front.activeSectionIds.size} sections)`, mx - 10, my - 14, C.labelAf, 11);

        const changeAnchors = getActiveFrontChangeAnchors(front);
        if (!changeAnchors) return;
        const [sx, sy] = changeAnchors.startPoint;
        const [ex, ey] = changeAnchors.endPoint;
        drawDiamond(ctx, sx, sy, 7, C.anchorFill, C.anchorStroke);
        drawDiamond(ctx, ex, ey, 7, C.anchorFill, C.anchorStroke);
        drawLabel(ctx, `CA${fi}-start`, sx + 8, sy - 8, C.labelAf, 10);
        drawLabel(ctx, `CA${fi}-end`, ex + 8, ey - 8, C.labelAf, 10);

        if (front.splitMode === 'none') {
            const correspondence = getActiveFrontMonotonicCorrespondence(
                front,
                progress,
                tvCount,
            );
            if (correspondence) {
                drawPolyline(ctx, correspondence.prevFront, C.prevFront, 2.5, true);
                drawPolyline(ctx, correspondence.postFront, C.postFront, 2.5);
                drawPolyline(ctx, correspondence.activeFront, C.activeFront, 5);
                for (const [tx, ty] of correspondence.activeFront) {
                    drawCircle(ctx, tx, ty, 3.2, C.tv);
                }
            }
            return;
        }

        const defectColor =
            front.splitMode === '1to2' || front.splitMode === '2to1'
                ? C.defectSplit
                : C.defectMissing;
        for (const path of [...front.prevPaths, ...front.nextPaths]) {
            drawPolyline(ctx, path.points, defectColor, 3.5);
        }
    });

    if (showAllVertices) {
        for (const [vertexId, vertex] of nextTopo.vertices) {
            if (anchorIds.has(vertexId)) continue;
            const [x, y] = vertex.point;
            drawCircle(ctx, x, y, 2.5, C.vertex);
            if (showVertexLabels) {
                const kind = vertex.kind
                    .replace('junction_3way', 'J')
                    .replace('world_intersection', 'WI')
                    .replace('world_corner', 'WC')
                    .replace('lane_anchor', 'LA')
                    .replace('star_anchor', 'SA');
                drawLabel(ctx, `${kind}:${vertexId.slice(0, 6)}`, x + 4, y - 9, C.labelNormal);
            }
        }
    }

    for (const anchorId of anchorIds) {
        const vertex = nextTopo.vertices.get(anchorId) ?? prevTopo.vertices.get(anchorId);
        if (!vertex) continue;
        const [x, y] = vertex.point;
        drawDiamond(ctx, x, y, 9, C.anchorFill, C.anchorStroke);
        if (showVertexLabels) {
            const label = anchorLabel.get(anchorId) ?? anchorId.slice(0, 10);
            drawLabel(ctx, `A ${label} (${Math.round(x)},${Math.round(y)})`, x + 12, y - 11, C.labelAnchor, 10);
        }
    }

    for (const target of plan.collapseTargets) {
        if (target.points.length < 3) continue;
        const [cx, cy] = target.center;
        const collapsePts = target.points.map(([px, py]): [number, number] => [
            px + (cx - px) * progress,
            py + (cy - py) * progress,
        ]);
        drawPolyline(ctx, [...collapsePts, collapsePts[0]], C.collapseLine, 2);
        drawCircle(ctx, cx, cy, 5, C.collapseCenter);
        drawLabel(ctx, `X ${target.ownerId}`, cx + 8, cy - 7, C.labelCollapse, 10);
    }

    const pct = `t=${progress.toFixed(2)}`;
    drawFrameLegend(ctx, [
        `${pct} fronts=${plan.fronts.length} active_sections=${activeSectionIds.size}`,
        `TVs=${tvCount}`,
    ]);

    return canvas;
}

export function renderTransitionFrameSeries(
    prevTopo: FrontierTopology,
    nextTopo: FrontierTopology,
    plan: ActiveFrontTransitionPlan,
    options: FrameRenderOptions,
): { progress: number; canvas: HTMLCanvasElement }[] {
    return FRAME_PROGRESS_VALUES.map((progress) => ({
        progress,
        canvas: renderTransitionFrame(prevTopo, nextTopo, plan, progress, options),
    }));
}
