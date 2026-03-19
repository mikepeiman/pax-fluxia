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
import { territoryTransitionHandler } from '../handlers/territoryTransitionHandler';

/**
 * Register all default (core) FX handlers with the registry.
 * Additional composable handlers can be registered after this.
 */
export function registerDefaults(registry: FXRegistry): void {
    registry.registerTransfer(coreTransferHandler);
    registry.registerCombat(coreCombatHandler);
    registry.registerConquest(coreConquestHandler);
    // Territory transition handler runs at priority 200 — after core conquest (100)
    // processes ship animations. See TERRITORY_ARCHITECTURE.md §3.
    registry.registerConquest(territoryTransitionHandler);
}
