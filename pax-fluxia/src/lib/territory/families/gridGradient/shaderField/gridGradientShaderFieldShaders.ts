export const gridGradientShaderFieldBitGl = {
    name: 'grid-gradient-shader-field-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vWorld;
        `,
        main: /* glsl */ `
            vWorld = position;
        `,
    },
    fragment: {
        header: /* glsl */ `#version 300 es
            in vec2 vWorld;

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
            uniform float uBorderOffsetPx;
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

            uniform float uShapeMode;
            uniform float uNeighborMode;

            float saturate(float v) {
                return clamp(v, 0.0, 1.0);
            }

            float unpackOwner(vec2 rg) {
                float lo = floor(rg.x * 255.0 + 0.5);
                float hi = floor(rg.y * 255.0 + 0.5);
                return lo + hi * 256.0;
            }

            vec2 cellUv(vec2 cell) {
                return (cell + 0.5) / max(vec2(1.0), uGridSize);
            }

            vec4 readOwnerTex(vec2 cell) {
                if (
                    cell.x < 0.0 ||
                    cell.y < 0.0 ||
                    cell.x >= uGridSize.x ||
                    cell.y >= uGridSize.y
                ) {
                    return vec4(0.0);
                }
                return texture(uOwnerTex, cellUv(cell));
            }

            vec4 readMetricsTex(vec2 cell) {
                if (
                    cell.x < 0.0 ||
                    cell.y < 0.0 ||
                    cell.x >= uGridSize.x ||
                    cell.y >= uGridSize.y
                ) {
                    return vec4(0.0);
                }
                return texture(uMetricsTex, cellUv(cell));
            }

            vec4 readPalette(float ownerIndex) {
                if (ownerIndex <= 0.5) return vec4(0.0);
                float x = (ownerIndex + 0.5) / max(1.0, uPaletteSize);
                return texture(uPaletteTex, vec2(x, 0.5));
            }

            float circleMask(vec2 p, float radius, float softness) {
                float d = length(p);
                return 1.0 - smoothstep(radius, radius + softness, d);
            }

            float squareMask(vec2 p, float halfSize, float softness) {
                float d = max(abs(p.x), abs(p.y));
                return 1.0 - smoothstep(halfSize, halfSize + softness, d);
            }

            float hash12(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            float valueNoise2d(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash12(i);
                float b = hash12(i + vec2(1.0, 0.0));
                float c = hash12(i + vec2(0.0, 1.0));
                float d = hash12(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
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
                return noiseMask(p, radius, softness, seed);
            }

            float roleAllowsSide(float role, float side) {
                if (role < 0.5) return 0.0;
                if (role > 2.5 && role < 3.5 && side < 0.5) return 0.0;
                if (role > 3.5 && role < 4.5 && side > 0.5) return 0.0;
                return 1.0;
            }

            vec4 alphaOver(vec4 under, vec4 over) {
                float a = over.a + under.a * (1.0 - over.a);
                if (a <= 0.0001) return vec4(0.0);
                vec3 rgb =
                    (over.rgb * over.a + under.rgb * under.a * (1.0 - over.a)) / a;
                return vec4(rgb, a);
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
                if (uBorderOffsetPx > 0.001 && distanceBand <= 0.001) {
                    return vec4(0.0);
                }

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
                    vec2 ownerSalt = vec2(prevOwner * 0.071, nextOwner * 0.113);
                    float broadPhase = valueNoise2d(cell * 0.11 + ownerSalt);
                    float midPhase = valueNoise2d(cell * 0.29 + ownerSalt.yx + vec2(17.0, 43.0));
                    float finePhase = hash12(cell + ownerSalt * 97.0);
                    float phase = (broadPhase * 0.58 + midPhase * 0.32 + finePhase * 0.10) * 6.2831853;
                    float amplitude = mix(0.72, 1.0, valueNoise2d(cell * 0.17 + ownerSalt + vec2(5.0, 11.0)));
                    pulse += sin(uTimeSec * uPulseSpeed + phase) * uPulseStrength * amplitude;
                }

                float alphaBoost = mix(uEdgeAlphaBoost, uInteriorAlphaBoost, distanceBand);
                float alpha = mask * color.a * uFillAlpha * alphaBoost;
                vec3 rgb = color.rgb * pulse;

                if (uColorMixPower != 1.0) {
                    rgb = pow(max(rgb, vec3(0.0)), vec3(max(0.01, uColorMixPower)));
                }

                if (uGlowStrength > 0.0) {
                    rgb += color.rgb * mask * uGlowStrength;
                }

                return vec4(rgb, alpha);
            }
        `,
        main: /* glsl */ `
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

            if (accum.a <= 0.001) discard;
            outColor = vec4(accum.rgb * accum.a, accum.a);
        `,
    },
} as const;
