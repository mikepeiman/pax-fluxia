// ---------------------------------------------------------------------------
// Draw a territory transition frame to PIXI.Graphics.
// ---------------------------------------------------------------------------
// Both fill and border derive from the same Vec2[] ring geometry,
// eliminating divergence by construction.
// ---------------------------------------------------------------------------

import * as PIXI from 'pixi.js';
import type { Vec2, TerritoryFrameGeometry, TerritoryFrameRing } from './types';

/**
 * Draw one ring as a filled polygon with optional stroke.
 */
function drawRing(
    graphics: PIXI.Graphics,
    points: Vec2[],
    fillColor: number,
    fillAlpha: number,
    borderWidth: number,
    borderColor: number,
    borderAlpha: number,
    isHole: boolean = false,
): void {
    if (points.length < 3) return;

    // Start path
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();

    // Fill (only for outer rings — holes are cut)
    if (!isHole) {
        graphics.fill({ color: fillColor, alpha: fillAlpha });
    } else {
        graphics.cut();
    }

    // Border stroke on same geometry
    if (borderWidth > 0 && borderAlpha > 0) {
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.stroke({
            width: borderWidth,
            color: borderColor,
            alpha: borderAlpha,
        });
    }
}

/** Style configuration for territory drawing. */
export interface TerritoryDrawStyle {
    fillAlpha: number;
    borderWidth: number;
    borderColor: number;
    borderAlpha: number;
    colorByTerritory: Map<string, number>;  // territoryId → fill color
}

/**
 * Draw all territory transition frame geometry to PIXI.Graphics.
 *
 * Both fill and border are drawn from the same Vec2[] ring points,
 * guaranteeing no divergence.
 */
export function drawTerritoryFrame(
    frame: TerritoryFrameGeometry,
    graphics: PIXI.Graphics,
    style: TerritoryDrawStyle,
): void {
    for (const [territoryId, rings] of frame.byTerritoryId) {
        const fillColor = style.colorByTerritory.get(territoryId) ?? 0x444444;

        for (const ring of rings) {
            const isHole = ring.ringId.includes(':hole');
            drawRing(
                graphics,
                ring.points,
                fillColor,
                style.fillAlpha,
                style.borderWidth,
                style.borderColor,
                style.borderAlpha,
                isHole,
            );
        }
    }
}
