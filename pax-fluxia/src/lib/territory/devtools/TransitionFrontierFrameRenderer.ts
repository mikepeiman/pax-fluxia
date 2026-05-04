// ── Territory Transition Frame Renderer ──────────────────────────────────────
// Renders debug frames at progress t: polylines, structural vertices, change
// anchors, active-front bridge, evenly sampled morph points along active sections.
// No territory fills / no swept motion-trail fills (debug clarity).

import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type { ActiveFrontTransitionPlan } from '../layers/transition/ActiveFrontTransition';
import { sampleActiveFrontTransition } from '../layers/transition/ActiveFrontTransition';
import type { OwnerColorResolver } from './TransitionGeometryRenderer';

export const FRAME_PROGRESS_VALUES = [0.0, 0.17, 0.33, 0.5, 0.67, 0.83, 1.0] as const;

export interface FrameRenderOptions {
    width: number;
    height: number;
    resolveColor?: OwnerColorResolver;
    fillAlpha?: number;
    showVertexLabels?: boolean;
    showAllVertices?: boolean;
    /** Dots along interpolated active-section polylines (morph sampling). */
    morphSamplesPerSection?: number;
}

const C = {
    bg:              '#111111',
    staticSection:   'rgba(110, 110, 140, 0.6)',
    activeSection:   'rgba(255, 175, 0, 0.95)',
    morphSample:     'rgba(255, 100, 200, 0.95)',
    vertex:          'rgba(160, 160, 210, 0.85)',
    anchorFill:      'rgba(0, 255, 255, 0.95)',
    anchorStroke:    '#ffffff',
    afBridge:        'rgba(80, 255, 120, 0.95)',
    collapseLine:    'rgba(255, 80, 80, 0.85)',
    collapseCenter:  'rgba(255, 80, 80, 0.9)',
    growLine:        'rgba(120, 255, 120, 0.85)',
    growCenter:      'rgba(120, 255, 120, 0.9)',
    labelNormal:     '#9999cc',
    labelAnchor:     '#00ffff',
    labelCollapse:   'rgba(255, 160, 160, 1)',
    labelGrow:       'rgba(170, 255, 170, 1)',
    labelAf:         '#66ff88',
    hudBg:           'rgba(0, 0, 0, 0.72)',
    hudText:         '#ffffff',
} as const;

function drawPolyline(
    ctx: CanvasRenderingContext2D,
    pts: readonly [number, number][],
    style: string,
    width: number,
): void {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function lerpPts(
    prev: readonly [number, number][],
    next: readonly [number, number][],
    t: number,
): [number, number][] {
    const len = Math.min(prev.length, next.length);
    const out: [number, number][] = [];
    for (let i = 0; i < len; i++) {
        out.push([
            prev[i][0] + (next[i][0] - prev[i][0]) * t,
            prev[i][1] + (next[i][1] - prev[i][1]) * t,
        ]);
    }
    return out;
}

/** Evenly spaced samples along polyline by arc-length (piecewise linear). */
function samplePolylineEven(
    pts: readonly [number, number][],
    numSamples: number,
): [number, number][] {
    if (pts.length < 2 || numSamples < 2) return [...pts];
    const segLen: number[] = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1][0] - pts[i][0];
        const dy = pts[i + 1][1] - pts[i][1];
        const L = Math.sqrt(dx * dx + dy * dy);
        segLen.push(L);
        total += L;
    }
    if (total < 1e-6) return [pts[0]];
    const out: [number, number][] = [];
    for (let s = 0; s < numSamples; s++) {
        const target = (s / (numSamples - 1)) * total;
        let acc = 0;
        let seg = 0;
        while (seg < segLen.length && acc + segLen[seg] < target) {
            acc += segLen[seg];
            seg++;
        }
        if (seg >= segLen.length) {
            out.push(pts[pts.length - 1]);
            continue;
        }
        const t = segLen[seg] > 1e-6 ? (target - acc) / segLen[seg] : 0;
        const [x0, y0] = pts[seg];
        const [x1, y1] = pts[seg + 1];
        out.push([x0 + t * (x1 - x0), y0 + t * (y1 - y0)]);
    }
    return out;
}

function drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number,
    fill: string,
): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
}

