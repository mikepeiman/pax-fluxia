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
};

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

// ── State Caches (managed by StarRenderer) ──────────────────────────────────

export interface StarRenderCaches {
    starGraphics: Map<string, PIXI.Graphics>;
    starLabels: Map<string, PIXI.Container>;
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

}

// ── Rendering Functions ─────────────────────────────────────────────────────

/**
 * Render all stars: circles, icons, labels, selection highlights.
 */
export function renderStars(
    stars: StarState[],
    starsContainer: PIXI.Container,
    labelsContainer: PIXI.Container,
    caches: StarRenderCaches,
    state: StarRenderState,
    colorUtils: ColorUtils,
): void {
    stars.forEach((star) => {
        let graphics = caches.starGraphics.get(star.id);
        let label = caches.starLabels.get(star.id);

        if (!graphics) {
            graphics = new PIXI.Graphics();
            starsContainer.addChild(graphics);
            caches.starGraphics.set(star.id, graphics);
        }

        if (!label) {
            label = createStarLabel(star);
            labelsContainer.addChild(label);
            caches.starLabels.set(star.id, label);
        }

        graphics.clear();

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
        const color = colorUtils.getPlayerColor(effectiveOwner);
        const radius = GAME_CONFIG.STAR_RENDER_RADIUS ?? star.radius;
        const isActive = star.id === state.activeStarId || star.id === state.dragSourceId;



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
        const starFxTime = state.gameNowMs / 1000;
        const glowPulse = 1 + Math.sin(starFxTime * 2) * 0.1;
        const glowAlpha = isActive ? 0.35 : 0.15;
        const glowRadius = ringRadius * glowPulse;
        graphics.beginPath();
        graphics.circle(star.x, star.y, glowRadius);
        graphics.fill({ color, alpha: glowAlpha });

        // Main star body — 3D Shaded 
        const typeStats = STAR_TYPE_STATS[star.starType as StarType];
        const typeColor = typeStats ? typeStats.color : 0xffffff;

        const typeHsl = colorUtils.hexToHSL(typeColor);
        const shadow = colorUtils.hslToHex(typeHsl.h, typeHsl.s, Math.max(0.0, typeHsl.l - 0.25));
        const highlight = colorUtils.hslToHex(typeHsl.h, typeHsl.s, Math.min(1.0, typeHsl.l + 0.2));

        if (usePolygon) {
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
        const flash = state.conquestFlashes.get(star.id);
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
        graphics.fill({ color: typeColor, alpha: 0.15 });

        // Inner type icon (geometric shape) — larger and more visible
        const iconTime = state.gameNowMs / 1000;
        const iconAlpha = 0.6 + Math.sin(iconTime * 3) * 0.1;
        const iconScale = GAME_CONFIG.STAR_ICON_SCALE ?? 0.55;
        const iconSize = radius * iconScale;
        drawTypeIcon(graphics, star.x, star.y, iconSize, star.starType, iconAlpha, typeColor);

        // Get label elements
        const activeText = label.getChildByLabel('active') as PIXI.Text;
        const damagedText = label.getChildByLabel('damaged') as PIXI.Text;
        const leashGraphics = label.getChildByLabel('leash') as PIXI.Graphics;

        // --- Smooth number transitions (mode-aware) ---
        const transMs = GAME_CONFIG.NUMBER_TRANSITION_MS ?? 120;
        const animMode = GAME_CONFIG.LABEL_ANIM_MODE ?? 'rolling';
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
            // Rolling / lerp mode (original behavior)
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
            // Fade mode: snap number instantly, flash alpha on change
            if (activeChanged || damagedChanged) {
                lerp.activeTarget = active;
                lerp.damagedTarget = damaged;
                lerp.activeDisplay = active;
                lerp.damagedDisplay = damaged;
                lerp.fadeAlpha = 0.25; // Flash low
            }
            // Fade alpha back to 1.0
            if (lerp.fadeAlpha < 1.0 && transMs > 0) {
                const dt = Math.max(1, state.gameNowMs - lerp.lastUpdateMs);
                const t = Math.min(1, dt / transMs * 2);
                lerp.fadeAlpha += (1.0 - lerp.fadeAlpha) * t;
                if (lerp.fadeAlpha > 0.98) lerp.fadeAlpha = 1.0;
            }
        } else {
            // Instant mode: snap everything
            lerp.activeTarget = active;
            lerp.damagedTarget = damaged;
            lerp.activeDisplay = active;
            lerp.damagedDisplay = damaged;
            lerp.fadeAlpha = 1.0;
        }
        lerp.lastUpdateMs = state.gameNowMs;

        if (activeText) {
            activeText.text = String(Math.round(lerp.activeDisplay));
            activeText.alpha = lerp.fadeAlpha;
        }

        if (damagedText) {
            damagedText.text = String(Math.round(lerp.damagedDisplay));
            damagedText.alpha = lerp.fadeAlpha;
            damagedText.visible = true;
        }

        // Label position from angle + distance (polar → cartesian)
        const labelAngle = (GAME_CONFIG.STAR_LABEL_ANGLE ?? 35) * Math.PI / 180;
        const labelDist = GAME_CONFIG.STAR_LABEL_DISTANCE ?? 55;
        const labelOffsetX = Math.cos(labelAngle) * labelDist;
        const labelOffsetY = Math.sin(labelAngle) * labelDist;
        label.x = star.x + labelOffsetX;
        label.y = star.y + labelOffsetY;

        // Dynamic font size updates (so sliders take effect immediately)
        const idText2 = label.getChildByLabel('starId') as PIXI.Text;
        if (idText2) idText2.style.fontSize = GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE ?? 14;
        if (activeText) activeText.style.fontSize = GAME_CONFIG.STAR_LABEL_FONT_SIZE ?? 22;
        if (damagedText) damagedText.style.fontSize = GAME_CONFIG.STAR_LABEL_DAMAGED_FONT_SIZE ?? 16;

        // Draw leash line from star edge to label
        if (leashGraphics) {
            leashGraphics.clear();
            const starEdgeX = -labelOffsetX + radius * 0.7;
            const starEdgeY = -labelOffsetY + radius * 0.7;
            leashGraphics.moveTo(starEdgeX, starEdgeY);
            leashGraphics.lineTo(-5, -5);
            leashGraphics.stroke({ color: 0x666688, width: 1, alpha: 0.6 });
        }
    });
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
    caches.starLabels.forEach((label, id) => {
        if (!currentIds.has(id)) {
            labelsContainer.removeChild(label);
            label.destroy();
            caches.starLabels.delete(id);
        }
    });
}

