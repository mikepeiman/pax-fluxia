// ============================================================================
// StarRenderer — Star circles, type icons, labels, glow, hex borders
// ============================================================================
//
// Extracted from GameCanvas.svelte ~lines 1027-1219 + helper functions.
// Renders:
//   1. Star circles (owner color border + type color fill)
//   2. Geometric type icons (triangle, square, pentagon, etc.)
//   3. Selection highlight (hex border)
//   4. Conquest flash overlay
//   5. Star labels (ID, active ships, damaged ships) with leash lines
//
// Drawn into:
//   - starsContainer (star graphics)
//   - labelsContainer (labels)
// ============================================================================

import * as PIXI from 'pixi.js';
import type { StarState } from '$lib/types/game.types';
import { STAR_TYPE_STATS } from '@pax/common';
import type { StarType } from '@pax/common';
import type { ColorUtils } from './RenderContext';
import { GAME_CONFIG } from '$lib/config/game.config';
import { measurePerf, recordPerfDuration } from '$lib/perf/perfProbe';
import { getPortalGroupHexColor } from '$lib/utils/portalStyling';

// ── Star Type → Polygon Sides ───────────────────────────────────────────────
// green=3 (attack), red=4 (defense), yellow=5 (prod),
// purple=6 (repair), blue=7 (move), grey=0 (circle)

const TYPE_SIDES: Record<string, number> = {
    green: 3,
    red: 4,
    yellow: 5,
    purple: 6,
    blue: 7,
    grey: 0,
    portal: 0,
};

const STAR_VISUAL_BUCKET_MS = 96;

function resolveStarVisualConfigKey(): string {
    return [
        GAME_CONFIG.STAR_RENDER_RADIUS ?? '',
        GAME_CONFIG.STAR_SHAPE_MODE ?? '',
        GAME_CONFIG.STAR_CORNER_RADIUS ?? '',
        GAME_CONFIG.STAR_RING_RADIUS ?? '',
        GAME_CONFIG.STAR_RING_WIDTH ?? '',
        GAME_CONFIG.STAR_RING_ALPHA ?? '',
        GAME_CONFIG.STAR_RING_SATURATION ?? '',
        GAME_CONFIG.STAR_RING_LIGHTNESS ?? '',
        GAME_CONFIG.STAR_ICON_SCALE ?? '',
    ].join('|');
}

function buildStarVisualKey(params: {
    star: StarState;
    effectiveOwner: string | null;
    isActive: boolean;
    radius: number;
    flashBucket: number;
    animationBucket: number;
    visualConfigKey: string;
}): string {
    const {
        star,
        effectiveOwner,
        isActive,
        radius,
        flashBucket,
        animationBucket,
        visualConfigKey,
    } = params;
    return [
        star.x,
        star.y,
        radius,
        effectiveOwner ?? '',
        star.starType,
        star.portalGroup ?? '',
        isActive ? 1 : 0,
        flashBucket,
        animationBucket,
        visualConfigKey,
    ].join('|');
}

function shouldAnimateStarVisual(params: {
    isActive: boolean;
    isPortalStar: boolean;
}): boolean {
    return params.isActive || params.isPortalStar;
}

// ── Polygon Geometry Helpers ────────────────────────────────────────────────

/**
 * Generate vertices for a regular polygon centered at (cx, cy).
 * Returns array of [x, y] pairs.
 */
