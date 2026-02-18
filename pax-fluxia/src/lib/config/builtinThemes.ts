// ============================================================================
// Built-in Themes — Curated presets shipped with the game
// ============================================================================

import type { GameTheme } from './themes';

/**
 * "Smooth Bezier" — User's tuned settings from 2026-02-16.
 * Characterized by:
 * - Slow, deliberate tick rate (1850ms)
 * - Bezier travel with strong arc intensity (2.0) and easeInOut power 3.5
 * - Minimal wobble (1px), nearside departure mode
 * - Slow attack surge ramp (1000ms) with proportional surge
 * - No ship glow, subtle outline (0.8px)
 * - Tight orbit density (1.8)
 */
export const SMOOTH_BEZIER: GameTheme = {
    name: 'Smooth Bezier',
    description: 'Deliberate pacing with graceful curved ship arcs. Minimal wobble, strong easing.',
    created: '2026-02-16T21:24:44Z',
    values: {
        // Timing
        BASE_TICK_MS: 1850,
        MIN_TICK_MS: 100,
        ANIMATION_SPEED_MS: 1150,

        // Transfer mechanics
        TRANSFER_RATE: 0.12,
        MIN_SHIPS_PER_TRANSFER: 0,
        MAX_SHIPS_PER_TRANSFER: 0,

        // Combat
        AGGRESSOR_ADVANTAGE: 0.8333333333333334,
        DAMAGE_PER_SHIP: 0.075,
        LETHALITY: 0.35,
        FORCE_RATIO_EFFECT: 0,
        CONQUEST_THRESHOLD: 25,
        DAMAGED_SHIP_EFFECTIVENESS: 0.5,

        // Production & Repair
        BASE_PRODUCTION: 0.6,
        REPAIR_RATE: 3,
        MIN_REPAIR: 1,
        REPAIR_COMBAT_PENALTY: 0.1,

        // Conquest mechanics
        CONQUEST_TRANSFER_PERCENTAGE: 40,
        OVERWHELM_THRESHOLD: 0.1,
        ORDERS_PERSIST_AFTER_CONQUEST: true,
        RETAIN_ORDER_ON_CONQUEST: true,
        ALLOW_OPPOSING_ORDERS: false,
        // Clock source toggles
        USE_WALL_CLOCK_TRAVEL: false,
        USE_WALL_CLOCK_SETTLE: true,
        USE_WALL_CLOCK_SURGE_PULSE: true,
        USE_WALL_CLOCK_SURGE_RAMP: true,
        USE_WALL_CLOCK_CONQUEST: false,
        USE_WALL_CLOCK_ORBIT: true,
        USE_WALL_CLOCK_STAR_FX: true,
        CONQUEST_DAMAGED_CAPTURE_RATE: 1,
        CONQUEST_DAMAGED_DESTROY_RATE: 0,
        RETREAT_CAPTURE_RATE: 0.1,
        SCATTER_CAPTURE_RATE: 0.2,
        SCATTER_DESTROY_RATE: 0.5,
        RETREAT_DAMAGED_ACTIVATION_RATE: 0.1,

        // Starting
        STARTING_SHIPS: 100,

        // Visual layout
        SHIP_BASE_SIZE: 3.5,
        STAR_RENDER_RADIUS: 20,
        ORBIT_RING_MULT: 1.6,
        TRANSFER_ANIMATION_MS: 600,
        STATIC_ORBITS: false,
        ORBIT_DENSITY: 1.8,
        MAX_VISUAL_SHIPS: 500,

        // Animation tuning
        ORBIT_BIAS_STRENGTH: 0,
        DEPART_FRACTION: 0.55,
        DEPART_JITTER_MS: 20,
        LANE_OFFSET_PX: 8,
        DEPART_MODE: 'nearside',
        SETTLE_DURATION_MS: 830,
        ARRIVAL_SPREAD: 0,
        WOBBLE_AMP: 1,
        TRAVEL_MODE: 'bezier',
        TRAVEL_EASING: 'easeInOut',
        TRAVEL_EASING_POWER: 3.5,
        TRAVEL_DURATION_MULT: 1.9,
        TRAVEL_ARC_INTENSITY: 2,

        // Attack surge
        ATTACK_SURGE_MULT: 0.65,
        ATTACK_SURGE_PROPORTIONAL: true,
        ATTACK_SURGE_FORCE_COFACTOR: 0.5,
        ATTACK_SURGE_RAMP_MS: 1000,
        ATTACK_SURGE_SHAPE: 1,

        // Conquest animation
        CONQUEST_ANIMATION_MODE: 'surge',
        CONQUEST_SETTLE_MS: 1350,
        CONQUEST_SURGE_RADIUS: 40,
        CONQUEST_SURGE_STAGGER_MS: 0,
        CONQUEST_TRAVEL_SPEED: 5,
        CONQUEST_LERP_DELAY_MS: 0,
        CONQUEST_COLOR_DELAY_MS: 400,
        CONQUEST_FLASH_DURATION_MS: 400,
        CONQUEST_SLOWMO_ENABLED: false,
        CONQUEST_SLOWMO_FACTOR: 5,
        CONQUEST_SLOWMO_DURATION_MS: 5000,

        // Ship appearance
        SHIP_OUTLINE_ON: true,
        SHIP_OUTLINE_PX: 0.8,
        SHIP_GLOW_INTENSITY: 0,
        SHIP_SCALE_MULT: 0.6,
        SHIP_VISUAL_RADIUS: 3,

        // Density VFX
        DENSITY_HUE_STEP: 20,
        DENSITY_SAT_STEP: 0.13,
        DENSITY_LIGHT_STEP: 0.06,
        DENSITY_TIERS: 6,
        DENSITY_DARKEN_ALT: true,

        // Star glow
        STAR_GLOW_ON: true,
        STAR_GLOW_RADIUS_MULT: 1.3,
        STAR_GLOW_INTENSITY: 0.25,
        STAR_GLOW_LAYERS: 4,

        // Orbit bias oscillation
        ORBIT_BIAS_OSCILLATE: false,
        ORBIT_BIAS_MIN: 0,
        ORBIT_BIAS_MAX: 0.95,
        ORBIT_BIAS_FREQ: 0.25,

        // Orb travel
        ORB_TRAVEL: false,
        ORB_BASE_RADIUS: 1.5,
        ORB_RADIUS_SCALE: 0.5,
        ORB_GLOW_MULT: 1.3,
        ORB_OUTER_ALPHA: 0.06,
        ORB_MID_ALPHA: 0.34,
        ORB_CORE_ALPHA: 0.74,
        ORB_CENTER_ALPHA: 1.2,
        ORB_OUTER_SCALE: 3.6,
        ORB_MID_SCALE: 1.5,
        ORB_CORE_SCALE: 0.4,

        // Arrow
        ARROW_LENGTH_FRACTION: 0.5,
    },
};

// ── All Built-in Themes ─────────────────────────────────────────────────────

export const BUILTIN_THEMES: GameTheme[] = [
    SMOOTH_BEZIER,
];
