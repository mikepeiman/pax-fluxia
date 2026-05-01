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

interface ResolveViewportWorldRectOptions {
    points: ReadonlyArray<ViewportWorldPoint>;
    configuredWidth?: number | null;
    configuredHeight?: number | null;
    edgePaddingPx?: number;
}

const DEFAULT_EDGE_PADDING_PX = 80;

function isFinitePositive(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Resolve the authoritative world rectangle for map presentation.
 *
 * The stage fit and the territory renderers both assume a world rooted at (0, 0).
 * If they infer different extents, the map drifts and leaves dead margins.
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
