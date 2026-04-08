// ── Territory Debug Overlay Config ───────────────────────────────────────────
// Shared mutable config singleton — written by the debug panel UI,
// read by the live PixiJS overlay each frame. No reactivity framework needed.

export const overlayConfig = {
    /** Master toggle — overlay drawn on the game canvas each frame. */
    enabled: false,
    /** Draw every frontier vertex as a small labeled dot. */
    showAllVertices: true,
    /** Highlight the active front sections (gold) and change anchors (cyan). */
    showActiveFront: true,
    /**
     * Draw sampled points along each section polyline (structural vertices are sparse;
     * curves are dense Chaikin samples between junctions).
     */
    showPolylineSamples: true,
    /** Stride between rendered sample dots (1 = every interior point). */
    polylineSampleStride: 4,
};
