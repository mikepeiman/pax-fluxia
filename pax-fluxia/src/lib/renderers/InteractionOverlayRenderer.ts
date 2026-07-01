import { GAME_CONFIG } from "$lib/config/game.config";
import {
    getDirectedLanePolyline,
} from "$lib/lanes/lanePolylineCache";
import {
    pointAtArcLength,
    polylineTotalLength,
    tangentAtArcFraction,
    trimLanePolylineToStarRims,
} from "$lib/lanes/laneGeometry";
import type { StarState } from "$lib/types/game.types";
import type { ColorUtils } from "./RenderContext";

type OverlayPoint = { x: number; y: number };

interface OverlayTransform {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
}

interface InteractionOverlayOrder {
    source: StarState;
    target: StarState;
    kind: "solid" | "deferred";
}

export interface InteractionOverlayState {
    ctx: CanvasRenderingContext2D;
    canvasWidth: number;
    canvasHeight: number;
    stars: ReadonlyArray<StarState>;
    starsById: ReadonlyMap<string, StarState>;
    pendingOrders: ReadonlySet<string>;
    deferredOrders: ReadonlySet<string>;
    activeStarId: string | null;
    dragSourceId: string | null;
    dragHoverTargetId: string | null;
    isDragging: boolean;
    dragSourceCenter: OverlayPoint | null;
    dragCurrentWorld: OverlayPoint | null;
    transform: OverlayTransform;
    projectWorldPoint: (point: OverlayPoint) => OverlayPoint;
    isLocalPlayerStar: (star: StarState) => boolean;
    colorUtils: ColorUtils;
}

function worldToScreen(
    transform: OverlayTransform,
    point: OverlayPoint,
): OverlayPoint {
    return {
        x: transform.offsetX + point.x * transform.scaleX,
        y: transform.offsetY + point.y * transform.scaleY,
    };
}

function withAlpha(color: number, alpha: number): string {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function buildVisibleOrders(
    state: InteractionOverlayState,
): InteractionOverlayOrder[] {
    const visible = new Map<string, InteractionOverlayOrder>();

    for (const star of state.stars) {
        if (!star.targetId) continue;
        const target = state.starsById.get(star.targetId);
        if (!target) continue;
        visible.set(`${star.id}|${target.id}`, {
            source: star,
            target,
            kind: "solid",
        });
    }

    for (const orderKey of state.pendingOrders) {
        const [sourceId, targetId] = orderKey.split("|");
        const source = state.starsById.get(sourceId);
        const target = state.starsById.get(targetId);
        if (!source || !target) continue;
        visible.set(orderKey, { source, target, kind: "solid" });
    }

    for (const star of state.stars) {
        if (!star.queuedOrderTargetId) continue;
        const target = state.starsById.get(star.queuedOrderTargetId);
        if (!target) continue;
        visible.set(`${star.id}|${target.id}`, {
            source: star,
            target,
            kind: "deferred",
        });
    }

    for (const orderKey of state.deferredOrders) {
        const [sourceId, targetId] = orderKey.split("|");
        const source = state.starsById.get(sourceId);
        const target = state.starsById.get(targetId);
        if (!source || !target) continue;
        visible.set(orderKey, { source, target, kind: "deferred" });
    }

    return [...visible.values()];
}

function getDisplayStarPoint(
    state: InteractionOverlayState,
    star: Pick<StarState, "x" | "y">,
): OverlayPoint {
    return state.projectWorldPoint({ x: star.x, y: star.y });
}

function getArrowPolyline(
    state: InteractionOverlayState,
    source: StarState,
    target: StarState,
): OverlayPoint[] {
    const sourcePoint = getDisplayStarPoint(state, source);
    const targetPoint = getDisplayStarPoint(state, target);
    const lanePolyline = getDirectedLanePolyline(source.id, target.id);
    const trimmedPath = lanePolyline?.length
        ? trimLanePolylineToStarRims(
              lanePolyline,
              { x: source.x, y: source.y, radius: source.radius },
              { x: target.x, y: target.y, radius: target.radius },
              GAME_CONFIG.ARROW_PATH_PADDING ?? 5,
          )
        : null;

    if (!trimmedPath || trimmedPath.length < 2) {
        return [
            worldToScreen(state.transform, sourcePoint),
            worldToScreen(state.transform, targetPoint),
        ];
    }

    return trimmedPath.map((point) =>
        worldToScreen(
            state.transform,
            state.projectWorldPoint({ x: point[0], y: point[1] }),
        ),
    );
}

function drawPolyline(
    ctx: CanvasRenderingContext2D,
    points: ReadonlyArray<OverlayPoint>,
): void {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) {
        const point = points[index]!;
        ctx.lineTo(point.x, point.y);
    }
}

