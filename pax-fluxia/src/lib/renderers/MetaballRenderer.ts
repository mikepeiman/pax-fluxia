// ============================================================================
// MetaballRenderer — CPU-computed influence field territory rendering
// ============================================================================
//
// Renders organic, blobby territory regions by computing influence fields
// on a coarse grid (CPU), then rendering colored rectangles via PIXI Graphics.
//
// PERFORMANCE: Grid computation only runs when fingerprint changes (ownership
// changes on tick). The render loop call is cheap — just a fingerprint check.
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

// ── Falloff Functions ──────────────────────────────────────────────────────
// All functions calibrated so at dist=radius they return ~0.2

function falloffInverseSquare(dist: number, radius: number): number {
    const d = dist / radius;
    return 1 / (1 + d * d);
}

function falloffGaussian(dist: number, radius: number): number {
    const sigma = radius / 1.2;
    const d = dist / sigma;
    return Math.exp(-0.5 * d * d);
}

function falloffSmoothstep(dist: number, radius: number): number {
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
    return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function rgbToHex(r: number, g: number, b: number): number {
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function rgbToHSL(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
    return [h, s, l];
}

function hslToRGB(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    function hue2rgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hn = h / 360;
    return [
        Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
        Math.round(hue2rgb(p, q, hn) * 255),
        Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
    ];
}

/**
 * Build fingerprint from ownership data + config.
 * This only changes on tick events (ownership/ship count changes),
 * so the expensive grid computation is naturally tick-throttled.
 */
function buildFingerprint(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        fp += `${s.id}:${s.ownerId ?? ''}:${s.activeShips}|`;
    }
    // Config params that affect rendering
    fp += `${GAME_CONFIG.METABALL_INFLUENCE_RADIUS}:${GAME_CONFIG.METABALL_FALLOFF}`;
    fp += `:${GAME_CONFIG.METABALL_BLEND_SHARPNESS}:${GAME_CONFIG.METABALL_ALPHA}`;
    fp += `:${GAME_CONFIG.METABALL_CELL_SIZE}:${GAME_CONFIG.METABALL_THRESHOLD}`;
    fp += `:${GAME_CONFIG.METABALL_STRENGTH_MULT}:${GAME_CONFIG.METABALL_EDGE_FADE}`;
    fp += `:${GAME_CONFIG.METABALL_BLUR}:${GAME_CONFIG.TERRITORY_METABALL}`;
    fp += `:${GAME_CONFIG.METABALL_BORDER_WIDTH}:${GAME_CONFIG.METABALL_BORDER_ALPHA}`;
    fp += `:${GAME_CONFIG.METABALL_SATURATION}:${GAME_CONFIG.METABALL_LIGHTNESS}`;
    return fp;
}

// ── Public API ─────────────────────────────────────────────────────────────

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

    // ── PERF: Fingerprint check — skip if nothing changed ──
    // This is the key optimization: fingerprint only changes when star
    // ownership/ship counts change (on tick), NOT every animation frame.
    const fingerprint = buildFingerprint(stars);
    if (fingerprint === cachedFingerprint) {
        // Still update blur filter (cheap)
        applyBlurFilter();
        return;
    }
    cachedFingerprint = fingerprint;

    // Only consider owned stars
    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        territoryGraphics.visible = false;
        borderGraphics.visible = false;
        return;
    }

    // Config
    const radius = GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 120;
    const falloffType = GAME_CONFIG.METABALL_FALLOFF ?? 'inverse-square';
    const sharpness = GAME_CONFIG.METABALL_BLEND_SHARPNESS ?? 3.0;
    const alpha = GAME_CONFIG.METABALL_ALPHA ?? 0.5;
    const cellSize = GAME_CONFIG.METABALL_CELL_SIZE ?? 8;
    const threshold = GAME_CONFIG.METABALL_THRESHOLD ?? 0.05;
    const strengthMult = GAME_CONFIG.METABALL_STRENGTH_MULT ?? 1.0;
    const edgeFade = GAME_CONFIG.METABALL_EDGE_FADE ?? 3.0;
    const borderWidth = GAME_CONFIG.METABALL_BORDER_WIDTH ?? 1.5;
    const borderAlpha = GAME_CONFIG.METABALL_BORDER_ALPHA ?? 0.6;
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

    const satMult = GAME_CONFIG.METABALL_SATURATION ?? 1.0;
    const lightMult = GAME_CONFIG.METABALL_LIGHTNESS ?? 1.0;
    const useHSL = satMult !== 1.0 || lightMult !== 1.0;

    const playerColors: [number, number, number][] = playerIds.map(pid => {
        const rawRgb = hexToRGB(colorUtils.getPlayerColor(pid));
        if (useHSL) {
            const [h, s, l] = rgbToHSL(rawRgb[0], rawRgb[1], rawRgb[2]);
            return hslToRGB(h, Math.min(1, s * satMult), Math.min(1, l * lightMult));
        }
        return rawRgb;
    });

    // Grid padding: 0=compact (exact world), 0.3=extended (fills viewport at zoom-out)
    const coverage = GAME_CONFIG.METABALL_COVERAGE ?? 0.3;
    const pad = Math.max(worldWidth, worldHeight) * coverage;
    const gridOriginX = -pad;
    const gridOriginY = -pad;
    const gridW = worldWidth + pad * 2;
    const gridH = worldHeight + pad * 2;

    // Coarse grid
    const cols = Math.ceil(gridW / cellSize);
    const rows = Math.ceil(gridH / cellSize);

    // Precompute star data (positions relative to grid origin)
    const starData = ownedStars.map(s => ({
        x: s.x,
        y: s.y,
        playerIdx: cachedPlayerMap.get(s.ownerId!) ?? 0,
        strength: (0.5 + Math.min(2.0, Math.log2(Math.max(1, s.activeShips + s.damagedShips)) * 0.2)) * strengthMult,
    }));

    // Ownership grid for border detection
    const ownerGrid = new Int8Array(cols * rows).fill(-1);

    // Clear and redraw
    territoryGraphics.clear();
    borderGraphics.clear();

    const numPlayers = playerIds.length;

    // ── Grid computation (only runs on fingerprint change = tick) ──
    for (let row = 0; row < rows; row++) {
        const py = gridOriginY + (row + 0.5) * cellSize;
        for (let col = 0; col < cols; col++) {
            const px = gridOriginX + (col + 0.5) * cellSize;

            // Accumulate influence per player
            const inf = new Float32Array(numPlayers);
            for (const star of starData) {
                const dx = px - star.x;
                const dy = py - star.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > radius * 2) continue; // Early skip for distant stars
                inf[star.playerIdx] += falloffFn(dist, radius) * star.strength;
            }

            // Find top two players
            let maxInf = 0, maxPlayer = -1, secondInf = 0;
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

            ownerGrid[row * cols + col] = maxPlayer;

            // Color with optional blend
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
                        if (p !== maxPlayer && inf[p] === secondInf) { secPlayer = p; break; }
                    }
                    if (secPlayer >= 0) {
                        const sc = playerColors[secPlayer];
                        r = sc[0] + (topColor[0] - sc[0]) * bf;
                        g = sc[1] + (topColor[1] - sc[1]) * bf;
                        b = sc[2] + (topColor[2] - sc[2]) * bf;
                    }
                }
            }

            const fadeAlpha = Math.min(1, maxInf * edgeFade) * alpha;
            if (fadeAlpha < 0.01) continue;

            territoryGraphics.rect(gridOriginX + col * cellSize, gridOriginY + row * cellSize, cellSize, cellSize);
            territoryGraphics.fill({ color: rgbToHex(r, g, b), alpha: fadeAlpha });
        }
    }

    // ── Border pass: lines between different-owner cells ──
    if (borderWidth > 0 && borderAlpha > 0) {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const owner = ownerGrid[row * cols + col];
                if (owner < 0) continue;

                const bc = playerColors[owner];
                const borderColor = rgbToHex(
                    Math.min(255, bc[0] + 100),
                    Math.min(255, bc[1] + 100),
                    Math.min(255, bc[2] + 100),
                );

                // Right neighbor
                if (col + 1 < cols) {
                    const rOwner = ownerGrid[row * cols + col + 1];
                    if (rOwner >= 0 && rOwner !== owner) {
                        const bx = gridOriginX + (col + 1) * cellSize;
                        borderGraphics.moveTo(bx, gridOriginY + row * cellSize);
                        borderGraphics.lineTo(bx, gridOriginY + (row + 1) * cellSize);
                        borderGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
                    }
                }

                // Bottom neighbor
                if (row + 1 < rows) {
                    const bOwner = ownerGrid[(row + 1) * cols + col];
                    if (bOwner >= 0 && bOwner !== owner) {
                        const by = gridOriginY + (row + 1) * cellSize;
                        borderGraphics.moveTo(gridOriginX + col * cellSize, by);
                        borderGraphics.lineTo(gridOriginX + (col + 1) * cellSize, by);
                        borderGraphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
                    }
                }
            }
        }
    }

    applyBlurFilter();
}

// ── GPU Blur (applied to territory fill only, not borders) ─────────────────

function applyBlurFilter(): void {
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

export function resetMetaballCache(): void {
    cachedFingerprint = '';
    cachedPlayerMap.clear();
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