// ── Private Helpers ─────────────────────────────────────────────────────────

function createStarLabel(star: StarState): PIXI.Container {
    const label = new PIXI.Container();

    // Leash line graphics (drawn first, behind text)
    const leashGraphics = new PIXI.Graphics();
    leashGraphics.label = 'leash';
    label.addChild(leashGraphics);

    // Star ID label (Top)
    const idText = new PIXI.Text({
        text: star.id.replace('star-', '#'),
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: GAME_CONFIG.STAR_LABEL_ID_FONT_SIZE ?? 14,
            fontWeight: 'bold',
            fill: 0x88aaff,
            align: 'center',
            stroke: { color: 0x000000, width: 3 },
        },
        resolution: 2,
    });
    idText.anchor.set(0.5, 0.5);
    idText.position.y = 0;
    idText.label = 'starId';
    label.addChild(idText);

    // Active count (Middle, Bright)
    const activeText = new PIXI.Text({
        text: '0',
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: GAME_CONFIG.STAR_LABEL_FONT_SIZE ?? 22,
            fontWeight: 'bold',
            fill: 0xffffff,
            align: 'center',
            stroke: { color: 0x000000, width: 3 },
        },
        resolution: 2,
    });
    activeText.anchor.set(0.5, 0.5);
    activeText.position.y = 18;
    activeText.label = 'active';
    label.addChild(activeText);

    // Damaged count (Bottom, Dimmer)
    const damagedText = new PIXI.Text({
        text: '0',
        style: {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 16,
            fontWeight: 'bold',
            fill: 0xff8888,
            align: 'center',
            stroke: { color: 0x000000, width: 2 },
        },
        resolution: 2,
    });
    damagedText.anchor.set(0.5, 0.5);
    damagedText.position.y = 38;
    damagedText.label = 'damaged';
    label.addChild(damagedText);

    return label;
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
