// Territory debug overlay config.
// Shared mutable singleton: UI writes, Pixi overlay reads.

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
