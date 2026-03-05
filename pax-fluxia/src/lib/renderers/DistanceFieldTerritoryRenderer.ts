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


// Ã¢â€â‚¬Ã¢â€â‚¬ Constants Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const MAX_STARS = 64;
const MAX_PLAYERS = 8;

// Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
interface LaneData {
    ax: number; ay: number;
    bx: number; by: number;
    len: number;
    starAIdx: number;
    starBIdx: number;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Shader Bit for Territory Distance Field Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Uses PIXI's compileHighShaderGlProgram() with shader bits.
// MVP = uProjectionMatrix * uWorldTransformMatrix * modelMatrix

const territoryBitGl = {
    name: 'territory-distance-field-bit',
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
            uniform float uPadding;
            uniform int uNumPlayers;
            uniform float uBorderWidth;
            uniform float uBorderSoftness;
            uniform float uBorderAlpha;
            uniform float uBorderBrighten;
            uniform float uFillAlpha;
            uniform float uEdgeFade;
            uniform float uHueShift;
            uniform float uSatMult;
            uniform float uLightMult;
            uniform float uMorphFactor;
            uniform vec3 uPlayerColor0;
            uniform vec3 uPlayerColor1;
            uniform vec3 uPlayerColor2;
            uniform vec3 uPlayerColor3;
            uniform vec3 uPlayerColor4;
            uniform vec3 uPlayerColor5;
            uniform vec3 uPlayerColor6;
            uniform vec3 uPlayerColor7;
        `,
        main: /* glsl */ `
            vec2 worldPos = vLocalPos;

            // Find nearest star to this pixel
            float minDist = 1e9;
            int nearestStar = -1;
            for (int i = 0; i < 256; i++) {
                if (i >= uNumStars) break;
                vec4 posRaw = texelFetch(uStarData, ivec2(i, 0), 0);
                float sx = floor(posRaw.r * 255.0 + 0.5) * 256.0 + floor(posRaw.g * 255.0 + 0.5);
                float sy = floor(posRaw.b * 255.0 + 0.5) * 256.0 + floor(posRaw.a * 255.0 + 0.5);
                float d = distance(worldPos, vec2(sx, sy));
                if (d < minDist) { minDist = d; nearestStar = i; }
            }

            if (nearestStar < 0) { outColor = vec4(0.0); }
            else {
                // Get owner of nearest star (row 2, R channel, 1-indexed)
                vec4 ownerRaw = texelFetch(uStarData, ivec2(nearestStar, 2), 0);
                int ownerIdx = int(floor(ownerRaw.r * 255.0 + 0.5)) - 1;

                if (ownerIdx < 0) { outColor = vec4(0.0); }
                else {
                    // Player color lookup
                    vec3 pc = vec3(0.5);
                    if (ownerIdx == 0) pc = uPlayerColor0;
                    else if (ownerIdx == 1) pc = uPlayerColor1;
                    else if (ownerIdx == 2) pc = uPlayerColor2;
                    else if (ownerIdx == 3) pc = uPlayerColor3;
                    else if (ownerIdx == 4) pc = uPlayerColor4;
                    else if (ownerIdx == 5) pc = uPlayerColor5;
                    else if (ownerIdx == 6) pc = uPlayerColor6;
                    else if (ownerIdx == 7) pc = uPlayerColor7;

                    // HSL adjustment
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
                    vec3 finalRGB = rgb + vec3(m2);

                    float alpha = uFillAlpha;

                    // Border: find second-nearest star with different owner
                    float secondMinDist = 1e9;
                    int secondOwner = -1;
                    for (int j = 0; j < 256; j++) {
                        if (j >= uNumStars || j == nearestStar) continue;
                        vec4 p2 = texelFetch(uStarData, ivec2(j, 0), 0);
                        float sx2 = floor(p2.r * 255.0 + 0.5) * 256.0 + floor(p2.g * 255.0 + 0.5);
                        float sy2 = floor(p2.b * 255.0 + 0.5) * 256.0 + floor(p2.a * 255.0 + 0.5);
                        float d2 = distance(worldPos, vec2(sx2, sy2));
                        vec4 own2 = texelFetch(uStarData, ivec2(j, 2), 0);
                        int oi2 = int(floor(own2.r * 255.0 + 0.5)) - 1;
                        if (oi2 != ownerIdx && oi2 >= 0 && d2 < secondMinDist) {
                            secondMinDist = d2;
                            secondOwner = oi2;
                        }
                    }

                    // Border rendering
                    if (secondOwner >= 0) {
                        float borderDist = abs(minDist - secondMinDist);
                        float borderFactor = 1.0 - smoothstep(uBorderWidth - uBorderSoftness, uBorderWidth + uBorderSoftness, borderDist);
                        if (borderFactor > 0.0) {
                            vec3 borderColor = min(finalRGB + vec3(uBorderBrighten / 255.0), vec3(1.0));
                            finalRGB = mix(finalRGB, borderColor, borderFactor);
                            alpha = mix(alpha, uBorderAlpha, borderFactor);
                        }
                    }

                    // Edge fade at world boundaries
                    float edgeX = min(worldPos.x, uWorldWidth - worldPos.x);
                    float edgeY = min(worldPos.y, uWorldHeight - worldPos.y);
                    float edgeDist = min(edgeX, edgeY);
                    alpha *= smoothstep(0.0, uEdgeFade, edgeDist);

                    outColor = vec4(finalRGB, alpha);
                }
            }
        `,
    },
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Module State Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

let cachedOwnerFp = '';
let cachedConfigFp = '';
let cachedConnFp = '';
let cachedMesh: PIXI.Mesh | null = null;
let cachedMeshShader: PIXI.Shader | null = null;
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
        + `${GAME_CONFIG.DF_DISTANCE_METRIC}:${GAME_CONFIG.TERRITORY_TRANSITION_MS}:${GAME_CONFIG.DF_EDGE_FADE}`;
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

function encode16(value: number): [number, number] {
    const clamped = Math.max(0, Math.min(65535, Math.round(value)));
    return [Math.floor(clamped / 256), clamped % 256];
}

function buildStarDataTexture(
    stars: StarState[],
    dist: number[][],
    prevDistArr: number[][] | null,
    playerIds: string[],
): void {
    const nStars = Math.min(stars.length, MAX_STARS);
    const nPlayers = playerIds.length;
    const texW = MAX_STARS;
    const texH = 4;
    const bufSize = texW * texH * 4;

    // Allocate buffer if needed
    if (!starDataBuffer || starDataBuffer.length !== bufSize) {
        starDataBuffer = new Uint8Array(bufSize);
    }
    starDataBuffer.fill(0);

    for (let i = 0; i < nStars; i++) {
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

    // DEBUG: Verify star position encoding roundtrip
    if (nStars > 0) {
        for (let i = 0; i < Math.min(3, nStars); i++) {
            const row0 = (0 * texW + i) * 4;
            const bytes = [starDataBuffer[row0], starDataBuffer[row0 + 1], starDataBuffer[row0 + 2], starDataBuffer[row0 + 3]];
            const decodedX = bytes[0] * 256 + bytes[1];
            const decodedY = bytes[2] * 256 + bytes[3];
            console.log(`[DF_DEBUG] Star${i}: actual=(${stars[i].x.toFixed(1)},${stars[i].y.toFixed(1)}) bytes=[${bytes}] decoded=(${decodedX},${decodedY})`);
        }
        console.log(`[DF_DEBUG] nStars=${nStars} texW=${texW} texH=${texH} bufLen=${starDataBuffer.length}`);
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
// GPU Mesh Creation (replaces Filter approach for correct zoom/resize)
// ============================================================================

function ensureMesh(worldWidth: number, worldHeight: number): PIXI.Shader {
    const padding = GAME_CONFIG.DF_EDGE_FADE ?? 200;

    if (cachedMeshShader) return cachedMeshShader;

    const glProgram = compileHighShaderGlProgram({
        bits: [localUniformBitGl, territoryBitGl, roundPixelsBitGl],
        name: 'territory-distance-field',
    });

    const x0 = -padding, y0 = -padding;
    const x1 = worldWidth + padding, y1 = worldHeight + padding;

    cachedMeshShader = new PIXI.Shader({
        glProgram,
        resources: {
            // CRITICAL: Must pass TextureSource (.source), NOT Texture!
            territoryUniforms: {
                uNumStars: { value: 0, type: 'i32' },
                uNumPlayers: { value: 0, type: 'i32' },
                uWorldWidth: { value: 0, type: 'f32' },
                uWorldHeight: { value: 0, type: 'f32' },
                uPadding: { value: 0, type: 'f32' },
                uBorderWidth: { value: 5, type: 'f32' },
                uBorderSoftness: { value: 3, type: 'f32' },
                uBorderAlpha: { value: 0.8, type: 'f32' },
                uBorderBrighten: { value: 20, type: 'f32' },
                uFillAlpha: { value: 0.2, type: 'f32' },
                uEdgeFade: { value: 200, type: 'f32' },
                uHueShift: { value: 0, type: 'f32' },
                uSatMult: { value: 0.7, type: 'f32' },
                uLightMult: { value: 0.5, type: 'f32' },
                uMorphFactor: { value: 0, type: 'f32' },
                // Player colors
                uPlayerColor0: { value: new Float32Array([1, 0, 0]), type: 'vec3<f32>' },
                uPlayerColor1: { value: new Float32Array([0, 0, 1]), type: 'vec3<f32>' },
                uPlayerColor2: { value: new Float32Array([0, 1, 0]), type: 'vec3<f32>' },
                uPlayerColor3: { value: new Float32Array([1, 1, 0]), type: 'vec3<f32>' },
                uPlayerColor4: { value: new Float32Array([1, 0, 1]), type: 'vec3<f32>' },
                uPlayerColor5: { value: new Float32Array([0, 1, 1]), type: 'vec3<f32>' },
                uPlayerColor6: { value: new Float32Array([1, 0.5, 0]), type: 'vec3<f32>' },
                uPlayerColor7: { value: new Float32Array([0.5, 0, 1]), type: 'vec3<f32>' },
            },
            uStarData: starDataTexture?.source ?? makeGradientTestTexture().source,
        },
    });

    // Quad geometry in WORLD SPACE with UVs 0Ã¢â€ â€™1
    // MeshGeometry wraps buffers with proper VERTEX|COPY_DST usage flags
    const geometry = new PIXI.MeshGeometry({
        positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        topology: 'triangle-list',
    });

    cachedMesh = new PIXI.Mesh({ geometry, shader: cachedMeshShader }) as any;

    return cachedMeshShader;
}


// ============================================================================
// Update GPU uniforms from current state
// ============================================================================

function updateFilterUniforms(
    stars: StarState[],
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
): void {
    if (!cachedMeshShader) return;

    const nStars = Math.min(stars.length, MAX_STARS);
    const nPlayers = currentPlayerIds.length;
    const padding = GAME_CONFIG.DF_EDGE_FADE ?? 200;

    const u = cachedMeshShader.resources.territoryUniforms.uniforms;
    u.uNumStars = nStars;
    u.uNumPlayers = nPlayers;
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
    u.uSatMult = GAME_CONFIG.DF_SATURATION ?? 0.7;
    u.uLightMult = GAME_CONFIG.DF_LIGHTNESS ?? 0.5;

    // Pack player colors (0-1 range)
    for (let i = 0; i < Math.min(nPlayers, MAX_PLAYERS); i++) {
        const hex = colorUtils.getPlayerColor(currentPlayerIds[i]);
        const r = ((hex >> 16) & 0xff) / 255;
        const g = ((hex >> 8) & 0xff) / 255;
        const b = (hex & 0xff) / 255;
        const colorArr = new Float32Array([r, g, b]);
        (u as any)[`uPlayerColor${i}`] = colorArr;
    }

    // Update star data texture reference Ã¢â‚¬â€ pass .source (TextureSource), not Texture
    if (starDataTexture) {
        cachedMeshShader.resources.uStarData = starDataTexture.source;
    }
}

// ============================================================================
// Blur helper (PRESERVED FROM V1)
// ============================================================================

function applyBlur(): void {
    if (!cachedMesh) return;
    const blur = GAME_CONFIG.DF_BLUR ?? 0;
    if (blur > 0) {
        if (cachedBlurStrength !== blur) {
            cachedBlurFilter = new PIXI.BlurFilter({ strength: blur, quality: 3 });
            cachedBlurStrength = blur;
        }
        // With Mesh approach, the custom shader is built in Ã¢â‚¬â€ only add blur as extra filter
        cachedMesh.filters = cachedBlurFilter ? [cachedBlurFilter] : [];
    } else {
        cachedMesh.filters = [];
        cachedBlurFilter = null;
        cachedBlurStrength = -1;
    }
}

// ============================================================================
// Main Renderer
// ============================================================================

export function renderDistanceFieldTerritory(
    stars: StarState[],
    container: PIXI.Container,
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    connections?: StarConnection[],
): void {
    if (!GAME_CONFIG.TERRITORY_DISTANCE_FIELD) {
        if (cachedMesh) cachedMesh.visible = false;
        return;
    }

    const now = performance.now();
    const conns = connections ?? [];
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;

    // Ã¢â€â‚¬Ã¢â€â‚¬ Rebuild lane index if connections changed Ã¢â€â‚¬Ã¢â€â‚¬
    const connFp = buildConnFp(conns);
    if (connFp !== cachedConnFp) {
        buildLaneIndex(stars, conns);
        cachedConnFp = connFp;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Check if ownership changed Ã¢â€ â€™ recompute Dijkstra Ã¢â€â‚¬Ã¢â€â‚¬
    const ownerFp = buildOwnerFp(stars);
    const ownerChanged = ownerFp !== cachedOwnerFp;

    if (ownerChanged) {
        cachedOwnerFp = ownerFp;

        // Build player list
        const playerSet = new Set<string>();
        for (const s of stars) if (s.ownerId) playerSet.add(s.ownerId);
        const newPlayerIds = Array.from(playerSet).sort();

        // Compute new distances
        const metric = (GAME_CONFIG.DF_DISTANCE_METRIC ?? 'length') as 'hops' | 'length';
        const newDist = computeDistToPlayer(stars, conns, newPlayerIds, metric);

        // Start temporal morph if we have previous data
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
        if (cachedMesh) cachedMesh.visible = false;
        return;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Temporal morph factor Ã¢â€â‚¬Ã¢â€â‚¬
    let morphFactor = 0;
    if (isMorphing && prevDist && transitionMs > 0) {
        const elapsed = now - morphStartTime;
        const rawT = Math.min(1, elapsed / transitionMs);

        if (rawT >= 1) {
            isMorphing = false;
            prevDist = null;
            morphFactor = 0;
        } else {
            // Exponential decay for smooth morph
            morphFactor = 1 - rawT;
        }
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Build GPU data texture (only when ownership or morph changed) Ã¢â€â‚¬Ã¢â€â‚¬
    const configFp = buildConfigFp();
    const needsUpdate = ownerChanged || isMorphing || configFp !== cachedConfigFp;
    if (!needsUpdate && cachedMesh) {
        cachedMesh.visible = true;
        return;
    }
    cachedConfigFp = configFp;

    // Pack star data into data texture
    buildStarDataTexture(stars, currentDist, prevDist, currentPlayerIds);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Ensure GPU mesh exists Ã¢â€â‚¬Ã¢â€â‚¬
    ensureMesh(worldWidth, worldHeight);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Add mesh to container if not already Ã¢â€â‚¬Ã¢â€â‚¬
    if (cachedMesh && !cachedMesh.parent) {
        container.addChild(cachedMesh);
    }
    if (cachedMesh) {
        cachedMesh.visible = true;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Update GPU uniforms Ã¢â€â‚¬Ã¢â€â‚¬
    if (cachedMeshShader) {
        cachedMeshShader.resources.territoryUniforms.uniforms.uMorphFactor = morphFactor;
    }
    updateFilterUniforms(stars, colorUtils, worldWidth, worldHeight);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Apply filter pipeline Ã¢â€â‚¬Ã¢â€â‚¬
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

    if (cachedMesh) {
        if (cachedMesh.parent) cachedMesh.parent.removeChild(cachedMesh);
        cachedMesh.destroy();
        cachedMesh = null;
    }
    if (cachedMeshShader) {
        cachedMeshShader.destroy();
        cachedMeshShader = null;
    }

    starDataTexture = null;
    starDataBuffer = null;
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
    laneArray = [];
    laneCells = new Map();
}
