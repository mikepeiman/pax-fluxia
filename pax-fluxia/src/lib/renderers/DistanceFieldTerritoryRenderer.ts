// ============================================================================
// DistanceFieldTerritoryRenderer Ã¢â‚¬â€ GPU-Accelerated (V2)
// ============================================================================
//
// Pipeline (from Deep Technical Guidance Ã‚Â§B):
//   CPU: Multi-source Dijkstra for K-best per star (~5ms, on ownership change)
//   GPU: Fragment shader rasterization + border blend (~1ms per frame)
//   GPU: Temporal blend for conquest animation (~0ms steady state)
//
// No per-frame CPU rasterization. All pixel work on GPU.
// ============================================================================

import * as PIXI from 'pixi.js';
import { compileHighShaderGlProgram, localUniformBitGl } from 'pixi.js';
// roundPixelsBitGl: defines roundPixels() used by localUniformBitGl.vertex.end
// Inlined because pixi.js doesn't export this from its package exports map
const roundPixelsBitGl = {
    name: 'round-pixels-bit',
    vertex: {
        header: /* glsl */ `
            vec2 roundPixels(vec2 position, vec2 targetSize)
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `,
    },
};
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';
import { computeCorridorVirtuals, computeDisconnectVirtuals, type VirtualSite } from './territoryFeatures';


// Ã¢â€â‚¬Ã¢â€â‚¬ Constants Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const MAX_STARS = 128; // Increased to accommodate virtual sites (corridors + disconnects)
const MAX_PLAYERS = 8;


// Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
interface LaneData {
    ax: number; ay: number;
    bx: number; by: number;
    len: number;
    starAIdx: number;
    starBIdx: number;
}

// ── TWO-PASS TERRITORY RENDERING ─────────────────────────────────────────
//
// PASS 1: Ownership shader → RenderTexture
//   For each pixel, computes which player owns it via influence competition.
//   MSR is applied as a post-decision constraint.
//   Output RGBA: R = (ownerIdx+1)/255, G = bestInfluence/65535 (hi byte),
//                B = bestInfluence/65535 (lo byte), A = enemyOwner encoded
//   We pack bestInfluence as 16-bit across G+B for precision.
//   R channel: 0 = no owner, 1-8 = player indices (1-indexed)
//   A channel: (enemyOwnerIdx+1)/255 in high bits, plus influence ratio info
//
// PASS 2: Visual shader (reads ownership texture)
//   Reads ownership texture. Colors by owner. Detects borders by sampling
//   8 neighbors — if ANY neighbor has a different owner, this pixel is a border.
//   Border width is exactly controlled via sampling radius (screen pixels).
//   No fwidth(), no gradient sensitivity, no artifacts.
// ─────────────────────────────────────────────────────────────────────────

// Uses PIXI's compileHighShaderGlProgram() with shader bits.
// MVP = uProjectionMatrix * uWorldTransformMatrix * modelMatrix

