// ============================================================================
// MetaballRenderer — CPU-computed influence field territory rendering
// ============================================================================
//
// Renders organic, blobby territory regions by computing influence fields
// on a coarse grid (CPU), then rendering colored rectangles via PIXI Graphics.
//
// Each owned star contributes an influence field; territory ownership is
// determined per-cell by which player's summed influence is strongest.
//
// Falloff modes: inverse-square, gaussian, smoothstep
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

// ── Cache ──────────────────────────────────────────────────────────────────

let cachedFingerprint = '';
let territoryGraphics: PIXI.Graphics | null = null;
let cachedPlayerMap: Map<string, number> = new Map();

// ── Falloff Functions ──────────────────────────────────────────────────────

function falloffInverseSquare(dist: number, radius: number): number {
    const d = dist / radius;
    return 1 / (1 + d * d);
}

function falloffGaussian(dist: number, radius: number): number {
    const d = dist / radius;
    return Math.exp(-d * d);
}

function falloffSmoothstep(dist: number, radius: number): number {
    const t = Math.max(0, Math.min(1, 1 - dist / radius));
    return t * t * (3 - 2 * t);
}

type FalloffFn = (dist: number, radius: number) => number;

const FALLOFF_MAP: Record<string, FalloffFn> = {
    'inverse-square': falloffInverseSquare,
    'gaussian': falloffGaussian,
    'smoothstep': falloffSmoothstep,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRGB(hex: number): [number, number, number] {
    return [
        (hex >> 16) & 0xff,
        (hex >> 8) & 0xff,
        hex & 0xff,
    ];
}

function rgbToHex(r: number, g: number, b: number): number {
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}:${s.activeShips}|`;
    }
    fp += `${GAME_CONFIG.METABALL_INFLUENCE_RADIUS}:${GAME_CONFIG.METABALL_FALLOFF}`;
    fp += `:${GAME_CONFIG.METABALL_BLEND_SHARPNESS}:${GAME_CONFIG.METABALL_ALPHA}`;
    fp += `:${GAME_CONFIG.METABALL_CELL_SIZE}:${GAME_CONFIG.METABALL_THRESHOLD}`;
    fp += `:${GAME_CONFIG.METABALL_STRENGTH_MULT}:${GAME_CONFIG.METABALL_EDGE_FADE}`;
    fp += `:${GAME_CONFIG.TERRITORY_MODE}`;
    return fp;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Render metaball territory overlay using CPU-computed influence grid.
 * Computes per-cell influence from all owned stars, determines winning
 * player per cell, and renders colored rectangles.
 */
export function renderMetaball(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
): void {
    const show = GAME_CONFIG.TERRITORY_MODE === 'metaball';

    if (!show) {
        if (territoryGraphics) territoryGraphics.visible = false;
        return;
    }

    // Ensure graphics exists
    if (!territoryGraphics) {
        territoryGraphics = new PIXI.Graphics();
        container.addChild(territoryGraphics);
    }
    territoryGraphics.visible = true;

    // Only consider owned stars
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        territoryGraphics.visible = false;
        return;
    }

    // Check fingerprint — skip if nothing changed
    const fingerprint = buildFingerprint(stars);
    if (fingerprint === cachedFingerprint) return;
    cachedFingerprint = fingerprint;

    // Config
    const radius = GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 120;
    const falloffType = GAME_CONFIG.METABALL_FALLOFF ?? 'inverse-square';
    const sharpness = GAME_CONFIG.METABALL_BLEND_SHARPNESS ?? 3.0;
    const alpha = GAME_CONFIG.METABALL_ALPHA ?? 0.5;
    const cellSize = GAME_CONFIG.METABALL_CELL_SIZE ?? 8;
    const threshold = GAME_CONFIG.METABALL_THRESHOLD ?? 0.05;
    const strengthMult = GAME_CONFIG.METABALL_STRENGTH_MULT ?? 1.0;
    const edgeFade = GAME_CONFIG.METABALL_EDGE_FADE ?? 3.0;
    const falloffFn = FALLOFF_MAP[falloffType] ?? falloffInverseSquare;

    // Build player index map
    cachedPlayerMap.clear();
    const playerIds: string[] = [];
    for (const s of ownedStars) {
        if (s.ownerId && !cachedPlayerMap.has(s.ownerId)) {
            cachedPlayerMap.set(s.ownerId, playerIds.length);
            playerIds.push(s.ownerId);
        }
    }

    // Get player colors
    const playerColors: [number, number, number][] = playerIds.map(
        pid => hexToRGB(colorUtils.getPlayerColor(pid))
    );

    // Coarse grid
    const cols = Math.ceil(worldWidth / cellSize);
    const rows = Math.ceil(worldHeight / cellSize);

    // Precompute star data
    const starData = ownedStars.map(s => ({
        x: s.x,
        y: s.y,
        playerIdx: cachedPlayerMap.get(s.ownerId!) ?? 0,
        strength: (0.5 + Math.min(2.0, Math.log2(Math.max(1, s.activeShips + s.damagedShips)) * 0.2)) * strengthMult,
    }));

    // Clear and redraw
    territoryGraphics.clear();

    const numPlayers = playerIds.length;

    // Per-pixel computation on the coarse grid
    for (let row = 0; row < rows; row++) {
        const py = (row + 0.5) * cellSize;
        for (let col = 0; col < cols; col++) {
            const px = (col + 0.5) * cellSize;

            // Accumulate influence per player
            const inf = new Float32Array(numPlayers);
            for (const star of starData) {
                const dx = px - star.x;
                const dy = py - star.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                inf[star.playerIdx] += falloffFn(dist, radius) * star.strength;
            }

            // Find top player
            let maxInf = 0;
            let maxPlayer = -1;
            let secondInf = 0;
            for (let p = 0; p < numPlayers; p++) {
                if (inf[p] > maxInf) {
                    secondInf = maxInf;
                    maxInf = inf[p];
                    maxPlayer = p;
                } else if (inf[p] > secondInf) {
                    secondInf = inf[p];
                }
            }

            if (maxPlayer < 0 || maxInf < threshold) continue;

            // Compute color (blend with second if close)
            let r: number, g: number, b: number;
            const topColor = playerColors[maxPlayer];
            r = topColor[0]; g = topColor[1]; b = topColor[2];

            if (secondInf > threshold) {
                // Sharpen the blend factor
                const total = maxInf + secondInf;
                let bf = maxInf / total;
                // Smoothstep-like sharpening
                const lo = 0.5 - 0.5 / sharpness;
                const hi = 0.5 + 0.5 / sharpness;
                bf = Math.max(0, Math.min(1, (bf - lo) / (hi - lo)));
                // Only blend if not fully dominant
                if (bf < 0.99) {
                    // Find second player
                    let secPlayer = -1;
                    for (let p = 0; p < numPlayers; p++) {
                        if (p !== maxPlayer && inf[p] === secondInf) {
                            secPlayer = p;
                            break;
                        }
                    }
                    if (secPlayer >= 0) {
                        const secColor = playerColors[secPlayer];
                        r = secColor[0] + (topColor[0] - secColor[0]) * bf;
                        g = secColor[1] + (topColor[1] - secColor[1]) * bf;
                        b = secColor[2] + (topColor[2] - secColor[2]) * bf;
                    }
                }
            }

            // Alpha falloff at edges
            const fadeAlpha = Math.min(1, maxInf * edgeFade) * alpha;
            if (fadeAlpha < 0.01) continue;

            const color = rgbToHex(r, g, b);
            territoryGraphics.rect(col * cellSize, row * cellSize, cellSize, cellSize);
            territoryGraphics.fill({ color, alpha: fadeAlpha });
        }
    }
}

/** Reset cached state (call on game session change). */
export function resetMetaballCache(): void {
    cachedFingerprint = '';
    cachedPlayerMap.clear();
    if (territoryGraphics) {
        if (territoryGraphics.parent) territoryGraphics.parent.removeChild(territoryGraphics);
        territoryGraphics.destroy();
        territoryGraphics = null;
    }
}
