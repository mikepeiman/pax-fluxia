// ============================================================================
// Pax Fluxia - Shared Engine Configuration
// ============================================================================
// These config values are used by the shared GameEngine for both SP and MP.
// The client populates these from GAME_CONFIG (Tweakpane-tunable).
// The server uses defaults.
// ============================================================================

import type { StarType } from './types';

// ============================================================================
// Star Type Stats — Single Source of Truth
// ============================================================================
// Each type has a 2x bonus on its specialty, all other stats @ 1.0

export const STAR_TYPE_STATS: Record<StarType, {
    defense: number;      // Combat defense multiplier (RED = 2x)
    prod: number;         // Production rate (YELLOW = 2x)
    speed: number;        // Movement/transfer speed (BLUE = 2x)
    repair: number;       // Repair rate (PURPLE = 2x)
    attack: number;       // Attack power (GREEN = 2x)
    color: number;        // PixiJS hex color for rendering
    // V2 Stats
    activationRate: number;
    defensivePosture: number;
    defenseStrength: number;
    repairRate: number;
    transferRate: number;
}> = {
    'grey': { defense: 1, prod: 1, speed: 1, repair: 1, attack: 1, color: 0x8899aa, activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 20, transferRate: 0.1 },
    'yellow': { defense: 1, prod: 2, speed: 1, repair: 1, attack: 1, color: 0xfbbf24, activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 20, transferRate: 0.1 },
    'blue': { defense: 1, prod: 1, speed: 2, repair: 1, attack: 1, color: 0x3b82f6, activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 20, transferRate: 0.2 },
    'purple': { defense: 1, prod: 1, speed: 1, repair: 2, attack: 1, color: 0xa855f7, activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 40, transferRate: 0.1 },
    'red': { defense: 2, prod: 1, speed: 1, repair: 1, attack: 1, color: 0xef4444, activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 2.0, repairRate: 20, transferRate: 0.1 },
    'green': { defense: 1, prod: 1, speed: 1, repair: 1, attack: 2, color: 0x22c55e, activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 20, transferRate: 0.1 },
    'portal': { defense: 1, prod: 1, speed: 1, repair: 1, attack: 1, color: 0x6366f1, activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 20, transferRate: 0.1 },
};

// ============================================================================
// Engine Config — Tunable per-game parameters
// ============================================================================

export interface EngineConfig {
    // Production
    BASE_PRODUCTION: number;

    // Repair
    REPAIR_RATE: number;
    MIN_REPAIR: number;
    REPAIR_COMBAT_PENALTY: number;         // Legacy: uniform penalty (used if split not set)
    REPAIR_SUPPRESS_ATTACKER: number;      // Repair multiplier when star is ATTACKING (0=no repair, 1=full)
    REPAIR_SUPPRESS_DEFENDER: number;      // Repair multiplier when star is DEFENDING (0=no repair, 1=full)

    // Transfer
    TRANSFER_RATE: number;                 // Base transfer rate (Blue stars get 2x via speed multiplier)
    MIN_SHIPS_PER_TRANSFER: number;

    // Conquest
    CONQUEST_TRANSFER_PERCENTAGE: number;  // % of attacker ships transferred on conquest
    RETAIN_ORDER_ON_CONQUEST: boolean;     // Keep attacker order post-conquest
    ORDERS_PERSIST_AFTER_CONQUEST: boolean; // Queued/deferred orders survive ownership change
    CONQUEST_DAMAGED_CAPTURE_RATE: number; // % of damaged ships captured at conquest (0-1, default 1)
    CONQUEST_DAMAGED_DESTROY_RATE: number; // % of damaged ships destroyed at conquest (0-1, default 0)

    // Scatter / Retreat
    RETREAT_CAPTURE_RATE: number;          // % captured when defender retreats
    SCATTER_CAPTURE_RATE: number;          // % captured when defender scatters
    SCATTER_DESTROY_RATE: number;          // % of non-captured destroyed during scatter
    RETREAT_DAMAGED_ACTIVATION_RATE: number; // % of damaged ships converted to active on retreat/scatter (0=stay damaged, 1=all activate)

    // Combat — unified from COMBAT_CONFIG (Phase A: single pipeline)
    DAMAGED_SHIP_EFFECTIVENESS: number;    // Damaged ships as fraction of defenders
    GLOBAL_DAMAGE_MODIFIER: number;        // Global damage scalar (percentage, 100 = full)
    LETHALITY: number;                     // Fraction of damage that kills (rest disables)
    AGGRESSOR_ADVANTAGE: number;           // Attacker damage multiplier (>1 = attacker advantage)
    FORCE_RATIO_EFFECT: number;            // How much numerical superiority matters
    CONQUEST_THRESHOLD: number;            // Overwhelm ratio for instant capture
    MINIMUM_DAMAGE: number;                // Floor damage per combat tick

    // Orders
    ALLOW_OPPOSING_ORDERS: boolean;    // Allow A→B and B→A simultaneously (default false)
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
    BASE_PRODUCTION: 0.4,
    REPAIR_RATE: 5,
    MIN_REPAIR: 1,
    REPAIR_COMBAT_PENALTY: 0.1,
    REPAIR_SUPPRESS_ATTACKER: 0.5,
    REPAIR_SUPPRESS_DEFENDER: 0.1,
    MIN_SHIPS_PER_TRANSFER: 1,
    TRANSFER_RATE: 0.1,
    CONQUEST_TRANSFER_PERCENTAGE: 50,
    RETAIN_ORDER_ON_CONQUEST: true,
    ORDERS_PERSIST_AFTER_CONQUEST: true,
    CONQUEST_DAMAGED_CAPTURE_RATE: 1.0,
    CONQUEST_DAMAGED_DESTROY_RATE: 0,
    RETREAT_CAPTURE_RATE: 0.2,
    SCATTER_CAPTURE_RATE: 0.4,
    SCATTER_DESTROY_RATE: 0.50,
    RETREAT_DAMAGED_ACTIVATION_RATE: 0.1,
    DAMAGED_SHIP_EFFECTIVENESS: 0.5,
    GLOBAL_DAMAGE_MODIFIER: 100,
    LETHALITY: 0.25,
    AGGRESSOR_ADVANTAGE: 0.8333333333333334,
    FORCE_RATIO_EFFECT: 0,
    CONQUEST_THRESHOLD: 20,
    MINIMUM_DAMAGE: 1,
    ALLOW_OPPOSING_ORDERS: false,
};