// ── PASS 1: Ownership Computation ──────────────────────────────────────
const ownershipBitGl = {
    name: 'territory-ownership-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vLocalPos;
        `,
        main: /* glsl */ `
            vLocalPos = position;
        `,
    },
    fragment: {
        header: /* glsl */ `
            #version 300 es
            in vec2 vLocalPos;
            uniform sampler2D uStarData;
            uniform int uNumStars;
            uniform float uWorldWidth;
            uniform float uWorldHeight;
            uniform float uMorphFactor;
            uniform float uInfluenceWeight;
            uniform float uMinStarRadius;
            uniform int uNumRealStars;

            // Helper: decode 16-bit value from RGBA high/low bytes
            float decode16(vec4 raw, int pair) {
                float hi, lo;
                if (pair == 0) { hi = raw.r; lo = raw.g; }
                else { hi = raw.b; lo = raw.a; }
                return floor(hi * 255.0 + 0.5) * 256.0 + floor(lo * 255.0 + 0.5);
            }
        `,
        main: /* glsl */ `
            vec2 worldPos = vLocalPos;

            // For each star, compute total influence = pixel distance + Dijkstra distance
            float bestInfluence = 1e9;
            int bestStar = -1;
            int bestOwner = -1;
            float enemyInfluence = 1e9;
            int enemyOwner = -1;

            for (int i = 0; i < 256; i++) {
                if (i >= uNumStars) break;

                vec4 posRaw = texelFetch(uStarData, ivec2(i, 0), 0);
                float sx = decode16(posRaw, 0);
                float sy = decode16(posRaw, 1);
                float pixDist = distance(worldPos, vec2(sx, sy));

                vec4 ownerRaw = texelFetch(uStarData, ivec2(i, 2), 0);
                int ownIdx = int(floor(ownerRaw.r * 255.0 + 0.5)) - 1;
                if (ownIdx < 0) continue;

                vec4 distRaw = texelFetch(uStarData, ivec2(i, 1), 0);
                float curDijkstra = decode16(distRaw, 0);
                vec4 prevRaw = texelFetch(uStarData, ivec2(i, 3), 0);
                float prevDijkstra = decode16(prevRaw, 0);
                float dijkstra = mix(curDijkstra, prevDijkstra, uMorphFactor);

                float influence = pixDist + dijkstra * uInfluenceWeight;

                // Apply corridor/disconnect boost
                vec4 ownerExtra = texelFetch(uStarData, ivec2(i, 2), 0);
                float boost = decode16(ownerExtra, 1);
                influence -= boost;

                if (influence < bestInfluence) {
                    if (bestOwner >= 0 && bestOwner != ownIdx && bestInfluence < enemyInfluence) {
                        enemyInfluence = bestInfluence;
                        enemyOwner = bestOwner;
                    }
                    bestInfluence = influence;
                    bestStar = i;
                    bestOwner = ownIdx;
                } else {
                    if (ownIdx != bestOwner && influence < enemyInfluence) {
                        enemyInfluence = influence;
                        enemyOwner = ownIdx;
                    }
                }
            }

            // MSR post-decision constraint: if this pixel is within uMinStarRadius
            // of any real star owned by the winning player, force ownership to that player.
            // This doesn't modify influence values, just ensures ownership near stars.
            // (Already handled by influence boost above, but kept for documentation)

            if (bestStar < 0 || bestOwner < 0) {
                // No owner — output marker
                outColor = vec4(0.0, 0.0, 0.0, 0.0);
                return;
            }

            // Encode ownership data into RGBA
            // R: ownerIdx + 1 (1-indexed, 0 = no owner), normalized to 0..1
            // G: bestInfluence high byte (0..255 mapped to 0..1)
            // B: bestInfluence low byte
            // A: enemyOwner + 1 (1-indexed, 0 = no enemy), normalized to 0..1
            float ownerVal = float(bestOwner + 1) / 255.0;

            // Encode bestInfluence as 16-bit across G,B (clamp to 0..65535)
            float clampedBest = clamp(bestInfluence, 0.0, 65535.0);
            float bestHi = floor(clampedBest / 256.0);
            float bestLo = clampedBest - bestHi * 256.0;

            // Encode enemyInfluence ratio: how close is enemy? (0 = far, 1 = equal)
            // This drives border width and force-ratio coloring in Pass 2
            float influenceGap = enemyOwner >= 0 ? (enemyInfluence - bestInfluence) : 9999.0;
            float gapNorm = clamp(influenceGap / 200.0, 0.0, 1.0); // normalized gap

            float enemyVal = enemyOwner >= 0 ? float(enemyOwner + 1) / 255.0 : 0.0;

            outColor = vec4(ownerVal, gapNorm, enemyVal, 1.0);
        `,
    },
};

// ── PASS 2: Visual Rendering ───────────────────────────────────────────
const visualBitGl = {
    name: 'territory-visual-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vLocalPos;
        `,
        main: /* glsl */ `
            vLocalPos = position;
        `,
    },
    fragment: {
        header: /* glsl */ `
            #version 300 es
            in vec2 vLocalPos;
            uniform sampler2D uOwnershipTex;
            uniform float uTexWidth;
            uniform float uTexHeight;
            uniform float uWorldWidth;
            uniform float uWorldHeight;
            uniform float uPadding;
            uniform float uBorderWidth;
            uniform float uBorderSoftness;
            uniform float uBorderAlpha;
            uniform float uBorderBrighten;
            uniform float uFillAlpha;
            uniform float uEdgeFade;
            uniform float uHueShift;
            uniform float uSatMult;
            uniform float uLightMult;
            uniform float uSmoothing;
            uniform float uBordersEnabled;
            uniform float uContentMinX;
            uniform float uContentMinY;
            uniform vec3 uPlayerColor0;
            uniform vec3 uPlayerColor1;
            uniform vec3 uPlayerColor2;
            uniform vec3 uPlayerColor3;
            uniform vec3 uPlayerColor4;
            uniform vec3 uPlayerColor5;
            uniform vec3 uPlayerColor6;
            uniform vec3 uPlayerColor7;

            vec3 getPlayerColor(int idx) {
                if (idx == 0) return uPlayerColor0;
                if (idx == 1) return uPlayerColor1;
                if (idx == 2) return uPlayerColor2;
                if (idx == 3) return uPlayerColor3;
                if (idx == 4) return uPlayerColor4;
                if (idx == 5) return uPlayerColor5;
                if (idx == 6) return uPlayerColor6;
                if (idx == 7) return uPlayerColor7;
                return vec3(0.5);
            }

            vec3 hslAdjust(vec3 pc) {
                float cmax = max(pc.r, max(pc.g, pc.b));
                float cmin = min(pc.r, min(pc.g, pc.b));
                float delta = cmax - cmin;
                float L = (cmax + cmin) * 0.5;
                float S = delta < 0.001 ? 0.0 : delta / (1.0 - abs(2.0 * L - 1.0));
                float H = 0.0;
                if (delta > 0.001) {
                    if (cmax == pc.r) H = mod((pc.g - pc.b) / delta, 6.0);
                    else if (cmax == pc.g) H = (pc.b - pc.r) / delta + 2.0;
                    else H = (pc.r - pc.g) / delta + 4.0;
                    H /= 6.0;
                }
                H = fract(H + uHueShift / 360.0);
                S *= uSatMult;
                L *= uLightMult;
                float c2 = (1.0 - abs(2.0 * L - 1.0)) * S;
                float x2 = c2 * (1.0 - abs(mod(H * 6.0, 2.0) - 1.0));
                float m2 = L - c2 * 0.5;
                vec3 rgb;
                float h6 = H * 6.0;
                if (h6 < 1.0) rgb = vec3(c2, x2, 0.0);
                else if (h6 < 2.0) rgb = vec3(x2, c2, 0.0);
                else if (h6 < 3.0) rgb = vec3(0.0, c2, x2);
                else if (h6 < 4.0) rgb = vec3(0.0, x2, c2);
                else if (h6 < 5.0) rgb = vec3(x2, 0.0, c2);
                else rgb = vec3(c2, 0.0, x2);
                return rgb + vec3(m2);
            }
        `,
        main: /* glsl */ `
            // Sample ownership at this pixel
            vec4 center = texture(uOwnershipTex, vUV);
            if (center.a < 0.5) discard; // no owner

            int myOwner = int(floor(center.r * 255.0 + 0.5)) - 1;
            if (myOwner < 0) discard;

            float gapNorm = center.g; // normalized influence gap to enemy
            int enemyOwner = int(floor(center.b * 255.0 + 0.5)) - 1;

            // ── Fill coloring ──
            vec3 pc = getPlayerColor(myOwner);
            vec3 finalRGB = hslAdjust(pc);
            float alpha = uFillAlpha;

            // Junction smoothing: fade alpha where enemy territory is close
            if (uSmoothing > 0.0 && enemyOwner >= 0) {
                float junctionFade = smoothstep(0.0, 1.0, gapNorm * (200.0 / max(uSmoothing, 1.0)));
                alpha *= junctionFade;
            }

            // ── GPU SDF Borders ──────────────────────────────────────────
            // gapNorm is the SDF: 0.0 = ON the border, 1.0 = deep inside territory
            // smoothstep creates a soft falloff from border to fill
            if (uBordersEnabled > 0.5 && enemyOwner >= 0) {
                float borderThreshold = uBorderWidth / 200.0;
                float softEdge = uBorderSoftness / 200.0;
                // borderMask: 1.0 AT the border, fading to 0.0 past borderWidth
                float borderMask = 1.0 - smoothstep(
                    max(borderThreshold - softEdge, 0.0),
                    borderThreshold + softEdge,
                    gapNorm
                );

                // Border color: blend between owner and enemy, brightened
                vec3 enemyPC = getPlayerColor(enemyOwner);
                vec3 borderBase = mix(hslAdjust(enemyPC), finalRGB, 0.5);
                float brightenVal = uBorderBrighten / 255.0;
                vec3 borderRGB = min(borderBase + vec3(brightenVal), vec3(1.0));

                // Blend border onto fill
                finalRGB = mix(finalRGB, borderRGB, borderMask);
                alpha = mix(alpha, uBorderAlpha, borderMask);
            }

            // ── Edge fade ─────────────────────────────────────────────────
            vec2 worldPos = vLocalPos;
            float edgeX = min(worldPos.x - uContentMinX, (uContentMinX + uWorldWidth) - worldPos.x);
            float edgeY = min(worldPos.y - uContentMinY, (uContentMinY + uWorldHeight) - worldPos.y);
            float edgeDist = min(edgeX, edgeY);
            alpha *= smoothstep(0.0, uEdgeFade, edgeDist);

            outColor = vec4(finalRGB * alpha, alpha);
        `,
    },
};

// ─── Module State ───────────────────────────────────────────────────────

let cachedOwnerFp = '';
let cachedConfigFp = '';
let cachedConnFp = '';

// Pass 1: ownership mesh → RenderTexture
let pass1Mesh: PIXI.Mesh | null = null;
let pass1Shader: PIXI.Shader | null = null;
let ownershipRT: PIXI.RenderTexture | null = null;
let pass1Container: PIXI.Container | null = null;

// Pass 2: visual mesh (reads ownership texture, renders to screen)
let pass2Mesh: PIXI.Mesh | null = null;
let pass2Shader: PIXI.Shader | null = null;

let cachedMeshWorldW = 0;
let cachedMeshWorldH = 0;
let cachedMeshX0 = 0;
let cachedMeshY0 = 0;
let cachedMeshW = 0;
let cachedMeshH = 0;
let cachedMeshExpansion = -1;
let cachedBlurFilter: PIXI.BlurFilter | null = null;
let cachedBlurStrength = -1;

// Dijkstra result: distToPlayer[starIdx][playerIdx]
let currentDist: number[][] | null = null;
let prevDist: number[][] | null = null;
let currentPlayerIds: string[] = [];

// Temporal blend
let morphStartTime = 0;
let isMorphing = false;

