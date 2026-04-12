/**
 * Main Menu Data Definitions
 *
 * Pure data constants extracted from MainMenu.svelte.
 * Contains map definitions, AI strategies, player config types.
 */

import type { GameSettings } from '$lib/types/game.types';
import {
    PLAYER_PALETTE_DEFAULTS,
    clampPlayerHueNudge,
    hslHueToHex,
    generatePlayerPaletteHues,
} from '$lib/utils/playerPalette';

// ── AI Strategies ───────────────────────────────────────────────────────────

export const AI_STRATEGIES = [
    { id: 'default', label: 'Default' },
    { id: 'frontline', label: 'Frontline Forces' },
    { id: 'mirror', label: 'Mirror Match' },
    { id: 'spread', label: 'Even Spread' },
    { id: 'ambush', label: 'Backline Ambush' },
    { id: 'surround', label: 'Tactical Surround' },
    { id: 'staraware', label: 'Star Hunter' },
    { id: 'retreat', label: 'Ghost Retreat' },
];

// ── Player Config ───────────────────────────────────────────────────────────

export interface PlayerConfig {
    hue: number;       // 0-360 HSL hue
    hueNudge: number;
    isAI: boolean;
    difficulty: string;
    strategy: string;
}

export const DEFAULT_HUES = generatePlayerPaletteHues(
    PLAYER_PALETTE_DEFAULTS.anchorHue,
);

export function makeDefaultPlayerConfigs(
    count: number,
    anchorHue: number = PLAYER_PALETTE_DEFAULTS.anchorHue,
): PlayerConfig[] {
    const palette = generatePlayerPaletteHues(anchorHue);
    return Array.from({ length: count }, (_, i) => ({
        hue: palette[i % palette.length],
        hueNudge: clampPlayerHueNudge(0),
        isAI: i > 0,
        difficulty: 'Normal',
        strategy: 'default',
    }));
}

// ── Map Definitions ─────────────────────────────────────────────────────────

export interface MapDef {
    id: string;
    label: string;
    mapType: 'standard' | 'debug' | 'debug-b';
    stars: { x: number; y: number; color: string }[];
    connections: [number, number][];
}

export const MAP_DEFS: MapDef[] = [
    {
        id: 'standard',
        label: 'RANDOMIZED',
        mapType: 'standard',
        stars: [
            { x: 15, y: 12, color: '#4488ff' },
            { x: 45, y: 8, color: '#ff4444' },
            { x: 50, y: 35, color: '#44ff44' },
            { x: 20, y: 38, color: '#ffaa00' },
            { x: 32, y: 22, color: '#aa44ff' },
        ],
        connections: [[0, 4], [1, 4], [2, 4], [3, 4], [0, 3], [1, 2]],
    },
    {
        id: 'debug',
        label: 'DEBUG A',
        mapType: 'debug',
        stars: [
            { x: 32, y: 8, color: '#44ff44' },
            { x: 12, y: 36, color: '#ff4444' },
            { x: 52, y: 36, color: '#ffaa00' },
            { x: 52, y: 10, color: '#4488ff' },
        ],
        connections: [[0, 1], [1, 2], [2, 0], [0, 3]],
    },
    {
        id: 'debug-b',
        label: 'DEBUG B',
        mapType: 'debug-b',
        stars: [
            { x: 8, y: 22, color: '#44ff44' },
            { x: 24, y: 12, color: '#ff4444' },
            { x: 38, y: 16, color: '#ffaa00' },
            { x: 50, y: 25, color: '#aa44ff' },
            { x: 58, y: 32, color: '#4488ff' },
            { x: 14, y: 38, color: '#666' },
        ],
        connections: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5]],
    },
];

// ── Constants ───────────────────────────────────────────────────────────────

export const PLAYERS: GameSettings['playerCount'][] = [2, 3, 4, 5, 6];
export const DIFFICULTIES = ['Easy', 'Normal', 'Hard', 'Expert'];

/** Minimum hue gap between players (degrees) */
export const MIN_HUE_GAP = 30;

/** Convert HSL hue (0-360) at fixed S/L to hex string */
export function hslToHex(hue: number, s: number = 0.7, l: number = 0.55): string {
    return hslHueToHex(hue, s, l);
}
