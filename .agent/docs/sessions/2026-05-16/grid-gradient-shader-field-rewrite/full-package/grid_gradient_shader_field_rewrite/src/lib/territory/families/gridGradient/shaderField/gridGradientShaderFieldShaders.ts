export const GRID_GRADIENT_SHADER_FIELD_VERTEX = `
precision mediump float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;

varying vec2 vUv;
varying vec2 vWorld;

void main(void) {
    vUv = aTextureCoord;
    vWorld = aVertexPosition;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
}
`;

export const GRID_GRADIENT_SHADER_FIELD_FRAGMENT = `
precision mediump float;

varying vec2 vUv;
varying vec2 vWorld;

uniform sampler2D uOwnerTex;
uniform sampler2D uMetricsTex;
uniform sampler2D uPaletteTex;

uniform vec2 uGridSize;
uniform vec2 uWorldOrigin;
uniform vec2 uWorldSize;
uniform float uSpacingPx;
uniform float uPaletteSize;

uniform float uProgress;
uniform float uTimeSec;
uniform float uFillAlpha;
uniform float uCenterSizePx;
uniform float uEdgeSizePx;
uniform float uCurvePower;
uniform float uMarkSoftness;
uniform float uEdgeSoftnessPx;
uniform float uNoiseStrength;
uniform float uPulseStrength;
uniform float uPulseSpeed;
uniform float uFieldDriftPx;
uniform float uFieldDriftSpeed;
uniform float uGlowStrength;
uniform float uInteriorAlphaBoost;
uniform float uEdgeAlphaBoost;
uniform float uColorMixPower;

uniform float uShapeMode;       // 0 circle, 1 square, 2 diamond, 3 noise
uniform float uNeighborMode;    // 0 center, 1 cross, 2 eight
uniform float uDebugMode;       // 0 off, 1 cell_grid, 2 owner_index, 3 distance_band, 4 flip_time, 5 role

const float ROLE_OUTSIDE = 0.0;
const float ROLE_NATIVE = 1.0;
const float ROLE_DISPOSSESSED = 2.0;
const float ROLE_EMERGENT = 3.0;
const float ROLE_VACATING = 4.0;

float saturate(float v) {
    return clamp(v, 0.0, 1.0);
}

float unpackOwner(vec2 rg) {
    float lo = floor(rg.x * 255.0 + 0.5);
    float hi = floor(rg.y * 255.0 + 0.5);
    return lo + hi * 256.0;
}

vec2 cellUv(vec2 cell) {
    return (cell + 0.5) / uGridSize;
}

vec4 readOwnerTex(vec2 cell) {
    if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uGridSize.x || cell.y >= uGridSize.y) {
        return vec4(0.0);
    }
    return texture2D(uOwnerTex, cellUv(cell));
}

vec4 readMetricsTex(vec2 cell) {
    if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uGridSize.x || cell.y >= uGridSize.y) {
        return vec4(0.0);
    }
    return texture2D(uMetricsTex, cellUv(cell));
}

vec4 readPalette(float ownerIndex) {
    if (ownerIndex <= 0.5) return vec4(0.0);
    float x = (ownerIndex + 0.5) / max(1.0, uPaletteSize);
    return texture2D(uPaletteTex, vec2(x, 0.5));
}

float hash11(float x) {
    return fract(sin(x * 127.1) * 43758.5453123);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float circleMask(vec2 p, float radius, float softness) {
    float d = length(p);
    return 1.0 - smoothstep(radius, radius + softness, d);
}

float squareMask(vec2 p, float halfSize, float softness) {
    float d = max(abs(p.x), abs(p.y));
    return 1.0 - smoothstep(halfSize, halfSize + softness, d);
}

float diamondMask(vec2 p, float halfSize, float softness) {
    float d = abs(p.x) + abs(p.y);
    return 1.0 - smoothstep(halfSize, halfSize + softness, d);
}

float noiseMask(vec2 p, float radius, float softness, float seed) {
    float a = atan(p.y, p.x);
    float n = 0.0;
    n += sin(a * 3.0 + seed * 6.2831) * 0.30;
    n += sin(a * 7.0 + seed * 19.173) * 0.20;
    n += sin(a * 11.0 + seed * 41.17) * 0.10;
    float r = radius * (1.0 + n * uNoiseStrength);
    return 1.0 - smoothstep(r, r + softness, length(p));
}

float markMask(vec2 p, float radius, float seed) {
    float softness = max(0.01, radius * uMarkSoftness + uEdgeSoftnessPx);
    if (uShapeMode < 0.5) return circleMask(p, radius, softness);
    if (uShapeMode < 1.5) return squareMask(p, radius, softness);
    if (uShapeMode < 2.5) return diamondMask(p, radius, softness);
    return noiseMask(p, radius, softness, seed);
}

float roleAllowsSide(float role, float side) {
    // side 0 = prev, side 1 = next
    if (role < 0.5) return 0.0;
    if (role > 2.5 && role < 3.5 && side < 0.5) return 0.0; // emergent no prev
    if (role > 3.5 && role < 4.5 && side > 0.5) return 0.0; // vacating no next
    return 1.0;
}

vec4 shadeCell(vec2 cell, vec2 worldPos) {
    vec4 ownerPacked = readOwnerTex(cell);
    vec4 metrics = readMetricsTex(cell);

    float role = floor(metrics.b * 255.0 + 0.5);
    if (role < 0.5) return vec4(0.0);

    float prevOwner = unpackOwner(ownerPacked.rg);
    float nextOwner = unpackOwner(ownerPacked.ba);
    float flipTime = metrics.g;
    float distanceBand = metrics.r;
    float noiseSeed = metrics.a;

    float blendWindow = 0.08;
    float t = smoothstep(flipTime - blendWindow, flipTime + blendWindow, uProgress);

    float prevAllowed = roleAllowsSide(role, 0.0);
    float nextAllowed = roleAllowsSide(role, 1.0);
    vec4 prevColor = readPalette(prevOwner) * prevAllowed;
    vec4 nextColor = readPalette(nextOwner) * nextAllowed;
    vec4 color = mix(prevColor, nextColor, t);

    if (color.a <= 0.001) return vec4(0.0);

    float distanceT = pow(saturate(distanceBand), max(0.01, uCurvePower));
    float sizePx = mix(uEdgeSizePx, uCenterSizePx, distanceT);
    float radius = sizePx * 0.5;

    vec2 center = uWorldOrigin + (cell + 0.5) * uSpacingPx;
    float jitter = (noiseSeed - 0.5) * uSpacingPx * 0.12;
    center += vec2(jitter, -jitter * 0.37);

    if (uFieldDriftPx > 0.0) {
        float phase = uTimeSec * uFieldDriftSpeed + noiseSeed * 6.2831;
        center += vec2(cos(phase), sin(phase * 1.17)) * uFieldDriftPx;
    }

    float mask = markMask(worldPos - center, radius, noiseSeed);
    if (mask <= 0.001) return vec4(0.0);

    float pulse = 1.0;
    if (uPulseStrength > 0.0) {
        pulse += sin(uTimeSec * uPulseSpeed + noiseSeed * 6.2831) * uPulseStrength;
    }

    float alphaBoost = mix(uEdgeAlphaBoost, uInteriorAlphaBoost, distanceBand);
    float alpha = mask * color.a * uFillAlpha * alphaBoost;
    vec3 rgb = color.rgb * pulse;

    if (uGlowStrength > 0.0) {
        rgb += color.rgb * mask * uGlowStrength;
    }

    if (uDebugMode > 1.5 && uDebugMode < 2.5) {
        float hue = fract(prevOwner / max(1.0, uPaletteSize));
        return vec4(vec3(hue, 1.0 - hue, 0.5 + 0.5 * sin(hue * 6.2831)), alpha);
    }
    if (uDebugMode > 2.5 && uDebugMode < 3.5) return vec4(vec3(distanceBand), alpha);
    if (uDebugMode > 3.5 && uDebugMode < 4.5) return vec4(vec3(flipTime), alpha);
    if (uDebugMode > 4.5 && uDebugMode < 5.5) return vec4(vec3(role / 4.0), alpha);

    return vec4(rgb, alpha);
}

vec4 alphaOver(vec4 under, vec4 over) {
    float a = over.a + under.a * (1.0 - over.a);
    if (a <= 0.0001) return vec4(0.0);
    vec3 rgb = (over.rgb * over.a + under.rgb * under.a * (1.0 - over.a)) / a;
    return vec4(rgb, a);
}

void main(void) {
    vec2 worldPos = vWorld;
    vec2 cellFloat = floor((worldPos - uWorldOrigin) / uSpacingPx);

    vec4 accum = vec4(0.0);

    accum = alphaOver(accum, shadeCell(cellFloat, worldPos));

    if (uNeighborMode > 0.5) {
        accum = alphaOver(accum, shadeCell(cellFloat + vec2( 1.0,  0.0), worldPos));
        accum = alphaOver(accum, shadeCell(cellFloat + vec2(-1.0,  0.0), worldPos));
        accum = alphaOver(accum, shadeCell(cellFloat + vec2( 0.0,  1.0), worldPos));
        accum = alphaOver(accum, shadeCell(cellFloat + vec2( 0.0, -1.0), worldPos));
    }

    if (uNeighborMode > 1.5) {
        accum = alphaOver(accum, shadeCell(cellFloat + vec2( 1.0,  1.0), worldPos));
        accum = alphaOver(accum, shadeCell(cellFloat + vec2( 1.0, -1.0), worldPos));
        accum = alphaOver(accum, shadeCell(cellFloat + vec2(-1.0,  1.0), worldPos));
        accum = alphaOver(accum, shadeCell(cellFloat + vec2(-1.0, -1.0), worldPos));
    }

    if (uDebugMode > 0.5 && uDebugMode < 1.5) {
        vec2 grid = abs(fract((worldPos - uWorldOrigin) / uSpacingPx) - 0.5);
        float line = 1.0 - smoothstep(0.47, 0.50, max(grid.x, grid.y));
        accum = alphaOver(accum, vec4(0.2, 0.8, 1.0, line * 0.35));
    }

    if (accum.a <= 0.001) discard;
    gl_FragColor = accum;
}
`;