// Lane index
let laneArray: LaneData[] = [];
let laneCells: Map<string, number[]> = new Map();
let laneCellSize = 50;

// GPU pipeline
let starDataTexture: PIXI.Texture | null = null;

// Cached PIXI app reference for rendering Pass 1
let cachedApp: PIXI.Application | null = null;

// Pass 3: Vector border overlay
let borderGraphics: PIXI.Graphics | null = null;
let cachedBorderOwnerFp = '';

// ============================================================================
// PASS 3: Vector Border Extraction (Marching Squares + Chaikin)
// ============================================================================

interface BorderSegment {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerA: number; ownerB: number;
}

/**
 * Extract border contours from the ownership RenderTexture.
 * Uses marching squares to trace boundary segments between different-owner regions.
 * Returns polylines in world-space coordinates.
 */
function extractBorderSegments(
    app: PIXI.Application,
    rt: PIXI.RenderTexture,
    meshX0: number, meshY0: number,
    meshW: number, meshH: number,
): BorderSegment[] {
    // Read ownership texture pixels
    const pixels = app.renderer.extract.pixels(rt);
    const w = pixels.width;
    const h = pixels.height;
    const data = pixels.pixels as unknown as Uint8Array;

    const segments: BorderSegment[] = [];
    // Scale factors: texture pixels → world coordinates
    const sx = meshW / w;
    const sy = meshH / h;

    // Scan grid for ownership changes between adjacent pixels
    // Horizontal edges (between rows y and y+1)
    for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w; x++) {
            const idx1 = (y * w + x) * 4;
            const idx2 = ((y + 1) * w + x) * 4;
            const a1 = data[idx1 + 3]; // alpha
            const a2 = data[idx2 + 3];
            const o1 = a1 > 127 ? data[idx1] : 0; // R = owner
            const o2 = a2 > 127 ? data[idx2] : 0;
            if (o1 !== o2) {
                // Boundary between y and y+1 — draw horizontal segment
                segments.push({
                    x1: meshX0 + x * sx,
                    y1: meshY0 + (y + 0.5) * sy,
                    x2: meshX0 + (x + 1) * sx,
                    y2: meshY0 + (y + 0.5) * sy,
                    ownerA: o1, ownerB: o2,
                });
            }
        }
    }
    // Vertical edges (between columns x and x+1)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w - 1; x++) {
            const idx1 = (y * w + x) * 4;
            const idx2 = (y * w + x + 1) * 4;
            const a1 = data[idx1 + 3];
            const a2 = data[idx2 + 3];
            const o1 = a1 > 127 ? data[idx1] : 0;
            const o2 = a2 > 127 ? data[idx2] : 0;
            if (o1 !== o2) {
                segments.push({
                    x1: meshX0 + (x + 0.5) * sx,
                    y1: meshY0 + y * sy,
                    x2: meshX0 + (x + 0.5) * sx,
                    y2: meshY0 + (y + 1) * sy,
                    ownerA: o1, ownerB: o2,
                });
            }
        }
    }
    return segments;
}

/**
 * Chain border segments into polylines.
 * Connects segments that share endpoints (within tolerance).
 */
function chainSegments(segments: BorderSegment[]): number[][][] {
    if (segments.length === 0) return [];

    // Build adjacency: endpoint → segment indices
    const eps = 0.01;
    const key = (x: number, y: number) => `${Math.round(x / eps)}:${Math.round(y / eps)}`;

    const endpointMap = new Map<string, { segIdx: number; end: 1 | 2 }[]>();
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        const k1 = key(s.x1, s.y1);
        const k2 = key(s.x2, s.y2);
        if (!endpointMap.has(k1)) endpointMap.set(k1, []);
        if (!endpointMap.has(k2)) endpointMap.set(k2, []);
        endpointMap.get(k1)!.push({ segIdx: i, end: 1 });
        endpointMap.get(k2)!.push({ segIdx: i, end: 2 });
    }

    const used = new Array(segments.length).fill(false);
    const polylines: number[][][] = [];

    for (let start = 0; start < segments.length; start++) {
        if (used[start]) continue;
        used[start] = true;

        const s = segments[start];
        const chain: number[][] = [[s.x1, s.y1], [s.x2, s.y2]];

        // Extend forward from end point
        let searching = true;
        while (searching) {
            searching = false;
            const lastPt = chain[chain.length - 1];
            const k = key(lastPt[0], lastPt[1]);
            const neighbors = endpointMap.get(k);
            if (neighbors) {
                for (const n of neighbors) {
                    if (used[n.segIdx]) continue;
                    const ns = segments[n.segIdx];
                    used[n.segIdx] = true;
                    if (n.end === 1) {
                        chain.push([ns.x2, ns.y2]);
                    } else {
                        chain.push([ns.x1, ns.y1]);
                    }
                    searching = true;
                    break;
                }
            }
        }

        // Extend backward from start point
        searching = true;
        while (searching) {
            searching = false;
            const firstPt = chain[0];
            const k = key(firstPt[0], firstPt[1]);
            const neighbors = endpointMap.get(k);
            if (neighbors) {
                for (const n of neighbors) {
                    if (used[n.segIdx]) continue;
                    const ns = segments[n.segIdx];
                    used[n.segIdx] = true;
                    if (n.end === 2) {
                        chain.unshift([ns.x1, ns.y1]);
                    } else {
                        chain.unshift([ns.x2, ns.y2]);
                    }
                    searching = true;
                    break;
                }
            }
        }

        if (chain.length >= 2) {
            polylines.push(chain);
        }
    }

    return polylines;
}

/**
 * Chaikin curve subdivision — produces smooth corners from polylines.
 * Each iteration rounds corners by 75/25 interpolation.
 */
function chaikinSmooth(polyline: number[][], iterations: number): number[][] {
    let pts = polyline;
    for (let iter = 0; iter < iterations; iter++) {
        const smoothed: number[][] = [];
        smoothed.push(pts[0]); // keep first point
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i], p1 = pts[i + 1];
            smoothed.push([
                0.75 * p0[0] + 0.25 * p1[0],
                0.75 * p0[1] + 0.25 * p1[1],
            ]);
            smoothed.push([
                0.25 * p0[0] + 0.75 * p1[0],
                0.25 * p0[1] + 0.75 * p1[1],
            ]);
        }
        smoothed.push(pts[pts.length - 1]); // keep last point
        pts = smoothed;
    }
    return pts;
}

/**
 * Draw vector borders as PIXI.Graphics strokes.
 */
