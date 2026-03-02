// ============================================================================
// Map Transpose Flag — shared between GameCanvas and renderers
// ============================================================================
// When true, star x↔y coordinates should be swapped at the point of
// consumption (rendering, territory computation, world bounds).
// This avoids mutating star data objects (which get replaced every tick).

let _shouldTranspose = $state(false);

export const mapTranspose = {
    get active() { return _shouldTranspose; },
    set active(v: boolean) { _shouldTranspose = v; },
    /** Get display X for a star (applies transpose if active) */
    x(star: { x: number; y: number }): number {
        return _shouldTranspose ? star.y : star.x;
    },
    /** Get display Y for a star (applies transpose if active) */
    y(star: { x: number; y: number }): number {
        return _shouldTranspose ? star.x : star.y;
    },
};
