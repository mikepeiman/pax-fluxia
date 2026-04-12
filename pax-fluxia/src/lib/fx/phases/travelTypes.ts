// ============================================================================
// FX Phases — Travel Phase Behavior Types
// ============================================================================
// Defines the interface for pluggable travel behaviors. Each behavior
// computes position, scale, and alpha for a ship given its progress.
// ============================================================================

import type { VisualShipState } from '$lib/utils/render.utils';

/**
 * Result of a travel phase interpolation.
 * Handlers must return x, y, scale, alpha for the ship.
 */
export interface PhaseResult {
    x: number;
    y: number;
    scale: number;
    alpha: number;
    /** If true, this phase is complete and ship should transition to next state */
    done: boolean;
}

/**
 * Context available to all phase behaviors.
 */
export interface PhaseContext {
    /** Current game time in ms (from FXClock — pausable, speed-scaled) */
    now: number;
    /** Time elapsed since ship.departTime (in game time) */
    elapsed: number;
    /** Extra easing config */
    travelEasing: string;
    travelEasingPower: number;
    travelDurationMult: number;
    travelArcIntensity: number;
    departArcIntensity: number;
    arrivalArcIntensity: number;
    wobbleAmp: number;
    followLanePath: boolean;
}

/**
 * A departure behavior takes a ship and progress 0→1, returns interpolated state.
 * The ship's departFrom, laneStart, laneEnd etc. are pre-computed.
 */
export interface DepartBehavior {
    name: string;
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult;
}

/**
 * A traveling behavior takes a ship and progress 0→1, returns interpolated state.
 */
export interface TravelBehavior {
    name: string;
    interpolate(ship: VisualShipState, elapsed: number, ctx: PhaseContext): PhaseResult;
}