function drawVectorBorders(
    container: PIXI.Container,
    app: PIXI.Application,
    rt: PIXI.RenderTexture,
    colorUtils: ColorUtils,
    meshX0: number, meshY0: number,
    meshW: number, meshH: number,
): void {
    // Create or clear graphics
    if (!borderGraphics) {
        borderGraphics = new PIXI.Graphics();
    }
    borderGraphics.clear();

    if (!borderGraphics.parent) {
        container.addChild(borderGraphics);
    }

    const borderWidth = GAME_CONFIG.DF_BORDER_WIDTH ?? 5;
    const borderAlpha = GAME_CONFIG.DF_BORDER_ALPHA ?? 0.8;
    const brighten = (GAME_CONFIG.DF_BORDER_BRIGHTEN ?? 20) / 255;

    // Extract boundary segments from the ownership texture
    const segments = extractBorderSegments(app, rt, meshX0, meshY0, meshW, meshH);
    if (segments.length === 0) return;

    // Chain into polylines and smooth
    const polylines = chainSegments(segments);
    const smoothIters = 2; // 2 passes of Chaikin smoothing

    for (const polyline of polylines) {
        if (polyline.length < 2) continue;
        const smoothed = chaikinSmooth(polyline, smoothIters);

        // Use a neutral bright border color (brighten from white)
        const r = Math.min(1, 0.7 + brighten);
        const g = Math.min(1, 0.7 + brighten);
        const b = Math.min(1, 0.7 + brighten);
        const color = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);

        borderGraphics.setStrokeStyle({
            width: borderWidth,
            color: color,
            alpha: borderAlpha,
            cap: 'round' as any,
            join: 'round' as any,
        });
        borderGraphics.moveTo(smoothed[0][0], smoothed[0][1]);
        for (let i = 1; i < smoothed.length; i++) {
            borderGraphics.lineTo(smoothed[i][0], smoothed[i][1]);
        }
        borderGraphics.stroke();
    }

    console.log(`[DF] Vector borders: ${segments.length} segments → ${polylines.length} polylines`);
}


// ============================================================================
// Multi-Source Dijkstra Ã¢â‚¬â€ per-player distances (PRESERVED FROM V1)
// ============================================================================
// Returns distToPlayer[starIdx][playerIdx] = shortest graph distance
// from star to nearest star owned by that player.

function computeDistToPlayer(
    stars: StarState[],
    connections: StarConnection[],
    playerIds: string[],
    metric: 'hops' | 'length',
): number[][] {
    const nStars = stars.length;
    const nPlayers = playerIds.length;
    const playerIdx = new Map<string, number>();
    for (let i = 0; i < nPlayers; i++) playerIdx.set(playerIds[i], i);

    // Build adjacency
    const starIdx = new Map<string, number>();
    for (let i = 0; i < nStars; i++) starIdx.set(stars[i].id, i);

    const adj: { neighbor: number; cost: number }[][] = new Array(nStars);
    for (let i = 0; i < nStars; i++) adj[i] = [];

    for (const conn of connections) {
        const a = starIdx.get(conn.sourceId);
        const b = starIdx.get(conn.targetId);
        if (a === undefined || b === undefined) continue;
        const cost = metric === 'hops' ? 1 : (conn.distance || 1);
        adj[a].push({ neighbor: b, cost });
        adj[b].push({ neighbor: a, cost });
    }

    // Initialize distances
    const dist: number[][] = new Array(nStars);
    for (let s = 0; s < nStars; s++) {
        dist[s] = new Array(nPlayers).fill(Infinity);
    }

    // Priority queue: [distance, starIdx, playerIdx]
    const pq: [number, number, number][] = [];

    // Seed: each owned star has distance 0 to its own player
    for (let s = 0; s < nStars; s++) {
        const ownerId = stars[s].ownerId;
        if (!ownerId) continue;
        const pi = playerIdx.get(ownerId);
        if (pi === undefined) continue;
        dist[s][pi] = 0;
        pq.push([0, s, pi]);
    }

    pq.sort((a, b) => a[0] - b[0]);

    while (pq.length > 0) {
        const [d, si, pi] = pq.shift()!;

        if (d > dist[si][pi]) continue;

        for (const { neighbor, cost } of adj[si]) {
            const nd = d + cost;
            if (nd < dist[neighbor][pi]) {
                dist[neighbor][pi] = nd;
                let inserted = false;
                for (let i = 0; i < pq.length; i++) {
                    if (nd < pq[i][0]) {
                        pq.splice(i, 0, [nd, neighbor, pi]);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) pq.push([nd, neighbor, pi]);
            }
        }
    }

    return dist;
}

// ============================================================================
// Lane Spatial Index (PRESERVED FROM V1)
// ============================================================================

function buildLaneIndex(
    stars: StarState[],
    connections: StarConnection[],
): void {
    const starIdx = new Map<string, number>();
    for (let i = 0; i < stars.length; i++) starIdx.set(stars[i].id, i);

    laneArray = [];
    for (const conn of connections) {
        const ai = starIdx.get(conn.sourceId);
        const bi = starIdx.get(conn.targetId);
        if (ai === undefined || bi === undefined) continue;
        const ax = stars[ai].x, ay = stars[ai].y;
        const bx = stars[bi].x, by = stars[bi].y;
        const len = Math.hypot(bx - ax, by - ay);
        laneArray.push({ ax, ay, bx, by, len, starAIdx: ai, starBIdx: bi });
    }

    const avgLen = laneArray.reduce((s, l) => s + l.len, 0) / Math.max(1, laneArray.length);
    laneCellSize = Math.max(50, Math.min(200, avgLen / 2));

    laneCells = new Map();
    for (let li = 0; li < laneArray.length; li++) {
        const l = laneArray[li];
        const cx0 = Math.floor(Math.min(l.ax, l.bx) / laneCellSize);
        const cx1 = Math.floor(Math.max(l.ax, l.bx) / laneCellSize);
        const cy0 = Math.floor(Math.min(l.ay, l.by) / laneCellSize);
        const cy1 = Math.floor(Math.max(l.ay, l.by) / laneCellSize);
        for (let cx = cx0; cx <= cx1; cx++) {
            for (let cy = cy0; cy <= cy1; cy++) {
                const key = `${cx},${cy}`;
                if (!laneCells.has(key)) laneCells.set(key, []);
                laneCells.get(key)!.push(li);
            }
        }
    }
}

// ============================================================================
// Fingerprints (PRESERVED FROM V1, minus DF_RESOLUTION/DF_ROUNDING)
// ============================================================================

function buildOwnerFp(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) fp += `${s.id}:${s.ownerId ?? ''}|`;
    return fp;
}

function buildConfigFp(): string {
    return `${GAME_CONFIG.DF_ALPHA}:${GAME_CONFIG.DF_BORDER_WIDTH}:`
        + `${GAME_CONFIG.DF_BORDER_SOFTNESS}:${GAME_CONFIG.DF_BORDER_ALPHA}:${GAME_CONFIG.DF_BORDER_BRIGHTEN}:`
        + `${GAME_CONFIG.DF_BLUR}:${GAME_CONFIG.DF_HUE}:`
        + `${GAME_CONFIG.DF_SATURATION}:${GAME_CONFIG.DF_LIGHTNESS}:`
        + `${GAME_CONFIG.DF_DISTANCE_METRIC}:${GAME_CONFIG.TERRITORY_TRANSITION_MS}:`
        + `${GAME_CONFIG.DF_EDGE_FADE}:${GAME_CONFIG.DF_RESOLUTION}:${GAME_CONFIG.DF_ROUNDING}:${GAME_CONFIG.DF_INFLUENCE_WEIGHT}`
        + `:${GAME_CONFIG.DF_CORRIDOR_ENABLED}:${GAME_CONFIG.DF_CORRIDOR_MODE}:${GAME_CONFIG.DF_CORRIDOR_SPACING}:${GAME_CONFIG.DF_CORRIDOR_COUNT}:${GAME_CONFIG.DF_CORRIDOR_WEIGHT}`
        + `:${GAME_CONFIG.DF_DISCONNECT_ENABLED}:${GAME_CONFIG.DF_DISCONNECT_DISTANCE}:${GAME_CONFIG.DF_DISCONNECT_WEIGHT}`;
}

function buildConnFp(connections: StarConnection[]): string {
    let fp = '';
    for (const c of connections) fp += `${c.sourceId}-${c.targetId}|`;
    return fp;
}

