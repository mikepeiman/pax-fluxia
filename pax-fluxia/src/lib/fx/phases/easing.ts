// ============================================================================
// FX Phases — Shared Easing Utilities
// ============================================================================

/** Standard easeInOutQuad used by ORB + LANE departure */
export function easeInOutQuad(t: number): number {
    return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Configurable easing for travel arcs.
 * Extracted from GameCanvas for reuse by all travel behaviors.
 */
export function applyTravelEasing(
    t: number,
    type: 'easeInOut' | 'easeIn' | 'easeOut' | 'linear',
    power: number,
): number {
    switch (type) {
        case 'linear':
            return t;
        case 'easeIn':
            return Math.pow(t, power);
        case 'easeOut':
            return 1 - Math.pow(1 - t, power);
        case 'easeInOut':
        default:
            if (t < 0.5) {
                return Math.pow(2, power - 1) * Math.pow(t, power);
            } else {
                return 1 - Math.pow(-2 * t + 2, power) / 2;
            }
    }
}
