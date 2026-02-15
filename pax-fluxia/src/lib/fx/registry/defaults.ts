// ============================================================================
// FX Defaults — Register Core Handlers
// ============================================================================
// Registers the built-in core handlers (transfer, combat, conquest)
// with the FXRegistry. Called on FXOrchestrator construction.
// ============================================================================

import type { FXRegistry } from '../FXRegistry';
import { coreTransferHandler } from '../handlers/transferHandler';
import { coreCombatHandler } from '../handlers/combatHandler';
import { coreConquestHandler } from '../handlers/conquestHandler';

/**
 * Register all default (core) FX handlers with the registry.
 * Additional composable handlers can be registered after this.
 */
export function registerDefaults(registry: FXRegistry): void {
    registry.registerTransfer(coreTransferHandler);
    registry.registerCombat(coreCombatHandler);
    registry.registerConquest(coreConquestHandler);
}