function regularPolygonVertices(
    cx: number, cy: number, radius: number, sides: number,
): [number, number][] {
    const verts: [number, number][] = [];
    const startAngle = -Math.PI / 2; // top-aligned
    for (let i = 0; i < sides; i++) {
        const angle = startAngle + (2 * Math.PI / sides) * i;
        verts.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
    return verts;
}

/**
 * Apply Chaikin corner-cutting to smooth polygon vertices.
 * Each iteration replaces each edge with two points at 25%/75% along it.
 * `roundness` (0-1) controls how much to cut: 0=no smoothing, 1=full Chaikin.
 */
function chaikinSmooth(
    verts: [number, number][], iterations: number, roundness: number,
): [number, number][] {
    if (iterations <= 0 || roundness <= 0) return verts;
    const cutRatio = 0.25 * roundness;
    let result = verts;
    for (let iter = 0; iter < iterations; iter++) {
        const smoothed: [number, number][] = [];
        for (let i = 0; i < result.length; i++) {
            const curr = result[i];
            const next = result[(i + 1) % result.length];
            smoothed.push([
                curr[0] + (next[0] - curr[0]) * cutRatio,
                curr[1] + (next[1] - curr[1]) * cutRatio,
            ]);
            smoothed.push([
                curr[0] + (next[0] - curr[0]) * (1 - cutRatio),
                curr[1] + (next[1] - curr[1]) * (1 - cutRatio),
            ]);
        }
        result = smoothed;
    }
    return result;
}

/**
 * Draw a filled+stroked rounded polygon (or circle if sides=0).
 */
function drawShapePath(
    g: PIXI.Graphics,
    cx: number, cy: number, radius: number,
    sides: number, cornerRadius: number,
    fill: { color: number; alpha: number },
    stroke?: { color: number; width: number; alpha: number },
): void {
    if (sides === 0 || sides > 20) {
        // Circle fallback
        g.beginPath();
        g.circle(cx, cy, radius);
        g.fill(fill);
        if (stroke) g.stroke(stroke);
        return;
    }
    const raw = regularPolygonVertices(cx, cy, radius, sides);
    const smoothed = chaikinSmooth(raw, 2, cornerRadius);
    g.beginPath();
    g.moveTo(smoothed[0][0], smoothed[0][1]);
    for (let i = 1; i < smoothed.length; i++) {
        g.lineTo(smoothed[i][0], smoothed[i][1]);
    }
    g.closePath();
    g.fill(fill);
    if (stroke) g.stroke(stroke);
}

function drawPortalArc(
    g: PIXI.Graphics,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    stroke: { color: number; width: number; alpha: number },
): void {
    g.beginPath();
    g.arc(cx, cy, radius, startAngle, endAngle);
    g.stroke(stroke);
}

function drawPortalStar(
    g: PIXI.Graphics,
    cx: number,
    cy: number,
    radius: number,
    portalColor: number,
    timeSeconds: number,
): void {
    const shellColor = 0x050816;
    const innerShellColor = 0x0b1120;
    const coreColor = 0x010308;
    const phaseOuter = timeSeconds * 1.6;
    const phaseInner = -timeSeconds * 1.2 + Math.PI / 2;

    g.beginPath();
    g.circle(cx, cy, radius);
    g.fill({ color: shellColor, alpha: 0.98 });
    g.stroke({ color: portalColor, width: 3, alpha: 0.95 });

    g.beginPath();
    g.circle(cx, cy, radius * 0.74);
    g.fill({ color: innerShellColor, alpha: 0.95 });
    g.stroke({ color: portalColor, width: 1.4, alpha: 0.45 });

    g.beginPath();
    g.circle(cx, cy, radius * 0.26);
    g.fill({ color: portalColor, alpha: 0.28 });

    g.beginPath();
    g.circle(cx, cy, radius * 0.14);
    g.fill({ color: coreColor, alpha: 0.95 });

    drawPortalArc(g, cx, cy, radius * 0.56, phaseOuter, phaseOuter + Math.PI * 1.18, {
        color: portalColor,
        width: Math.max(1.6, radius * 0.15),
        alpha: 0.82,
    });
    drawPortalArc(g, cx, cy, radius * 0.37, phaseInner, phaseInner + Math.PI * 1.12, {
        color: 0xffffff,
        width: Math.max(1.1, radius * 0.1),
        alpha: 0.42,
    });
}

// ── State Caches (managed by StarRenderer) ──────────────────────────────────

export interface StarRenderCaches {
    starGraphics: Map<string, PIXI.Graphics>;
    starLabels: Map<string, StarLabelView>;
    starVisualKeys?: Map<string, string>;
}

export type StarLabelMode = 'full' | 'compact' | 'hidden';

export interface StarLabelView {
    container: PIXI.Container;
    leashGraphics: PIXI.Graphics;
    pillBg: PIXI.Graphics;
    idText: PIXI.Text;
    sepText: PIXI.Text;
    activeText: PIXI.Text;
    slashText: PIXI.Text;
    damagedText: PIXI.Text;
    lastMode?: StarLabelMode;
    lastTextKey?: string;
    lastStyleKey?: string;
    lastLayoutKey?: string;
    lastBackgroundKey?: string;
    lastLeashKey?: string;
    lastVisibilityKey?: string;
    lastAlphaKey?: string;
    lastPositionX?: number;
    lastPositionY?: number;
    idWidth: number;
    sepWidth: number;
    activeWidth: number;
    slashWidth: number;
    damagedWidth: number;
}

// Per-star interpolation cache for smooth number transitions
interface LabelLerp {
    activeDisplay: number;
    damagedDisplay: number;
    activeTarget: number;
    damagedTarget: number;
    lastUpdateMs: number;
    fadeAlpha: number; // For 'fade' mode: 1.0 = fully visible, flashes low on change
}
const labelLerps = new Map<string, LabelLerp>();

export interface StarRenderState {
    /** Currently selected star */
    activeStarId: string | null;
    /** Currently being dragged from */
    dragSourceId: string | null;
    /** Pending conquest color transitions */
    pendingConquests: Map<string, { previousOwner: string; transitionTime: number }>;
    /** Conquest flash effects */
    conquestFlashes: Map<string, { startTime: number; duration: number }>;
    /** Game clock in ms — pause-aware, from FXClock. Use instead of performance.now(). */
    gameNowMs: number;
    /** Current stage scale used for label density LOD decisions. */
    stageScale: number;
}

// ── Rendering Functions ─────────────────────────────────────────────────────

/**
 * Render all stars: circles, icons, labels, selection highlights.
 */
const STAR_LABEL_HIDE_SCALE = 0.42;
const STAR_LABEL_COMPACT_SCALE = 0.68;
const STAR_LABEL_COMPACT_SCALE_FACTOR = 0.82;
const STAR_LABEL_CACHE_RESOLUTION = 2;

function resolveStarLabelMode(
    stageScale: number,
    isImportant: boolean,
): StarLabelMode {
    if (isImportant) return 'full';
    if (stageScale <= STAR_LABEL_HIDE_SCALE) return 'hidden';
    if (stageScale <= STAR_LABEL_COMPACT_SCALE) return 'compact';
    return 'full';
}

function applyTextStyle(
    text: PIXI.Text,
    fontFamily: string,
    fontSize: number,
): void {
    text.style.fontFamily = fontFamily;
    text.style.fontSize = fontSize;
}

export function renderStars(
    stars: StarState[],
    starsContainer: PIXI.Container,
    labelsContainer: PIXI.Container,
    caches: StarRenderCaches,
    state: StarRenderState,
    colorUtils: ColorUtils,
): void {
    const starVisualKeys = caches.starVisualKeys;
    const globalAnimationBucket = Math.floor(state.gameNowMs / STAR_VISUAL_BUCKET_MS);
    const visualConfigKey = resolveStarVisualConfigKey();
    const ownerColorCache = new Map<string | null, number>();
    const labelAngle = (GAME_CONFIG.STAR_LABEL_ANGLE ?? 35) * Math.PI / 180;
    const labelDirectionX = Math.cos(labelAngle);
    const labelDirectionY = Math.sin(labelAngle);
    const baseLabelDist = GAME_CONFIG.STAR_LABEL_DISTANCE ?? 55;
    const labelScaleBase = GAME_CONFIG.STAR_LABEL_SCALE ?? 1.0;
    const fullLabelScale = labelScaleBase;
    const compactLabelScale = labelScaleBase * STAR_LABEL_COMPACT_SCALE_FACTOR;
    const fontFamily = GAME_CONFIG.STAR_LABEL_FONT_FAMILY ?? 'JetBrains Mono, monospace';
    const idFontSizeBase = GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE ?? 13;
    const activeFontSizeBase = GAME_CONFIG.STAR_LABEL_FONT_SIZE ?? 14;
    const damagedFontSizeBase = GAME_CONFIG.STAR_LABEL_DAMAGED_FONT_SIZE ?? 12;
    const separatorFontSizeBase = 12;
    const slashFontSizeBase = 11;
    const padBase = GAME_CONFIG.STAR_LABEL_PAD_X ?? 4;
    const padYBase = GAME_CONFIG.STAR_LABEL_PAD_Y ?? 2;
    const gapBase = GAME_CONFIG.STAR_LABEL_GAP ?? 2;
    const fullPad = padBase;
    const fullPadY = padYBase;
    const fullGap = gapBase;
    const compactPad = Math.max(2, padBase * 0.75);
    const compactPadY = Math.max(1, padYBase * 0.75);
    const compactGap = Math.max(1, gapBase * 0.5);
    const fullLayout = GAME_CONFIG.STAR_LABEL_LAYOUT ?? 'horizontal';
    const lineHeight = GAME_CONFIG.STAR_LABEL_LINE_HEIGHT ?? 18;
    const showIdBase = GAME_CONFIG.STAR_LABEL_SHOW_ID ?? true;
    const showActiveBase = GAME_CONFIG.STAR_LABEL_SHOW_ACTIVE ?? true;
    const showDamagedBase = GAME_CONFIG.STAR_LABEL_SHOW_DAMAGED ?? true;
    const transMs = GAME_CONFIG.NUMBER_TRANSITION_MS ?? 120;
    const animMode = GAME_CONFIG.LABEL_ANIM_MODE ?? 'rolling';
    const labelLeashEnabled = Boolean(GAME_CONFIG.STAR_LABEL_LEASH);
    const bgAlpha = GAME_CONFIG.STAR_LABEL_BG_ALPHA ?? 0.75;
    const borderAlpha = GAME_CONFIG.STAR_LABEL_BORDER_ALPHA ?? 0.5;
    const borderWidth = GAME_CONFIG.STAR_LABEL_BORDER_WIDTH ?? 1;
    const colorMode = GAME_CONFIG.STAR_LABEL_COLOR_MODE ?? 'player';
    const universalFillAlpha = GAME_CONFIG.STAR_LABEL_UNIVERSAL_A ?? 0.75;
    const universalLabelPalette =
        colorMode === 'player'
            ? null
            : {
                  fillCol: colorUtils.hslToHex(
                      GAME_CONFIG.STAR_LABEL_UNIVERSAL_H ?? 220,
                      (GAME_CONFIG.STAR_LABEL_UNIVERSAL_S ?? 30) / 100,
                      (GAME_CONFIG.STAR_LABEL_UNIVERSAL_L ?? 25) / 100,
                  ),
                  borderCol: colorUtils.hslToHex(
                      GAME_CONFIG.STAR_LABEL_UNIVERSAL_H ?? 220,
                      (GAME_CONFIG.STAR_LABEL_UNIVERSAL_S ?? 30) / 100,
                      Math.min(
                          1,
                          ((GAME_CONFIG.STAR_LABEL_UNIVERSAL_L ?? 25) / 100) + 0.2,
                      ),
                  ),
                  fillAlpha: universalFillAlpha,
              };
    const playerLabelPaletteCache = new Map<number, { fillCol: number; borderCol: number }>();
    let starVisualRedrawCount = 0;
    let starVisualDurationMs = 0;
    let labelPassCount = 0;
    let labelDurationMs = 0;
    let labelDirtyCount = 0;
    let labelCacheRefreshCount = 0;
    let labelCacheRefreshDurationMs = 0;
    stars.forEach((star) => {
        let graphics = caches.starGraphics.get(star.id);

        if (!graphics) {
            graphics = new PIXI.Graphics();
            starsContainer.addChild(graphics);
            caches.starGraphics.set(star.id, graphics);
        }

        // Delayed star color change: use previous owner until ships arrive
        let effectiveOwner = star.ownerId;
        const pending = state.pendingConquests.get(star.id);
        if (pending) {
            const conquestCheckNow = state.gameNowMs;
            if (conquestCheckNow < pending.transitionTime) {
                effectiveOwner = pending.previousOwner;
            } else {
                state.pendingConquests.delete(star.id);
            }
        }
        let color = ownerColorCache.get(effectiveOwner);
        if (color == null) {
            color = colorUtils.getPlayerColor(effectiveOwner ?? '');
            ownerColorCache.set(effectiveOwner, color);
        }
        const radius = GAME_CONFIG.STAR_RENDER_RADIUS ?? star.radius;
        const isActive = star.id === state.activeStarId || star.id === state.dragSourceId;
        const isPortalStar = star.starType === 'portal';
        const portalColor = isPortalStar ? getPortalGroupHexColor(star.portalGroup) : 0;
        const flash = state.conquestFlashes.get(star.id);
        const isLabelImportant = isActive || Boolean(pending) || Boolean(flash);
        const labelMode = resolveStarLabelMode(state.stageScale, isLabelImportant);
        let labelView = caches.starLabels.get(star.id);
        if (labelMode !== 'hidden' && !labelView) {
            labelView = createStarLabel(star);
            labelsContainer.addChild(labelView.container);
            caches.starLabels.set(star.id, labelView);
        }
        const flashBucket = flash
            ? Math.floor((state.gameNowMs - flash.startTime) / STAR_VISUAL_BUCKET_MS)
            : -1;
        const shouldAnimateVisuals = shouldAnimateStarVisual({
            isActive,
            isPortalStar,
        });
        const visualKey = buildStarVisualKey({
            star,
            effectiveOwner,
            isActive,
            radius,
            flashBucket,
            animationBucket: shouldAnimateVisuals ? globalAnimationBucket : -1,
            visualConfigKey,
        });
        const shouldRedrawVisuals = starVisualKeys?.get(star.id) !== visualKey;

        if (shouldRedrawVisuals) {
            const visualStartedAt = performance.now();
            try {
                graphics.clear();

        // Determine shape properties
        const sides = TYPE_SIDES[star.starType] ?? 0;
        const usePolygon = GAME_CONFIG.STAR_SHAPE_MODE === 'polygon' && sides > 0;
        const cornerRadius = GAME_CONFIG.STAR_CORNER_RADIUS ?? 0.3;

        // Player Ownership-Ring (absolute radius from center)
        const ringRadius = GAME_CONFIG.STAR_RING_RADIUS;
        const ringWidth = GAME_CONFIG.STAR_RING_WIDTH ?? 2;
        const ringAlpha = GAME_CONFIG.STAR_RING_ALPHA ?? 0.8;
        // Apply SLA transforms to player color for ownership-ring
        let ringColor = isActive ? 0xffffff : color;
        if (!isActive) {
            const hsl = colorUtils.hexToHSL(color);
            const satMult = GAME_CONFIG.STAR_RING_SATURATION ?? 1.0;
            const litMult = GAME_CONFIG.STAR_RING_LIGHTNESS ?? 1.0;
            ringColor = colorUtils.hslToHex(
                hsl.h,
                Math.min(1, hsl.s * satMult),
                Math.min(1, hsl.l * litMult),
            );
        }
        graphics.beginPath();
        graphics.circle(star.x, star.y, ringRadius);
        graphics.stroke({ color: ringColor, width: isActive ? ringWidth + 2 : ringWidth, alpha: isActive ? Math.min(1, ringAlpha + 0.1) : ringAlpha });

        // Outer glow ring (pulses slightly, stronger when active)
        const starFxTime = shouldAnimateVisuals ? state.gameNowMs / 1000 : 0;
        const glowPulse = shouldAnimateVisuals
            ? 1 + Math.sin(starFxTime * 2) * 0.1
            : 1;
        const glowAlpha = isActive ? 0.35 : 0.15;
        const glowRadius = ringRadius * glowPulse;
        graphics.beginPath();
        graphics.circle(star.x, star.y, glowRadius);
        graphics.fill({ color: isPortalStar ? portalColor : color, alpha: glowAlpha });

        // Main star body — 3D Shaded 
        const typeStats = STAR_TYPE_STATS[star.starType as StarType];
        const typeColor = isPortalStar
            ? portalColor
            : (typeStats ? typeStats.color : 0xffffff);

        const typeHsl = colorUtils.hexToHSL(typeColor);
        const shadow = colorUtils.hslToHex(typeHsl.h, typeHsl.s, Math.max(0.0, typeHsl.l - 0.25));
        const highlight = colorUtils.hslToHex(typeHsl.h, typeHsl.s, Math.min(1.0, typeHsl.l + 0.2));

        if (isPortalStar) {
            drawPortalStar(graphics, star.x, star.y, radius, portalColor, starFxTime);
        } else if (usePolygon) {
            // Base layer with dark fill and normal stroke
            drawShapePath(graphics, star.x, star.y, radius, sides, cornerRadius,
                { color: shadow, alpha: 0.8 },
                { color: typeColor, width: 3, alpha: 1.0 });

            // Inner layer with bright fill
            drawShapePath(graphics, star.x, star.y, radius * 0.55, sides, cornerRadius,
                { color: highlight, alpha: 1.0 },
                { color: highlight, width: 1, alpha: 1.0 });
        } else {
            // Circle fallback
            graphics.beginPath();
            graphics.circle(star.x, star.y, radius);
            graphics.fill({ color: shadow, alpha: 0.8 });
            graphics.stroke({ color: typeColor, width: 3, alpha: 1.0 });

            graphics.beginPath();
            graphics.circle(star.x, star.y, radius * 0.55);
            graphics.fill({ color: highlight, alpha: 1.0 });
            graphics.stroke({ color: highlight, width: 1, alpha: 1.0 });
        }

        // Active star white fill overlay
        if (isActive) {
            if (usePolygon) {
                drawShapePath(graphics, star.x, star.y, radius, sides, cornerRadius,
                    { color: 0xffffff, alpha: 0.3 });
            } else {
                graphics.beginPath();
                graphics.circle(star.x, star.y, radius);
                graphics.fill({ color: 0xffffff, alpha: 0.3 });
            }
        }

        // Conquest flash: bright white pulse overlay
        if (flash) {
            const flashCheckNow = state.gameNowMs;
            const flashElapsed = flashCheckNow - flash.startTime;
            if (flashElapsed >= flash.duration) {
                state.conquestFlashes.delete(star.id);
            } else {
                const flashProgress = flashElapsed / flash.duration;
                const flashAlpha = Math.sin(flashProgress * Math.PI);
                if (usePolygon) {
                    drawShapePath(graphics, star.x, star.y, radius * 1.3, sides, cornerRadius,
                        { color: 0xffffff, alpha: flashAlpha * 0.85 });
                } else {
                    graphics.beginPath();
                    graphics.circle(star.x, star.y, radius * 1.3);
                    graphics.fill({ color: 0xffffff, alpha: flashAlpha * 0.85 });
                }
            }
        }

        // Inner corona glow — soft type-colored radial behind the icon
        const coronaRadius = radius * 0.65;
        graphics.beginPath();
        graphics.circle(star.x, star.y, coronaRadius);
        graphics.fill({ color: typeColor, alpha: isPortalStar ? 0.1 : 0.15 });

        if (!isPortalStar) {
            // Inner type icon (geometric shape) — larger and more visible
            const iconTime = isActive ? state.gameNowMs / 1000 : 0;
            const iconAlpha = isActive ? 0.6 + Math.sin(iconTime * 3) * 0.1 : 0.6;
            const iconScale = GAME_CONFIG.STAR_ICON_SCALE ?? 0.55;
            const iconSize = radius * iconScale;
            drawTypeIcon(graphics, star.x, star.y, iconSize, star.starType, iconAlpha, typeColor);
        }

                starVisualKeys?.set(star.id, visualKey);
            } finally {
                starVisualRedrawCount += 1;
                starVisualDurationMs += performance.now() - visualStartedAt;
            }
        }

        if (labelMode === 'hidden') {
            if (labelView) {
                if (labelView.container.visible) {
                    labelView.container.visible = false;
                }
                labelView.lastMode = labelMode;
            }
            const hiddenLerp = labelLerps.get(star.id);
            if (hiddenLerp) {
                hiddenLerp.activeTarget = star.activeShips;
                hiddenLerp.damagedTarget = star.damagedShips;
                hiddenLerp.activeDisplay = star.activeShips;
                hiddenLerp.damagedDisplay = star.damagedShips;
                hiddenLerp.fadeAlpha = 1.0;
                hiddenLerp.lastUpdateMs = state.gameNowMs;
            }
            return;
        }

        if (!labelView) {
            return;
        }

        const label = labelView.container;
        const labelStartedAt = performance.now();
        let labelContentDirty = false;
        try {
            labelPassCount += 1;
            if (!label.visible) {
                label.visible = true;
            }
            const pillBg = labelView.pillBg;
            const idText2 = labelView.idText;
            const sepText = labelView.sepText;
            const activeText = labelView.activeText;
            const slashText = labelView.slashText;
            const damagedText = labelView.damagedText;
            const leashGraphics = labelView.leashGraphics;

        // --- Smooth number transitions (mode-aware) ---
        const active = star.activeShips;
        const damaged = star.damagedShips;

        let lerp = labelLerps.get(star.id);
        if (!lerp) {
            lerp = { activeDisplay: active, damagedDisplay: damaged, activeTarget: active, damagedTarget: damaged, lastUpdateMs: state.gameNowMs, fadeAlpha: 1.0 };
            labelLerps.set(star.id, lerp);
        }

        // Detect value changes
        const activeChanged = lerp.activeTarget !== active;
        const damagedChanged = lerp.damagedTarget !== damaged;

        if (animMode === 'rolling') {
            if (activeChanged) {
                lerp.activeTarget = active;
                if (transMs <= 0) lerp.activeDisplay = active;
            }
            if (damagedChanged) {
                lerp.damagedTarget = damaged;
                if (transMs <= 0) lerp.damagedDisplay = damaged;
            }
            if (transMs > 0) {
                const dt = Math.max(1, state.gameNowMs - lerp.lastUpdateMs);
                const t = Math.min(1, dt / transMs * 3);
                lerp.activeDisplay += (lerp.activeTarget - lerp.activeDisplay) * t;
                lerp.damagedDisplay += (lerp.damagedTarget - lerp.damagedDisplay) * t;
                if (Math.abs(lerp.activeDisplay - lerp.activeTarget) < 0.5) lerp.activeDisplay = lerp.activeTarget;
                if (Math.abs(lerp.damagedDisplay - lerp.damagedTarget) < 0.5) lerp.damagedDisplay = lerp.damagedTarget;
            }
            lerp.fadeAlpha = 1.0;
        } else if (animMode === 'fade') {
            if (activeChanged || damagedChanged) {
                lerp.activeTarget = active;
                lerp.damagedTarget = damaged;
                lerp.activeDisplay = active;
                lerp.damagedDisplay = damaged;
                lerp.fadeAlpha = 0.25;
            }
            if (lerp.fadeAlpha < 1.0 && transMs > 0) {
                const dt = Math.max(1, state.gameNowMs - lerp.lastUpdateMs);
                const t = Math.min(1, dt / transMs * 2);
                lerp.fadeAlpha += (1.0 - lerp.fadeAlpha) * t;
                if (lerp.fadeAlpha > 0.98) lerp.fadeAlpha = 1.0;
            }
        } else {
            lerp.activeTarget = active;
            lerp.damagedTarget = damaged;
            lerp.activeDisplay = active;
            lerp.damagedDisplay = damaged;
            lerp.fadeAlpha = 1.0;
        }
        lerp.lastUpdateMs = state.gameNowMs;

        const showId =
            labelMode === 'full'
                ? showIdBase
                : !showActiveBase && !showDamagedBase && showIdBase;
        const showActive = showActiveBase;
        const showDamaged =
            labelMode === 'compact'
                ? showDamagedBase && damaged > 0
                : showDamagedBase;
        const showSep = labelMode === 'full' && showId && (showActive || showDamaged);
        const showSlash = showActive && showDamaged;
        const hasVisibleContent = showId || showActive || showDamaged;
        if (!hasVisibleContent) {
            label.visible = false;
            labelView.lastMode = labelMode;
            return;
        }

        const visibilityKey = [
            labelMode,
            showId ? 1 : 0,
            showActive ? 1 : 0,
            showDamaged ? 1 : 0,
            showSep ? 1 : 0,
            showSlash ? 1 : 0,
        ].join('|');
        if (labelView.lastVisibilityKey !== visibilityKey) {
            idText2.visible = showId;
            sepText.visible = showSep;
            activeText.visible = showActive;
            slashText.visible = showSlash;
            damagedText.visible = showDamaged;
            labelView.lastVisibilityKey = visibilityKey;
            labelContentDirty = true;
        }

        const activeTextValue = String(Math.round(lerp.activeDisplay));
        const damagedTextValue = String(Math.round(lerp.damagedDisplay));
        const textKey = `${activeTextValue}|${damagedTextValue}`;
        const alphaKey = lerp.fadeAlpha.toFixed(3);
        const textMetricsDirty = labelView.lastTextKey !== textKey;
        if (textMetricsDirty) {
            activeText.text = activeTextValue;
            damagedText.text = damagedTextValue;
            labelView.lastTextKey = textKey;
            labelView.activeWidth = activeText.width;
            labelView.damagedWidth = damagedText.width;
            labelContentDirty = true;
        }
        if (labelView.lastAlphaKey !== alphaKey) {
            activeText.alpha = lerp.fadeAlpha;
            damagedText.alpha = lerp.fadeAlpha;
            labelView.lastAlphaKey = alphaKey;
            labelContentDirty = true;
        }

        // Label position from angle + distance (polar → cartesian)
        const labelDist =
            labelMode === 'compact'
                ? Math.max(radius + 18, baseLabelDist * 0.72)
                : baseLabelDist;
        const labelOffsetX = labelDirectionX * labelDist;
        const labelOffsetY = labelDirectionY * labelDist;
        const nextLabelX = star.x + labelOffsetX;
        const nextLabelY = star.y + labelOffsetY;
        if (
            labelView.lastPositionX !== nextLabelX ||
            labelView.lastPositionY !== nextLabelY
        ) {
            label.x = nextLabelX;
            label.y = nextLabelY;
            labelView.lastPositionX = nextLabelX;
            labelView.lastPositionY = nextLabelY;
        }

        const labelScale =
            labelMode === 'compact' ? compactLabelScale : fullLabelScale;

        // Apply font sizes + family
        const styleKey = [
            labelMode,
            fontFamily,
            idFontSizeBase * labelScale,
            activeFontSizeBase * labelScale,
            damagedFontSizeBase * labelScale,
            separatorFontSizeBase * labelScale,
            slashFontSizeBase * labelScale,
        ].join('|');
        if (labelView.lastStyleKey !== styleKey) {
            applyTextStyle(
                idText2,
                fontFamily,
                idFontSizeBase * labelScale,
            );
            applyTextStyle(
                activeText,
                fontFamily,
                activeFontSizeBase * labelScale,
            );
            applyTextStyle(
                damagedText,
                fontFamily,
                damagedFontSizeBase * labelScale,
            );
            applyTextStyle(sepText, fontFamily, separatorFontSizeBase * labelScale);
            applyTextStyle(slashText, fontFamily, slashFontSizeBase * labelScale);
            labelView.idWidth = idText2.width;
            labelView.sepWidth = sepText.width;
            labelView.activeWidth = activeText.width;
            labelView.slashWidth = slashText.width;
            labelView.damagedWidth = damagedText.width;
            labelView.lastStyleKey = styleKey;
            labelContentDirty = true;
        }

        // ── Layout ──
        const pad =
            labelMode === 'compact'
                ? compactPad
                : fullPad;
        const padY =
            labelMode === 'compact'
                ? compactPadY
                : fullPadY;
        const gap =
            labelMode === 'compact'
                ? compactGap
                : fullGap;
        const layout =
            labelMode === 'compact'
                ? 'horizontal'
                : fullLayout;

        if (layout === 'horizontal') {
            const totalW =
                (idText2.visible ? labelView.idWidth + gap : 0) +
                (sepText.visible ? labelView.sepWidth + gap : 0) +
                (activeText.visible ? labelView.activeWidth : 0) +
                (slashText.visible ? labelView.slashWidth : 0) +
                (damagedText.visible ? labelView.damagedWidth : 0);
            const pillH = 18 * labelScale;
            const layoutKey = [
                layout,
                labelMode,
                totalW.toFixed(2),
                pillH.toFixed(2),
                gap.toFixed(2),
                idText2.visible ? 1 : 0,
                sepText.visible ? 1 : 0,
                activeText.visible ? 1 : 0,
                slashText.visible ? 1 : 0,
                damagedText.visible ? 1 : 0,
            ].join('|');
            if (labelView.lastLayoutKey !== layoutKey) {
                idText2.visible = showId;
                sepText.visible = showSep;
                activeText.visible = showActive;
                slashText.visible = showSlash;
                damagedText.visible = showDamaged;
                let cx = 0;
                if (idText2.visible) {
                    idText2.anchor.set(0, 0.5);
                    idText2.position.set(cx, 0);
                    cx += labelView.idWidth + gap;
                }
                if (sepText.visible) {
                    sepText.anchor.set(0, 0.5);
                    sepText.position.set(cx, 0);
                    cx += labelView.sepWidth + gap;
                }
                if (activeText.visible) {
                    activeText.anchor.set(0, 0.5);
                    activeText.position.set(cx, 0);
                    cx += labelView.activeWidth;
                }
                if (slashText.visible) {
                    slashText.anchor.set(0, 0.5);
                    slashText.position.set(cx, 0);
                    cx += labelView.slashWidth;
                }
                if (damagedText.visible) {
                    damagedText.anchor.set(0, 0.5);
                    damagedText.position.set(cx, 0);
                }
                label.pivot.set(totalW / 2, 0);
                labelView.lastLayoutKey = layoutKey;
                labelContentDirty = true;
            }

            let borderCol: number;
            let fillCol: number;
            let fillAlpha = bgAlpha;

            if (colorMode === 'player') {
                const cachedPalette = playerLabelPaletteCache.get(color);
                if (cachedPalette) {
                    borderCol = cachedPalette.borderCol;
                    fillCol = cachedPalette.fillCol;
                } else {
                    borderCol = color;
                    const hsl = colorUtils.hexToHSL(color);
                    fillCol = colorUtils.hslToHex(hsl.h, hsl.s * 0.4, hsl.l * 0.15);
                    playerLabelPaletteCache.set(color, { borderCol, fillCol });
                }
            } else {
                fillCol = universalLabelPalette?.fillCol ?? color;
                borderCol = universalLabelPalette?.borderCol ?? color;
                fillAlpha = universalLabelPalette?.fillAlpha ?? fillAlpha;
            }

            const backgroundKey = [
                layout,
                totalW.toFixed(2),
                pillH.toFixed(2),
                pad.toFixed(2),
                padY.toFixed(2),
                fillCol,
                fillAlpha.toFixed(3),
                borderCol,
                borderAlpha.toFixed(3),
                borderWidth.toFixed(2),
            ].join('|');
            if (pillBg && labelView.lastBackgroundKey !== backgroundKey) {
                pillBg.clear();
                pillBg.roundRect(-pad, -pillH / 2 - padY, totalW + pad * 2, pillH + padY * 2, 4);
                pillBg.fill({ color: fillCol, alpha: fillAlpha });
                if (borderWidth > 0) {
                    pillBg.stroke({ color: borderCol, width: borderWidth, alpha: borderAlpha });
                }
                labelView.lastBackgroundKey = backgroundKey;
                labelContentDirty = true;
            }
        } else {
            // Vertical stacked mode (legacy)
            const layoutKey = [
                layout,
                lineH.toFixed(2),
                idText2.visible ? 1 : 0,
                activeText.visible ? 1 : 0,
                damagedText.visible ? 1 : 0,
            ].join('|');
            if (labelView.lastLayoutKey !== layoutKey) {
                idText2.visible = showId;
                activeText.visible = showActive;
                damagedText.visible = showDamaged;
                sepText.visible = false;
                slashText.visible = false;
                idText2.anchor.set(0.5, 0.5);
                idText2.position.set(0, 0);
                activeText.anchor.set(0.5, 0.5);
                activeText.position.set(0, lineH);
                damagedText.anchor.set(0.5, 0.5);
                damagedText.position.set(0, lineH * 2);
                label.pivot.set(0, lineH);
                labelView.lastLayoutKey = layoutKey;
                labelContentDirty = true;
            }

            const backgroundKey = `${layout}|none`;
            if (pillBg && labelView.lastBackgroundKey !== backgroundKey) {
                pillBg.clear();
                labelView.lastBackgroundKey = backgroundKey;
                labelContentDirty = true;
            }
        }

            const leashKey = [
                layout,
                labelMode,
                labelLeashEnabled ? 1 : 0,
                labelOffsetX.toFixed(2),
                labelOffsetY.toFixed(2),
                radius.toFixed(2),
                pad.toFixed(2),
            ].join('|');
            if (leashGraphics && labelView.lastLeashKey !== leashKey) {
                leashGraphics.clear();
                if (labelLeashEnabled && labelMode === 'full') {
                    leashGraphics.beginPath();
                    const starEdgeX = -labelOffsetX + radius * 0.7;
                    const starEdgeY = -labelOffsetY + radius * 0.7;
                    leashGraphics.moveTo(starEdgeX, starEdgeY);
                    leashGraphics.lineTo(-pad, 0);
                    leashGraphics.stroke({ color: 0x666688, width: 1, alpha: 0.4 });
                }
                labelView.lastLeashKey = leashKey;
                labelContentDirty = true;
            }
            if (labelContentDirty) {
                const cacheRefreshStartedAt = performance.now();
                label.updateCacheTexture();
                labelCacheRefreshCount += 1;
                labelCacheRefreshDurationMs += performance.now() - cacheRefreshStartedAt;
            }
            labelView.lastMode = labelMode;
        } finally {
            labelDurationMs += performance.now() - labelStartedAt;
            if (labelContentDirty) {
                labelDirtyCount += 1;
            }
        }
    });

    if (starVisualRedrawCount > 0) {
        recordPerfDuration('game.renderFrame.stars.visuals', starVisualDurationMs, {
            redrawCount: starVisualRedrawCount,
            starCount: stars.length,
        });
    }
    if (labelPassCount > 0) {
        recordPerfDuration('game.renderFrame.stars.labels', labelDurationMs, {
            labelCount: labelPassCount,
            dirtyLabelCount: labelDirtyCount,
            starCount: stars.length,
        });
    }
    if (labelCacheRefreshCount > 0) {
        recordPerfDuration(
            'game.renderFrame.stars.labelCacheRefresh',
            labelCacheRefreshDurationMs,
            {
                refreshCount: labelCacheRefreshCount,
                dirtyLabelCount: labelDirtyCount,
                starCount: stars.length,
            },
        );
    }
}

/**
 * Clean up stale star graphics/labels for stars that no longer exist.
 */
export function cleanupStaleStars(
    currentIds: Set<string>,
    starsContainer: PIXI.Container,
    labelsContainer: PIXI.Container,
    caches: StarRenderCaches,
): void {
    caches.starGraphics.forEach((graphics, id) => {
        if (!currentIds.has(id)) {
            starsContainer.removeChild(graphics);
            graphics.destroy();
            caches.starGraphics.delete(id);
        }
    });
    caches.starLabels.forEach((labelView, id) => {
        if (!currentIds.has(id)) {
            labelsContainer.removeChild(labelView.container);
            labelView.container.destroy();
            caches.starLabels.delete(id);
            labelLerps.delete(id);
        }
    });
}

// ── Private Helpers ─────────────────────────────────────────────────────────

function createStarLabel(star: StarState): StarLabelView {
    const label = new PIXI.Container();
    label.cacheAsTexture({ resolution: STAR_LABEL_CACHE_RESOLUTION });

    // Leash line graphics (drawn first, behind text)
    const leashGraphics = new PIXI.Graphics();
    leashGraphics.label = 'leash';
    label.addChild(leashGraphics);

    // Pill background (rounded rect, drawn dynamically in renderStars)
    const pillBg = new PIXI.Graphics();
    pillBg.label = 'pillBg';
    label.addChild(pillBg);

    // Star ID text (left side of pill)
    const idText = new PIXI.Text({
        text: star.id.replace('star-', '#'),
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE ?? 13,
            fontWeight: 'bold',
            fill: 0x88aaff,
            align: 'center',
        },
        resolution: 2,
    });
    idText.anchor.set(0.5, 0.5);
    idText.label = 'starId';
    label.addChild(idText);

    // Separator text "|"
    const sepText = new PIXI.Text({
        text: '│',
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            fill: 0x446688,
            align: 'center',
        },
        resolution: 2,
    });
    sepText.anchor.set(0.5, 0.5);
    sepText.label = 'sep';
    label.addChild(sepText);

    // Active count (bright white)
    const activeText = new PIXI.Text({
        text: '0',
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: GAME_CONFIG.STAR_LABEL_FONT_SIZE ?? 14,
            fontWeight: 'bold',
            fill: 0xffffff,
            align: 'center',
        },
        resolution: 2,
    });
    activeText.anchor.set(1.0, 0.5);
    activeText.label = 'active';
    label.addChild(activeText);

    // Slash separator
    const slashText = new PIXI.Text({
        text: '/',
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fill: 0x556677,
            align: 'center',
        },
        resolution: 2,
    });
    slashText.anchor.set(0.5, 0.5);
    slashText.label = 'slash';
    label.addChild(slashText);

    // Damaged count (red-tinted)
    const damagedText = new PIXI.Text({
        text: '0',
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: GAME_CONFIG.STAR_LABEL_DAMAGED_FONT_SIZE ?? 12,
            fontWeight: 'bold',
            fill: 0xff8888,
            align: 'center',
        },
        resolution: 2,
    });
    damagedText.anchor.set(0, 0.5);
    damagedText.label = 'damaged';
    label.addChild(damagedText);

    return {
        container: label,
        leashGraphics,
        pillBg,
        idText,
        sepText,
        activeText,
        slashText,
        damagedText,
        idWidth: idText.width,
        sepWidth: sepText.width,
        activeWidth: activeText.width,
        slashWidth: slashText.width,
        damagedWidth: damagedText.width,
    };
}

