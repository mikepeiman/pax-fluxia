/**
 * Perceptual color distance utilities for player color conflict checking.
 *
 * Uses CIELAB ΔE*₀₀ (CIEDE2000) to compute perceptually uniform color distances.
 * This is better than simple hue gap because:
 * - Blue region needs more hue gap than green/yellow for same perceived difference
 * - Lightness and chroma interactions affect hue perception
 *
 * Minimum recommended ΔE for game player colors: ~30 (very distinct to anyone)
 */

// ── sRGB → CIELAB conversion pipeline ────────────────────────

/** HSL to sRGB (0-1 components) */
export function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [f(0), f(8), f(4)];
}

/** sRGB (0-1) → linear RGB */
function linearize(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Linear RGB → CIE XYZ (D65) */
function rgbToXYZ(r: number, g: number, b: number): [number, number, number] {
    const rl = linearize(r), gl = linearize(g), bl = linearize(b);
    return [
        0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl,
        0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl,
        0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl,
    ];
}

/** CIE XYZ → CIELAB (D65 white point) */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
    const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
    const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const fx = f(x / Xn), fy = f(y / Yn), fz = f(z / Zn);
    return [
        116 * fy - 16,       // L*
        500 * (fx - fy),     // a*
        200 * (fy - fz),     // b*
    ];
}

/** HSL → CIELAB (convenience) */
export function hslToLab(h: number, s: number, l: number): [number, number, number] {
    const [r, g, b] = hslToRGB(h, s, l);
    const [x, y, z] = rgbToXYZ(r, g, b);
    return xyzToLab(x, y, z);
}

// ── CIEDE2000 ΔE computation ────────────────────────

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * CIEDE2000 color difference.
 * Returns ΔE₀₀ — perceptually uniform distance.
 * ΔE₀₀ ≈ 1 is just noticeable, ≈ 30+ is very distinct.
 */
export function deltaE00(
    L1: number, a1: number, b1: number,
    L2: number, a2: number, b2: number,
): number {
    // Step 1: Calculate C'ᵢ and h'ᵢ
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cab = (C1 + C2) / 2;
    const Cab7 = Math.pow(Cab, 7);
    const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + Math.pow(25, 7))));
    const a1p = a1 * (1 + G);
    const a2p = a2 * (1 + G);
    const C1p = Math.sqrt(a1p * a1p + b1 * b1);
    const C2p = Math.sqrt(a2p * a2p + b2 * b2);
    const h1p = Math.atan2(b1, a1p) * DEG;
    const h2p = Math.atan2(b2, a2p) * DEG;
    const h1pn = h1p < 0 ? h1p + 360 : h1p;
    const h2pn = h2p < 0 ? h2p + 360 : h2p;

    // Step 2: Calculate ΔL', ΔC', ΔH'
    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp: number;
    if (C1p * C2p === 0) {
        dhp = 0;
    } else {
        let d = h2pn - h1pn;
        if (d > 180) d -= 360;
        else if (d < -180) d += 360;
        dhp = d;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * RAD);

    // Step 3: Calculate CIEDE2000 weighting functions
    const Lp = (L1 + L2) / 2;
    const Cp = (C1p + C2p) / 2;

    let Hp: number;
    if (C1p * C2p === 0) {
        Hp = h1pn + h2pn;
    } else {
        const hDiff = Math.abs(h1pn - h2pn);
        if (hDiff <= 180) {
            Hp = (h1pn + h2pn) / 2;
        } else if (h1pn + h2pn < 360) {
            Hp = (h1pn + h2pn + 360) / 2;
        } else {
            Hp = (h1pn + h2pn - 360) / 2;
        }
    }

    const T = 1
        - 0.17 * Math.cos((Hp - 30) * RAD)
        + 0.24 * Math.cos(2 * Hp * RAD)
        + 0.32 * Math.cos((3 * Hp + 6) * RAD)
        - 0.20 * Math.cos((4 * Hp - 63) * RAD);

    const SL = 1 + 0.015 * Math.pow(Lp - 50, 2) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const SC = 1 + 0.045 * Cp;
    const SH = 1 + 0.015 * Cp * T;

    const Cp7 = Math.pow(Cp, 7);
    const RT = -2 * Math.sqrt(Cp7 / (Cp7 + Math.pow(25, 7)))
        * Math.sin(60 * Math.exp(-Math.pow((Hp - 275) / 25, 2)) * RAD);

    // Step 4: Calculate ΔE₀₀
    const result = Math.sqrt(
        Math.pow(dLp / SL, 2) +
        Math.pow(dCp / SC, 2) +
        Math.pow(dHp / SH, 2) +
        RT * (dCp / SC) * (dHp / SH)
    );
    return result;
}

/**
 * Check if two HSL hues (at fixed S=0.7, L=0.55 game colors) are too close.
 * Returns ΔE₀₀ distance. Values < MIN_DELTA_E are too close.
 */
export const GAME_SAT = 0.7;
export const GAME_LIG = 0.55;
export const MIN_DELTA_E = 25; // ~very distinct for game players

export function huePerceptualDistance(hue1: number, hue2: number): number {
    const [L1, a1, b1] = hslToLab(hue1, GAME_SAT, GAME_LIG);
    const [L2, a2, b2] = hslToLab(hue2, GAME_SAT, GAME_LIG);
    return deltaE00(L1, a1, b1, L2, a2, b2);
}

/**
 * Enforce perceptual color spacing for a list of player hues.
 * Modifies hues in-place to ensure MIN_DELTA_E distance.
 * Returns the corrected hue array.
 */
export function enforcePerceptualSpacing(hues: number[]): number[] {
    const result = [...hues];
    const MAX_ATTEMPTS = 50; // Prevent infinite loops

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let anyConflict = false;
        for (let i = 1; i < result.length; i++) {
            for (let j = 0; j < i; j++) {
                const dist = huePerceptualDistance(result[i], result[j]);
                if (dist < MIN_DELTA_E) {
                    // Shift this hue forward by 30° and recheck
                    result[i] = (result[i] + 30) % 360;
                    anyConflict = true;
                }
            }
        }
        if (!anyConflict) break;
    }
    return result;
}

/**
 * Generate a perceptually-spaced palette of N hues.
 * Starts from anchorHue=0 and spaces evenly, nudging to maintain CIEDE2000 distance.
 */
export function generatePalette(count: number, s: number = GAME_SAT, l: number = GAME_LIG): number[] {
    const palette: number[] = [0];
    const step = 360 / count;

    for (let i = 1; i < count; i++) {
        let candidate = (step * i) % 360;
        for (let attempt = 0; attempt < 20; attempt++) {
            let ok = true;
            for (const existing of palette) {
                const [L1, a1, b1] = hslToLab(candidate, s, l);
                const [L2, a2, b2] = hslToLab(existing, s, l);
                if (deltaE00(L1, a1, b1, L2, a2, b2) < MIN_DELTA_E) {
                    candidate = (candidate + 15) % 360;
                    ok = false;
                    break;
                }
            }
            if (ok) break;
        }
        palette.push(candidate);
    }
    return palette;
}