// ============================================================================
// DEBUG_LADDER: Gradient test texture to prove BufferImageSource upload works
// ============================================================================

function makeGradientTestTexture(): PIXI.Texture {
    // Use Canvas2D Ã¢â‚¬â€ the most universally supported texture source
    const w = 64, h = 4;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(w, h);
    const px = imageData.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            px[i + 0] = Math.round((x / (w - 1)) * 255); // R ramp
            px[i + 1] = Math.round((y / (h - 1)) * 255); // G ramp
            px[i + 2] = 128;                               // B constant (so it's not black)
            px[i + 3] = 255;                               // A opaque
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return PIXI.Texture.from(canvas);
}

// ============================================================================
// GPU Data Texture Ã¢â‚¬â€ pack star data for shader (BufferImageSource pattern)
// ============================================================================
// Layout: MAX_STARS columns Ãƒâ€” 4 rows, RGBA uint8 via BufferImageSource
//   row 0: (x_hi, x_lo, y_hi, y_lo)      Ã¢â‚¬â€ star positions as 16-bit
//   row 1: (bestDist_hi, bestDist_lo, secondDist_hi, secondDist_lo)
//   row 2: (bestOwner+1, secondOwner+1, 0, 0)  Ã¢â‚¬â€ player indices (1-indexed, 0=none)
//   row 3: (prevBest_hi, prevBest_lo, prevSecond_hi, prevSecond_lo)
//
// IMPORTANT: BufferImageSource with Uint8Array defaults to 'bgra8unorm',
// so we MUST explicitly set format: 'rgba8unorm'.
// IMPORTANT: alphaMode must be 'no-premultiply-alpha' because we use all
// 4 RGBA channels for data, not color.

let starDataBuffer: Uint8Array | null = null;
let totalPackedStars = 0; // real + virtual star count for uniform

function encode16(value: number): [number, number] {
    const clamped = Math.max(0, Math.min(65535, Math.round(value)));
    return [Math.floor(clamped / 256), clamped % 256];
}

function buildStarDataTexture(
    stars: StarState[],
    dist: number[][],
    prevDistArr: number[][] | null,
    playerIds: string[],
    virtualSites?: VirtualSite[],
): void {
    const nRealStars = Math.min(stars.length, MAX_STARS);
    const nPlayers = playerIds.length;
    const texW = MAX_STARS;
    const texH = 4;
    const bufSize = texW * texH * 4;

    // Allocate buffer if needed
    if (!starDataBuffer || starDataBuffer.length !== bufSize) {
        starDataBuffer = new Uint8Array(bufSize);
    }
    starDataBuffer.fill(0);

    // Pack real stars
    for (let i = 0; i < nRealStars; i++) {
        // Row 0: positions (16-bit encoded)
        const row0 = (0 * texW + i) * 4;
        const [xh, xl] = encode16(stars[i].x);
        const [yh, yl] = encode16(stars[i].y);
        starDataBuffer[row0] = xh;
        starDataBuffer[row0 + 1] = xl;
        starDataBuffer[row0 + 2] = yh;
        starDataBuffer[row0 + 3] = yl;

        // Find best and second-best player for this star
        let bestP = -1, bestD = Infinity;
        let secondP = -1, secondD = Infinity;
        for (let pi = 0; pi < nPlayers; pi++) {
            const d = dist[i]?.[pi] ?? Infinity;
            if (d < bestD) {
                secondD = bestD; secondP = bestP;
                bestD = d; bestP = pi;
            } else if (d < secondD) {
                secondD = d; secondP = pi;
            }
        }

        // Row 1: distances (16-bit encoded, capped at 65535)
        const row1 = (1 * texW + i) * 4;
        const [bdh, bdl] = encode16(bestD === Infinity ? 65535 : bestD);
        const [sdh, sdl] = encode16(secondD === Infinity ? 65535 : secondD);
        starDataBuffer[row1] = bdh;
        starDataBuffer[row1 + 1] = bdl;
        starDataBuffer[row1 + 2] = sdh;
        starDataBuffer[row1 + 3] = sdl;

        // Row 2: owner indices (1-indexed, 0 = no owner)
        const row2 = (2 * texW + i) * 4;
        starDataBuffer[row2] = bestP >= 0 ? bestP + 1 : 0;
        starDataBuffer[row2 + 1] = secondP >= 0 ? secondP + 1 : 0;

        // Row 3: previous distances for morph (16-bit encoded)
        const row3 = (3 * texW + i) * 4;
        if (prevDistArr) {
            let prevBestD = Infinity, prevSecondD = Infinity;
            for (let pi = 0; pi < nPlayers; pi++) {
                const d = prevDistArr[i]?.[pi] ?? Infinity;
                if (d < prevBestD) {
                    prevSecondD = prevBestD;
                    prevBestD = d;
                } else if (d < prevSecondD) {
                    prevSecondD = d;
                }
            }
            const [pbd_h, pbd_l] = encode16(prevBestD === Infinity ? 65535 : prevBestD);
            const [psd_h, psd_l] = encode16(prevSecondD === Infinity ? 65535 : prevSecondD);
            starDataBuffer[row3] = pbd_h;
            starDataBuffer[row3 + 1] = pbd_l;
            starDataBuffer[row3 + 2] = psd_h;
            starDataBuffer[row3 + 3] = psd_l;
        } else {
            starDataBuffer[row3] = starDataBuffer[row1];
            starDataBuffer[row3 + 1] = starDataBuffer[row1 + 1];
            starDataBuffer[row3 + 2] = starDataBuffer[row1 + 2];
            starDataBuffer[row3 + 3] = starDataBuffer[row1 + 3];
        }
    }

    // Pack virtual sites after real stars
    const vSites = virtualSites ?? [];
    const nVirtual = Math.min(vSites.length, MAX_STARS - nRealStars);
    for (let v = 0; v < nVirtual; v++) {
        const i = nRealStars + v;  // texture column index
        const vs = vSites[v];

        // Row 0: position
        const row0 = (0 * texW + i) * 4;
        const [xh, xl] = encode16(vs.x);
        const [yh, yl] = encode16(vs.y);
        starDataBuffer[row0] = xh;
        starDataBuffer[row0 + 1] = xl;
        starDataBuffer[row0 + 2] = yh;
        starDataBuffer[row0 + 3] = yl;

        // Row 1: Dijkstra distance
        // Corridors: 0 (they ARE the owner's territory, should win easily)
        // Disconnects: use half the distance between source stars as Dijkstra
        //   This makes the disconnect site compete fairly with real stars
        //   instead of dominating via Dijkstra=0 advantage
        const row1 = (1 * texW + i) * 4;
        let dijkForVirtual = 0;
        if (vs.kind === 'disconnect') {
            // Find source stars to compute their separation distance
            const starA = stars.find(s => s.id === vs.sourceStarA);
            const starB = stars.find(s => s.id === vs.sourceStarB);
            if (starA && starB) {
                const halfDist = Math.hypot(starB.x - starA.x, starB.y - starA.y) / 2;
                // Weight controls how competitive: higher weight → lower Dijkstra → stronger gap
                // At weight=1.0, Dijkstra = halfDist (neutral). At weight=0.1, Dijkstra = halfDist*10 (very weak).
                dijkForVirtual = Math.round(halfDist / Math.max(vs.weight, 0.01));
            }
        }
        const [dh, dl] = encode16(dijkForVirtual);
        starDataBuffer[row1] = dh;
        starDataBuffer[row1 + 1] = dl;
        starDataBuffer[row1 + 2] = 0;
        starDataBuffer[row1 + 3] = 0;

        // Row 2: owner — resolve to player index + influence boost
        const row2 = (2 * texW + i) * 4;
        const pIdx = playerIds.indexOf(vs.ownerId);
        starDataBuffer[row2] = pIdx >= 0 ? pIdx + 1 : 0;
        // Encode boost as 16-bit in bytes 2-3
        // Both corridors AND disconnects use boost (subtracted from influence = more competitive)
        // Corridors: boost makes friendly sites claim territory along connections
        // Disconnects: boost makes enemy sites create gaps between disconnected same-owner regions
        const boostRaw = Math.round((vs.weight ?? 1.0) * 100);
        const [bh, bl] = encode16(boostRaw);
        starDataBuffer[row2 + 2] = bh;
        starDataBuffer[row2 + 3] = bl;

        // Row 3: previous distances = same as row 1 (no morph for virtuals)
        const row3 = (3 * texW + i) * 4;
        starDataBuffer[row3] = 0;
        starDataBuffer[row3 + 1] = 0;
        starDataBuffer[row3 + 2] = 0;
        starDataBuffer[row3 + 3] = 0;
    }

    // Update total star count (real + virtual)
    totalPackedStars = nRealStars + nVirtual;

    // DEBUG: Verify star position encoding roundtrip
    if (nRealStars > 0) {
        for (let i = 0; i < Math.min(3, nRealStars); i++) {
            const row0 = (0 * texW + i) * 4;
            const bytes = [starDataBuffer[row0], starDataBuffer[row0 + 1], starDataBuffer[row0 + 2], starDataBuffer[row0 + 3]];
            const decodedX = bytes[0] * 256 + bytes[1];
            const decodedY = bytes[2] * 256 + bytes[3];
            console.log(`[DF_DEBUG] Star${i}: actual=(${stars[i].x.toFixed(1)},${stars[i].y.toFixed(1)}) bytes=[${bytes}] decoded=(${decodedX},${decodedY})`);
        }
        console.log(`[DF_DEBUG] nRealStars=${nRealStars} nVirtual=${nVirtual} total=${totalPackedStars} texW=${texW} texH=${texH}`);
    }

    if (!starDataTexture) {
        // First time: create BufferImageSource + Texture
        const source = new PIXI.BufferImageSource({
            resource: starDataBuffer,
            width: texW,
            height: texH,
            format: 'rgba8unorm',           // MUST be explicit Ã¢â‚¬â€ Uint8Array defaults to bgra8unorm!
            alphaMode: 'no-premultiply-alpha', // data texture, not color
            scaleMode: 'nearest',
            autoGarbageCollect: false,
        });
        starDataTexture = new PIXI.Texture({ source });
    } else {
        // Subsequent: update existing source in-place (avoids texture recreation)
        (starDataTexture.source as PIXI.BufferImageSource).resource = starDataBuffer;
        starDataTexture.source.update();
    }
}

