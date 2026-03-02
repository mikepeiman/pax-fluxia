// ============================================================================
// Map Transpose Flag — shared between GameCanvas and renderers
// ============================================================================
// When true, star x↔y coordinates should be swapped at the point of
// consumption (rendering, territory computation, world bounds).
// This avoids mutating star data objects (which get replaced every tick).
// Additionally, the Y axis is flipped so that portrait top-left → landscape
// bottom-left (matching physical device rotation).

let _shouldTranspose = $state(false);
let _mapHeight = $state(0);

export const mapTranspose = {
    get active() { return _shouldTranspose; },
    set active(v: boolean) { _shouldTranspose = v; },

    /** Set the map height used for axis flip when transposing */
    set mapHeight(h: number) { _mapHeight = h; },
    get mapHeight() { return _mapHeight; },

    /** Get display X for a star (applies transpose if active) */
    x(star: { x: number; y: number }): number {
        return _shouldTranspose ? star.y : star.x;
    },
    /** Get display Y for a star (applies transpose + axis flip if active) */
    y(star: { x: number; y: number }): number {
        return _shouldTranspose ? (_mapHeight - star.x) : star.y;
    },
};