function drawArrow(
    state: InteractionOverlayState,
    order: InteractionOverlayOrder,
): void {
    const { ctx } = state;
    const path = getArrowPolyline(state, order.source, order.target);
    const totalLength = polylineTotalLength(
        path.map((point) => [point.x, point.y] as [number, number]),
    );
    if (path.length < 2 || totalLength <= 6) return;

    const sourceColor = state.colorUtils.getPlayerColor(order.source.ownerId);
    const isDeferred = order.kind === "deferred";
    const shaftWidth = isDeferred
        ? Math.max(2, (GAME_CONFIG.ARROW_SHAFT_WIDTH ?? 6) * 0.7)
        : GAME_CONFIG.ARROW_SHAFT_WIDTH ?? 6;
    const shaftAlpha = isDeferred
        ? (GAME_CONFIG.ARROW_ALPHA ?? 0.6) * 0.7
        : GAME_CONFIG.ARROW_ALPHA ?? 0.6;
    const headLength = isDeferred
        ? Math.max(12, (GAME_CONFIG.ARROW_HEAD_SIZE ?? 30) * 0.7)
        : GAME_CONFIG.ARROW_HEAD_SIZE ?? 30;
    const dashLength = GAME_CONFIG.ARROW_DASH_LENGTH ?? 15;
    const dashGap = GAME_CONFIG.ARROW_DASH_GAP ?? 10;
    const tipDistance = totalLength * (GAME_CONFIG.ARROW_LENGTH ?? 0.5);
    const baseDistance = Math.max(0, tipDistance - headLength);
    const shaftPath = pointAtArcLength(
        path.map((point) => [point.x, point.y] as [number, number]),
        baseDistance,
    );
    const shaftEnd = { x: shaftPath.x, y: shaftPath.y };
    const strokeColor = isDeferred ? 0x4488ff : sourceColor;

    ctx.save();
    drawPolyline(ctx, [
        ...path.slice(0, Math.max(1, path.length - 1)),
        shaftEnd,
    ]);
    ctx.strokeStyle = withAlpha(strokeColor, shaftAlpha);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = shaftWidth;
    if (isDeferred) {
        ctx.setLineDash([dashLength, dashGap]);
    } else {
        ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.restore();

    const tip = pointAtArcLength(
        path.map((point) => [point.x, point.y] as [number, number]),
        tipDistance,
    );
    const tangent = tangentAtArcFraction(
        path.map((point) => [point.x, point.y] as [number, number]),
        totalLength > 0 ? tipDistance / totalLength : 1,
    );
    const angle = Math.atan2(tangent.ty, tangent.tx);
    const spreadRadians =
        ((GAME_CONFIG.ARROW_HEAD_SPREAD_DEG ?? 30) * Math.PI) / 180;
    const left = {
        x: tip.x - headLength * Math.cos(angle - spreadRadians * 0.5),
        y: tip.y - headLength * Math.sin(angle - spreadRadians * 0.5),
    };
    const right = {
        x: tip.x - headLength * Math.cos(angle + spreadRadians * 0.5),
        y: tip.y - headLength * Math.sin(angle + spreadRadians * 0.5),
    };

    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fillStyle = withAlpha(
        state.colorUtils.getLightenedColor(strokeColor, isDeferred ? 0.2 : 0.3),
        shaftAlpha,
    );
    ctx.fill();
}

function drawSelectionRing(
    state: InteractionOverlayState,
    starId: string,
    color: number,
    width: number,
    alpha: number,
): void {
    const star = state.starsById.get(starId);
    if (!star) return;
    const center = worldToScreen(
        state.transform,
        getDisplayStarPoint(state, star),
    );
    const radius = Math.max(14, (star.radius + 12) * state.transform.scaleX);
    state.ctx.beginPath();
    state.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    state.ctx.strokeStyle = withAlpha(color, alpha);
    state.ctx.lineWidth = width;
    state.ctx.stroke();
}

function drawDragPreview(state: InteractionOverlayState): void {
    if (
        !state.isDragging ||
        !state.dragSourceCenter ||
        !state.dragCurrentWorld
    ) {
        return;
    }
    const source = worldToScreen(state.transform, state.dragSourceCenter);
    const cursor = worldToScreen(state.transform, state.dragCurrentWorld);
    state.ctx.beginPath();
    state.ctx.moveTo(source.x, source.y);
    state.ctx.lineTo(cursor.x, cursor.y);
    state.ctx.strokeStyle = withAlpha(0x00ffff, 0.75);
    state.ctx.lineWidth = 3;
    state.ctx.stroke();

    state.ctx.beginPath();
    state.ctx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2);
    state.ctx.strokeStyle = withAlpha(0x00ffff, 0.9);
    state.ctx.lineWidth = 2;
    state.ctx.stroke();

    if (!state.dragHoverTargetId) return;
    const target = state.starsById.get(state.dragHoverTargetId);
    if (!target) return;
    const targetCenter = worldToScreen(
        state.transform,
        getDisplayStarPoint(state, target),
    );
    const ringColor = state.isLocalPlayerStar(target) ? 0x00ff00 : 0xff4466;
    state.ctx.beginPath();
    state.ctx.arc(
        targetCenter.x,
        targetCenter.y,
        Math.max(14, (target.radius + 15) * state.transform.scaleX),
        0,
        Math.PI * 2,
    );
    state.ctx.strokeStyle = withAlpha(ringColor, 0.85);
    state.ctx.lineWidth = 3;
    state.ctx.stroke();
}

export function renderInteractionOverlay(state: InteractionOverlayState): void {
    const { ctx } = state;
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

    for (const order of buildVisibleOrders(state)) {
        drawArrow(state, order);
    }

    if (state.activeStarId) {
        drawSelectionRing(state, state.activeStarId, 0x00ffff, 3, 0.85);
    }
    if (state.dragSourceId && state.dragSourceId !== state.activeStarId) {
        drawSelectionRing(state, state.dragSourceId, 0xffcc33, 2, 0.7);
    }

    drawDragPreview(state);
}
