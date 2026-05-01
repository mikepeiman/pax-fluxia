export interface ViewportWorldPoint {
    x: number;
    y: number;
}

export interface ViewportWorldRect {
    minX: number;
    minY: number;
    width: number;
    height: number;
    requiredWidth: number;
    requiredHeight: number;
    source:
        | "configured_map"
        | "expanded_configured_map"
        | "derived_star_extents";
}

export interface ContentFitWorldRect {
    minX: number;
    minY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
}

interface ResolveViewportWorldRectOptions {
    points: ReadonlyArray<ViewportWorldPoint>;
    configuredWidth?: number | null;
    configuredHeight?: number | null;
    edgePaddingPx?: number;
}

interface ResolveCenteredViewportFrameOptions {
    centerX: number;
    centerY: number;
    viewportWidthPx: number;
    viewportHeightPx: number;
    scale: number;
}

const DEFAULT_EDGE_PADDING_PX = 80;

function isFinitePositive(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Resolve the stable coordinate-space world rect rooted at (0, 0).
 *
 * This is the map-space extent used for coordinate transforms and any systems
 * that need the authored map domain rather than the visible viewport-aligned
 * fill frame.
 */
export function resolveViewportWorldRect(
    options: ResolveViewportWorldRectOptions,
): ViewportWorldRect {
    const edgePaddingPx = Math.max(
        0,
        options.edgePaddingPx ?? DEFAULT_EDGE_PADDING_PX,
    );
    const maxX = Math.max(0, ...options.points.map((point) => point.x));
    const maxY = Math.max(0, ...options.points.map((point) => point.y));
    const requiredWidth = Math.max(1, maxX + edgePaddingPx);
    const requiredHeight = Math.max(1, maxY + edgePaddingPx);
    const hasConfiguredRect =
        isFinitePositive(options.configuredWidth) &&
        isFinitePositive(options.configuredHeight);

    if (!hasConfiguredRect) {
        return {
            minX: 0,
            minY: 0,
            width: requiredWidth,
            height: requiredHeight,
            requiredWidth,
            requiredHeight,
            source: "derived_star_extents",
        };
    }

    const width = Math.max(options.configuredWidth, requiredWidth);
    const height = Math.max(options.configuredHeight, requiredHeight);
    return {
        minX: 0,
        minY: 0,
        width,
        height,
        requiredWidth,
        requiredHeight,
        source:
            width === options.configuredWidth &&
            height === options.configuredHeight
                ? "configured_map"
                : "expanded_configured_map",
    };
}

/**
 * Resolve the star-fit rect used by the camera.
 *
 * This intentionally follows the live star field, not the authored world rect.
 * Camera fit and star-map centering should track the playable content.
 */
export function resolveContentFitWorldRect(
    points: ReadonlyArray<ViewportWorldPoint>,
    edgePaddingPx: number = DEFAULT_EDGE_PADDING_PX,
): ContentFitWorldRect {
    const minX = Math.min(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxX = Math.max(...points.map((point) => point.x));
    const maxY = Math.max(...points.map((point) => point.y));
    const width = Math.max(1, maxX - minX + edgePaddingPx * 2);
    const height = Math.max(1, maxY - minY + edgePaddingPx * 2);
    const paddedMinX = minX - edgePaddingPx;
    const paddedMinY = minY - edgePaddingPx;
    return {
        minX: paddedMinX,
        minY: paddedMinY,
        width,
        height,
        centerX: paddedMinX + width / 2,
        centerY: paddedMinY + height / 2,
    };
}

/**
 * Resolve the viewport-aligned territory frame in world coordinates.
 *
 * This frame is centered on the fitted content, but sized so the fill surface
 * reaches the viewport edges at the current fit scale.
 */
export function resolveCenteredViewportFrame(
    options: ResolveCenteredViewportFrameOptions,
): ContentFitWorldRect {
    const safeScale = Math.max(options.scale, 0.000001);
    const width = Math.max(1, options.viewportWidthPx / safeScale);
    const height = Math.max(1, options.viewportHeightPx / safeScale);
    return {
        minX: options.centerX - width / 2,
        minY: options.centerY - height / 2,
        width,
        height,
        centerX: options.centerX,
        centerY: options.centerY,
    };
}
