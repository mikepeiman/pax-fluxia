// ============================================================================
// FX Handler — Combat Events (V2, uses VSM + gameTime)
// ============================================================================
// Populates starsInCombat via VSM for tick-synced surge animations.
// ============================================================================

import type { FXContext } from '../types';
import type { CombatEvent } from '@pax/common';
import type { FXHandler } from '../FXRegistry';

/**
 * Core combat handler — marks all participating stars as "in combat"
 * so the surge animation renders displacement effects.
 */
export const coreCombatHandler: FXHandler<CombatEvent> = {
    id: 'core:combat',
    priority: 100,

    handle(event: CombatEvent, ctx: FXContext): void {
        for (const attackerId of event.attackerIds) {
            ctx.vsm.markCombat(attackerId);
        }
        ctx.vsm.markCombat(event.defenderId);
    },
};

// Re-export standalone function for backward compatibility during migration
export function handleCombatEvent(event: CombatEvent, ctx: FXContext): void {
    coreCombatHandler.handle(event, ctx);
}
