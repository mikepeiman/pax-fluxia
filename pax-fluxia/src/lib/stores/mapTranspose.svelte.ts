// ============================================================================
// Map Transpose Flag — shared between GameCanvas and gameStore
// ============================================================================
// When true, star x↔y coordinates are swapped in toGameState() so that
// all consumers (rendering, territory workers, etc.) see transposed positions.
// This avoids mutating star data objects (which get replaced every tick).

let _shouldTranspose = $state(false);

export const mapTranspose = {
    get active() { return _shouldTranspose; },
    set active(v: boolean) { _shouldTranspose = v; },
};
