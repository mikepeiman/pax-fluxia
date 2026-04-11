// ============================================================================
// Color Utilities — Shared player color functions for all renderers
// ============================================================================
//
// Extracted from GameCanvas.svelte HSL color utilities section.
// Provides getPlayerColor, HSL conversion, density-tier color mapping,
// and safe color parsing (string/number/object).
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';
import type { PlayerHSL, ColorUtils } from './RenderContext';
import { defaultPlayerPaletteHex, fallbackPlayerColor } from '$lib/utils/playerPalette';

const DEFAULT_PLAYER_HEX = defaultPlayerPaletteHex().map((hex) =>
    parseInt(hex.replace('#', ''), 16),
);
const PLAYER_COLORS: Record<string, number> = {
    'human-player': DEFAULT_PLAYER_HEX[0] ?? 0x4488ff,
    'ai-1': DEFAULT_PLAYER_HEX[1] ?? 0xff4466,
    'ai-2': DEFAULT_PLAYER_HEX[2] ?? 0x44ff88,
    'ai-3': DEFAULT_PLAYER_HEX[3] ?? 0xffcc44,
    'ai-4': DEFAULT_PLAYER_HEX[4] ?? 0xaa66ff,
    'ai-5': DEFAULT_PLAYER_HEX[5] ?? 0xff8844,
};

// HSL cache per player (invalidated when hex changes)
const playerHSLCache: Map<string, PlayerHSL> = new Map();

/** Convert 0xRRGGBB integer to { h, s, l } */
export function hexToHSL(hex: number): { h: number; s: number; l: number } {
    const r = ((hex >> 16) & 0xff) / 255;
    const g = ((hex >> 8) & 0xff) / 255;
    const b = (hex & 0xff) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
    }
    return { h, s, l };
}

/** Convert { h, s, l } back to 0xRRGGBB integer */
export function hslToHex(h: number, s: number, l: number): number {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1: number, g1: number, b1: number;
    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    const ri = Math.round((r1 + m) * 255);
    const gi = Math.round((g1 + m) * 255);
    const bi = Math.round((b1 + m) * 255);
    return (ri << 16) | (gi << 8) | bi;
}

/** Safely parse color from config (string/number/Tweakpane object) */
export function parseColor(input: string | number | { r: number; g: number; b: number }): number {
    if (typeof input === 'number') return input;
    if (typeof input === 'string') {
        if (input.startsWith('#')) return parseInt(input.slice(1), 16);
        if (input.startsWith('0x')) return parseInt(input, 16);
        return parseInt(input);
    }
    if (typeof input === 'object' && input !== null) {
        if ('r' in input && 'g' in input && 'b' in input) {
            return (input.r << 16) + (input.g << 8) + input.b;
        }
    }
    return 0xffffff;
}

/**
 * Create a ColorUtils instance bound to a player color resolver.
 * 
 * The resolver function typically calls `activeGameStore.getPlayerColor()`
 * with a fallback to the static PLAYER_COLORS palette.
 */
export function createColorUtils(
    resolvePlayerColor: (ownerId: string) => number | undefined,
): ColorUtils {

    function getPlayerColor(ownerId: string): number {
        let hex =
            resolvePlayerColor(ownerId) ??
            PLAYER_COLORS[ownerId] ??
            parseInt(fallbackPlayerColor(ownerId).replace('#', ''), 16);
        // F-75: Apply minimum lightness floor so dark colors don't vanish on dark bg
        const minL = GAME_CONFIG.MIN_COLOR_LIGHTNESS ?? 0;
        if (minL > 0) {
            const hsl = hexToHSL(hex);
            if (hsl.l < minL) {
                hex = hslToHex(hsl.h, hsl.s, minL);
            }
        }
        return hex;
    }

    function getPlayerHSL(ownerId: string): PlayerHSL {
        let cached = playerHSLCache.get(ownerId);
        const currentHex = getPlayerColor(ownerId);
        if (cached && cached.hex === currentHex) return cached;
        const hsl = hexToHSL(currentHex);
        cached = { hex: currentHex, h: hsl.h, s: hsl.s, l: hsl.l };
        playerHSLCache.set(ownerId, cached);
        return cached;
    }

    function getDensityFillColor(
        playerHsl: PlayerHSL,
        ringTier: number,
        darken: boolean = false,
    ): number {
        if (ringTier <= 0) return playerHsl.hex;

        const hueStep = GAME_CONFIG.DENSITY_HUE_STEP;
        const satStep = GAME_CONFIG.DENSITY_SAT_STEP;
        const lightStep = GAME_CONFIG.DENSITY_LIGHT_STEP;
        const maxTiers = GAME_CONFIG.DENSITY_TIERS;
        const tier = Math.min(ringTier, maxTiers);

        // Cumulative hue shift: each tier shifts further from base
        const hueShift = hueStep * tier;

        const satBoost = satStep * tier;
        const lightBoost = darken ? -(lightStep * tier) : lightStep * tier;

        return hslToHex(
            playerHsl.h + hueShift,
            playerHsl.s + satBoost,
            playerHsl.l + lightBoost,
        );
    }

    /** F-75: Lighten a hex color by intensity (0-1). Used for glow outline. */
    function getLightenedColor(hex: number, intensity: number): number {
        if (intensity <= 0) return hex;
        const hsl = hexToHSL(hex);
        // Boost lightness: at intensity=1, push to 0.85; at 0.5, halfway there
        const targetL = 0.85;
        const newL = hsl.l + (targetL - hsl.l) * intensity;
        return hslToHex(hsl.h, hsl.s * (1 - intensity * 0.3), newL);
    }

    return {
        getPlayerColor,
        getPlayerHSL,
        getDensityFillColor,
        getLightenedColor,
        parseColor,
        hexToHSL,
        hslToHex,
    };
}
