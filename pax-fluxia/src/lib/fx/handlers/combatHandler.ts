// ============================================================================
// FX Handler — Combat Events
// ============================================================================
// Populates starsInCombat set for tick-synced surge animations.
// ============================================================================

import type { FXContext } from '../types';
import type { CombatEvent } from '@pax/common';

/**
 * Handle a combat event: mark all participating stars as "in combat"
 * so the surge animation renders displacement effects.
 */
export function handleCombatEvent(event: CombatEvent, ctx: FXContext): void {
    for (const attackerId of event.attackerIds) {
        ctx.starsInCombat.add(attackerId);
    }
    ctx.starsInCombat.add(event.defenderId);
}
