// ============================================================================
// TerritoryRenderer — Radial gradient territory overlay per star
// ============================================================================
//
// F-47: Draws a semi-transparent radial gradient circle behind each owned star
// in the player's color. Overlapping gradients naturally show territory boundaries.
// Inserted as the bottommost layer in the rendering pipeline.
// ============================================================================

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarState } from '$lib/types/game.types';
import type { ColorUtils } from './RenderContext';

/**
 * Render territory overlay — large, faint colored circles behind each owned star.
 * Must be called each frame before other renderers.
 */
export function renderTerritory(
    stars: StarState[],
    territoryGraphics: PIXI.Graphics,
    colorUtils: ColorUtils,
): void {
    territoryGraphics.clear();

    if (!GAME_CONFIG.SHOW_TERRITORY) return;

    const alpha = GAME_CONFIG.TERRITORY_ALPHA ?? 0.08;
    const radiusMult = GAME_CONFIG.TERRITORY_RADIUS_MULT ?? 3.0;

    if (alpha <= 0) return;

    for (const star of stars) {
        if (!star.ownerId) continue;

        const color = colorUtils.getPlayerColor(star.ownerId);
        const radius = star.radius * radiusMult;

        // Fleet-size alpha boost: larger fleets = brighter halos (smooth linear)
        let starAlpha = alpha;
        if (GAME_CONFIG.HALO_FLEET_SCALE) {
            const totalShips = star.activeShips + star.damagedShips;
            const intensity = GAME_CONFIG.HALO_FLEET_INTENSITY ?? 1.0;
            // Linear from alpha → alpha+0.2 over 0→10k ships, scaled by intensity
            const t = Math.min(totalShips / 10000, 1);
            starAlpha = alpha + (t * 0.2 * intensity);
        }

        if (starAlpha <= 0) continue;

        // Draw radial gradient as concentric circles with decreasing alpha
        // 3 layers for smooth falloff
        const layers = 4;
        for (let i = layers; i >= 1; i--) {
            const layerR = radius * (i / layers);
            const layerAlpha = starAlpha * (1 - (i - 1) / layers);
            territoryGraphics.circle(star.x, star.y, layerR);
            territoryGraphics.fill({ color, alpha: layerAlpha });
        }
    }
}
