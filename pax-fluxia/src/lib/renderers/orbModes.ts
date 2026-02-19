// ============================================================================
// Orb Draw Modes — Swappable visual rendering for orb-mode traveling ships
// ============================================================================
// Each mode defines how grouped traveling ships are drawn when ORB_TRAVEL is on.
// The depart/travel behaviors (orbDepart, orbTravel) handle movement;
// these modes handle only the VISUAL rendering of the orb itself.
// ============================================================================

import type * as PIXI from 'pixi.js';
import type { GAME_CONFIG } from '$lib/config/game.config';

/** Per-route group of traveling ships, pre-computed by ShipRenderer */
export interface OrbGroup {
    cx: number;      // centroid x
    cy: number;      // centroid y
    count: number;   // number of ships in this group
    color: number;   // player color (hex)
    ownerId: string;
}

/** A named orb draw mode — how the orb visual is rendered */
export interface OrbDrawMode {
    name: string;
    draw(group: OrbGroup, graphics: PIXI.Graphics, config: typeof GAME_CONFIG): void;
}

// ════════════════════════════════════════════════════════════════════════════
// MODE 1: Concentric Glow Circles
// ════════════════════════════════════════════════════════════════════════════
// Five concentric layers: outer glow → mid glow → white core → colored inner → white center dot.
// Size scales with sqrt(shipCount). Intensity scales with sqrt(shipCount) capped at 1.0.

export const orbMode1: OrbDrawMode = {
    name: 'mode1',
    draw(group: OrbGroup, g: PIXI.Graphics, cfg: typeof GAME_CONFIG): void {
        const { cx, cy, count, color } = group;

        const baseRadius = cfg.ORB_BASE_RADIUS + Math.sqrt(count) * cfg.ORB_RADIUS_SCALE;
        const intensity = Math.min(1.0, 0.4 + Math.sqrt(count) * 0.06) * cfg.ORB_GLOW_MULT;

        // Layer 1: Outer glow (player color, wide)
        const glowRadius = baseRadius * cfg.ORB_OUTER_SCALE;
        g.circle(cx, cy, glowRadius);
        g.fill({ color, alpha: intensity * cfg.ORB_OUTER_ALPHA });

        // Layer 2: Mid glow (player color, medium)
        const midRadius = baseRadius * cfg.ORB_MID_SCALE;
        g.circle(cx, cy, midRadius);
        g.fill({ color, alpha: intensity * cfg.ORB_MID_ALPHA });

        // Layer 3: White core
        g.circle(cx, cy, baseRadius);
        g.fill({ color: 0xffffff, alpha: intensity * cfg.ORB_CORE_ALPHA });

        // Layer 4: Colored inner core
        const coreRadius = baseRadius * cfg.ORB_CORE_SCALE;
        g.circle(cx, cy, coreRadius);
        g.fill({ color, alpha: intensity * 0.9 });

        // Layer 5: Center dot (white)
        const dotRadius = Math.max(1.5, baseRadius * 0.3);
        g.circle(cx, cy, dotRadius);
        g.fill({ color: 0xffffff, alpha: Math.min(1, intensity * cfg.ORB_CENTER_ALPHA) });
    },
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY — named lookup for orb draw modes
// ════════════════════════════════════════════════════════════════════════════

export const ORB_DRAW_MODES: Record<string, OrbDrawMode> = {
    mode1: orbMode1,
};
