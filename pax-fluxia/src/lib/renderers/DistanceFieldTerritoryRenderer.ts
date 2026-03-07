// ============================================================================
// DistanceFieldTerritoryRenderer - GPU-Accelerated (V2)
// ============================================================================
//
// Pipeline (from Deep Technical Guidance, Section B):
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


// ============================================================================
// Constants
// ============================================================================
const MAX_STARS = 128; // Increased to accommodate virtual sites (corridors + disconnects)
const MAX_PLAYERS = 8;


// ============================================================================
// Types
// ============================================================================
interface LaneData {
    ax: number; ay: number;
    bx: number; by: number;
    len: number;
    starAIdx: number;
    starBIdx: number;
}

type AlignmentContractStage = 'prebuild' | 'uniforms';

interface AlignmentBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

interface AlignmentSample {
    starId: string;
    worldX: number;
    worldY: number;
    normalizedX: number;
    normalizedY: number;
}

interface AlignmentDiagnosticsPayload {
    stage: AlignmentContractStage;
    world: AlignmentBounds;
    content: AlignmentBounds;
    mesh: AlignmentBounds;
    padding: number;
    expansion: number;
    issues: string[];
    samples: AlignmentSample[];
}

interface AlignmentContract {
    contentMinX: number;
    contentMinY: number;
    diagnostics: AlignmentDiagnosticsPayload;
}

interface CanonicalDfInputSnapshot {
    stars: StarState[];
    connections: StarConnection[];
    ownedStars: StarState[];
}

interface DfChangeClassification {
    geometryChanged: boolean;
    topologyChanged: boolean;
    visualChanged: boolean;
    geometryFp: string;
    topologyFp: string;
    visualFp: string;
    changedBuckets: Array<'geometry' | 'topology' | 'visual'>;
}

interface TwoPassSampleComparison {
    starId: string;
    worldX: number;
    worldY: number;
    pass1UvX: number;
    pass1UvY: number;
    pass2WorldX: number;
    pass2WorldY: number;
    mappingDrift: number;
    ownerSinglePass: number;
    ownerTwoPass: number;
    ownerMismatch: boolean;
}

interface TwoPassDiagnosticsPayload {
    enabled: boolean;
    legacyOriginMode: boolean;
    mismatchCount: number;
    maxMappingDrift: number;
    samples: TwoPassSampleComparison[];
}

interface OwnershipSampleSite {
    x: number;
    y: number;
    ownerIdx: number;
    order: number;
    curDijkstra: number;
    prevDijkstra: number;
    boost: number;
    isRealStar: boolean;
}

interface VectorBorderPolyline {
    ownerA: number;
    ownerB: number;
    points: number[];
}

const DF_CONTENT_BOUNDS_PADDING = 80;
const DF_ALIGNMENT_EPSILON = 0.5;
const DF_ALIGNMENT_SAMPLE_LIMIT = 6;
const DF_ALIGNMENT_HISTORY_LIMIT = 24;
const DF_TIE_EPSILON = 0.01;
const DF_INTERNAL_TWO_PASS_TRACK = false;
const DF_INTERNAL_TWO_PASS_LEGACY_CONTENT_ORIGIN = false;
const DF_TWO_PASS_BORDERS_ENABLED = true;
const DF_PASS1_GAP_SCALE = 512.0;
const DF_PASS1_BASE_MAX_TEXTURE_DIM = 4096;
const DF_PASS1_ABSOLUTE_MAX_TEXTURE_DIM = 8192;
const DF_BORDER_HQ_MIN_SCALE = 1.0;
const DF_BORDER_HQ_MAX_SCALE = 4.0;
const DF_VECTOR_MIN_GRID = 64;
const DF_VECTOR_MAX_GRID = 512;
const DF_VECTOR_MAX_CHAIKIN = 4;

// ============================================================================
// Shader Bit: Territory Distance Field (single-pass fill + optional inline border)
// ============================================================================
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
            uniform int uBorderMode;
            uniform float uFillAlpha;
            uniform float uEdgeFade;
            uniform float uHueShift;
            uniform float uSatMult;
            uniform float uLightMult;
            uniform float uMorphFactor;
            uniform float uTieEpsilon;
            uniform float uInfluenceWeight;
            uniform float uContentMinX;
            uniform float uContentMinY;
            uniform float uSmoothing;
            uniform float uCorridorBoost;
            uniform float uDisconnectBoost;
            uniform float uMinStarRadius;
            uniform int uNumRealStars;
            uniform vec3 uPlayerColor0;
            uniform vec3 uPlayerColor1;
            uniform vec3 uPlayerColor2;
            uniform vec3 uPlayerColor3;
            uniform vec3 uPlayerColor4;
            uniform vec3 uPlayerColor5;
            uniform vec3 uPlayerColor6;
            uniform vec3 uPlayerColor7;

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
            // The star with lowest total influence "owns" this pixel
            float bestInfluence = 1e9;
            int bestStar = -1;
            int bestOwner = -1;
            // Track closest star with a DIFFERENT owner (for border drawing)
            float enemyInfluence = 1e9;
            int enemyStar = -1;
            int enemyOwner = -1;
            // Track second-closest influence from ANY owner (for junction detection)
            float secondInfluence = 1e9;

            for (int i = 0; i < 256; i++) {
                if (i >= uNumStars) break;
                // Decode star position (row 0)
                vec4 posRaw = texelFetch(uStarData, ivec2(i, 0), 0);
                float sx = decode16(posRaw, 0);
                float sy = decode16(posRaw, 1);
                float pixDist = distance(worldPos, vec2(sx, sy));

                // Get ownership (row 2)
                vec4 ownerRaw = texelFetch(uStarData, ivec2(i, 2), 0);
                int ownIdx = int(floor(ownerRaw.r * 255.0 + 0.5)) - 1;
                if (ownIdx < 0) continue; // skip unowned stars

                // Decode Dijkstra distances (row 1 = current, row 3 = previous)
                vec4 distRaw = texelFetch(uStarData, ivec2(i, 1), 0);
                float curDijkstra = decode16(distRaw, 0);

                vec4 prevRaw = texelFetch(uStarData, ivec2(i, 3), 0);
                float prevDijkstra = decode16(prevRaw, 0);

                // Morph: interpolate between current and previous Dijkstra distances
                float dijkstra = mix(curDijkstra, prevDijkstra, uMorphFactor);

                // Total influence = pixel distance + weighted graph distance
                // Virtual sites (dijkstra=0) get a boost that makes them win more pixels
                float influence = pixDist + dijkstra * uInfluenceWeight;

                // Apply corridor/disconnect boost (stored in row 2, bytes 2-3)
                vec4 ownerExtra = texelFetch(uStarData, ivec2(i, 2), 0);
                float boost = decode16(ownerExtra, 1); // bytes 2-3 = influence boost
                influence -= boost;

                // Minimum star territory: smooth influence boost near real stars
                // Quadratic falloff: strongest at star center, smoothly fades to 0 at radius
                // This avoids hard discontinuities that create visible ring artifacts
                if (uMinStarRadius > 0.0 && pixDist < uMinStarRadius && i < uNumRealStars) {
                    float t = pixDist / uMinStarRadius; // 0..1 (center..edge)
                    float msrBoost = (1.0 - t * t) * uMinStarRadius; // quadratic, smooth at edge
                    influence -= msrBoost;
                }

                float bestDelta = influence - bestInfluence;
                bool winsBest = bestOwner < 0
                    || bestDelta < -uTieEpsilon
                    || (abs(bestDelta) <= uTieEpsilon && (ownIdx < bestOwner || (ownIdx == bestOwner && i < bestStar)));

                if (winsBest) {
                    // Before replacing best: push old best to second
                    if (bestOwner >= 0) {
                        secondInfluence = bestInfluence;
                        if (bestOwner != ownIdx) {
                            float enemyDeltaPrev = bestInfluence - enemyInfluence;
                            bool winsEnemyPrev = enemyOwner < 0
                                || enemyDeltaPrev < -uTieEpsilon
                                || (abs(enemyDeltaPrev) <= uTieEpsilon && bestOwner < enemyOwner);
                            if (winsEnemyPrev) {
                                enemyInfluence = bestInfluence;
                                enemyStar = bestStar;
                                enemyOwner = bestOwner;
                            }
                        }
                    }
                    bestInfluence = influence;
                    bestStar = i;
                    bestOwner = ownIdx;
                } else {
                    // Track second-best from any owner
                    if (influence < secondInfluence) secondInfluence = influence;
                    if (ownIdx != bestOwner) {
                        float enemyDelta = influence - enemyInfluence;
                        bool winsEnemy = enemyOwner < 0
                            || enemyDelta < -uTieEpsilon
                            || (abs(enemyDelta) <= uTieEpsilon && ownIdx < enemyOwner);
                        if (winsEnemy) {
                            enemyInfluence = influence;
                            enemyStar = i;
                            enemyOwner = ownIdx;
                        }
                    }
                }
            }

            if (bestStar < 0 || bestOwner < 0) {
                discard;
            }

            {
                // Player color lookup
                vec3 pc = vec3(0.5);
                if (bestOwner == 0) pc = uPlayerColor0;
                else if (bestOwner == 1) pc = uPlayerColor1;
                else if (bestOwner == 2) pc = uPlayerColor2;
                else if (bestOwner == 3) pc = uPlayerColor3;
                else if (bestOwner == 4) pc = uPlayerColor4;
                else if (bestOwner == 5) pc = uPlayerColor5;
                else if (bestOwner == 6) pc = uPlayerColor6;
                else if (bestOwner == 7) pc = uPlayerColor7;

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

                // Junction smoothing: round corners where enemy territory is close
                // Only applies at inter-territory boundaries, NOT within same-owner area
                if (uSmoothing > 0.0 && enemyOwner >= 0) {
                    float junctionGap = enemyInfluence - bestInfluence;
                    float junctionFade = smoothstep(0.0, uSmoothing, junctionGap);
                    alpha *= junctionFade;
                }

                // ── Border rendering (3 modes) ──
                // gap = 0 at boundary, grows into territory interior
                if (enemyOwner >= 0 && uBorderWidth > 0.0) {
                    float gap = enemyInfluence - bestInfluence;
                    float borderMask = 0.0;

                    if (uBorderMode == 0) {
                        // Mode 0: "Gap" — raw influence gap threshold (organic, variable width)
                        borderMask = 1.0 - smoothstep(
                            max(uBorderWidth - uBorderSoftness, 0.0),
                            uBorderWidth + uBorderSoftness,
                            gap
                        );
                    } else if (uBorderMode == 1) {
                        // Mode 1: "Even" — normalize by bestInfluence gradient for uniform screen-width
                        float gradMag = max(fwidth(bestInfluence), 0.5);
                        float normGap = gap / gradMag;
                        borderMask = 1.0 - smoothstep(
                            max(uBorderWidth - uBorderSoftness, 0.0),
                            uBorderWidth + uBorderSoftness,
                            normGap
                        );
                    } else {
                        // Mode 2: "Layered" — normalize by gap gradient (variable, layered look)
                        float gradMag = max(fwidth(gap), 1.0);
                        float normGap = gap / gradMag;
                        borderMask = 1.0 - smoothstep(
                            max(uBorderWidth - uBorderSoftness, 0.0),
                            uBorderWidth + uBorderSoftness,
                            normGap
                        );
                    }

                    if (borderMask > 0.0) {
                        // Look up enemy player color
                        vec3 ec = vec3(0.5);
                        if (enemyOwner == 0) ec = uPlayerColor0;
                        else if (enemyOwner == 1) ec = uPlayerColor1;
                        else if (enemyOwner == 2) ec = uPlayerColor2;
                        else if (enemyOwner == 3) ec = uPlayerColor3;
                        else if (enemyOwner == 4) ec = uPlayerColor4;
                        else if (enemyOwner == 5) ec = uPlayerColor5;
                        else if (enemyOwner == 6) ec = uPlayerColor6;
                        else if (enemyOwner == 7) ec = uPlayerColor7;

                        // Blend both owners' colors 50/50 + brighten for contrast
                        vec3 borderColor = (pc + ec) * 0.5;
                        borderColor = min(borderColor + vec3(uBorderBrighten / 255.0), vec3(1.0));
                        finalRGB = mix(finalRGB, borderColor, borderMask);
                        alpha = mix(alpha, uBorderAlpha, borderMask);
                    }
                }

                // Edge fade at world boundaries — symmetric using content min bounds
                float edgeX = min(worldPos.x - uContentMinX, uWorldWidth - worldPos.x);
                float edgeY = min(worldPos.y - uContentMinY, uWorldHeight - worldPos.y);
                float edgeDist = min(edgeX, edgeY);
                alpha *= smoothstep(0.0, uEdgeFade, edgeDist);

                outColor = vec4(finalRGB * alpha, alpha);
            }
        `,
    },
};

// ============================================================================
// Two-Pass Border Pipeline: Pass 1 ownership+gap field (offscreen)
// ============================================================================

const ownershipPassBitGl = {
    name: 'territory-distance-field-ownership-pass-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vUv;
        `,
        main: /* glsl */ `
            vUv = uv;
        `,
    },
    fragment: {
        header: /* glsl */ `
            #version 300 es
            in vec2 vUv;
            uniform sampler2D uStarData;
            uniform int uNumStars;
            uniform int uNumRealStars;
            uniform float uMorphFactor;
            uniform float uTieEpsilon;
            uniform float uInfluenceWeight;
            uniform float uMinStarRadius;
            uniform vec2 uRenderOrigin;
            uniform vec2 uRenderExtent;
            uniform float uGapScale;

            float decode16(vec4 raw, int pair) {
                float hi, lo;
                if (pair == 0) { hi = raw.r; lo = raw.g; }
                else { hi = raw.b; lo = raw.a; }
                return floor(hi * 255.0 + 0.5) * 256.0 + floor(lo * 255.0 + 0.5);
            }
        `,
        main: /* glsl */ `
            vec2 worldPos = uRenderOrigin + vUv * uRenderExtent;

            float bestInfluence = 1e9;
            int bestOwner = -1;
            int bestStar = -1;
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

                vec4 ownerExtra = texelFetch(uStarData, ivec2(i, 2), 0);
                float boost = decode16(ownerExtra, 1);
                influence -= boost;

                if (uMinStarRadius > 0.0 && pixDist < uMinStarRadius && i < uNumRealStars) {
                    float t = pixDist / uMinStarRadius;
                    float msrBoost = (1.0 - t * t) * uMinStarRadius;
                    influence -= msrBoost;
                }

                float bestDelta = influence - bestInfluence;
                bool winsBest = bestOwner < 0
                    || bestDelta < -uTieEpsilon
                    || (abs(bestDelta) <= uTieEpsilon && (ownIdx < bestOwner || (ownIdx == bestOwner && i < bestStar)));

                if (winsBest) {
                    if (bestOwner >= 0 && bestOwner != ownIdx) {
                        float enemyDeltaPrev = bestInfluence - enemyInfluence;
                        bool winsEnemyPrev = enemyOwner < 0
                            || enemyDeltaPrev < -uTieEpsilon
                            || (abs(enemyDeltaPrev) <= uTieEpsilon && bestOwner < enemyOwner);
                        if (winsEnemyPrev) {
                            enemyInfluence = bestInfluence;
                            enemyOwner = bestOwner;
                        }
                    }
                    bestInfluence = influence;
                    bestOwner = ownIdx;
                    bestStar = i;
                } else if (ownIdx != bestOwner) {
                    float enemyDelta = influence - enemyInfluence;
                    bool winsEnemy = enemyOwner < 0
                        || enemyDelta < -uTieEpsilon
                        || (abs(enemyDelta) <= uTieEpsilon && ownIdx < enemyOwner);
                    if (winsEnemy) {
                        enemyInfluence = influence;
                        enemyOwner = ownIdx;
                    }
                }
            }

            if (bestOwner < 0) {
                outColor = vec4(0.0, 0.0, 1.0, 1.0);
                return;
            }

            float gap = uGapScale;
            int encodedEnemy = bestOwner;
            if (enemyOwner >= 0) {
                gap = max(enemyInfluence - bestInfluence, 0.0);
                encodedEnemy = enemyOwner;
            }

            float bestEnc = float(bestOwner + 1) / 255.0;
            float enemyEnc = float(encodedEnemy + 1) / 255.0;
            float gapNorm = clamp(gap / uGapScale, 0.0, 1.0);
            outColor = vec4(bestEnc, enemyEnc, gapNorm, 1.0);
        `,
    },
};