function drawTypeIcon(
    g: PIXI.Graphics,
    cx: number,
    cy: number,
    size: number,
    starType: string,
    alpha: number,
    color: number,
): void {
    const sides = TYPE_SIDES[starType] ?? 0;
    if (sides === 0) {
        g.beginPath();
        g.circle(cx, cy, size);
        g.fill({ color: 0xffffff, alpha });
        return;
    }

    const angleStep = (2 * Math.PI) / sides;
    const startAngle = -Math.PI / 2;
    g.beginPath();
    g.moveTo(cx + size * Math.cos(startAngle), cy + size * Math.sin(startAngle));
    for (let i = 1; i <= sides; i++) {
        const angle = startAngle + angleStep * i;
        g.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
    }
    g.closePath();
    g.fill({ color, alpha });
    g.stroke({ color: 0xffffff, width: 1, alpha });
}

function drawHexBorder(
    graphics: PIXI.Graphics,
    cx: number,
    cy: number,
    radius: number,
    color: number,
    lineWidth: number,
): void {
    const a = (2 * Math.PI) / 6;
    graphics.beginPath();
    graphics.moveTo(cx + radius * Math.cos(0), cy + radius * Math.sin(0));
    for (let i = 1; i <= 6; i++) {
        graphics.lineTo(cx + radius * Math.cos(a * i), cy + radius * Math.sin(a * i));
    }
    graphics.closePath();
    graphics.stroke({ color, width: lineWidth, alpha: 0.9 });
}

/**
 * Render selection hex overlay on the active star (above ships layer).
 * Respects GAME_CONFIG.SHOW_SELECTION_HEX toggle.
 */
export function renderSelectionOverlay(
    stars: StarState[],
    overlayGraphics: PIXI.Graphics,
    activeStarId: string | null,
    dragSourceId: string | null,
): void {
    overlayGraphics.clear();
    if (!GAME_CONFIG.SHOW_SELECTION_HEX) return;

    const targetId = activeStarId || dragSourceId;
    if (!targetId) return;

    const star = stars.find(s => s.id === targetId);
    if (!star) return;

    const radius = GAME_CONFIG.STAR_RENDER_RADIUS ?? star.radius;
    drawHexBorder(overlayGraphics, star.x, star.y, radius + 20, 0xffffff, 3);
}
