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
let borderGraphics: PIXI.Graphics | null = null;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;
let cachedPlayerMap: Map<string, number> = new Map();

// ── Ownership grid cache (for border detection) ──
let ownerGrid: Int8Array | null = null;
let gridCols = 0;
let gridRows = 0;

// ── Falloff Functions ──────────────────────────────────────────────────────
// All functions are calibrated so that at dist=radius they return ~0.2,
// giving visually equivalent coverage across modes.

function falloffInverseSquare(dist: number, radius: number): number {
    const d = dist / radius;
    return 1 / (1 + d * d);
}

function falloffGaussian(dist: number, radius: number): number {
    // Standard gaussian drops too fast. Use sigma = radius/1.2 so that
    // falloff at dist=radius ≈ 0.24 (similar to inverse-square's 0.5 * coverage)
    const sigma = radius / 1.2;
    const d = dist / sigma;
    return Math.exp(-0.5 * d * d);
}

function falloffSmoothstep(dist: number, radius: number): number {
    // Extend effective range to 1.5× radius so it doesn't hard-clip
    const effectiveRadius = radius * 1.5;
    const t = Math.max(0, Math.min(1, 1 - dist / effectiveRadius));
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
    fp += `:${GAME_CONFIG.METABALL_BLUR}:${GAME_CONFIG.TERRITORY_METABALL}`;
    return fp;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Render metaball territory overlay using CPU-computed influence grid.
 * Computes per-cell influence from all owned stars, determines winning
 * player per cell, and renders colored rectangles + border lines.
 */
export function renderMetaball(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
): void {
    const show = GAME_CONFIG.TERRITORY_METABALL;

    if (!show) {
        if (territoryGraphics) territoryGraphics.visible = false;
        if (borderGraphics) borderGraphics.visible = false;
        return;
    }

    // Ensure graphics exist
    if (!territoryGraphics) {
        territoryGraphics = new PIXI.Graphics();
        container.addChild(territoryGraphics);
    }
    if (!borderGraphics) {
        borderGraphics = new PIXI.Graphics();
        container.addChild(borderGraphics);
    }
    territoryGraphics.visible = true;
    borderGraphics.visible = true;

    // Only consider owned stars
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        territoryGraphics.visible = false;
        borderGraphics.visible = false;
        return;
    }

    // Check fingerprint — skip if nothing changed
    const fingerprint = buildFingerprint(stars);
    if (fingerprint === cachedFingerprint) {
        // Still apply blur filter even if grid unchanged
        applyBlurFilter(container);
        return;
    }
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
    gridCols = cols;
    gridRows = rows;

    // Precompute star data
    const starData = ownedStars.map(s => ({
        x: s.x,
        y: s.y,
        playerIdx: cachedPlayerMap.get(s.ownerId!) ?? 0,
        strength: (0.5 + Math.min(2.0, Math.log2(Math.max(1, s.activeShips + s.damagedShips)) * 0.2)) * strengthMult,
    }));

    // Allocate ownership grid for border detection
    ownerGrid = new Int8Array(cols * rows).fill(-1);

    // Clear and redraw
    territoryGraphics.clear();
    borderGraphics.clear();

    const numPlayers = playerIds.length;

    // Per-cell computation on the coarse grid
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

            // Find top two players
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

            // Store ownership for border detection
            ownerGrid[row * cols + col] = maxPlayer;

            // Compute color (blend with second if close)
            let r: number, g: number, b: number;
            const topColor = playerColors[maxPlayer];
            r = topColor[0]; g = topColor[1]; b = topColor[2];

            if (secondInf > threshold) {
                const total = maxInf + secondInf;
                let bf = maxInf / total;
                const lo = 0.5 - 0.5 / sharpness;
                const hi = 0.5 + 0.5 / sharpness;
                bf = Math.max(0, Math.min(1, (bf - lo) / (hi - lo)));
                if (bf < 0.99) {
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

    // ── Border pass: draw lines where adjacent cells have different owners ──
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const owner = ownerGrid[row * cols + col];
            if (owner < 0) continue;

            // Check right neighbor
            if (col + 1 < cols) {
                const rOwner = ownerGrid[row * cols + col + 1];
                if (rOwner >= 0 && rOwner !== owner) {
                    const bx = (col + 1) * cellSize;
                    const by = row * cellSize;
                    // Brighten the border color
                    const bc = playerColors[owner];
                    const borderColor = rgbToHex(
                        Math.min(255, bc[0] + 100),
                        Math.min(255, bc[1] + 100),
                        Math.min(255, bc[2] + 100),
                    );
                    borderGraphics.moveTo(bx, by);
                    borderGraphics.lineTo(bx, by + cellSize);
                    borderGraphics.stroke({ width: 1.5, color: borderColor, alpha: 0.6 });
                }
            }

            // Check bottom neighbor
            if (row + 1 < rows) {
                const bOwner = ownerGrid[(row + 1) * cols + col];
                if (bOwner >= 0 && bOwner !== owner) {
                    const bx = col * cellSize;
                    const by = (row + 1) * cellSize;
                    const bc = playerColors[owner];
                    const borderColor = rgbToHex(
                        Math.min(255, bc[0] + 100),
                        Math.min(255, bc[1] + 100),
                        Math.min(255, bc[2] + 100),
                    );
                    borderGraphics.moveTo(bx, by);
                    borderGraphics.lineTo(bx + cellSize, by);
                    borderGraphics.stroke({ width: 1.5, color: borderColor, alpha: 0.6 });
                }
            }
        }
    }

    // Apply GPU blur
    applyBlurFilter(container);
}

// ── GPU Blur ───────────────────────────────────────────────────────────────

function applyBlurFilter(container: PIXI.Container): void {
    const blurStrength = GAME_CONFIG.METABALL_BLUR ?? 4;
    if (blurStrength > 0 && territoryGraphics) {
        if (!cachedBlurFilter || cachedBlurStrength !== blurStrength) {
            cachedBlurFilter = new PIXI.BlurFilter({ strength: blurStrength, quality: 4 });
            cachedBlurStrength = blurStrength;
        }
        territoryGraphics.filters = [cachedBlurFilter];
    } else if (territoryGraphics) {
        territoryGraphics.filters = [];
        cachedBlurFilter = null;
        cachedBlurStrength = -1;
    }
}

// ── Cache Reset ────────────────────────────────────────────────────────────

/** Reset cached state (call on game session change). */
export function resetMetaballCache(): void {
    cachedFingerprint = '';
    cachedPlayerMap.clear();
    ownerGrid = null;
    gridCols = 0;
    gridRows = 0;
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
    if (territoryGraphics) {
        if (territoryGraphics.parent) territoryGraphics.parent.removeChild(territoryGraphics);
        territoryGraphics.destroy();
        territoryGraphics = null;
    }
    if (borderGraphics) {
        if (borderGraphics.parent) borderGraphics.parent.removeChild(borderGraphics);
        borderGraphics.destroy();
        borderGraphics = null;
    }
}
