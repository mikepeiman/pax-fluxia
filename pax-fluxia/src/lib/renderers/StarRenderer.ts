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

// ── State Caches (managed by StarRenderer) ──────────────────────────────────

export interface StarRenderCaches {
    starGraphics: Map<string, PIXI.Graphics>;
    starLabels: Map<string, PIXI.Container>;
}

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

        // Active star selection highlight (hex border) — white
        if (isActive) {
            drawHexBorder(graphics, star.x, star.y, radius + 20, 0xffffff, 3);
        }

        // Outer glow ring (pulses slightly, stronger when active)
        const starFxTime = state.gameNowMs / 1000;
        const glowPulse = 1 + Math.sin(starFxTime * 2) * 0.1;
        const glowAlpha = isActive ? 0.25 : 0.12;
        graphics.circle(star.x, star.y, (radius + 8) * glowPulse);
        graphics.fill({ color, alpha: glowAlpha });

        // Main star body — base color from StarType
        const typeStats = STAR_TYPE_STATS[star.starType as StarType];
        const typeColor = typeStats ? typeStats.color : 0xffffff;

        graphics.circle(star.x, star.y, radius);
        graphics.fill({ color: typeColor, alpha: 0.3 });
        graphics.stroke({ color: isActive ? 0xffffff : color, width: isActive ? 4 : 2, alpha: 1 });

        // Active star white fill overlay
        if (isActive) {
            graphics.circle(star.x, star.y, radius);
            graphics.fill({ color: 0xffffff, alpha: 0.3 });
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
                graphics.circle(star.x, star.y, radius * 1.3);
                graphics.fill({ color: 0xffffff, alpha: flashAlpha * 0.85 });
            }
        }

        // Inner type icon (geometric shape)
        const iconTime = state.gameNowMs / 1000;
        const iconAlpha = 0.5 + Math.sin(iconTime * 3) * 0.1;
        const iconSize = radius * 0.35;
        drawTypeIcon(graphics, star.x, star.y, iconSize, star.starType, iconAlpha, typeColor);

        // Update labels
        const activeText = label.getChildByLabel('active') as PIXI.Text;
        const damagedText = label.getChildByLabel('damaged') as PIXI.Text;
        const leashGraphics = label.getChildByLabel('leash') as PIXI.Graphics;

        if (activeText) activeText.text = String(star.activeShips);

        if (damagedText) {
            damagedText.text = String(star.damagedShips);
            damagedText.visible = true;
        }

        // Label offset from star center (bottom-right diagonal)
        const labelOffsetX = 45;
        const labelOffsetY = 35;
        label.x = star.x + labelOffsetX;
        label.y = star.y + labelOffsetY;

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
            fontSize: 14,
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
            fontSize: 22,
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
        g.circle(cx, cy, size);
        g.fill({ color: 0xffffff, alpha });
        return;
    }

    const angleStep = (2 * Math.PI) / sides;
    const startAngle = -Math.PI / 2;
    g.moveTo(cx + size * Math.cos(startAngle), cy + size * Math.sin(startAngle));
    for (let i = 1; i <= sides; i++) {
        const angle = startAngle + angleStep * i;
        g.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
    }
    g.fill({ color, alpha });
    g.stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.6 });
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
    graphics.moveTo(cx + radius * Math.cos(0), cy + radius * Math.sin(0));
    for (let i = 1; i <= 6; i++) {
        graphics.lineTo(cx + radius * Math.cos(a * i), cy + radius * Math.sin(a * i));
    }
    graphics.stroke({ color, width: lineWidth, alpha: 0.9 });
}
