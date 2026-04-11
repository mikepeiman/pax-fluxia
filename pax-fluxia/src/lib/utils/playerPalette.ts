import {
    GAME_LIG,
    GAME_SAT,
    deltaE00,
    hslToLab,
} from '$lib/utils/colorDistance';

export const PLAYER_PALETTE_SIZE = 6;
export const PLAYER_PALETTE_STORAGE_KEY = 'pax-fluxia-player-palette';
export const PLAYER_HUE_STEP_DEGREES = 5;

export interface PlayerPaletteSettings {
    anchorHue: number;
    saturation: number;
    lightness: number;
}

export const PLAYER_PALETTE_DEFAULTS: PlayerPaletteSettings = {
    anchorHue: 210,
    saturation: 70,
    lightness: 55,
};

const IDEAL_SLOT_OFFSETS = [0, 180, 120, 300, 60, 240, 30, 210, 150, 330, 90, 270];

function normalizeHue(hue: number): number {
    const wrapped = hue % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
}

function circularHueDistance(a: number, b: number): number {
    const diff = Math.abs(normalizeHue(a) - normalizeHue(b));
    return Math.min(diff, 360 - diff);
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
    saturation: number = GAME_SAT,
    lightness: number = GAME_LIG,
): number[] {
    const normalizedAnchor = normalizeHue(anchorHue);
    const targetCount = Math.max(1, Math.min(count, PLAYER_PALETTE_SIZE));
    const chosen = [normalizedAnchor];
    const chosenLabs = [hslToLab(normalizedAnchor, saturation, lightness)];
    const candidates: { hue: number; lab: [number, number, number] }[] = [];

    for (let hue = 0; hue < 360; hue += PLAYER_HUE_STEP_DEGREES) {
        const normalizedHue = normalizeHue(hue);
        if (normalizedHue === normalizedAnchor) continue;
        candidates.push({
            hue: normalizedHue,
            lab: hslToLab(normalizedHue, saturation, lightness),
        });
    }

    while (chosen.length < targetCount && candidates.length > 0) {
        const targetHue = normalizeHue(
            normalizedAnchor +
                IDEAL_SLOT_OFFSETS[Math.min(chosen.length, IDEAL_SLOT_OFFSETS.length - 1)],
        );
        let bestIndex = 0;
        let bestScore = -Infinity;
        let bestHueDistance = -Infinity;
        let bestTargetDistance = Infinity;

        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            let minDeltaE = Infinity;
            for (const lab of chosenLabs) {
                const score = deltaE00(
                    candidate.lab[0],
                    candidate.lab[1],
                    candidate.lab[2],
                    lab[0],
                    lab[1],
                    lab[2],
                );
                if (score < minDeltaE) minDeltaE = score;
            }

            const minHueDistance = chosen.reduce(
                (minDistance, existingHue) =>
                    Math.min(minDistance, circularHueDistance(candidate.hue, existingHue)),
                180,
            );
            const targetDistance = circularHueDistance(candidate.hue, targetHue);

            if (
                minDeltaE > bestScore ||
                (Math.abs(minDeltaE - bestScore) < 0.001 &&
                    (minHueDistance > bestHueDistance ||
                        (minHueDistance === bestHueDistance &&
                            targetDistance < bestTargetDistance)))
            ) {
                bestIndex = i;
                bestScore = minDeltaE;
                bestHueDistance = minHueDistance;
                bestTargetDistance = targetDistance;
            }
        }

        const winner = candidates.splice(bestIndex, 1)[0];
        chosen.push(winner.hue);
        chosenLabs.push(winner.lab);
    }

    return chosen;
}

export function buildPlayerPaletteHex(
    anchorHue: number,
    count: number = PLAYER_PALETTE_SIZE,
    saturationPct: number = PLAYER_PALETTE_DEFAULTS.saturation,
    lightnessPct: number = PLAYER_PALETTE_DEFAULTS.lightness,
): string[] {
    const hues = generatePlayerPaletteHues(
        anchorHue,
        count,
        saturationPct / 100,
        lightnessPct / 100,
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