// ============================================================================
// Two-Pass Border Pipeline: Pass 1.5 boundary seeds (offscreen)
// ============================================================================

const boundarySeedBitGl = {
    name: 'territory-distance-field-boundary-seed-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vUv;
        `,
        main: /* glsl */ `
            vUv = uv;
        `,
    },
    fragment: {
        header: /* glsl */ `
            #version 300 es
            in vec2 vUv;
            uniform sampler2D uOwnershipTex;
            uniform vec2 uOwnershipTexSize;

            int decodeOwner(float enc) {
                return int(floor(enc * 255.0 + 0.5)) - 1;
            }

            vec4 encodeSeed(vec2 coord) {
                vec2 clamped = clamp(coord, vec2(0.0), vec2(65535.0));
                vec2 hi = floor(clamped / 256.0);
                vec2 lo = clamped - hi * 256.0;
                return vec4(hi.x / 255.0, lo.x / 255.0, hi.y / 255.0, lo.y / 255.0);
            }
        `,
        main: /* glsl */ `
            ivec2 texSize = ivec2(uOwnershipTexSize);
            ivec2 maxCoord = max(texSize - ivec2(1), ivec2(0));
            ivec2 p = ivec2(min(floor(vUv * uOwnershipTexSize), uOwnershipTexSize - vec2(1.0)));

            int ownerC = decodeOwner(texelFetch(uOwnershipTex, p, 0).r);
            if (ownerC < 0) {
                outColor = vec4(1.0);
                return;
            }

            ivec2 pL = max(p + ivec2(-1, 0), ivec2(0));
            ivec2 pR = min(p + ivec2(1, 0), maxCoord);
            ivec2 pU = max(p + ivec2(0, -1), ivec2(0));
            ivec2 pD = min(p + ivec2(0, 1), maxCoord);
            ivec2 pUL = max(p + ivec2(-1, -1), ivec2(0));
            ivec2 pUR = ivec2(min(p.x + 1, maxCoord.x), max(p.y - 1, 0));
            ivec2 pDL = ivec2(max(p.x - 1, 0), min(p.y + 1, maxCoord.y));
            ivec2 pDR = min(p + ivec2(1, 1), maxCoord);

            int ownerL = decodeOwner(texelFetch(uOwnershipTex, pL, 0).r);
            int ownerR = decodeOwner(texelFetch(uOwnershipTex, pR, 0).r);
            int ownerU = decodeOwner(texelFetch(uOwnershipTex, pU, 0).r);
            int ownerD = decodeOwner(texelFetch(uOwnershipTex, pD, 0).r);
            int ownerUL = decodeOwner(texelFetch(uOwnershipTex, pUL, 0).r);
            int ownerUR = decodeOwner(texelFetch(uOwnershipTex, pUR, 0).r);
            int ownerDL = decodeOwner(texelFetch(uOwnershipTex, pDL, 0).r);
            int ownerDR = decodeOwner(texelFetch(uOwnershipTex, pDR, 0).r);

            bool boundary =
                (ownerL >= 0 && ownerL != ownerC) ||
                (ownerR >= 0 && ownerR != ownerC) ||
                (ownerU >= 0 && ownerU != ownerC) ||
                (ownerD >= 0 && ownerD != ownerC) ||
                (ownerUL >= 0 && ownerUL != ownerC) ||
                (ownerUR >= 0 && ownerUR != ownerC) ||
                (ownerDL >= 0 && ownerDL != ownerC) ||
                (ownerDR >= 0 && ownerDR != ownerC);

            outColor = boundary ? encodeSeed(vec2(p)) : vec4(1.0);
        `,
    },
};

// ============================================================================
// Two-Pass Border Pipeline: Pass 1.75 jump flood nearest-boundary field
// ============================================================================

const jumpFloodBitGl = {
    name: 'territory-distance-field-jump-flood-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vUv;
        `,
        main: /* glsl */ `
            vUv = uv;
        `,
    },
    fragment: {
        header: /* glsl */ `
            #version 300 es
            in vec2 vUv;
            uniform sampler2D uSeedTex;
            uniform vec2 uSeedTexSize;
            uniform float uJump;

            vec2 decodeSeed(vec4 raw) {
                float x = floor(raw.r * 255.0 + 0.5) * 256.0 + floor(raw.g * 255.0 + 0.5);
                float y = floor(raw.b * 255.0 + 0.5) * 256.0 + floor(raw.a * 255.0 + 0.5);
                return vec2(x, y);
            }

            vec4 encodeSeed(vec2 coord) {
                vec2 clamped = clamp(coord, vec2(0.0), vec2(65535.0));
                vec2 hi = floor(clamped / 256.0);
                vec2 lo = clamped - hi * 256.0;
                return vec4(hi.x / 255.0, lo.x / 255.0, hi.y / 255.0, lo.y / 255.0);
            }

            bool validSeed(vec2 seed) {
                return seed.x < 65535.0 && seed.y < 65535.0;
            }
        `,
        main: /* glsl */ `
            ivec2 texSize = ivec2(uSeedTexSize);
            ivec2 maxCoord = max(texSize - ivec2(1), ivec2(0));
            ivec2 p = ivec2(min(floor(vUv * uSeedTexSize), uSeedTexSize - vec2(1.0)));
            int jump = int(max(floor(uJump + 0.5), 1.0));

            vec2 base = decodeSeed(texelFetch(uSeedTex, p, 0));
            vec2 bestSeed = base;
            float bestDist = 1e20;
            if (validSeed(base)) {
                vec2 d = base - vec2(p);
                bestDist = dot(d, d);
            }

            ivec2 n0 = max(p + ivec2(-jump, -jump), ivec2(0));
            vec2 c0 = decodeSeed(texelFetch(uSeedTex, n0, 0));
            if (validSeed(c0)) { vec2 d0 = c0 - vec2(p); float dist0 = dot(d0, d0); if (dist0 < bestDist) { bestDist = dist0; bestSeed = c0; } }

            ivec2 n1 = max(p + ivec2(0, -jump), ivec2(0));
            vec2 c1 = decodeSeed(texelFetch(uSeedTex, n1, 0));
            if (validSeed(c1)) { vec2 d1 = c1 - vec2(p); float dist1 = dot(d1, d1); if (dist1 < bestDist) { bestDist = dist1; bestSeed = c1; } }

            ivec2 n2 = ivec2(min(p.x + jump, maxCoord.x), max(p.y - jump, 0));
            vec2 c2 = decodeSeed(texelFetch(uSeedTex, n2, 0));
            if (validSeed(c2)) { vec2 d2 = c2 - vec2(p); float dist2 = dot(d2, d2); if (dist2 < bestDist) { bestDist = dist2; bestSeed = c2; } }

            ivec2 n3 = max(p + ivec2(-jump, 0), ivec2(0));
            vec2 c3 = decodeSeed(texelFetch(uSeedTex, n3, 0));
            if (validSeed(c3)) { vec2 d3 = c3 - vec2(p); float dist3 = dot(d3, d3); if (dist3 < bestDist) { bestDist = dist3; bestSeed = c3; } }

            ivec2 n4 = min(p + ivec2(jump, 0), maxCoord);
            vec2 c4 = decodeSeed(texelFetch(uSeedTex, n4, 0));
            if (validSeed(c4)) { vec2 d4 = c4 - vec2(p); float dist4 = dot(d4, d4); if (dist4 < bestDist) { bestDist = dist4; bestSeed = c4; } }

            ivec2 n5 = ivec2(max(p.x - jump, 0), min(p.y + jump, maxCoord.y));
            vec2 c5 = decodeSeed(texelFetch(uSeedTex, n5, 0));
            if (validSeed(c5)) { vec2 d5 = c5 - vec2(p); float dist5 = dot(d5, d5); if (dist5 < bestDist) { bestDist = dist5; bestSeed = c5; } }

            ivec2 n6 = min(p + ivec2(0, jump), maxCoord);
            vec2 c6 = decodeSeed(texelFetch(uSeedTex, n6, 0));
            if (validSeed(c6)) { vec2 d6 = c6 - vec2(p); float dist6 = dot(d6, d6); if (dist6 < bestDist) { bestDist = dist6; bestSeed = c6; } }

            ivec2 n7 = min(p + ivec2(jump, jump), maxCoord);
            vec2 c7 = decodeSeed(texelFetch(uSeedTex, n7, 0));
            if (validSeed(c7)) { vec2 d7 = c7 - vec2(p); float dist7 = dot(d7, d7); if (dist7 < bestDist) { bestDist = dist7; bestSeed = c7; } }

            outColor = validSeed(bestSeed) ? encodeSeed(bestSeed) : vec4(1.0);
        `,
    },
};

// ============================================================================
// Two-Pass Border Pipeline: Pass 2 constant-width border stroke (onscreen)
// ============================================================================

