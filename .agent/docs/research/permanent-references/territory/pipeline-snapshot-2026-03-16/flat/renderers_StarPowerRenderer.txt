// ============================================================================
// StarPowerRenderer — Radial gradient star power overlay per star
// ============================================================================
//
// F-47: Draws a semi-transparent radial gradient circle behind each owned star
// in the player's color. Overlapping gradients naturally show star power.
// Inserted as the bottommost layer in the rendering pipeline.
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

/** Max alpha for any single halo layer — prevents visual wrap-around */
const MAX_HALO_ALPHA = 0.6;

/**
 * Render territory overlay — large, faint colored circles behind each owned star.
 * Must be called each frame before other renderers.
 */
export function renderStarPower(
    stars: StarState[],
    territoryGraphics: PIXI.Graphics,
    colorUtils: ColorUtils,
): void {
    territoryGraphics.clear();

    if (!GAME_CONFIG.SHOW_STAR_POWER) return;

    const alpha = GAME_CONFIG.STAR_POWER_ALPHA ?? 0.08;
    const radiusMult = GAME_CONFIG.STAR_POWER_RADIUS_MULT ?? 3.0;
    const layers = Math.max(1, GAME_CONFIG.STAR_POWER_LAYERS ?? 4);

    if (alpha <= 0) return;

    for (const star of stars) {
        if (!star.ownerId) continue;

        const color = colorUtils.getPlayerColor(star.ownerId);
        const radius = star.radius * radiusMult;

        // Fleet-size alpha boost (two modes available)
        let starAlpha = alpha;
        if (GAME_CONFIG.HALO_FLEET_SCALE) {
            const totalShips = star.activeShips + star.damagedShips;
            const intensity = GAME_CONFIG.HALO_FLEET_INTENSITY ?? 1.0;
            const mode = GAME_CONFIG.HALO_FLEET_MODE ?? 'linear';

            if (mode === 'stepped') {
                // Discrete boost per step (e.g. +0.03 per 500 ships)
                const stepSize = GAME_CONFIG.HALO_FLEET_STEP_SIZE ?? 500;
                const stepBoost = Math.floor(totalShips / stepSize) * 0.03 * intensity;
                starAlpha = alpha + stepBoost;
            } else {
                // Linear: smooth from alpha → alpha+0.5 over 0→maxShips
                const maxShips = GAME_CONFIG.HALO_FLEET_MAX_SHIPS ?? 500;
                const t = Math.min(totalShips / maxShips, 1);
                starAlpha = alpha + (t * 0.5 * intensity);
            }
        }

        // Clamp to prevent visual wrap-around at high ship counts
        starAlpha = Math.min(starAlpha, MAX_HALO_ALPHA);

        if (starAlpha <= 0) continue;

        // Draw radial gradient as concentric circles with decreasing alpha
        for (let i = layers; i >= 1; i--) {
            const layerR = radius * (i / layers);
            const layerAlpha = starAlpha * (1 - (i - 1) / layers);
            territoryGraphics.circle(star.x, star.y, layerR);
            territoryGraphics.fill({ color, alpha: layerAlpha });
        }
    }

    // Apply optional GPU blur for soft territory edges
    const blurStrength = GAME_CONFIG.STAR_POWER_BLUR ?? 4;
    if (blurStrength > 0) {
        const blur = new PIXI.BlurFilter({ strength: blurStrength, quality: 3 });
        territoryGraphics.filters = [blur];
    } else {
        territoryGraphics.filters = [];
    }
}