function drawDiamond(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number,
    fill: string, stroke?: string,
): void {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string, x: number, y: number,
    color: string = '#ffffff',
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

export function renderTransitionFrame(
    prevTopo: FrontierTopology,
    nextTopo: FrontierTopology,
    plan: ActiveFrontTransitionPlan,
    progress: number,
    options: FrameRenderOptions,
): HTMLCanvasElement {
    const {
        width, height,
        showVertexLabels = true,
        showAllVertices = true,
        morphSamplesPerSection = 14,
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, width, height);

    // Draw territory fills if a color resolver is provided
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
                for (let i = 1; i < region.points.length; i++) {
                    ctx.lineTo(region.points[i][0], region.points[i][1]);
                }
                ctx.closePath();
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;
                ctx.fill();
            }
        } catch {
            // fill sampling failed — draw debug overlays without fills
        }
    }

    const activeSectionIds = new Set<string>();
    const anchorIds = new Set<string>();
    const anchorLabel = new Map<string, string>();
    plan.fronts.forEach((front, fi) => {
        for (const id of front.activeSectionIds) activeSectionIds.add(id);
        anchorIds.add(front.anchorStartId);
        anchorIds.add(front.anchorEndId);
        anchorLabel.set(front.anchorStartId, `AF${fi}-start`);
        anchorLabel.set(front.anchorEndId, `AF${fi}-end`);
    });

    for (const [sectionId, section] of nextTopo.sections) {
        if (activeSectionIds.has(sectionId)) continue;
        drawPolyline(ctx, section.points, C.staticSection, 1.5);
    }

    for (const sectionId of activeSectionIds) {
        const prevSec = prevTopo.sections.get(sectionId);
        const nextSec = nextTopo.sections.get(sectionId);
        if (!prevSec && !nextSec) continue;
        const prev = prevSec?.points ?? nextSec!.points;
        const next = nextSec?.points ?? prevSec!.points;
        const curr = lerpPts(prev, next, progress);
        drawPolyline(ctx, curr, C.activeSection, 3.5);

        const samples = samplePolylineEven(curr, morphSamplesPerSection);
        for (const [sx, sy] of samples) {
            drawCircle(ctx, sx, sy, 2.2, C.morphSample);
        }
    }

    plan.fronts.forEach((front, fi) => {
        const a = nextTopo.vertices.get(front.anchorStartId) ?? prevTopo.vertices.get(front.anchorStartId);
        const b = nextTopo.vertices.get(front.anchorEndId) ?? prevTopo.vertices.get(front.anchorEndId);
        if (!a || !b) return;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(a.point[0], a.point[1]);
        ctx.lineTo(b.point[0], b.point[1]);
        ctx.strokeStyle = C.afBridge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        const mx = (a.point[0] + b.point[0]) / 2;
        const my = (a.point[1] + b.point[1]) / 2;
        drawLabel(ctx, `AF${fi}  (${front.activeSectionIds.size} secs)`, mx - 10, my - 14, C.labelAf, 11);
    });

    if (showAllVertices) {
        for (const [vertexId, vertex] of nextTopo.vertices) {
            if (anchorIds.has(vertexId)) continue;
            const [x, y] = vertex.point;
            drawCircle(ctx, x, y, 2.5, C.vertex);
            if (showVertexLabels) {
                const kind = vertex.kind.replace('junction_3way', 'J').replace('world_intersection', 'WI').replace('world_corner', 'WC').replace('lane_anchor', 'LA').replace('star_anchor', 'SA');
                drawLabel(ctx, `${kind}:${vertexId.slice(0, 6)}`, x + 4, y - 9, C.labelNormal);
            }
        }
    }

    for (const anchorId of anchorIds) {
        const v = nextTopo.vertices.get(anchorId) ?? prevTopo.vertices.get(anchorId);
        if (!v) continue;
        const [x, y] = v.point;
        drawDiamond(ctx, x, y, 9, C.anchorFill, C.anchorStroke);
        if (showVertexLabels) {
            const lbl = anchorLabel.get(anchorId) ?? anchorId.slice(0, 10);
            drawLabel(ctx, `⚓ ${lbl} (${Math.round(x)},${Math.round(y)})`, x + 12, y - 11, C.labelAnchor, 10);
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
        drawLabel(ctx, `✕ ${target.ownerId}`, cx + 8, cy - 7, C.labelCollapse, 10);
    }

    for (const target of plan.expandTargets) {
        if (target.points.length < 3) continue;
        const [cx, cy] = target.center;
        const expandPts = target.points.map(([px, py]): [number, number] => [
            cx + (px - cx) * progress,
            cy + (py - cy) * progress,
        ]);
        drawPolyline(ctx, [...expandPts, expandPts[0]], C.growLine, 2);
        drawCircle(ctx, cx, cy, 5, C.growCenter);
        drawLabel(ctx, `＋ ${target.ownerId}`, cx + 8, cy - 7, C.labelGrow, 10);
    }

    const pct = `t=${(progress * 100).toFixed(0).padStart(3)}%`;
    const info = `${pct}  fronts=${plan.fronts.length}  active_secs=${activeSectionIds.size}`;
    ctx.font = 'bold 11px monospace';
    const hudW = ctx.measureText(info).width + 18;
    ctx.fillStyle = C.hudBg;
    ctx.fillRect(8, 8, hudW, 22);
    ctx.fillStyle = C.hudText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(info, 16, 13);

    return canvas;
}

export function renderTransitionFrameSeries(
    prevTopo: FrontierTopology,
    nextTopo: FrontierTopology,
    plan: ActiveFrontTransitionPlan,
    options: FrameRenderOptions,
): { progress: number; canvas: HTMLCanvasElement }[] {
    return FRAME_PROGRESS_VALUES.map(progress => ({
        progress,
        canvas: renderTransitionFrame(prevTopo, nextTopo, plan, progress, options),
    }));
}