const borderPassBitGl = {
    name: 'territory-distance-field-border-pass-bit',
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
            uniform sampler2D uBoundaryTex;
            uniform vec2 uBoundaryTexSize;
            uniform vec2 uRenderOrigin;
            uniform vec2 uRenderExtent;
            uniform float uBorderWidth;
            uniform float uBorderSoftness;
            uniform float uBorderAlpha;
            uniform float uBorderBrighten;
            uniform float uWorldWidth;
            uniform float uWorldHeight;
            uniform float uContentMinX;
            uniform float uContentMinY;
            uniform float uEdgeFade;
            uniform vec3 uPlayerColor0;
            uniform vec3 uPlayerColor1;
            uniform vec3 uPlayerColor2;
            uniform vec3 uPlayerColor3;
            uniform vec3 uPlayerColor4;
            uniform vec3 uPlayerColor5;
            uniform vec3 uPlayerColor6;
            uniform vec3 uPlayerColor7;

            int decodeOwner(float enc) {
                return int(floor(enc * 255.0 + 0.5)) - 1;
            }

            vec2 decodeSeed(vec4 raw) {
                float x = floor(raw.r * 255.0 + 0.5) * 256.0 + floor(raw.g * 255.0 + 0.5);
                float y = floor(raw.b * 255.0 + 0.5) * 256.0 + floor(raw.a * 255.0 + 0.5);
                return vec2(x, y);
            }

            vec3 getPlayerColor(int owner) {
                if (owner == 0) return uPlayerColor0;
                if (owner == 1) return uPlayerColor1;
                if (owner == 2) return uPlayerColor2;
                if (owner == 3) return uPlayerColor3;
                if (owner == 4) return uPlayerColor4;
                if (owner == 5) return uPlayerColor5;
                if (owner == 6) return uPlayerColor6;
                if (owner == 7) return uPlayerColor7;
                return vec3(0.5);
            }
        `,
        main: /* glsl */ `
            vec2 worldPos = vLocalPos;
            vec2 uv = (worldPos - uRenderOrigin) / uRenderExtent;
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                discard;
            }

            vec4 center = texture(uOwnershipTex, uv);
            int bestOwner = decodeOwner(center.r);
            int enemyOwner = decodeOwner(center.g);
            if (bestOwner < 0 || enemyOwner < 0 || bestOwner == enemyOwner || uBorderWidth <= 0.0) {
                discard;
            }

            vec2 seed = decodeSeed(texture(uBoundaryTex, uv));
            if (seed.x >= 65535.0 || seed.y >= 65535.0) {
                discard;
            }

            vec2 texelPos = uv * uBoundaryTexSize + vec2(0.5);
            vec2 seedPos = seed + vec2(0.5);
            vec2 deltaTex = texelPos - seedPos;
            vec2 texelWorld = uRenderExtent / max(uBoundaryTexSize, vec2(1.0));
            float sd = length(deltaTex * texelWorld);

            float inner = max(uBorderWidth - uBorderSoftness, 0.0);
            float outer = uBorderWidth + uBorderSoftness;
            // Screen-space AA softens the border edge even when softness=0.
            float aa = max(fwidth(sd), 0.0001);
            float borderMask = 1.0 - smoothstep(inner - aa, outer + aa, sd);
            if (borderMask <= 0.0) {
                discard;
            }

            vec3 pc = getPlayerColor(bestOwner);
            vec3 ec = getPlayerColor(enemyOwner);
            vec3 borderColor = (pc + ec) * 0.5;
            borderColor = min(borderColor + vec3(uBorderBrighten / 255.0), vec3(1.0));

            float edgeX = min(worldPos.x - uContentMinX, uWorldWidth - worldPos.x);
            float edgeY = min(worldPos.y - uContentMinY, uWorldHeight - worldPos.y);
            float edgeDist = min(edgeX, edgeY);
            float edgeMask = smoothstep(0.0, uEdgeFade, edgeDist);

            float alpha = uBorderAlpha * borderMask * edgeMask;
            outColor = vec4(borderColor * alpha, alpha);
        `,
    },
};
// ============================================================================
// Module State
// ============================================================================

let cachedGeometryFp = '';
let cachedTopologyFp = '';
let cachedVisualFp = '';
let cachedDistanceMetric: 'hops' | 'length' | null = null;
let cachedMesh: PIXI.Mesh | null = null;
let cachedMeshShader: PIXI.Shader | null = null;
let cachedMeshWorldW = 0;
let cachedMeshWorldH = 0;
let cachedMeshExpansion = -1;
let cachedMeshPadding = -1;
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

let latestAlignmentDiagnostics: AlignmentDiagnosticsPayload | null = null;
let alignmentDiagnosticsHistory: AlignmentDiagnosticsPayload[] = [];
let lastAlignmentIssueFp = '';
let lastChangeClassification: DfChangeClassification | null = null;
let cachedVirtualSites: VirtualSite[] = [];
let latestTwoPassDiagnostics: TwoPassDiagnosticsPayload | null = null;

let warnedMissingRendererForTwoPass = false;
let cachedOwnershipTexture: PIXI.RenderTexture | null = null;
let cachedOwnershipShader: PIXI.Shader | null = null;
let cachedOwnershipMesh: PIXI.Mesh | null = null;
let cachedBoundarySeedShader: PIXI.Shader | null = null;
let cachedBoundarySeedMesh: PIXI.Mesh | null = null;
let cachedJumpFloodShader: PIXI.Shader | null = null;
let cachedJumpFloodMesh: PIXI.Mesh | null = null;
let cachedJumpFloodTextureA: PIXI.RenderTexture | null = null;
let cachedJumpFloodTextureB: PIXI.RenderTexture | null = null;
let cachedBoundaryDistanceTexture: PIXI.RenderTexture | null = null;
let cachedOwnershipTexW = 0;
let cachedOwnershipTexH = 0;
let cachedOwnershipExtentW = 0;
let cachedOwnershipExtentH = 0;

let cachedBorderShader: PIXI.Shader | null = null;
let cachedBorderMesh: PIXI.Mesh | null = null;
let cachedBorderOriginX = 0;
let cachedBorderOriginY = 0;
let cachedBorderExtentW = 0;
let cachedBorderExtentH = 0;

let cachedVectorBorderGraphics: PIXI.Graphics | null = null;
let cachedVectorBorderFingerprint = '';
let cachedVectorBorderLastBuildMs = 0;

let cachedRenderOriginX = 0;
let cachedRenderOriginY = 0;
let cachedRenderExtentW = 0;
let cachedRenderExtentH = 0;


// ============================================================================
// Multi-Source Dijkstra - per-player distances (preserved from V1)
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
// Canonical inputs + change bucketing
// ============================================================================

function canonicalizeDfInputs(stars: StarState[], connections: StarConnection[]): CanonicalDfInputSnapshot {
    const canonicalStars = [...stars].sort((a, b) => a.id.localeCompare(b.id));

    const normalizedConnections = connections
        .map((conn) => {
            const sourceId = conn.sourceId <= conn.targetId ? conn.sourceId : conn.targetId;
            const targetId = conn.sourceId <= conn.targetId ? conn.targetId : conn.sourceId;
            return sourceId === conn.sourceId ? conn : { ...conn, sourceId, targetId };
        })
        .sort((a, b) => {
            if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
            if (a.targetId !== b.targetId) return a.targetId.localeCompare(b.targetId);
            return (a.distance ?? 0) - (b.distance ?? 0);
        });

    const canonicalConnections: StarConnection[] = [];
    let prevConnKey = '';
    for (const conn of normalizedConnections) {
        const key = `${conn.sourceId}|${conn.targetId}|${Math.round((conn.distance ?? 0) * 1000)}`;
        if (key === prevConnKey) continue;
        canonicalConnections.push(conn);
        prevConnKey = key;
    }

    return {
        stars: canonicalStars,
        connections: canonicalConnections,
        ownedStars: canonicalStars.filter((s) => Boolean(s.ownerId)),
    };
}

function buildTopologyConfigFp(metric: 'hops' | 'length'): string {
    return `${metric}:${GAME_CONFIG.DF_CORRIDOR_ENABLED}:${GAME_CONFIG.DF_CORRIDOR_MODE}:`
        + `${GAME_CONFIG.DF_CORRIDOR_SPACING}:${GAME_CONFIG.DF_CORRIDOR_COUNT}:${GAME_CONFIG.DF_CORRIDOR_WEIGHT}:`
        + `${GAME_CONFIG.DF_DISCONNECT_ENABLED}:${GAME_CONFIG.DF_DISCONNECT_DISTANCE}:${GAME_CONFIG.DF_DISCONNECT_WEIGHT}`;
}

function buildVisualFp(): string {
    return `${GAME_CONFIG.DF_ALPHA}:${GAME_CONFIG.DF_BORDER_WIDTH}:${GAME_CONFIG.DF_BORDER_SOFTNESS}:`
        + `${GAME_CONFIG.DF_BORDER_ALPHA}:${GAME_CONFIG.DF_BORDER_BRIGHTEN}:${GAME_CONFIG.DF_BORDER_MODE}:`
        + `${GAME_CONFIG.DF_BORDER_HQ_ENABLED}:${GAME_CONFIG.DF_BORDER_HQ_SCALE}:${GAME_CONFIG.DF_BORDER_HQ_MAX_DIM}:`
        + `${GAME_CONFIG.DF_VECTOR_BORDERS_ENABLED}:${GAME_CONFIG.DF_VECTOR_GRID_RESOLUTION}:${GAME_CONFIG.DF_VECTOR_SMOOTHING}:`
        + `${GAME_CONFIG.DF_VECTOR_SIMPLIFY}:${GAME_CONFIG.DF_VECTOR_UPDATE_MS}:`
        + `${GAME_CONFIG.DF_BLUR}:${GAME_CONFIG.DF_HUE}:${GAME_CONFIG.DF_SATURATION}:${GAME_CONFIG.DF_LIGHTNESS}:`
        + `${GAME_CONFIG.DF_EDGE_FADE}:${GAME_CONFIG.DF_RESOLUTION}:${GAME_CONFIG.DF_ROUNDING}:`
        + `${GAME_CONFIG.DF_INFLUENCE_WEIGHT}:${GAME_CONFIG.DF_EXPANSION}:${GAME_CONFIG.DF_SMOOTHING}:`
        + `${GAME_CONFIG.DF_MIN_STAR_RADIUS}:${GAME_CONFIG.TERRITORY_TRANSITION_MS}`;
}

function buildTopologyFp(snapshot: CanonicalDfInputSnapshot, metric: 'hops' | 'length'): string {
    let ownerFp = '';
    for (const s of snapshot.stars) {
        ownerFp += `${s.id}:${s.ownerId ?? ''}|`;
    }

    let connFp = '';
    for (const c of snapshot.connections) {
        connFp += `${c.sourceId}-${c.targetId}:${Math.round((c.distance ?? 0) * 10)}|`;
    }

    return `${ownerFp}||${connFp}||${buildTopologyConfigFp(metric)}`;
}

function buildGeometryFp(stars: StarState[]): string {
    let fp = '';
    for (const s of stars) {
        // Round to 0.1 so tiny float jitter does not thrash cache invalidation.
        fp += `${s.id}:${Math.round(s.x * 10)}:${Math.round(s.y * 10)}|`;
    }
    return fp;
}

function classifyDfChanges(snapshot: CanonicalDfInputSnapshot, metric: 'hops' | 'length'): DfChangeClassification {
    const geometryFp = buildGeometryFp(snapshot.stars);
    const topologyFp = buildTopologyFp(snapshot, metric);
    const visualFp = buildVisualFp();

    const geometryChanged = geometryFp !== cachedGeometryFp;
    const topologyChanged = topologyFp !== cachedTopologyFp;
    const visualChanged = visualFp !== cachedVisualFp;

    cachedGeometryFp = geometryFp;
    cachedTopologyFp = topologyFp;
    cachedVisualFp = visualFp;

    const changedBuckets: Array<'geometry' | 'topology' | 'visual'> = [];
    if (geometryChanged) changedBuckets.push('geometry');
    if (topologyChanged) changedBuckets.push('topology');
    if (visualChanged) changedBuckets.push('visual');

    const classification: DfChangeClassification = {
        geometryChanged,
        topologyChanged,
        visualChanged,
        geometryFp,
        topologyFp,
        visualFp,
        changedBuckets,
    };

    lastChangeClassification = classification;
    return classification;
}

function canonicalizeVirtualSites(virtualSites: VirtualSite[]): VirtualSite[] {
    if (virtualSites.length <= 1) return [...virtualSites];

    const sorted = [...virtualSites].sort((a, b) => {
        const aA = a.sourceStarA <= a.sourceStarB ? a.sourceStarA : a.sourceStarB;
        const aB = a.sourceStarA <= a.sourceStarB ? a.sourceStarB : a.sourceStarA;
        const bA = b.sourceStarA <= b.sourceStarB ? b.sourceStarA : b.sourceStarB;
        const bB = b.sourceStarA <= b.sourceStarB ? b.sourceStarB : b.sourceStarA;

        const keyA = `${a.kind}|${a.ownerId}|${aA}|${aB}|${Math.round(a.x * 100)}|${Math.round(a.y * 100)}|${Math.round(a.weight * 1000)}`;
        const keyB = `${b.kind}|${b.ownerId}|${bA}|${bB}|${Math.round(b.x * 100)}|${Math.round(b.y * 100)}|${Math.round(b.weight * 1000)}`;
        return keyA.localeCompare(keyB);
    });

    const deduped: VirtualSite[] = [];
    let prevKey = '';
    for (const site of sorted) {
        const a = site.sourceStarA <= site.sourceStarB ? site.sourceStarA : site.sourceStarB;
        const b = site.sourceStarA <= site.sourceStarB ? site.sourceStarB : site.sourceStarA;
        const key = `${site.kind}|${site.ownerId}|${a}|${b}|${Math.round(site.x * 100)}|${Math.round(site.y * 100)}|${Math.round(site.weight * 1000)}`;
        if (key === prevKey) continue;
        deduped.push(site);
        prevKey = key;
    }

    return deduped;
}

function computeVirtualDijkstra(site: VirtualSite, starById: Map<string, StarState>): number {
    if (site.kind !== 'disconnect') return 0;
    const starA = starById.get(site.sourceStarA);
    const starB = starById.get(site.sourceStarB);
    if (!starA || !starB) return 0;
    const halfDist = Math.hypot(starB.x - starA.x, starB.y - starA.y) / 2;
    return Math.round(halfDist / Math.max(site.weight, 0.01));
}

function pickOwnerAtPoint(
    worldX: number,
    worldY: number,
    stars: StarState[],
    virtualSites: VirtualSite[],
    dist: number[][],
    playerIds: string[],
): number {
    const influenceWeight = GAME_CONFIG.DF_INFLUENCE_WEIGHT ?? 1.0;
    const minStarRadius = GAME_CONFIG.DF_MIN_STAR_RADIUS ?? 40;
    const playerIdxById = new Map<string, number>();
    for (let i = 0; i < playerIds.length; i++) {
        playerIdxById.set(playerIds[i], i);
    }

    let bestInfluence = Infinity;
    let bestOwner = -1;
    let bestOrder = Number.MAX_SAFE_INTEGER;

    const applyCandidate = (ownerIdx: number, influence: number, order: number) => {
        const delta = influence - bestInfluence;
        const wins = bestOwner < 0
            || delta < -DF_TIE_EPSILON
            || (Math.abs(delta) <= DF_TIE_EPSILON && (ownerIdx < bestOwner || (ownerIdx === bestOwner && order < bestOrder)));
        if (wins) {
            bestInfluence = influence;
            bestOwner = ownerIdx;
            bestOrder = order;
        }
    };

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const ownerIdx = playerIdxById.get(star.ownerId);
        if (ownerIdx === undefined) continue;

        const dijkstra = dist[i]?.[ownerIdx] ?? Infinity;
        if (!Number.isFinite(dijkstra)) continue;

        const pixDist = Math.hypot(worldX - star.x, worldY - star.y);
        let influence = pixDist + dijkstra * influenceWeight;
        if (minStarRadius > 0 && pixDist < minStarRadius) {
            const t = pixDist / minStarRadius;
            influence -= (1 - t * t) * minStarRadius;
        }
        applyCandidate(ownerIdx, influence, i);
    }

    const starById = new Map(stars.map((star) => [star.id, star] as const));
    for (let i = 0; i < virtualSites.length; i++) {
        const site = virtualSites[i];
        const ownerIdx = playerIdxById.get(site.ownerId);
        if (ownerIdx === undefined) continue;

        const pixDist = Math.hypot(worldX - site.x, worldY - site.y);
        const dijkstra = computeVirtualDijkstra(site, starById);
        let influence = pixDist + dijkstra * influenceWeight;
        if (site.kind === 'corridor') {
            influence -= Math.round((site.weight ?? 1.0) * 100);
        }
        applyCandidate(ownerIdx, influence, stars.length + i);
    }

    return bestOwner;
}

function runInternalTwoPassTrack(
    alignment: AlignmentContract,
    stars: StarState[],
    dist: number[][],
    playerIds: string[],
    virtualSites: VirtualSite[],
    worldWidth: number,
    worldHeight: number,
): void {
    if (!DF_INTERNAL_TWO_PASS_TRACK) {
        latestTwoPassDiagnostics = null;
        return;
    }

    const pass1ContentMinX = DF_INTERNAL_TWO_PASS_LEGACY_CONTENT_ORIGIN ? 0 : alignment.contentMinX;
    const pass1ContentMinY = DF_INTERNAL_TWO_PASS_LEGACY_CONTENT_ORIGIN ? 0 : alignment.contentMinY;

    const samples: TwoPassSampleComparison[] = [];
    let mismatchCount = 0;
    let maxMappingDrift = 0;

    for (const sample of alignment.diagnostics.samples) {
        const pass1UvX = worldWidth > 0 ? (sample.worldX - pass1ContentMinX) / worldWidth : 0;
        const pass1UvY = worldHeight > 0 ? (sample.worldY - pass1ContentMinY) / worldHeight : 0;

        const pass2WorldX = alignment.contentMinX + pass1UvX * worldWidth;
        const pass2WorldY = alignment.contentMinY + pass1UvY * worldHeight;
        const mappingDrift = Math.hypot(pass2WorldX - sample.worldX, pass2WorldY - sample.worldY);

        const ownerSinglePass = pickOwnerAtPoint(sample.worldX, sample.worldY, stars, virtualSites, dist, playerIds);
        const ownerTwoPass = pickOwnerAtPoint(pass2WorldX, pass2WorldY, stars, virtualSites, dist, playerIds);
        const ownerMismatch = ownerSinglePass !== ownerTwoPass || mappingDrift > DF_ALIGNMENT_EPSILON;
        if (ownerMismatch) mismatchCount++;
        if (mappingDrift > maxMappingDrift) maxMappingDrift = mappingDrift;

        samples.push({
            starId: sample.starId,
            worldX: sample.worldX,
            worldY: sample.worldY,
            pass1UvX,
            pass1UvY,
            pass2WorldX,
            pass2WorldY,
            mappingDrift,
            ownerSinglePass,
            ownerTwoPass,
            ownerMismatch,
        });
    }

    latestTwoPassDiagnostics = {
        enabled: true,
        legacyOriginMode: DF_INTERNAL_TWO_PASS_LEGACY_CONTENT_ORIGIN,
        mismatchCount,
        maxMappingDrift,
        samples,
    };

    if (mismatchCount > 0) {
        console.warn('[DF_TWOPASS] mapping/ownership mismatch detected in internal diagnostics', latestTwoPassDiagnostics);
    }
}

function buildOwnershipSampleSites(
    stars: StarState[],
    virtualSites: VirtualSite[],
    dist: number[][],
    prevDistArr: number[][] | null,
    playerIds: string[],
): OwnershipSampleSite[] {
    const playerIdxById = new Map<string, number>();
    for (let i = 0; i < playerIds.length; i++) {
        playerIdxById.set(playerIds[i], i);
    }

    const sites: OwnershipSampleSite[] = [];

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const ownerIdx = playerIdxById.get(star.ownerId ?? '');
        if (ownerIdx === undefined) continue;

        const curDijkstra = dist[i]?.[ownerIdx] ?? Infinity;
        if (!Number.isFinite(curDijkstra)) continue;
        const prevDijkstra = prevDistArr?.[i]?.[ownerIdx] ?? curDijkstra;

        sites.push({
            x: star.x,
            y: star.y,
            ownerIdx,
            order: i,
            curDijkstra,
            prevDijkstra,
            boost: 0,
            isRealStar: true,
        });
    }

    if (virtualSites.length > 0) {
        const starById = new Map(stars.map((star) => [star.id, star] as const));
        for (let i = 0; i < virtualSites.length; i++) {
            const site = virtualSites[i];
            const ownerIdx = playerIdxById.get(site.ownerId);
            if (ownerIdx === undefined) continue;

            const curDijkstra = computeVirtualDijkstra(site, starById);
            const prevDijkstra = 0;
            const boost = site.kind === 'corridor'
                ? Math.round((site.weight ?? 1.0) * 100)
                : 0;

            sites.push({
                x: site.x,
                y: site.y,
                ownerIdx,
                order: stars.length + i,
                curDijkstra,
                prevDijkstra,
                boost,
                isRealStar: false,
            });
        }
    }

    return sites;
}

function sampleOwnerFromSites(
    worldX: number,
    worldY: number,
    sites: OwnershipSampleSite[],
    influenceWeight: number,
    minStarRadius: number,
    morphFactor: number,
): number {
    let bestInfluence = Infinity;
    let bestOwner = -1;
    let bestOrder = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        const pixDist = Math.hypot(worldX - site.x, worldY - site.y);
        const dijkstra = site.curDijkstra + (site.prevDijkstra - site.curDijkstra) * morphFactor;
        let influence = pixDist + dijkstra * influenceWeight - site.boost;

        if (site.isRealStar && minStarRadius > 0 && pixDist < minStarRadius) {
            const t = pixDist / minStarRadius;
            influence -= (1 - t * t) * minStarRadius;
        }

        const delta = influence - bestInfluence;
        const wins = bestOwner < 0
            || delta < -DF_TIE_EPSILON
            || (Math.abs(delta) <= DF_TIE_EPSILON && (site.ownerIdx < bestOwner || (site.ownerIdx === bestOwner && site.order < bestOrder)));

        if (wins) {
            bestInfluence = influence;
            bestOwner = site.ownerIdx;
            bestOrder = site.order;
        }
    }

    return bestOwner;
}

function simplifyOpenPolyline(points: number[], tolerance: number): number[] {
    const n = points.length / 2;
    if (n <= 2 || tolerance <= 0) return points;

    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;

    const pointLineDistance = (idx: number, start: number, end: number): number => {
        const sx = points[start * 2];
        const sy = points[start * 2 + 1];
        const ex = points[end * 2];
        const ey = points[end * 2 + 1];
        const px = points[idx * 2];
        const py = points[idx * 2 + 1];

        const dx = ex - sx;
        const dy = ey - sy;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 0.0001) return Math.hypot(px - sx, py - sy);

        const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lenSq));
        const cx = sx + t * dx;
        const cy = sy + t * dy;
        return Math.hypot(px - cx, py - cy);
    };

    const recurse = (start: number, end: number): void => {
        let maxDist = 0;
        let maxIdx = -1;
        for (let i = start + 1; i < end; i++) {
            const dist = pointLineDistance(i, start, end);
            if (dist > maxDist) {
                maxDist = dist;
                maxIdx = i;
            }
        }

        if (maxIdx >= 0 && maxDist > tolerance) {
            keep[maxIdx] = 1;
            recurse(start, maxIdx);
            recurse(maxIdx, end);
        }
    };

    recurse(0, n - 1);

    const out: number[] = [];
    for (let i = 0; i < n; i++) {
        if (keep[i]) {
            out.push(points[i * 2], points[i * 2 + 1]);
        }
    }

    return out.length >= 4 ? out : points;
}

function chaikinSmoothOpen(points: number[], iterations: number): number[] {
    let pts = points;
    for (let iter = 0; iter < iterations; iter++) {
        const n = pts.length / 2;
        if (n < 3) break;

        const out: number[] = [pts[0], pts[1]];
        for (let i = 0; i < n - 1; i++) {
            const x0 = pts[i * 2];
            const y0 = pts[i * 2 + 1];
            const x1 = pts[(i + 1) * 2];
            const y1 = pts[(i + 1) * 2 + 1];
            out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
            out.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
        }
        out.push(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1]);
        pts = out;
    }
    return pts;
}

function chaikinSmoothClosed(points: number[], iterations: number): number[] {
    let pts = points;
    for (let iter = 0; iter < iterations; iter++) {
        const n = pts.length / 2;
        if (n < 3) break;
        const out: number[] = [];
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const x0 = pts[i * 2];
            const y0 = pts[i * 2 + 1];
            const x1 = pts[j * 2];
            const y1 = pts[j * 2 + 1];
            out.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
            out.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
        }
        pts = out;
    }
    return pts;
}

function extractVectorBorderPolylines(
    ownerGrid: Int16Array,
    gridW: number,
    gridH: number,
    originX: number,
    originY: number,
    extentW: number,
    extentH: number,
    simplifyTolerance: number,
    smoothIterations: number,
): VectorBorderPolyline[] {
    type Edge = [number, number, number, number];
    const pairEdges = new Map<string, Edge[]>();

    const addPairEdge = (ownerA: number, ownerB: number, x1: number, y1: number, x2: number, y2: number) => {
        if (ownerA < 0 || ownerB < 0 || ownerA === ownerB) return;
        const a = Math.min(ownerA, ownerB);
        const b = Math.max(ownerA, ownerB);
        const key = `${a}|${b}`;
        let edges = pairEdges.get(key);
        if (!edges) {
            edges = [];
            pairEdges.set(key, edges);
        }
        edges.push([x1, y1, x2, y2]);
    };

    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const owner = ownerGrid[y * gridW + x];
            if (owner < 0) continue;

            if (x + 1 < gridW) {
                const rightOwner = ownerGrid[y * gridW + x + 1];
                if (rightOwner >= 0 && rightOwner !== owner) {
                    addPairEdge(owner, rightOwner, x + 1, y, x + 1, y + 1);
                }
            }

            if (y + 1 < gridH) {
                const downOwner = ownerGrid[(y + 1) * gridW + x];
                if (downOwner >= 0 && downOwner !== owner) {
                    addPairEdge(owner, downOwner, x, y + 1, x + 1, y + 1);
                }
            }
        }
    }

    const toWorldPoints = (path: string[]): number[] => {
        const points: number[] = [];
        for (const key of path) {
            const [sx, sy] = key.split(',');
            const vx = Number(sx);
            const vy = Number(sy);
            points.push(
                originX + (vx / gridW) * extentW,
                originY + (vy / gridH) * extentH,
            );
        }
        return points;
    };

    const polylines: VectorBorderPolyline[] = [];

    for (const [pairKey, edges] of pairEdges) {
        const [pairA, pairB] = pairKey.split('|').map(Number);

        const adjacency = new Map<string, string[]>();
        const addAdjacency = (from: string, to: string) => {
            const list = adjacency.get(from) ?? [];
            if (!list.includes(to)) list.push(to);
            adjacency.set(from, list);
        };

        for (const [x1, y1, x2, y2] of edges) {
            const v1 = `${x1},${y1}`;
            const v2 = `${x2},${y2}`;
            addAdjacency(v1, v2);
            addAdjacency(v2, v1);
        }

        const usedEdges = new Set<string>();
        const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

        const consumePath = (start: string, next: string): string[] => {
            const path = [start, next];
            usedEdges.add(edgeKey(start, next));

            let safety = 0;
            while (safety++ < 100000) {
                const prev = path[path.length - 2];
                const current = path[path.length - 1];
                const neighbors = adjacency.get(current) ?? [];

                let candidate: string | null = null;
                for (const neighbor of neighbors) {
                    const key = edgeKey(current, neighbor);
                    if (usedEdges.has(key)) continue;
                    if (neighbor === prev && neighbors.length > 1) continue;
                    candidate = neighbor;
                    break;
                }

                if (!candidate) break;
                path.push(candidate);
                usedEdges.add(edgeKey(current, candidate));
                if (candidate === start) break;
            }

            return path;
        };

        const tryAddPolyline = (path: string[]) => {
            if (path.length < 2) return;

            const isClosed = path[0] === path[path.length - 1];
            const uniquePath = isClosed ? path.slice(0, -1) : path;
            if (uniquePath.length < 2) return;

            let worldPoints = toWorldPoints(uniquePath);
            if (simplifyTolerance > 0 && !isClosed) {
                worldPoints = simplifyOpenPolyline(worldPoints, simplifyTolerance);
            }

            if (smoothIterations > 0) {
                worldPoints = isClosed
                    ? chaikinSmoothClosed(worldPoints, smoothIterations)
                    : chaikinSmoothOpen(worldPoints, smoothIterations);
            }

            if (worldPoints.length >= 4) {
                polylines.push({ ownerA: pairA, ownerB: pairB, points: worldPoints });
            }
        };

        for (const [vertex, neighbors] of adjacency) {
            if (neighbors.length === 2) continue;
            for (const neighbor of neighbors) {
                const key = edgeKey(vertex, neighbor);
                if (usedEdges.has(key)) continue;
                tryAddPolyline(consumePath(vertex, neighbor));
            }
        }

        for (const [vertex, neighbors] of adjacency) {
            for (const neighbor of neighbors) {
                const key = edgeKey(vertex, neighbor);
                if (usedEdges.has(key)) continue;
                tryAddPolyline(consumePath(vertex, neighbor));
            }
        }
    }

    return polylines;
}

function hideVectorBorderOverlay(): void {
    if (cachedVectorBorderGraphics) {
        cachedVectorBorderGraphics.visible = false;
    }
}

function renderVectorBorderOverlay(
    container: PIXI.Container,
    colorUtils: ColorUtils,
    stars: StarState[],
    virtualSites: VirtualSite[],
    dist: number[][],
    prevDistArr: number[][] | null,
    playerIds: string[],
    morphFactor: number,
    now: number,
    forceRebuild: boolean,
): void {
    const borderWidth = GAME_CONFIG.DF_BORDER_WIDTH ?? 0;
    const borderSoftness = GAME_CONFIG.DF_BORDER_SOFTNESS ?? 0;
    const borderAlpha = GAME_CONFIG.DF_BORDER_ALPHA ?? 0;
    if (borderWidth <= 0 || borderAlpha <= 0 || stars.length === 0 || playerIds.length === 0) {
        hideVectorBorderOverlay();
        return;
    }

    const extentW = Math.max(1, cachedRenderExtentW);
    const extentH = Math.max(1, cachedRenderExtentH);

    const requestedGrid = GAME_CONFIG.DF_VECTOR_GRID_RESOLUTION ?? 192;
    const gridW = Math.max(DF_VECTOR_MIN_GRID, Math.min(DF_VECTOR_MAX_GRID, Math.round(requestedGrid)));
    const gridH = Math.max(DF_VECTOR_MIN_GRID, Math.min(DF_VECTOR_MAX_GRID, Math.round(gridW * (extentH / extentW))));

    const smoothIterations = Math.max(0, Math.min(DF_VECTOR_MAX_CHAIKIN, Math.round(GAME_CONFIG.DF_VECTOR_SMOOTHING ?? 1)));
    const simplifyTolerance = Math.max(0, GAME_CONFIG.DF_VECTOR_SIMPLIFY ?? 0.5);
    const updateMs = Math.max(0, GAME_CONFIG.DF_VECTOR_UPDATE_MS ?? 33);

    const staticFp = `${cachedGeometryFp}:${cachedTopologyFp}:${cachedRenderOriginX}:${cachedRenderOriginY}:${extentW}:${extentH}:`
        + `${borderWidth}:${borderSoftness}:${borderAlpha}:${GAME_CONFIG.DF_BORDER_BRIGHTEN}:${gridW}:${gridH}:${smoothIterations}:${simplifyTolerance}`;
    const intervalDue = morphFactor > 0 && (now - cachedVectorBorderLastBuildMs >= updateMs);
    const needsRebuild = forceRebuild || staticFp !== cachedVectorBorderFingerprint || intervalDue || !cachedVectorBorderGraphics;

    if (!needsRebuild) {
        if (cachedVectorBorderGraphics && !cachedVectorBorderGraphics.parent) {
            container.addChild(cachedVectorBorderGraphics);
        }
        if (cachedVectorBorderGraphics) {
            cachedVectorBorderGraphics.visible = true;
        }
        return;
    }

    const ownershipSites = buildOwnershipSampleSites(stars, virtualSites, dist, prevDistArr, playerIds);
    if (ownershipSites.length === 0) {
        hideVectorBorderOverlay();
        return;
    }

    const influenceWeight = GAME_CONFIG.DF_INFLUENCE_WEIGHT ?? 1.0;
    const minStarRadius = GAME_CONFIG.DF_MIN_STAR_RADIUS ?? 0;

    const ownerGrid = new Int16Array(gridW * gridH);
    for (let y = 0; y < gridH; y++) {
        const worldY = cachedRenderOriginY + ((y + 0.5) / gridH) * extentH;
        for (let x = 0; x < gridW; x++) {
            const worldX = cachedRenderOriginX + ((x + 0.5) / gridW) * extentW;
            ownerGrid[y * gridW + x] = sampleOwnerFromSites(
                worldX,
                worldY,
                ownershipSites,
                influenceWeight,
                minStarRadius,
                morphFactor,
            );
        }
    }

    const polylines = extractVectorBorderPolylines(
        ownerGrid,
        gridW,
        gridH,
        cachedRenderOriginX,
        cachedRenderOriginY,
        extentW,
        extentH,
        simplifyTolerance,
        smoothIterations,
    );

    if (!cachedVectorBorderGraphics) {
        cachedVectorBorderGraphics = new PIXI.Graphics();
    }
    if (!cachedVectorBorderGraphics.parent) {
        container.addChild(cachedVectorBorderGraphics);
    }

    cachedVectorBorderGraphics.clear();

    const brighten = GAME_CONFIG.DF_BORDER_BRIGHTEN ?? 0;

    for (const polyline of polylines) {
        const ownerAId = playerIds[polyline.ownerA];
        const ownerBId = playerIds[polyline.ownerB];
        if (!ownerAId || !ownerBId) continue;

        const colorA = colorUtils.getPlayerColor(ownerAId);
        const colorB = colorUtils.getPlayerColor(ownerBId);

        const r = Math.min(255, Math.round((((colorA >> 16) & 0xff) + ((colorB >> 16) & 0xff)) * 0.5 + brighten));
        const g = Math.min(255, Math.round((((colorA >> 8) & 0xff) + ((colorB >> 8) & 0xff)) * 0.5 + brighten));
        const b = Math.min(255, Math.round(((colorA & 0xff) + (colorB & 0xff)) * 0.5 + brighten));
        const strokeColor = (r << 16) | (g << 8) | b;

        const points = polyline.points;
        if (points.length < 4) continue;

        cachedVectorBorderGraphics.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
            cachedVectorBorderGraphics.lineTo(points[i], points[i + 1]);
        }

        if (borderSoftness > 0) {
            cachedVectorBorderGraphics.stroke({
                width: borderWidth + borderSoftness * 2,
                color: strokeColor,
                alpha: Math.max(0, borderAlpha * 0.35),
                cap: 'round',
                join: 'round',
            } as any);

            cachedVectorBorderGraphics.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length; i += 2) {
                cachedVectorBorderGraphics.lineTo(points[i], points[i + 1]);
            }
        }

        cachedVectorBorderGraphics.stroke({
            width: borderWidth,
            color: strokeColor,
            alpha: borderAlpha,
            cap: 'round',
            join: 'round',
        } as any);
    }

    cachedVectorBorderGraphics.visible = true;
    cachedVectorBorderFingerprint = staticFp;
    cachedVectorBorderLastBuildMs = now;
}
function makeBounds(minX: number, minY: number, maxX: number, maxY: number): AlignmentBounds {
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

function computeStarBounds(stars: StarState[]): AlignmentBounds {
    if (stars.length === 0) {
        return makeBounds(0, 0, 0, 0);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const s of stars) {
        if (s.x < minX) minX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.x > maxX) maxX = s.x;
        if (s.y > maxY) maxY = s.y;
    }

    return makeBounds(minX, minY, maxX, maxY);
}

function pickAlignmentSamples(stars: StarState[], worldWidth: number, worldHeight: number): AlignmentSample[] {
    if (stars.length === 0) return [];

    const sorted = [...stars].sort((a, b) => a.id.localeCompare(b.id));
    const stride = Math.max(1, Math.floor(sorted.length / DF_ALIGNMENT_SAMPLE_LIMIT));
    const samples: AlignmentSample[] = [];

    for (let i = 0; i < sorted.length && samples.length < DF_ALIGNMENT_SAMPLE_LIMIT; i += stride) {
        const star = sorted[i];
        samples.push({
            starId: star.id,
            worldX: star.x,
            worldY: star.y,
            normalizedX: worldWidth > 0 ? star.x / worldWidth : 0,
            normalizedY: worldHeight > 0 ? star.y / worldHeight : 0,
        });
    }

    return samples;
}

function buildAlignmentContract(
    stars: StarState[],
    worldWidth: number,
    worldHeight: number,
    stage: AlignmentContractStage,
): AlignmentContract {
    const padding = DF_CONTENT_BOUNDS_PADDING;
    const edgeFade = GAME_CONFIG.DF_EDGE_FADE ?? 200;
    const expansion = GAME_CONFIG.DF_EXPANSION ?? 0.10;
    const issues: string[] = [];

    const world = makeBounds(0, 0, worldWidth, worldHeight);
    const starBounds = computeStarBounds(stars);
    const content = stars.length > 0
        ? makeBounds(
            starBounds.minX - padding,
            starBounds.minY - padding,
            starBounds.maxX + padding,
            starBounds.maxY + padding,
        )
        : makeBounds(0, 0, worldWidth, worldHeight);
    const mesh = makeBounds(
        -edgeFade - worldWidth * expansion,
        -edgeFade - worldHeight * expansion,
        worldWidth + edgeFade + worldWidth * expansion,
        worldHeight + edgeFade + worldHeight * expansion,
    );

    if (!Number.isFinite(worldWidth) || !Number.isFinite(worldHeight) || worldWidth <= 0 || worldHeight <= 0) {
        issues.push('world dimensions must be finite positive numbers');
    }

    if (stars.some((s) => !Number.isFinite(s.x) || !Number.isFinite(s.y))) {
        issues.push('star positions must be finite numbers');
    }

    if (content.minX < mesh.minX - DF_ALIGNMENT_EPSILON || content.maxX > mesh.maxX + DF_ALIGNMENT_EPSILON
        || content.minY < mesh.minY - DF_ALIGNMENT_EPSILON || content.maxY > mesh.maxY + DF_ALIGNMENT_EPSILON) {
        issues.push('content bounds exceed mesh coverage after padding/expansion');
    }

    if (content.maxX > worldWidth + DF_ALIGNMENT_EPSILON || content.maxY > worldHeight + DF_ALIGNMENT_EPSILON) {
        issues.push('content max exceeds world extent; check world-bounds mapping inputs');
    }

    const diagnostics: AlignmentDiagnosticsPayload = {
        stage,
        world,
        content,
        mesh,
        padding,
        expansion,
        issues,
        samples: pickAlignmentSamples(stars, worldWidth, worldHeight),
    };

    latestAlignmentDiagnostics = diagnostics;
    alignmentDiagnosticsHistory.push(diagnostics);
    if (alignmentDiagnosticsHistory.length > DF_ALIGNMENT_HISTORY_LIMIT) {
        alignmentDiagnosticsHistory.shift();
    }

    const issueFp = issues.join('|');
    if (issues.length > 0 && issueFp !== lastAlignmentIssueFp) {
        console.warn(`[DF_ALIGN] ${issues.join('; ')}`, diagnostics);
    }
    lastAlignmentIssueFp = issueFp;

    return {
        contentMinX: content.minX,
        contentMinY: content.minY,
        diagnostics,
    };
}

// ============================================================================
// DEBUG_LADDER: Gradient test texture to prove BufferImageSource upload works
// ============================================================================

function makeGradientTestTexture(): PIXI.Texture {
    // Use Canvas2D - the most universally supported texture source
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
// GPU Data Texture - pack star data for shader (BufferImageSource pattern)
// ============================================================================
// Layout: MAX_STARS columns x 4 rows, RGBA uint8 via BufferImageSource
//   row 0: (x_hi, x_lo, y_hi, y_lo)      - star positions as 16-bit
//   row 1: (bestDist_hi, bestDist_lo, secondDist_hi, secondDist_lo)
//   row 2: (bestOwner+1, secondOwner+1, 0, 0)  - player indices (1-indexed, 0=none)
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
        // Corridors use boost (subtracted from influence = more competitive)
        // Disconnects use Dijkstra distance instead, so boost = 0
        const boostRaw = vs.kind === 'disconnect' ? 0 : Math.round((vs.weight ?? 1.0) * 100);
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
            format: 'rgba8unorm',           // MUST be explicit - Uint8Array defaults to bgra8unorm!
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
    const expand = GAME_CONFIG.DF_EXPANSION ?? 0.10;

    // Check if we need to rebuild geometry (dimensions or expansion changed)
    const dimsChanged = worldWidth !== cachedMeshWorldW || worldHeight !== cachedMeshWorldH || expand !== cachedMeshExpansion || padding !== cachedMeshPadding;
    if (cachedMeshShader && !dimsChanged) {
        return cachedMeshShader;
    }

    // Expand mesh coverage: padding + 10% of world dimensions
    const extraX = worldWidth * expand;
    const extraY = worldHeight * expand;
    const x0 = -padding - extraX, y0 = -padding - extraY;
    const x1 = worldWidth + padding + extraX, y1 = worldHeight + padding + extraY;
    const extentW = x1 - x0;
    const extentH = y1 - y0;

    // If shader already exists but dimensions changed, rebuild geometry only
    if (cachedMeshShader && dimsChanged) {
        const geometry = new PIXI.MeshGeometry({
            positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
            uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
            topology: 'triangle-list',
        });
        if (cachedMesh) {
            const parent = cachedMesh.parent;
            if (parent) parent.removeChild(cachedMesh);
            cachedMesh.destroy();
        }
        cachedMesh = new PIXI.Mesh({ geometry, shader: cachedMeshShader }) as any;
        cachedMeshWorldW = worldWidth;
        cachedMeshWorldH = worldHeight;
        cachedMeshExpansion = expand;
        cachedMeshPadding = padding;
        cachedRenderOriginX = x0;
        cachedRenderOriginY = y0;
        cachedRenderExtentW = extentW;
        cachedRenderExtentH = extentH;
        return cachedMeshShader;
    }

    // First time: compile shader program
    const glProgram = compileHighShaderGlProgram({
        bits: [localUniformBitGl, territoryBitGl, roundPixelsBitGl],
        name: 'territory-distance-field',
    });

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
                uBorderWidth: { value: 15, type: 'f32' },
                uBorderSoftness: { value: 10, type: 'f32' },
                uBorderAlpha: { value: 0.6, type: 'f32' },
                uBorderBrighten: { value: 60, type: 'f32' },
                uBorderMode: { value: 0, type: 'i32' },
                uFillAlpha: { value: 0.15, type: 'f32' },
                uEdgeFade: { value: 200, type: 'f32' },
                uHueShift: { value: 0, type: 'f32' },
                uSatMult: { value: 0.5, type: 'f32' },
                uLightMult: { value: 0.4, type: 'f32' },
                uMorphFactor: { value: 0, type: 'f32' },
                uTieEpsilon: { value: DF_TIE_EPSILON, type: 'f32' },
                uInfluenceWeight: { value: 1.0, type: 'f32' },
                uContentMinX: { value: 0, type: 'f32' },
                uContentMinY: { value: 0, type: 'f32' },
                uSmoothing: { value: 30, type: 'f32' },
                uCorridorBoost: { value: 0, type: 'f32' },
                uDisconnectBoost: { value: 0, type: 'f32' },
                uMinStarRadius: { value: 40, type: 'f32' },
                uNumRealStars: { value: 0, type: 'i32' },
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

    // Quad geometry in world space with UVs in [0, 1]
    // MeshGeometry wraps buffers with proper VERTEX|COPY_DST usage flags
    const geometry = new PIXI.MeshGeometry({
        positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        topology: 'triangle-list',
    });

    cachedMesh = new PIXI.Mesh({ geometry, shader: cachedMeshShader }) as any;
    cachedMeshWorldW = worldWidth;
    cachedMeshWorldH = worldHeight;
    cachedMeshExpansion = expand;
    cachedMeshPadding = padding;
    cachedRenderOriginX = x0;
    cachedRenderOriginY = y0;
    cachedRenderExtentW = extentW;
    cachedRenderExtentH = extentH;

    return cachedMeshShader;
}


// Two-pass resource lifecycle:
// 1) render ownership field into offscreen texture
// 2) detect boundary pixels and run jump-flood nearest-boundary propagation
// 3) render constant-width border using true distance-to-boundary
function createNearestRenderTexture(width: number, height: number): PIXI.RenderTexture {
    const texture = PIXI.RenderTexture.create({ width, height, resolution: 1 });
    const src = texture.source as any;
    if (src) {
        src.scaleMode = 'nearest';
        src.autoGarbageCollect = false;
    }
    return texture;
}

function createTargetMesh(width: number, height: number, shader: PIXI.Shader): PIXI.Mesh {
    const geometry = new PIXI.MeshGeometry({
        positions: new Float32Array([0, 0, width, 0, width, height, 0, height]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        topology: 'triangle-list',
    });
    return new PIXI.Mesh({ geometry, shader }) as PIXI.Mesh;
}

// HQ mode supersamples pass-1 ownership/JFA textures before pass-2 shading.
// Border width remains in world units; only edge fidelity increases at close zoom.
function getTwoPassTextureSizing(extentW: number, extentH: number): {
    texW: number;
    texH: number;
} {
    const hqEnabled = Boolean(GAME_CONFIG.DF_BORDER_HQ_ENABLED ?? false);
    const requestedScale = hqEnabled ? (GAME_CONFIG.DF_BORDER_HQ_SCALE ?? 2.0) : 1.0;
    const clampedScale = Math.max(DF_BORDER_HQ_MIN_SCALE, Math.min(DF_BORDER_HQ_MAX_SCALE, requestedScale));

    const configuredMaxDim = Math.floor(GAME_CONFIG.DF_BORDER_HQ_MAX_DIM ?? DF_PASS1_ABSOLUTE_MAX_TEXTURE_DIM);
    const maxTextureDim = hqEnabled
        ? Math.max(
            DF_PASS1_BASE_MAX_TEXTURE_DIM,
            Math.min(DF_PASS1_ABSOLUTE_MAX_TEXTURE_DIM, configuredMaxDim),
        )
        : DF_PASS1_BASE_MAX_TEXTURE_DIM;

    const fitScale = Math.max(0.01, Math.min(maxTextureDim / extentW, maxTextureDim / extentH));
    const effectiveScale = Math.min(clampedScale, fitScale);

    return {
        texW: Math.max(1, Math.round(extentW * effectiveScale)),
        texH: Math.max(1, Math.round(extentH * effectiveScale)),
    };
}

function ensureTwoPassBorderResources(): void {
    if (!DF_TWO_PASS_BORDERS_ENABLED) return;

    const extentW = Math.max(1, cachedRenderExtentW);
    const extentH = Math.max(1, cachedRenderExtentH);
    const { texW, texH } = getTwoPassTextureSizing(extentW, extentH);

    const textureChanged = !cachedOwnershipTexture || texW !== cachedOwnershipTexW || texH !== cachedOwnershipTexH;
    if (textureChanged) {
        if (cachedOwnershipTexture) cachedOwnershipTexture.destroy(true);
        if (cachedJumpFloodTextureA) cachedJumpFloodTextureA.destroy(true);
        if (cachedJumpFloodTextureB) cachedJumpFloodTextureB.destroy(true);

        cachedOwnershipTexture = createNearestRenderTexture(texW, texH);
        cachedJumpFloodTextureA = createNearestRenderTexture(texW, texH);
        cachedJumpFloodTextureB = createNearestRenderTexture(texW, texH);
        cachedBoundaryDistanceTexture = null;
        cachedOwnershipTexW = texW;
        cachedOwnershipTexH = texH;
    }

    if (!cachedOwnershipShader) {
        const ownershipProgram = compileHighShaderGlProgram({
            bits: [localUniformBitGl, ownershipPassBitGl, roundPixelsBitGl],
            name: 'territory-distance-field-ownership-pass',
        });
        cachedOwnershipShader = new PIXI.Shader({
            glProgram: ownershipProgram,
            resources: {
                passOwnershipUniforms: {
                    uNumStars: { value: 0, type: 'i32' },
                    uNumRealStars: { value: 0, type: 'i32' },
                    uMorphFactor: { value: 0, type: 'f32' },
                    uTieEpsilon: { value: DF_TIE_EPSILON, type: 'f32' },
                    uInfluenceWeight: { value: 1.0, type: 'f32' },
                    uMinStarRadius: { value: 40, type: 'f32' },
                    uRenderOrigin: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
                    uRenderExtent: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
                    uGapScale: { value: DF_PASS1_GAP_SCALE, type: 'f32' },
                },
                uStarData: starDataTexture?.source ?? makeGradientTestTexture().source,
            },
        });
    }

    if (!cachedBoundarySeedShader) {
        const boundarySeedProgram = compileHighShaderGlProgram({
            bits: [localUniformBitGl, boundarySeedBitGl, roundPixelsBitGl],
            name: 'territory-distance-field-boundary-seed-pass',
        });
        cachedBoundarySeedShader = new PIXI.Shader({
            glProgram: boundarySeedProgram,
            resources: {
                boundarySeedUniforms: {
                    uOwnershipTexSize: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
                },
                uOwnershipTex: cachedOwnershipTexture?.source ?? makeGradientTestTexture().source,
            },
        });
    }

    if (!cachedJumpFloodShader) {
        const jumpFloodProgram = compileHighShaderGlProgram({
            bits: [localUniformBitGl, jumpFloodBitGl, roundPixelsBitGl],
            name: 'territory-distance-field-jump-flood-pass',
        });
        cachedJumpFloodShader = new PIXI.Shader({
            glProgram: jumpFloodProgram,
            resources: {
                jumpFloodUniforms: {
                    uSeedTexSize: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
                    uJump: { value: 1, type: 'f32' },
                },
                uSeedTex: cachedJumpFloodTextureA?.source ?? makeGradientTestTexture().source,
            },
        });
    }

    if (!cachedBorderShader) {
        const borderProgram = compileHighShaderGlProgram({
            bits: [localUniformBitGl, borderPassBitGl, roundPixelsBitGl],
            name: 'territory-distance-field-border-pass',
        });
        cachedBorderShader = new PIXI.Shader({
            glProgram: borderProgram,
            resources: {
                borderPassUniforms: {
                    uRenderOrigin: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
                    uRenderExtent: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
                    uBoundaryTexSize: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
                    uBorderWidth: { value: 10, type: 'f32' },
                    uBorderSoftness: { value: 4, type: 'f32' },
                    uBorderAlpha: { value: 0.8, type: 'f32' },
                    uBorderBrighten: { value: 40, type: 'f32' },
                    uWorldWidth: { value: 0, type: 'f32' },
                    uWorldHeight: { value: 0, type: 'f32' },
                    uContentMinX: { value: 0, type: 'f32' },
                    uContentMinY: { value: 0, type: 'f32' },
                    uEdgeFade: { value: 200, type: 'f32' },
                    uPlayerColor0: { value: new Float32Array([1, 0, 0]), type: 'vec3<f32>' },
                    uPlayerColor1: { value: new Float32Array([0, 0, 1]), type: 'vec3<f32>' },
                    uPlayerColor2: { value: new Float32Array([0, 1, 0]), type: 'vec3<f32>' },
                    uPlayerColor3: { value: new Float32Array([1, 1, 0]), type: 'vec3<f32>' },
                    uPlayerColor4: { value: new Float32Array([1, 0, 1]), type: 'vec3<f32>' },
                    uPlayerColor5: { value: new Float32Array([0, 1, 1]), type: 'vec3<f32>' },
                    uPlayerColor6: { value: new Float32Array([1, 0.5, 0]), type: 'vec3<f32>' },
                    uPlayerColor7: { value: new Float32Array([0.5, 0, 1]), type: 'vec3<f32>' },
                },
                uOwnershipTex: cachedOwnershipTexture?.source ?? makeGradientTestTexture().source,
                uBoundaryTex: cachedJumpFloodTextureA?.source ?? makeGradientTestTexture().source,
            },
        });
    }

    const targetMeshNeedsRebuild = textureChanged
        || !cachedOwnershipMesh
        || !cachedBoundarySeedMesh
        || !cachedJumpFloodMesh;

    if (targetMeshNeedsRebuild) {
        if (cachedOwnershipMesh) cachedOwnershipMesh.destroy();
        if (cachedBoundarySeedMesh) cachedBoundarySeedMesh.destroy();
        if (cachedJumpFloodMesh) cachedJumpFloodMesh.destroy();

        cachedOwnershipMesh = createTargetMesh(texW, texH, cachedOwnershipShader!);
        cachedBoundarySeedMesh = createTargetMesh(texW, texH, cachedBoundarySeedShader!);
        cachedJumpFloodMesh = createTargetMesh(texW, texH, cachedJumpFloodShader!);
        cachedOwnershipExtentW = texW;
        cachedOwnershipExtentH = texH;
    }

    const borderMeshNeedsRebuild = !cachedBorderMesh
        || Math.abs(cachedRenderOriginX - cachedBorderOriginX) > 0.5
        || Math.abs(cachedRenderOriginY - cachedBorderOriginY) > 0.5
        || Math.abs(cachedRenderExtentW - cachedBorderExtentW) > 0.5
        || Math.abs(cachedRenderExtentH - cachedBorderExtentH) > 0.5;

    if (borderMeshNeedsRebuild) {
        const x0 = cachedRenderOriginX;
        const y0 = cachedRenderOriginY;
        const x1 = x0 + cachedRenderExtentW;
        const y1 = y0 + cachedRenderExtentH;

        const geometry = new PIXI.MeshGeometry({
            positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
            uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
            indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
            topology: 'triangle-list',
        });

        if (cachedBorderMesh) {
            if (cachedBorderMesh.parent) cachedBorderMesh.parent.removeChild(cachedBorderMesh);
            cachedBorderMesh.destroy();
        }

        const borderMesh = new PIXI.Mesh({ geometry, shader: cachedBorderShader! }) as PIXI.Mesh;
        borderMesh.filters = [];
        cachedBorderMesh = borderMesh;
        cachedBorderOriginX = cachedRenderOriginX;
        cachedBorderOriginY = cachedRenderOriginY;
        cachedBorderExtentW = cachedRenderExtentW;
        cachedBorderExtentH = cachedRenderExtentH;
    }
}

// Pass 1 runs every frame so morphing and influence sliders remain fluid.
function updateOwnershipPassUniforms(stars: StarState[], morphFactor: number): void {
    if (!cachedOwnershipShader) return;

    const nStars = totalPackedStars > 0 ? totalPackedStars : Math.min(stars.length, MAX_STARS);
    const u = cachedOwnershipShader.resources.passOwnershipUniforms.uniforms;
    u.uNumStars = nStars;
    u.uNumRealStars = stars.length;
    u.uMorphFactor = morphFactor;
    u.uTieEpsilon = DF_TIE_EPSILON;
    u.uInfluenceWeight = GAME_CONFIG.DF_INFLUENCE_WEIGHT ?? 1.0;
    u.uMinStarRadius = GAME_CONFIG.DF_MIN_STAR_RADIUS ?? 40;
    u.uRenderOrigin = new Float32Array([cachedRenderOriginX, cachedRenderOriginY]);
    u.uRenderExtent = new Float32Array([Math.max(1, cachedRenderExtentW), Math.max(1, cachedRenderExtentH)]);
    u.uGapScale = DF_PASS1_GAP_SCALE;

    if (starDataTexture) {
        cachedOwnershipShader.resources.uStarData = starDataTexture.source;
    }

    const ug = cachedOwnershipShader.resources.passOwnershipUniforms as any;
    if (ug && typeof ug.update === 'function') ug.update();
}

function renderOwnershipPass(renderer: PIXI.Renderer): void {
    if (!cachedOwnershipMesh || !cachedOwnershipTexture) return;
    (renderer as any).render({ container: cachedOwnershipMesh, target: cachedOwnershipTexture, clear: true });
}

function renderBoundaryDistancePass(renderer: PIXI.Renderer): boolean {
    if (
        !cachedOwnershipTexture
        || !cachedBoundarySeedShader
        || !cachedBoundarySeedMesh
        || !cachedJumpFloodShader
        || !cachedJumpFloodMesh
        || !cachedJumpFloodTextureA
        || !cachedJumpFloodTextureB
    ) {
        return false;
    }

    const boundaryUniforms = cachedBoundarySeedShader.resources.boundarySeedUniforms.uniforms;
    boundaryUniforms.uOwnershipTexSize = new Float32Array([Math.max(1, cachedOwnershipTexW), Math.max(1, cachedOwnershipTexH)]);
    cachedBoundarySeedShader.resources.uOwnershipTex = cachedOwnershipTexture.source;
    const boundaryGroup = cachedBoundarySeedShader.resources.boundarySeedUniforms as any;
    if (boundaryGroup && typeof boundaryGroup.update === 'function') boundaryGroup.update();

    (renderer as any).render({ container: cachedBoundarySeedMesh, target: cachedJumpFloodTextureA, clear: true });

    let jump = 1;
    const maxDim = Math.max(cachedOwnershipTexW, cachedOwnershipTexH);
    while (jump < maxDim) jump *= 2;
    jump = Math.max(1, Math.floor(jump / 2));

    let inputTex = cachedJumpFloodTextureA;
    let outputTex = cachedJumpFloodTextureB;

    while (true) {
        const jumpUniforms = cachedJumpFloodShader.resources.jumpFloodUniforms.uniforms;
        jumpUniforms.uSeedTexSize = new Float32Array([Math.max(1, cachedOwnershipTexW), Math.max(1, cachedOwnershipTexH)]);
        jumpUniforms.uJump = jump;
        cachedJumpFloodShader.resources.uSeedTex = inputTex.source;

        const jumpGroup = cachedJumpFloodShader.resources.jumpFloodUniforms as any;
        if (jumpGroup && typeof jumpGroup.update === 'function') jumpGroup.update();

        (renderer as any).render({ container: cachedJumpFloodMesh, target: outputTex, clear: true });

        const nextInput = outputTex;
        outputTex = inputTex;
        inputTex = nextInput;

        if (jump <= 1) break;
        jump = Math.floor(jump / 2);
    }

    cachedBoundaryDistanceTexture = inputTex;
    return true;
}

// Pass 2 consumes ownership + nearest-boundary field and draws an even-width AA stroke.
function updateTwoPassBorderUniforms(
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    alignment: AlignmentContract,
): boolean {
    if (!cachedBorderShader || !cachedOwnershipTexture || !cachedBoundaryDistanceTexture) return false;

    const nPlayers = currentPlayerIds.length;
    const u = cachedBorderShader.resources.borderPassUniforms.uniforms;
    u.uRenderOrigin = new Float32Array([cachedRenderOriginX, cachedRenderOriginY]);
    u.uRenderExtent = new Float32Array([Math.max(1, cachedRenderExtentW), Math.max(1, cachedRenderExtentH)]);
    u.uBoundaryTexSize = new Float32Array([Math.max(1, cachedOwnershipTexW), Math.max(1, cachedOwnershipTexH)]);
    u.uBorderWidth = GAME_CONFIG.DF_BORDER_WIDTH ?? 5;
    u.uBorderSoftness = GAME_CONFIG.DF_BORDER_SOFTNESS ?? 3;
    u.uBorderAlpha = GAME_CONFIG.DF_BORDER_ALPHA ?? 0.8;
    u.uBorderBrighten = GAME_CONFIG.DF_BORDER_BRIGHTEN ?? 20;
    u.uWorldWidth = worldWidth;
    u.uWorldHeight = worldHeight;
    u.uContentMinX = alignment.contentMinX;
    u.uContentMinY = alignment.contentMinY;
    u.uEdgeFade = GAME_CONFIG.DF_EDGE_FADE ?? 200;

    for (let i = 0; i < Math.min(nPlayers, MAX_PLAYERS); i++) {
        const hex = colorUtils.getPlayerColor(currentPlayerIds[i]);
        const r = ((hex >> 16) & 0xff) / 255;
        const g = ((hex >> 8) & 0xff) / 255;
        const b = (hex & 0xff) / 255;
        const colorArr = new Float32Array([r, g, b]);
        (u as any)[`uPlayerColor${i}`] = colorArr;
    }

    cachedBorderShader.resources.uOwnershipTex = cachedOwnershipTexture.source;
    cachedBorderShader.resources.uBoundaryTex = cachedBoundaryDistanceTexture.source;

    const ug = cachedBorderShader.resources.borderPassUniforms as any;
    if (ug && typeof ug.update === 'function') ug.update();
    return true;
}
// Update GPU uniforms from current state
// ============================================================================

function updateFilterUniforms(
    stars: StarState[],
    colorUtils: ColorUtils,
    worldWidth: number,
    worldHeight: number,
    alignment: AlignmentContract,
    disableInlineBorders: boolean,
): void {
    if (!cachedMeshShader) return;

    const nStars = totalPackedStars > 0 ? totalPackedStars : Math.min(stars.length, MAX_STARS);
    const nPlayers = currentPlayerIds.length;
    const padding = GAME_CONFIG.DF_EDGE_FADE ?? 200;

    const u = cachedMeshShader.resources.territoryUniforms.uniforms;
    u.uNumStars = nStars;
    u.uNumRealStars = stars.length;
    u.uNumPlayers = nPlayers;
    u.uWorldWidth = worldWidth;
    u.uWorldHeight = worldHeight;
    u.uPadding = padding;
    // In two-pass mode, fill pass must not draw inline borders.
    u.uBorderWidth = disableInlineBorders ? 0 : (GAME_CONFIG.DF_BORDER_WIDTH ?? 5);
    u.uBorderSoftness = GAME_CONFIG.DF_BORDER_SOFTNESS ?? 3;
    u.uBorderAlpha = GAME_CONFIG.DF_BORDER_ALPHA ?? 0.8;
    u.uBorderBrighten = GAME_CONFIG.DF_BORDER_BRIGHTEN ?? 20;
    u.uBorderMode = GAME_CONFIG.DF_BORDER_MODE ?? 1;
    u.uFillAlpha = GAME_CONFIG.DF_ALPHA ?? 0.2;
    u.uEdgeFade = GAME_CONFIG.DF_EDGE_FADE ?? 200;
    u.uHueShift = GAME_CONFIG.DF_HUE ?? 0;
    u.uSatMult = GAME_CONFIG.DF_SATURATION ?? 0.7;
    u.uLightMult = GAME_CONFIG.DF_LIGHTNESS ?? 0.5;
    u.uTieEpsilon = DF_TIE_EPSILON;
    u.uInfluenceWeight = GAME_CONFIG.DF_INFLUENCE_WEIGHT ?? 1.0;

    // Alignment contract owns content bounds so mesh/data/shader stay in one coordinate space.
    u.uContentMinX = alignment.contentMinX;
    u.uContentMinY = alignment.contentMinY;
    u.uSmoothing = GAME_CONFIG.DF_SMOOTHING ?? 30;
    u.uMinStarRadius = GAME_CONFIG.DF_MIN_STAR_RADIUS ?? 40;
    // Note: corridor/disconnect boosts are encoded per-site in the data texture,
    // not as uniforms. The weights are applied via vs.weight → encode16 → shader decode.

    // Pack player colors (0-1 range)
    for (let i = 0; i < Math.min(nPlayers, MAX_PLAYERS); i++) {
        const hex = colorUtils.getPlayerColor(currentPlayerIds[i]);
        const r = ((hex >> 16) & 0xff) / 255;
        const g = ((hex >> 8) & 0xff) / 255;
        const b = (hex & 0xff) / 255;
        const colorArr = new Float32Array([r, g, b]);
        (u as any)[`uPlayerColor${i}`] = colorArr;
    }

    // Update star data texture reference - pass .source (TextureSource), not Texture
    if (starDataTexture) {
        cachedMeshShader.resources.uStarData = starDataTexture.source;
    }

    // CRITICAL: Flag the UniformGroup as dirty so PIXI re-uploads to GPU
    const ug = cachedMeshShader.resources.territoryUniforms as any;
    if (ug && typeof ug.update === 'function') {
        ug.update();
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
        // With mesh approach, the custom shader is built in - only add blur as extra filter
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
    renderer?: PIXI.Renderer,
): void {
    if (!GAME_CONFIG.TERRITORY_DISTANCE_FIELD) {
        if (cachedMesh) cachedMesh.visible = false;
        if (cachedBorderMesh) cachedBorderMesh.visible = false;
        hideVectorBorderOverlay();
        return;
    }

    const now = performance.now();
    const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;
    const metric = (GAME_CONFIG.DF_DISTANCE_METRIC ?? 'length') as 'hops' | 'length';
    cachedDistanceMetric = metric;

    const canonicalInput = canonicalizeDfInputs(stars, connections ?? []);
    const canonicalStars = canonicalInput.stars;
    const canonicalConnections = canonicalInput.connections;

    const alignmentContract = buildAlignmentContract(canonicalStars, worldWidth, worldHeight, 'prebuild');
    const hasInvalidWorld = alignmentContract.diagnostics.issues.includes('world dimensions must be finite positive numbers');
    if (hasInvalidWorld) {
        if (cachedMesh) cachedMesh.visible = false;
        if (cachedBorderMesh) cachedBorderMesh.visible = false;
        hideVectorBorderOverlay();
        return;
    }

    const vectorBordersEnabled = Boolean(GAME_CONFIG.DF_VECTOR_BORDERS_ENABLED ?? false);
    const useTwoPassBorders = DF_TWO_PASS_BORDERS_ENABLED && !!renderer && !vectorBordersEnabled;
    if (DF_TWO_PASS_BORDERS_ENABLED && !renderer && !vectorBordersEnabled && !warnedMissingRendererForTwoPass) {
        warnedMissingRendererForTwoPass = true;
        console.warn('[DF_TWOPASS] renderer unavailable; falling back to inline borders');
    }

    const changeClassification = classifyDfChanges(canonicalInput, metric);

    if (changeClassification.geometryChanged || changeClassification.topologyChanged) {
        buildLaneIndex(canonicalStars, canonicalConnections);
    }

    if (changeClassification.geometryChanged || changeClassification.topologyChanged) {
        const playerSet = new Set<string>();
        for (const s of canonicalStars) if (s.ownerId) playerSet.add(s.ownerId);
        const newPlayerIds = Array.from(playerSet).sort();

        const newDist = computeDistToPlayer(canonicalStars, canonicalConnections, newPlayerIds, metric);

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
        hideVectorBorderOverlay();
        return;
    }

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

    const needsRebuild = changeClassification.geometryChanged
        || changeClassification.topologyChanged
        || isMorphing
        || !starDataTexture;

    let activeVirtualSites = cachedVirtualSites;

    if (needsRebuild) {
        if (alignmentContract.diagnostics.issues.length > 0) {
            console.assert(false, '[DF_ALIGN] alignment contract issues detected before DF rebuild', alignmentContract.diagnostics);
        }

        let virtuals: VirtualSite[] = [];

        if (GAME_CONFIG.DF_CORRIDOR_ENABLED && canonicalConnections.length > 0) {
            const spacing = GAME_CONFIG.DF_CORRIDOR_SPACING ?? 60;
            const weight = GAME_CONFIG.DF_CORRIDOR_WEIGHT ?? 1.0;
            const mode = GAME_CONFIG.DF_CORRIDOR_MODE ?? 'spacing';
            const count = mode === 'count' ? (GAME_CONFIG.DF_CORRIDOR_COUNT ?? 3) : undefined;
            const corridorSites = computeCorridorVirtuals(canonicalInput.ownedStars, canonicalConnections, spacing, 0.5, count);
            for (const site of corridorSites) site.weight = weight;
            virtuals = virtuals.concat(corridorSites);
            console.log(`[DF] Corridors: ${corridorSites.length} sites (mode=${mode}, ${mode === 'count' ? `count=${count}` : `spacing=${spacing}`}, weight=${weight})`);
        }

        if (GAME_CONFIG.DF_DISCONNECT_ENABLED && canonicalConnections.length > 0) {
            const maxDist = GAME_CONFIG.DF_DISCONNECT_DISTANCE ?? 400;
            const weight = GAME_CONFIG.DF_DISCONNECT_WEIGHT ?? 0.3;
            const disconnectSites = computeDisconnectVirtuals(canonicalInput.ownedStars, canonicalStars, canonicalConnections, maxDist, weight);
            virtuals = virtuals.concat(disconnectSites);
            console.log(`[DF] Disconnects: ${disconnectSites.length} sites (maxDist=${maxDist}, weight=${weight})`);
            for (const site of disconnectSites) {
                const pIdx = currentPlayerIds.indexOf(site.ownerId);
                console.log(`  [DF-DC] site at (${site.x.toFixed(0)},${site.y.toFixed(0)}) owner=${site.ownerId} pIdx=${pIdx} weight=${site.weight}`);
            }
        }

        const stableVirtuals = canonicalizeVirtualSites(virtuals);
        activeVirtualSites = stableVirtuals;
        cachedVirtualSites = stableVirtuals;
        console.log(`[DF] Total packed: ${canonicalStars.length} real + ${stableVirtuals.length} virtual = ${canonicalStars.length + stableVirtuals.length}`);
        buildStarDataTexture(canonicalStars, currentDist, prevDist, currentPlayerIds, stableVirtuals);
    }

    runInternalTwoPassTrack(
        alignmentContract,
        canonicalStars,
        currentDist,
        currentPlayerIds,
        activeVirtualSites,
        worldWidth,
        worldHeight,
    );

    ensureMesh(worldWidth, worldHeight);

    if (cachedMesh && !cachedMesh.parent) {
        container.addChild(cachedMesh);
    }
    if (cachedMesh) {
        cachedMesh.visible = true;
    }

    if (cachedMeshShader) {
        cachedMeshShader.resources.territoryUniforms.uniforms.uMorphFactor = morphFactor;
    }
    updateFilterUniforms(canonicalStars, colorUtils, worldWidth, worldHeight, alignmentContract, useTwoPassBorders || vectorBordersEnabled);

    if (useTwoPassBorders) {
        ensureTwoPassBorderResources();
        updateOwnershipPassUniforms(canonicalStars, morphFactor);
        renderOwnershipPass(renderer!);
        const hasBoundaryField = renderBoundaryDistancePass(renderer!);
        const borderReady = hasBoundaryField
            && updateTwoPassBorderUniforms(colorUtils, worldWidth, worldHeight, alignmentContract);

        if (cachedBorderMesh && !cachedBorderMesh.parent) {
            container.addChild(cachedBorderMesh);
        }
        if (cachedBorderMesh) {
            cachedBorderMesh.visible = borderReady
                && (GAME_CONFIG.DF_BORDER_WIDTH ?? 0) > 0
                && (GAME_CONFIG.DF_BORDER_ALPHA ?? 0) > 0;
        }
        hideVectorBorderOverlay();
    } else if (cachedBorderMesh) {
        cachedBorderMesh.visible = false;
    }

    if (vectorBordersEnabled) {
        const forceVectorRebuild = changeClassification.geometryChanged
            || changeClassification.topologyChanged
            || changeClassification.visualChanged;
        renderVectorBorderOverlay(
            container,
            colorUtils,
            canonicalStars,
            activeVirtualSites,
            currentDist,
            prevDist,
            currentPlayerIds,
            morphFactor,
            now,
            forceVectorRebuild,
        );
    } else {
        hideVectorBorderOverlay();
    }

    applyBlur();
}
// ============================================================================
// Alignment Diagnostics
// ============================================================================

export function getDistanceFieldAlignmentDiagnostics(): AlignmentDiagnosticsPayload | null {
    return latestAlignmentDiagnostics;
}

export function getDistanceFieldAlignmentDiagnosticsHistory(): AlignmentDiagnosticsPayload[] {
    return [...alignmentDiagnosticsHistory];
}

export function getDistanceFieldChangeClassification(): DfChangeClassification | null {
    return lastChangeClassification;
}

export function getDistanceFieldTwoPassDiagnostics(): TwoPassDiagnosticsPayload | null {
    return latestTwoPassDiagnostics;
}

// ============================================================================
// Cache Reset
// ============================================================================

export function resetDistanceFieldTerritoryCache(): void {
    cachedGeometryFp = '';
    cachedTopologyFp = '';
    cachedVisualFp = '';
    cachedDistanceMetric = null;
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
    if (cachedOwnershipMesh) {
        cachedOwnershipMesh.destroy();
        cachedOwnershipMesh = null;
    }
    if (cachedBoundarySeedMesh) {
        cachedBoundarySeedMesh.destroy();
        cachedBoundarySeedMesh = null;
    }
    if (cachedJumpFloodMesh) {
        cachedJumpFloodMesh.destroy();
        cachedJumpFloodMesh = null;
    }
    if (cachedBoundarySeedShader) {
        cachedBoundarySeedShader.destroy();
        cachedBoundarySeedShader = null;
    }
    if (cachedJumpFloodShader) {
        cachedJumpFloodShader.destroy();
        cachedJumpFloodShader = null;
    }
    if (cachedOwnershipShader) {
        cachedOwnershipShader.destroy();
        cachedOwnershipShader = null;
    }
    if (cachedBorderMesh) {
        if (cachedBorderMesh.parent) cachedBorderMesh.parent.removeChild(cachedBorderMesh);
        cachedBorderMesh.destroy();
        cachedBorderMesh = null;
    }
    if (cachedBorderShader) {
        cachedBorderShader.destroy();
        cachedBorderShader = null;
    }
    if (cachedVectorBorderGraphics) {
        if (cachedVectorBorderGraphics.parent) cachedVectorBorderGraphics.parent.removeChild(cachedVectorBorderGraphics);
        cachedVectorBorderGraphics.destroy();
        cachedVectorBorderGraphics = null;
    }
    if (cachedJumpFloodTextureA) {
        cachedJumpFloodTextureA.destroy(true);
        cachedJumpFloodTextureA = null;
    }
    if (cachedJumpFloodTextureB) {
        cachedJumpFloodTextureB.destroy(true);
        cachedJumpFloodTextureB = null;
    }
    if (cachedOwnershipTexture) {
        cachedOwnershipTexture.destroy(true);
        cachedOwnershipTexture = null;
    }

    starDataTexture = null;
    starDataBuffer = null;
    cachedBlurFilter = null;
    cachedBlurStrength = -1;
    cachedMeshWorldW = 0;
    cachedMeshWorldH = 0;
    cachedMeshExpansion = -1;
    cachedMeshPadding = -1;
    cachedRenderOriginX = 0;
    cachedRenderOriginY = 0;
    cachedRenderExtentW = 0;
    cachedRenderExtentH = 0;
    cachedOwnershipTexW = 0;
    cachedOwnershipTexH = 0;
    cachedOwnershipExtentW = 0;
    cachedOwnershipExtentH = 0;
    cachedBoundaryDistanceTexture = null;
    cachedBorderOriginX = 0;
    cachedBorderOriginY = 0;
    cachedBorderExtentW = 0;
    cachedBorderExtentH = 0;
    cachedVectorBorderFingerprint = '';
    cachedVectorBorderLastBuildMs = 0;
    laneArray = [];
    laneCells = new Map();
    latestAlignmentDiagnostics = null;
    alignmentDiagnosticsHistory = [];
    lastAlignmentIssueFp = '';
    lastChangeClassification = null;
    cachedVirtualSites = [];
    latestTwoPassDiagnostics = null;
    warnedMissingRendererForTwoPass = false;
}

