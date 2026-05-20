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
            uniform float uTransitionMode;
            uniform float uTransitionScaleMin;
            uniform float uFlipWindow;
            uniform float uFieldDriftPx;
            uniform float uFieldDriftSpeed;
            uniform float uGlowStrength;
            uniform float uInteriorAlphaBoost;
            uniform float uEdgeAlphaBoost;
            uniform float uColorMixPower;
            uniform float uBorderBlendRangePx;
            uniform float uBorderBlendStrength;

            uniform float uShapeMode;
            uniform float uNeighborMode;
            uniform float uDebugMode;

            float saturate(float v) {
                return clamp(v, 0.0, 1.0);
            }

            float hash21(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            float valueNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                float a = hash21(i);
                float b = hash21(i + vec2(1.0, 0.0));
                float c = hash21(i + vec2(0.0, 1.0));
                float d = hash21(i + vec2(1.0, 1.0));
                return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
            }

            float pulseField(vec2 cell) {
                float phase = uTimeSec * uPulseSpeed;
                float broad = valueNoise(cell * 0.11 + vec2(phase * 0.055, -phase * 0.037));
                float detail = valueNoise(cell * 0.31 + vec2(-phase * 0.021, phase * 0.044));
                return sin(phase + (broad * 0.7 + detail * 0.3) * 6.2831853 + cell.x * 0.173 + cell.y * 0.219);
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

            float transitionT(float flipTime) {
                if (uTransitionMode < 0.5) {
                    return step(flipTime, uProgress);
                }
                float transitionWindow = max(0.0001, uFlipWindow);
                return smoothstep(flipTime - transitionWindow, flipTime + transitionWindow, uProgress);
            }

            float circleMask(vec2 p, float radius, float softness) {
                float d = length(p);
                return 1.0 - smoothstep(radius, radius + softness, d);
            }

            float squareMask(vec2 p, float halfSize, float softness) {
                float d = max(abs(p.x), abs(p.y));
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
                float softness = max(0.01, max(radius * uMarkSoftness, uEdgeSoftnessPx));
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

            float effectiveOwnerAt(vec2 cell) {
                vec4 ownerPacked = readOwnerTex(cell);
                vec4 metrics = readMetricsTex(cell);
                float role = floor(metrics.b * 255.0 + 0.5);
                if (role < 0.5) return 0.0;

                float prevOwner = unpackOwner(ownerPacked.rg);
                float nextOwner = unpackOwner(ownerPacked.ba);
                float prevAllowed = roleAllowsSide(role, 0.0);
                float nextAllowed = roleAllowsSide(role, 1.0);
                if (prevAllowed <= 0.5) return nextOwner;
                if (nextAllowed <= 0.5) return prevOwner;
                if (prevOwner <= 0.5) return nextOwner;
                if (nextOwner <= 0.5) return prevOwner;
                if (abs(prevOwner - nextOwner) <= 0.5) return nextOwner;
                return transitionT(metrics.g) < 0.5 ? prevOwner : nextOwner;
            }

            void accumulateOpposingColor(inout vec4 accum, inout float count, vec2 cell, vec2 offset, float currentOwner) {
                float owner = effectiveOwnerAt(cell + offset);
                if (owner > 0.5 && abs(owner - currentOwner) > 0.5) {
                    vec4 color = readPalette(owner);
                    accum.rgb += color.rgb;
                    accum.a += color.a;
                    count += 1.0;
                }
            }

            vec4 averageOpposingColor(vec2 cell, float currentOwner) {
                vec4 accum = vec4(0.0);
                float count = 0.0;
                accumulateOpposingColor(accum, count, cell, vec2( 1.0,  0.0), currentOwner);
                accumulateOpposingColor(accum, count, cell, vec2(-1.0,  0.0), currentOwner);
                accumulateOpposingColor(accum, count, cell, vec2( 0.0,  1.0), currentOwner);
                accumulateOpposingColor(accum, count, cell, vec2( 0.0, -1.0), currentOwner);
                accumulateOpposingColor(accum, count, cell, vec2( 1.0,  1.0), currentOwner);
                accumulateOpposingColor(accum, count, cell, vec2( 1.0, -1.0), currentOwner);
                accumulateOpposingColor(accum, count, cell, vec2(-1.0,  1.0), currentOwner);
                accumulateOpposingColor(accum, count, cell, vec2(-1.0, -1.0), currentOwner);
                if (count <= 0.5) return vec4(0.0);
                return accum / count;
            }

            vec4 alphaOver(vec4 under, vec4 over) {
                float a = over.a + under.a * (1.0 - over.a);
                if (a <= 0.0001) return vec4(0.0);
                vec3 rgb =
                    (over.rgb * over.a + under.rgb * under.a * (1.0 - over.a)) / a;
                return vec4(rgb, a);
            }

            vec4 styleContribution(vec4 color, float mask, float alphaFactor, float distanceBand, float pulse) {
                if (mask <= 0.001 || color.a <= 0.001 || alphaFactor <= 0.001) {
                    return vec4(0.0);
                }
                float alphaBoost = mix(uEdgeAlphaBoost, uInteriorAlphaBoost, distanceBand);
                float alpha = mask * color.a * alphaFactor * uFillAlpha * alphaBoost;
                if (alpha <= 0.001) return vec4(0.0);
                vec3 rgb = color.rgb * pulse;

                if (uColorMixPower != 1.0) {
                    rgb = pow(max(rgb, vec3(0.0)), vec3(max(0.01, uColorMixPower)));
                }

                if (uGlowStrength > 0.0) {
                    rgb += color.rgb * mask * uGlowStrength;
                }

                return vec4(rgb, alpha);
            }

            vec4 applyBorderBlend(vec4 color, vec2 cell, float currentOwner, float borderDistancePx, float radius) {
                if (color.a <= 0.001 || uBorderBlendStrength <= 0.001 || currentOwner <= 0.5) {
                    return color;
                }
                float borderT;
                if (uBorderBlendRangePx <= 0.001) {
                    borderT = 1.0 - step(radius, borderDistancePx);
                } else {
                    borderT = 1.0 - smoothstep(radius, radius + uBorderBlendRangePx, borderDistancePx);
                }
                borderT *= uBorderBlendStrength;
                if (borderT <= 0.001) return color;

                vec4 opposing = averageOpposingColor(cell, currentOwner);
                if (opposing.a <= 0.001) return color;
                color.rgb = mix(color.rgb, opposing.rgb, saturate(borderT));
                return color;
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
                float borderDistancePx = metrics.a * 255.0;
                if (borderDistancePx < uBorderOffsetPx) return vec4(0.0);
                float noiseSeed = hash21(cell + vec2(prevOwner * 0.13, nextOwner * 0.17));

                float t = transitionT(flipTime);

                float prevAllowed = roleAllowsSide(role, 0.0);
                float nextAllowed = roleAllowsSide(role, 1.0);
                vec4 prevColor = readPalette(prevOwner) * prevAllowed;
                vec4 nextColor = readPalette(nextOwner) * nextAllowed;

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

                float pulse = 1.0;
                if (uPulseStrength > 0.0) {
                    pulse += pulseField(cell + vec2(noiseSeed * 13.0, noiseSeed * 7.0)) * uPulseStrength;
                }

                vec4 accum = vec4(0.0);
                float currentOwner = effectiveOwnerAt(cell);
                float scaleMin = saturate(uTransitionScaleMin);

                if ((role > 0.5 && role < 1.5) || abs(prevOwner - nextOwner) <= 0.5) {
                    vec4 color = nextColor.a > 0.001 ? nextColor : prevColor;
                    float mask = markMask(worldPos - center, radius, noiseSeed);
                    accum = styleContribution(color, mask, 1.0, distanceBand, pulse);
                } else {
                    if (prevColor.a > 0.001) {
                        float prevRadius = radius * mix(1.0, scaleMin, t);
                        float prevMask = markMask(worldPos - center, prevRadius, noiseSeed);
                        accum = alphaOver(
                            accum,
                            styleContribution(prevColor, prevMask, 1.0 - t, distanceBand, pulse)
                        );
                    }
                    if (nextColor.a > 0.001) {
                        float nextRadius = radius * mix(scaleMin, 1.0, t);
                        float nextMask = markMask(worldPos - center, nextRadius, fract(noiseSeed + 0.37));
                        accum = alphaOver(
                            accum,
                            styleContribution(nextColor, nextMask, t, distanceBand, pulse)
                        );
                    }
                }

                if (uDebugMode > 1.5 && uDebugMode < 2.5) {
                    float hue = fract(nextOwner / max(1.0, uPaletteSize));
                    return vec4(vec3(hue, 1.0 - hue, 0.5 + 0.5 * sin(hue * 6.2831)), accum.a);
                }
                if (uDebugMode > 2.5 && uDebugMode < 3.5) return vec4(vec3(distanceBand), accum.a);
                if (uDebugMode > 3.5 && uDebugMode < 4.5) return vec4(vec3(flipTime), accum.a);
                if (uDebugMode > 4.5 && uDebugMode < 5.5) return vec4(vec3(role / 4.0), accum.a);

                return applyBorderBlend(accum, cell, currentOwner, borderDistancePx, radius);
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

            if (uDebugMode > 0.5 && uDebugMode < 1.5) {
                vec2 grid = abs(fract((worldPos - uWorldOrigin) / uSpacingPx) - 0.5);
                float line = 1.0 - smoothstep(0.47, 0.50, max(grid.x, grid.y));
                accum = alphaOver(accum, vec4(0.2, 0.8, 1.0, line * 0.35));
            }

            if (accum.a <= 0.001) discard;
            outColor = vec4(accum.rgb * accum.a, accum.a);
        `,
    },
} as const;