// ============================================================================
// GPU Mesh Creation — Two-pass pipeline
// ============================================================================
// Pass 1: ownershipBitGl + starData → mesh renders to ownershipRT (RenderTexture)
// Pass 2: visualBitGl + ownershipRT → mesh renders to screen

function ensureMeshes(worldWidth: number, worldHeight: number): void {
    const padding = GAME_CONFIG.DF_EDGE_FADE ?? 200;
    const expand = GAME_CONFIG.DF_EXPANSION ?? 0.10;

    const dimsChanged = worldWidth !== cachedMeshWorldW || worldHeight !== cachedMeshWorldH || expand !== cachedMeshExpansion;
    if (pass1Shader && pass2Shader && !dimsChanged) return;

    // Expand mesh coverage
    const extraX = worldWidth * expand;
    const extraY = worldHeight * expand;
    const x0 = -padding - extraX, y0 = -padding - extraY;

    // Cache mesh bounds for vector border extraction
    cachedMeshX0 = x0;
    cachedMeshY0 = y0;
    const x1 = worldWidth + padding + extraX, y1 = worldHeight + padding + extraY;

    // ── RenderTexture for ownership data ──
    cachedMeshW = x1 - x0;
    cachedMeshH = y1 - y0;
    const rtW = Math.ceil(x1 - x0);
    const rtH = Math.ceil(y1 - y0);
    if (ownershipRT) ownershipRT.destroy();
    ownershipRT = PIXI.RenderTexture.create({
        width: rtW,
        height: rtH,
        scaleMode: 'nearest',
    });

    // Rebuild geometry for both meshes if dimensions changed
    if (pass1Shader && pass2Shader && dimsChanged) {
        const geom1 = new PIXI.MeshGeometry({
            positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
            uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
            topology: 'triangle-list',
        });
        if (pass1Mesh) {
            if (pass1Mesh.parent) pass1Mesh.parent.removeChild(pass1Mesh);
            pass1Mesh.destroy();
        }
        pass1Mesh = new PIXI.Mesh({ geometry: geom1, shader: pass1Shader }) as any;
        if (pass1Container) pass1Container.addChild(pass1Mesh!);

        const geom2 = new PIXI.MeshGeometry({
            positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
            uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
            topology: 'triangle-list',
        });
        if (pass2Mesh) {
            const parent = pass2Mesh.parent;
            if (parent) parent.removeChild(pass2Mesh);
            pass2Mesh.destroy();
        }
        pass2Mesh = new PIXI.Mesh({ geometry: geom2, shader: pass2Shader }) as any;

        cachedMeshWorldW = worldWidth;
        cachedMeshWorldH = worldHeight;
        cachedMeshExpansion = expand;
        return;
    }

    // ── First time: compile both shader programs ──

    // Pass 1: ownership computation
    const pass1Program = compileHighShaderGlProgram({
        bits: [localUniformBitGl, ownershipBitGl, roundPixelsBitGl],
        name: 'territory-ownership',
    });

    pass1Shader = new PIXI.Shader({
        glProgram: pass1Program,
        resources: {
            territoryUniforms: {
                uNumStars: { value: 0, type: 'i32' },
                uWorldWidth: { value: 0, type: 'f32' },
                uWorldHeight: { value: 0, type: 'f32' },
                uMorphFactor: { value: 0, type: 'f32' },
                uInfluenceWeight: { value: 1.0, type: 'f32' },
                uMinStarRadius: { value: 0, type: 'f32' },
                uNumRealStars: { value: 0, type: 'i32' },
            },
            uStarData: starDataTexture?.source ?? makeGradientTestTexture().source,
        },
    });

    const geom1 = new PIXI.MeshGeometry({
        positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        topology: 'triangle-list',
    });
    pass1Mesh = new PIXI.Mesh({ geometry: geom1, shader: pass1Shader }) as any;

    if (!pass1Container) pass1Container = new PIXI.Container();
    pass1Container.addChild(pass1Mesh!);

    // Pass 2: visual rendering
    const pass2Program = compileHighShaderGlProgram({
        bits: [localUniformBitGl, visualBitGl, roundPixelsBitGl],
        name: 'territory-visual',
    });

    pass2Shader = new PIXI.Shader({
        glProgram: pass2Program,
        resources: {
            visualUniforms: {
                uTexWidth: { value: rtW, type: 'f32' },
                uTexHeight: { value: rtH, type: 'f32' },
                uWorldWidth: { value: 0, type: 'f32' },
                uWorldHeight: { value: 0, type: 'f32' },
                uPadding: { value: 0, type: 'f32' },
                uBorderWidth: { value: 5, type: 'f32' },
                uBorderSoftness: { value: 3, type: 'f32' },
                uBorderAlpha: { value: 0.6, type: 'f32' },
                uBorderBrighten: { value: 60, type: 'f32' },
                uFillAlpha: { value: 0.15, type: 'f32' },
                uEdgeFade: { value: 200, type: 'f32' },
                uHueShift: { value: 0, type: 'f32' },
                uSatMult: { value: 0.5, type: 'f32' },
                uLightMult: { value: 0.4, type: 'f32' },
                uSmoothing: { value: 30, type: 'f32' },
                uBordersEnabled: { value: 1, type: 'f32' },
                uContentMinX: { value: 0, type: 'f32' },
                uContentMinY: { value: 0, type: 'f32' },
                uPlayerColor0: { value: new Float32Array([1, 0, 0]), type: 'vec3<f32>' },
                uPlayerColor1: { value: new Float32Array([0, 0, 1]), type: 'vec3<f32>' },
                uPlayerColor2: { value: new Float32Array([0, 1, 0]), type: 'vec3<f32>' },
                uPlayerColor3: { value: new Float32Array([1, 1, 0]), type: 'vec3<f32>' },
                uPlayerColor4: { value: new Float32Array([1, 0, 1]), type: 'vec3<f32>' },
                uPlayerColor5: { value: new Float32Array([0, 1, 1]), type: 'vec3<f32>' },
                uPlayerColor6: { value: new Float32Array([1, 0.5, 0]), type: 'vec3<f32>' },
                uPlayerColor7: { value: new Float32Array([0.5, 0, 1]), type: 'vec3<f32>' },
            },
            uOwnershipTex: ownershipRT!.source,
        },
    });

    const geom2 = new PIXI.MeshGeometry({
        positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        topology: 'triangle-list',
    });
    pass2Mesh = new PIXI.Mesh({ geometry: geom2, shader: pass2Shader }) as any;

    cachedMeshWorldW = worldWidth;
    cachedMeshWorldH = worldHeight;
    cachedMeshExpansion = expand;
}


