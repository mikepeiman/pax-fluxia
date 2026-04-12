import { GAME_LIG, GAME_SAT } from '$lib/utils/colorDistance';

export const PLAYER_PALETTE_SIZE = 6;
export const PLAYER_PALETTE_STORAGE_KEY = 'pax-fluxia-player-palette';
export const PLAYER_HUE_STEP_DEGREES = 5;
export const PLAYER_HUE_NUDGE_LIMIT = 15;

export interface PlayerPaletteSettings {
    anchorHue: number;
    saturation: number;
    lightness: number;
    nudges: number[];
}

export const PLAYER_PALETTE_DEFAULTS: PlayerPaletteSettings = {
    anchorHue: 210,
    saturation: 70,
    lightness: 55,
    nudges: Array.from({ length: PLAYER_PALETTE_SIZE }, () => 0),
};

const SPREAD_ORDERS: Record<number, number[]> = {
    1: [0],
    2: [0, 1],
    3: [0, 2, 1],
    4: [0, 2, 1, 3],
    5: [0, 2, 4, 1, 3],
    6: [0, 3, 1, 4, 2, 5],
};

export function normalizeHue(hue: number): number {
    const wrapped = hue % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function clampPlayerHueNudge(nudge: number): number {
    if (!Number.isFinite(nudge)) return 0;
    return Math.max(-PLAYER_HUE_NUDGE_LIMIT, Math.min(PLAYER_HUE_NUDGE_LIMIT, Math.round(nudge)));
}

export function normalizePlayerPaletteNudges(nudges?: number[] | null): number[] {
    return Array.from({ length: PLAYER_PALETTE_SIZE }, (_, index) =>
        clampPlayerHueNudge(nudges?.[index] ?? 0),
    );
}

function toHexChannel(value: number): string {
    return Math.round(value).toString(16).padStart(2, '0');
}

export function loadPlayerPaletteSettings(): PlayerPaletteSettings {
    if (typeof window === 'undefined') return { ...PLAYER_PALETTE_DEFAULTS };
    try {
        const raw = localStorage.getItem(PLAYER_PALETTE_STORAGE_KEY);
        if (!raw) return { ...PLAYER_PALETTE_DEFAULTS };
        const parsed = JSON.parse(raw) as Partial<PlayerPaletteSettings>;
        return {
            anchorHue:
                typeof parsed.anchorHue === 'number'
                    ? normalizeHue(parsed.anchorHue)
                    : PLAYER_PALETTE_DEFAULTS.anchorHue,
            saturation:
                typeof parsed.saturation === 'number'
                    ? parsed.saturation
                    : PLAYER_PALETTE_DEFAULTS.saturation,
            lightness:
                typeof parsed.lightness === 'number'
                    ? parsed.lightness
                    : PLAYER_PALETTE_DEFAULTS.lightness,
            nudges: normalizePlayerPaletteNudges(parsed.nudges),
        };
    } catch {
        return { ...PLAYER_PALETTE_DEFAULTS };
    }
}

export function savePlayerPaletteSettings(settings: PlayerPaletteSettings): void {
    if (typeof window === 'undefined') return;
    const normalized: PlayerPaletteSettings = {
        anchorHue: normalizeHue(settings.anchorHue),
        saturation: settings.saturation,
        lightness: settings.lightness,
        nudges: normalizePlayerPaletteNudges(settings.nudges),
    };
    localStorage.setItem(PLAYER_PALETTE_STORAGE_KEY, JSON.stringify(normalized));
}

export function hslHueToHex(
    hue: number,
    saturation: number = PLAYER_PALETTE_DEFAULTS.saturation / 100,
    lightness: number = PLAYER_PALETTE_DEFAULTS.lightness / 100,
): string {
    const h = normalizeHue(hue);
    const s = Math.max(0, Math.min(1, saturation));
    const l = Math.max(0, Math.min(1, lightness));
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return 255 * color;
    };

    return `#${toHexChannel(f(0))}${toHexChannel(f(8))}${toHexChannel(f(4))}`;
}

export function generatePlayerPaletteHues(
    anchorHue: number,
    count: number = PLAYER_PALETTE_SIZE,
    nudgesOrSaturation: number[] | number = GAME_SAT,
    lightness: number = GAME_LIG,
): number[] {
    const normalizedAnchor = normalizeHue(anchorHue);
    const targetCount = Math.max(1, Math.min(count, PLAYER_PALETTE_SIZE));
    const nudges = Array.isArray(nudgesOrSaturation)
        ? normalizePlayerPaletteNudges(nudgesOrSaturation).slice(0, targetCount)
        : [];
    void nudgesOrSaturation;
    void lightness;

    const step = 360 / targetCount;
    const baseSlots = Array.from({ length: targetCount }, (_, index) =>
        normalizeHue(normalizedAnchor + step * index),
    );
    const order = SPREAD_ORDERS[targetCount] ?? baseSlots.map((_, index) => index);
    return order.map((index, orderedIndex) =>
        normalizeHue((baseSlots[index] ?? normalizedAnchor) + (nudges[orderedIndex] ?? 0)),
    );
}

export function buildPlayerPaletteHex(
    anchorHue: number,
    count: number = PLAYER_PALETTE_SIZE,
    nudgesOrSaturationPct: number[] | number = PLAYER_PALETTE_DEFAULTS.saturation,
    lightnessOrSaturationPct: number = PLAYER_PALETTE_DEFAULTS.lightness,
    maybeLightnessPct?: number,
): string[] {
    const nudges = Array.isArray(nudgesOrSaturationPct)
        ? normalizePlayerPaletteNudges(nudgesOrSaturationPct)
        : [];
    const saturationPct = Array.isArray(nudgesOrSaturationPct)
        ? lightnessOrSaturationPct
        : nudgesOrSaturationPct;
    const lightnessPct = Array.isArray(nudgesOrSaturationPct)
        ? (maybeLightnessPct ?? PLAYER_PALETTE_DEFAULTS.lightness)
        : lightnessOrSaturationPct;
    const hues = generatePlayerPaletteHues(
        anchorHue,
        count,
        nudges,
    );
    return hues.map((hue) => hslHueToHex(hue, saturationPct / 100, lightnessPct / 100));
}

export function defaultPlayerPaletteHex(): string[] {
    return buildPlayerPaletteHex(
        PLAYER_PALETTE_DEFAULTS.anchorHue,
        PLAYER_PALETTE_SIZE,
        PLAYER_PALETTE_DEFAULTS.saturation,
        PLAYER_PALETTE_DEFAULTS.lightness,
    );
}

export function fallbackPlayerColor(ownerId: string): string {
    if (!ownerId || ownerId === 'neutral') return '#556677';
    const palette = defaultPlayerPaletteHex();
    if (ownerId === 'human-player') return palette[0];
    const aiMatch = /^ai-(\d+)$/.exec(ownerId);
    if (aiMatch) {
        const index = Number.parseInt(aiMatch[1] ?? '1', 10);
        return palette[Math.min(index, palette.length - 1)] ?? palette[0];
    }

    let hash = 0;
    for (let i = 0; i < ownerId.length; i++) {
        hash = (hash * 31 + ownerId.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length] ?? palette[0];
}
