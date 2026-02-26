// ============================================================================
// MetaballRenderer — GPU-accelerated influence field territory rendering
// ============================================================================
//
// Renders organic, blobby territory regions using a WebGL fragment shader.
// Each owned star contributes an influence field; territory ownership is
// determined per-pixel by which player's summed influence is strongest.
//
// Uses PIXI v8 Filter API applied to a fullscreen Graphics rectangle.
// Star data is packed into a DataTexture sampled per-pixel in the shader.
//
// Falloff modes: inverse-square, gaussian, smoothstep
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

// Max stars we support in the shader
const MAX_STARS = 64;
// Max players
const MAX_PLAYERS = 8;

// ── Shaders ────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

// Fragment shader — computes per-pixel territory from influence fields
// Star data is passed as individual uniforms (up to 64 stars, 4 floats each)
// Player colors as individual uniforms (up to 8 players, 3 floats each)
const FRAGMENT_SHADER = /* glsl */ `
in vec2 vTextureCoord;

uniform sampler2D uTexture;

// Star data: packed as individual vec4s
// x, y, playerIndex, strength
uniform vec4 uStarData[${MAX_STARS}];
uniform int uNumStars;

// Player colors
uniform vec3 uColors[${MAX_PLAYERS}];
uniform int uNumPlayers;

// Visual parameters
uniform float uRadius;
uniform int uFalloff;          // 0=inverse-square, 1=gaussian, 2=smoothstep
uniform float uSharpness;
uniform float uAlpha;
uniform vec2 uWorldSize;

// Inverse-square falloff: soft, organic
float falloffInvSq(float dist, float radius) {
    float d = dist / radius;
    return 1.0 / (1.0 + d * d);
}

// Gaussian falloff: very soft, fluid
float falloffGauss(float dist, float radius) {
    float d = dist / radius;
    return exp(-d * d);
}

// Smoothstep falloff: defined edges
float falloffSmooth(float dist, float radius) {
    return smoothstep(radius, 0.0, dist);
}

float computeInf(float dist, float radius) {
    if (uFalloff == 0) return falloffInvSq(dist, radius);
    if (uFalloff == 1) return falloffGauss(dist, radius);
    return falloffSmooth(dist, radius);
}

void main() {
    // Convert filter texture coord to world position
    vec2 pixelPos = vTextureCoord * uWorldSize;

    // Accumulate influence per player
    float pInf[${MAX_PLAYERS}];
    for (int p = 0; p < ${MAX_PLAYERS}; p++) pInf[p] = 0.0;

    // Sum influence from each star
    for (int i = 0; i < ${MAX_STARS}; i++) {
        if (i >= uNumStars) break;

        vec2 sPos = uStarData[i].xy;
        int pIdx = int(uStarData[i].z);
        float str = uStarData[i].w;

        float dist = length(pixelPos - sPos);
        float inf = computeInf(dist, uRadius) * str;

        // Accumulate (manual indexing for WebGL compatibility)
        for (int p = 0; p < ${MAX_PLAYERS}; p++) {
            if (p == pIdx) {
                pInf[p] += inf;
                break;
            }
        }
    }

    // Find top 2 players
    float maxInf = 0.0;
    int maxP = -1;
    float secInf = 0.0;
    int secP = -1;

    for (int p = 0; p < ${MAX_PLAYERS}; p++) {
        if (p >= uNumPlayers) break;
        if (pInf[p] > maxInf) {
            secInf = maxInf;
            secP = maxP;
            maxInf = pInf[p];
            maxP = p;
        } else if (pInf[p] > secInf) {
            secInf = pInf[p];
            secP = p;
        }
    }

    // No influence — transparent
    if (maxP < 0 || maxInf < 0.001) {
        gl_FragColor = vec4(0.0);
        return;
    }

    // Get winning color (manual indexing)
    vec3 topCol = vec3(0.5);
    for (int p = 0; p < ${MAX_PLAYERS}; p++) {
        if (p == maxP) { topCol = uColors[p]; break; }
    }

    vec3 blended = topCol;

    // Blend with second if present
    if (secP >= 0 && secInf > 0.001) {
        vec3 secCol = vec3(0.5);
        for (int p = 0; p < ${MAX_PLAYERS}; p++) {
            if (p == secP) { secCol = uColors[p]; break; }
        }
        float total = maxInf + secInf;
        float bf = maxInf / total;
        bf = smoothstep(0.5 - 0.5 / uSharpness, 0.5 + 0.5 / uSharpness, bf);
        blended = mix(secCol, topCol, bf);
    }

    // Alpha fades at edges of influence
    float fadeAlpha = clamp(maxInf * 3.0, 0.0, 1.0);

    gl_FragColor = vec4(blended, uAlpha * fadeAlpha);
}
`;

// ── Renderer State ─────────────────────────────────────────────────────────