// ============================================================================
// Update GPU uniforms from current state
// ============================================================================

function updatePass1Uniforms(
    stars: StarState[],
    worldWidth: number,
    worldHeight: number,
): void {
    if (!pass1Shader) return;

    const nStars = totalPackedStars > 0 ? totalPackedStars : Math.min(stars.length, MAX_STARS);

    const u = pass1Shader.resources.territoryUniforms.uniforms;
    u.uNumStars = nStars;
    u.uNumRealStars = stars.length;
    u.uWorldWidth = worldWidth;
    u.uWorldHeight = worldHeight;
    u.uInfluenceWeight = GAME_CONFIG.DF_INFLUENCE_WEIGHT ?? 1.0;
    u.uMinStarRadius = GAME_CONFIG.DF_MIN_STAR_RADIUS ?? 0;

    if (starDataTexture) {
        pass1Shader.resources.uStarData = starDataTexture.source;
    }

    const ug = pass1Shader.resources.territoryUniforms as any;
    if (ug && typeof ug.update === 'function') {
        ug.update();
    }
}

function updatePass2Uniforms(
    stars: StarState[],
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
): void {
    if (!pass2Shader) return;

    const nPlayers = currentPlayerIds.length;
    const padding = GAME_CONFIG.DF_EDGE_FADE ?? 200;

    const u = pass2Shader.resources.visualUniforms.uniforms;
    u.uWorldWidth = worldWidth;
    u.uWorldHeight = worldHeight;
    u.uPadding = padding;
    u.uBorderWidth = GAME_CONFIG.DF_BORDER_WIDTH ?? 5;
    u.uBorderSoftness = GAME_CONFIG.DF_BORDER_SOFTNESS ?? 3;
    u.uBorderAlpha = GAME_CONFIG.DF_BORDER_ALPHA ?? 0.8;
    u.uBorderBrighten = GAME_CONFIG.DF_BORDER_BRIGHTEN ?? 20;
    u.uFillAlpha = GAME_CONFIG.DF_ALPHA ?? 0.2;
    u.uEdgeFade = GAME_CONFIG.DF_EDGE_FADE ?? 200;
    u.uHueShift = GAME_CONFIG.DF_HUE ?? 0;
    u.uSatMult = GAME_CONFIG.DF_SATURATION ?? 1;
    u.uLightMult = GAME_CONFIG.DF_LIGHTNESS ?? 1;
    u.uSmoothing = GAME_CONFIG.DF_SMOOTHING ?? 30;
    u.uBordersEnabled = (GAME_CONFIG as any).DF_BORDERS_ENABLED !== false ? 1.0 : 0.0;

    // Compute expanded content bounds for edge fade
    // These must match the mesh geometry (x0,y0)→(x1,y1) from ensureMeshes()
    const expand = GAME_CONFIG.DF_EXPANSION ?? 0.10;
    const extraX = worldWidth * expand;
    const extraY = worldHeight * expand;
    const contentMinX = -padding - extraX;
    const contentMinY = -padding - extraY;
    const contentW = worldWidth + 2 * padding + 2 * extraX;
    const contentH = worldHeight + 2 * padding + 2 * extraY;

    u.uContentMinX = contentMinX;
    u.uContentMinY = contentMinY;
    u.uWorldWidth = contentW;
    u.uWorldHeight = contentH;

    if (ownershipRT) {
        u.uTexWidth = ownershipRT.width;
        u.uTexHeight = ownershipRT.height;
    }

    for (let i = 0; i < Math.min(nPlayers, MAX_PLAYERS); i++) {
        const hex = colorUtils.getPlayerColor(currentPlayerIds[i]);
        const r = ((hex >> 16) & 0xff) / 255;
        const g = ((hex >> 8) & 0xff) / 255;
        const b = (hex & 0xff) / 255;
        const colorArr = new Float32Array([r, g, b]);
        (u as any)[`uPlayerColor${i}`] = colorArr;
    }

    if (ownershipRT) {
        pass2Shader.resources.uOwnershipTex = ownershipRT.source;
    }

    const ug = pass2Shader.resources.visualUniforms as any;
    if (ug && typeof ug.update === 'function') {
        ug.update();
    }
}

// ============================================================================
// Blur helper
// ============================================================================

function applyBlur(): void {
    if (!pass2Mesh) return;
    const blur = GAME_CONFIG.DF_BLUR ?? 0;
    if (blur > 0) {
        if (cachedBlurStrength !== blur) {
            cachedBlurFilter = new PIXI.BlurFilter({ strength: blur, quality: 3 });
            cachedBlurStrength = blur;
        }
        pass2Mesh.filters = cachedBlurFilter ? [cachedBlurFilter] : [];
    } else {
        pass2Mesh.filters = [];
        cachedBlurFilter = null;
        cachedBlurStrength = -1;
    }
}

// ============================================================================
// Main Renderer — Two-Pass Pipeline
// ============================================================================

