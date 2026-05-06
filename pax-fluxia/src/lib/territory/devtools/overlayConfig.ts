// Territory debug overlay config.
// Shared mutable singleton: UI writes, runtime renderers read.

export const OVERLAY_PANEL_KEYS = {
    enabled: 'debugOverlayEnabled',
    pauseOnConquestStart: 'debugOverlayPauseOnConquestStart',
    showAllVertices: 'debugOverlayShowVertices',
    showActiveFront: 'debugOverlayShowActiveFront',
    showClassificationLabels: 'debugOverlayShowClassificationLabels',
    showPolylineSamples: 'debugOverlayShowPolylineSamples',
    freezeOnUnclassifiedBoundary: 'debugOverlayFreezeOnUnclassifiedBoundary',
} as const;

export const overlayConfig = {
    /** Master toggle. */
    enabled: false,
    /** Pause immediately when a new PVV4 conquest transition starts. */
    pauseOnConquestStart: false,
    /** Draw every structural frontier vertex. */
    showAllVertices: true,
    /** Highlight active front sections and anchors. */
    showActiveFront: true,
    /** Show per-section and per-vertex classification labels. */
    showClassificationLabels: true,
    /** Draw sampled points along each section polyline. */
    showPolylineSamples: true,
    /** Stride between rendered sample dots (1 = every point). */
    polylineSampleStride: 4,
    /** Pause when PV boundary classification surfaces a defect. */
    freezeOnUnclassifiedBoundary: false,
};

export function applyOverlayConfigFromPanel(
    panel: Record<string, unknown> | null | undefined,
): void {
    if (!panel) return;
    const readBool = (key: string, fallback: boolean): boolean => {
        const value = panel[key];
        return typeof value === 'boolean' ? value : fallback;
    };

    overlayConfig.enabled = readBool(
        OVERLAY_PANEL_KEYS.enabled,
        overlayConfig.enabled,
    );
    overlayConfig.pauseOnConquestStart = readBool(
        OVERLAY_PANEL_KEYS.pauseOnConquestStart,
        overlayConfig.pauseOnConquestStart,
    );
    overlayConfig.showAllVertices = readBool(
        OVERLAY_PANEL_KEYS.showAllVertices,
        overlayConfig.showAllVertices,
    );
    overlayConfig.showActiveFront = readBool(
        OVERLAY_PANEL_KEYS.showActiveFront,
        overlayConfig.showActiveFront,
    );
    overlayConfig.showClassificationLabels = readBool(
        OVERLAY_PANEL_KEYS.showClassificationLabels,
        overlayConfig.showClassificationLabels,
    );
    overlayConfig.showPolylineSamples = readBool(
        OVERLAY_PANEL_KEYS.showPolylineSamples,
        overlayConfig.showPolylineSamples,
    );
    overlayConfig.freezeOnUnclassifiedBoundary = readBool(
        OVERLAY_PANEL_KEYS.freezeOnUnclassifiedBoundary,
        overlayConfig.freezeOnUnclassifiedBoundary,
    );
}