let metaballFilter: PIXI.Filter | null = null;
let backingGraphics: PIXI.Graphics | null = null;
let cachedPlayerMap: Map<string, number> = new Map();

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Render metaball territory overlay.
 * Creates a fullscreen backing Graphics with a custom Filter that computes
 * per-pixel influence fields from all owned stars.
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
        if (backingGraphics) backingGraphics.visible = false;
        return;
    }

    // Ensure backing graphics exists
    if (!backingGraphics) {
        backingGraphics = new PIXI.Graphics();
        container.addChild(backingGraphics);
    }
    backingGraphics.visible = true;

    // Draw fullscreen rect (filter needs something to render)
    backingGraphics.clear();
    backingGraphics.rect(0, 0, worldWidth, worldHeight);
    backingGraphics.fill({ color: 0x000000, alpha: 0.01 });

    const ownedStars = stars.filter(s => s.ownerId);
    if (ownedStars.length === 0) {
        backingGraphics.visible = false;
        return;
    }

    // Build player index map
    const playerIds = new Set<string>();
    for (const s of ownedStars) {
        if (s.ownerId) playerIds.add(s.ownerId);
    }
    cachedPlayerMap.clear();
    let idx = 0;
    for (const pid of playerIds) {
        cachedPlayerMap.set(pid, idx++);
    }

    const numStars = Math.min(ownedStars.length, MAX_STARS);
    const numPlayers = cachedPlayerMap.size;

    // Pack star data
    const starDataValues: number[] = [];
    for (let i = 0; i < MAX_STARS; i++) {
        if (i < numStars) {
            const s = ownedStars[i];
            const playerIdx = cachedPlayerMap.get(s.ownerId!) ?? 0;
            const totalShips = s.activeShips + s.damagedShips;
            const strength = 0.5 + Math.min(2.0, Math.log2(Math.max(1, totalShips)) * 0.2);
            starDataValues.push(s.x, s.y, playerIdx, strength);
        } else {
            starDataValues.push(0, 0, 0, 0);
        }
    }

    // Pack player colors
    const colorValues: number[] = [];
    for (let p = 0; p < MAX_PLAYERS; p++) {
        let found = false;
        for (const [pid, pIdx] of cachedPlayerMap) {
            if (pIdx === p) {
                const hex = colorUtils.getPlayerColor(pid);
                colorValues.push(
                    ((hex >> 16) & 0xff) / 255,
                    ((hex >> 8) & 0xff) / 255,
                    (hex & 0xff) / 255,
                );
                found = true;
                break;
            }
        }
        if (!found) colorValues.push(0.5, 0.5, 0.5);
    }

    const falloffMap: Record<string, number> = {
        'inverse-square': 0,
        'gaussian': 1,
        'smoothstep': 2,
    };

    const radius = GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 120;
    const falloff = falloffMap[GAME_CONFIG.METABALL_FALLOFF ?? 'inverse-square'] ?? 0;
    const sharpness = GAME_CONFIG.METABALL_BLEND_SHARPNESS ?? 3.0;
    const alpha = GAME_CONFIG.METABALL_ALPHA ?? 0.5;

    // Create or update filter
    if (!metaballFilter) {
        // Build uniform resources for PIXI v8 Filter
        const resources: Record<string, any> = {
            metaballUniforms: {
                uNumStars: { value: numStars, type: 'i32' },
                uNumPlayers: { value: numPlayers, type: 'i32' },
                uRadius: { value: radius, type: 'f32' },
                uFalloff: { value: falloff, type: 'i32' },
                uSharpness: { value: sharpness, type: 'f32' },
                uAlpha: { value: alpha, type: 'f32' },
                uWorldSize: { value: new Float32Array([worldWidth, worldHeight]), type: 'vec2<f32>' },
                uStarData: { value: new Float32Array(starDataValues), type: 'vec4<f32>', size: MAX_STARS },
                uColors: { value: new Float32Array(colorValues), type: 'vec3<f32>', size: MAX_PLAYERS },
            },
        };

        metaballFilter = new PIXI.Filter({
            glProgram: new PIXI.GlProgram({
                vertex: VERTEX_SHADER,
                fragment: FRAGMENT_SHADER,
            }),
            resources,
        });

        backingGraphics.filters = [metaballFilter];
    } else {
        // Update existing uniform values
        const u = (metaballFilter.resources as any).metaballUniforms.uniforms;
        u.uNumStars = numStars;
        u.uNumPlayers = numPlayers;
        u.uRadius = radius;
        u.uFalloff = falloff;
        u.uSharpness = sharpness;
        u.uAlpha = alpha;

        // Update world size
        const ws = u.uWorldSize as Float32Array;
        ws[0] = worldWidth;
        ws[1] = worldHeight;

        // Update star data
        const sd = u.uStarData as Float32Array;
        sd.set(starDataValues);

        // Update colors
        const cols = u.uColors as Float32Array;
        cols.set(colorValues);
    }
}

/** Reset cached state (call on game session change). */
export function resetMetaballCache(): void {
    cachedPlayerMap.clear();
    if (backingGraphics) {
        if (backingGraphics.parent) backingGraphics.parent.removeChild(backingGraphics);
        backingGraphics.destroy();
        backingGraphics = null;
    }
    metaballFilter = null;
}