export function renderDistanceFieldTerritory(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
    app?: PIXI.Application,
): void {
    if (!GAME_CONFIG.TERRITORY_DISTANCE_FIELD) {
        if (pass2Mesh) pass2Mesh.visible = false;
        return;
    }

    // Cache the PIXI app reference for rendering Pass 1
    if (app) cachedApp = app;

    const now = performance.now();
    const conns = connections ?? [];
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;

    // ── Rebuild lane index if connections changed ──
    const connFp = buildConnFp(conns);
    if (connFp !== cachedConnFp) {
        buildLaneIndex(stars, conns);
        cachedConnFp = connFp;
    }

    // ── Check if ownership changed → recompute Dijkstra ──
    const ownerFp = buildOwnerFp(stars);
    const ownerChanged = ownerFp !== cachedOwnerFp;

    if (ownerChanged) {
        cachedOwnerFp = ownerFp;

        const playerSet = new Set<string>();
        for (const s of stars) if (s.ownerId) playerSet.add(s.ownerId);
        const newPlayerIds = Array.from(playerSet).sort();

        const metric = (GAME_CONFIG.DF_DISTANCE_METRIC ?? 'length') as 'hops' | 'length';
        const newDist = computeDistToPlayer(stars, conns, newPlayerIds, metric);

        if (currentDist && transitionMs > 0 && currentPlayerIds.length === newPlayerIds.length
            && currentPlayerIds.every((id, i) => id === newPlayerIds[i])) {
            prevDist = currentDist;
            morphStartTime = now;
            isMorphing = true;
        } else {
            prevDist = null;
            isMorphing = false;
        }

        currentDist = newDist;
        currentPlayerIds = newPlayerIds;
    }

    if (!currentDist || currentPlayerIds.length === 0) {
        if (pass2Mesh) pass2Mesh.visible = false;
        return;
    }

    // ── Temporal morph factor ──
    let morphFactor = 0;
    if (isMorphing && prevDist && transitionMs > 0) {
        const elapsed = now - morphStartTime;
        const rawT = Math.min(1, elapsed / transitionMs);

        if (rawT >= 1) {
            isMorphing = false;
            prevDist = null;
            morphFactor = 0;
        } else {
            morphFactor = 1 - rawT;
        }
    }

    // —— Build GPU data texture (only when ownership or morph changed) ——
    const configFp = buildConfigFp();
    const needsRebuild = ownerChanged || isMorphing || configFp !== cachedConfigFp;
    cachedConfigFp = configFp;

    if (needsRebuild) {
        const ownedStars = stars.filter(s => s.ownerId);
        let virtuals: VirtualSite[] = [];

        if (GAME_CONFIG.DF_CORRIDOR_ENABLED && conns.length > 0) {
            const spacing = GAME_CONFIG.DF_CORRIDOR_SPACING ?? 60;
            const weight = GAME_CONFIG.DF_CORRIDOR_WEIGHT ?? 1.0;
            const mode = GAME_CONFIG.DF_CORRIDOR_MODE ?? 'spacing';
            const count = mode === 'count' ? (GAME_CONFIG.DF_CORRIDOR_COUNT ?? 3) : undefined;
            const corridorSites = computeCorridorVirtuals(ownedStars, conns, spacing, 0.5, count);
            for (const s of corridorSites) s.weight = weight;
            virtuals = virtuals.concat(corridorSites);
            console.log(`[DF] Corridors: ${corridorSites.length} sites (mode=${mode}, ${mode === 'count' ? `count=${count}` : `spacing=${spacing}`}, weight=${weight})`);
        }

        if (GAME_CONFIG.DF_DISCONNECT_ENABLED && conns.length > 0) {
            const maxDist = GAME_CONFIG.DF_DISCONNECT_DISTANCE ?? 400;
            const weight = GAME_CONFIG.DF_DISCONNECT_WEIGHT ?? 0.3;
            const disconnectSites = computeDisconnectVirtuals(ownedStars, stars, conns, maxDist, weight);
            virtuals = virtuals.concat(disconnectSites);
            console.log(`[DF] Disconnects: ${disconnectSites.length} sites (maxDist=${maxDist}, weight=${weight})`);
            for (const ds of disconnectSites) {
                const pIdx = currentPlayerIds.indexOf(ds.ownerId);
                console.log(`  [DF-DC] site at (${ds.x.toFixed(0)},${ds.y.toFixed(0)}) owner=${ds.ownerId} pIdx=${pIdx} weight=${ds.weight}`);
            }
        }

        console.log(`[DF] Total packed: ${stars.length} real + ${virtuals.length} virtual = ${stars.length + virtuals.length}`);
        buildStarDataTexture(stars, currentDist, prevDist, currentPlayerIds, virtuals);
    }

    // —— Ensure both meshes exist ——
    ensureMeshes(worldWidth, worldHeight);

    // —— PASS 1: Render ownership to RenderTexture ——
    if (cachedApp && pass1Container && ownershipRT && pass1Shader) {
        pass1Shader.resources.territoryUniforms.uniforms.uMorphFactor = morphFactor;
        updatePass1Uniforms(stars, worldWidth, worldHeight);

        cachedApp.renderer.render({
            container: pass1Container,
            target: ownershipRT,
            clear: true,
        });
    }

    // —— PASS 2: Add visual mesh to container ——
    if (pass2Mesh && !pass2Mesh.parent) {
        container.addChild(pass2Mesh);
    }
    if (pass2Mesh) {
        pass2Mesh.visible = true;
    }

    updatePass2Uniforms(stars, colorUtils, worldWidth, worldHeight);

    // —— PASS 3: Vector border overlay ——
    // Only recompute when ownership changes (avoids per-frame GPU readback)
    const borderFpNow = ownerFp + ':' + (GAME_CONFIG.DF_BORDER_WIDTH ?? 5) + ':' + (GAME_CONFIG.DF_BORDER_ALPHA ?? 0.8) + ':' + (GAME_CONFIG.DF_BORDER_BRIGHTEN ?? 20);
    if (cachedApp && ownershipRT && borderFpNow !== cachedBorderOwnerFp) {
        cachedBorderOwnerFp = borderFpNow;
        drawVectorBorders(
            container, cachedApp, ownershipRT, colorUtils,
            cachedMeshX0, cachedMeshY0, cachedMeshW, cachedMeshH,
        );
    }

    // —— Apply filter pipeline ——
    applyBlur();
}

// ============================================================================
// Cache Reset
// ============================================================================

export function resetDistanceFieldTerritoryCache(): void {
    cachedOwnerFp = '';
    cachedConfigFp = '';
    cachedConnFp = '';
    currentDist = null;
    prevDist = null;
    isMorphing = false;
    morphStartTime = 0;
    currentPlayerIds = [];

    if (pass1Mesh) {
        if (pass1Mesh.parent) pass1Mesh.parent.removeChild(pass1Mesh);
        pass1Mesh.destroy();
        pass1Mesh = null;
    }
    if (pass2Mesh) {
        if (pass2Mesh.parent) pass2Mesh.parent.removeChild(pass2Mesh);
        pass2Mesh.destroy();
        pass2Mesh = null;
    }
    if (pass1Shader) {
        pass1Shader.destroy();
        pass1Shader = null;
    }
    if (pass2Shader) {
        pass2Shader.destroy();
        pass2Shader = null;
    }
    if (pass1Container) {
        pass1Container.destroy();
        pass1Container = null;
    }
    if (ownershipRT) {
        ownershipRT.destroy();
        ownershipRT = null;
    }

    starDataTexture = null;
    starDataBuffer = null;
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
    cachedApp = null;
    laneArray = [];
    laneCells = new Map();

    if (borderGraphics) {
        if (borderGraphics.parent) borderGraphics.parent.removeChild(borderGraphics);
        borderGraphics.destroy();
        borderGraphics = null;
    }
    cachedBorderOwnerFp = '';
}
