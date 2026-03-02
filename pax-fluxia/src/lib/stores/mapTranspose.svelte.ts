// ============================================================================
// Map Transpose Flag — shared between GameCanvas and renderers
// ============================================================================
// When true, star x↔y coordinates should be swapped at the point of
// consumption (rendering, territory computation, world bounds).
// This avoids mutating star data objects (which get replaced every tick).
// Additionally, the Y axis is flipped so that the transpose behaves as a
// 90° counter-clockwise rotation matching physical device rotation.

let _shouldTranspose = $state(false);
let _mapWidth = $state(0);

export const mapTranspose = {
    get active() { return _shouldTranspose; },
    set active(v: boolean) { _shouldTranspose = v; },

    /** Set the pre-transpose map width used for axis flip */
    set mapWidth(w: number) { _mapWidth = w; },
    get mapWidth() { return _mapWidth; },

    /** Get display X for a star (applies transpose if active) */
    x(star: { x: number; y: number }): number {
        return _shouldTranspose ? star.y : star.x;
    },
    /** Get display Y for a star (applies transpose + axis flip if active) */
    y(star: { x: number; y: number }): number {
        return _shouldTranspose ? (_mapWidth - star.x) : star.y;
    },
};
