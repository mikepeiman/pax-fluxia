// ============================================================================
// FX System — Barrel Export (V2)
// ============================================================================

// ── Core modules ─────────────────────────────────────────────────────────────
export { FXClock } from './clock';
export { VisualStateManager } from './VisualStateManager';
export type { VisualSnapshot, ConquestFlashState, PendingConquestState, ShipSelector } from './VisualStateManager';
export { FXRegistry } from './FXRegistry';
export type { FXHandler, FXEventType } from './FXRegistry';
export { FXOrchestrator } from './orchestrator';
export type { FXContext } from './types';

// ── Handlers (backward-compatible standalone exports) ────────────────────────
export { handleTransferEvent } from './handlers/transferHandler';
export { handleCombatEvent } from './handlers/combatHandler';
export { handleConquestEvent } from './handlers/conquestHandler';

// ── Handler objects (for registry-based usage) ───────────────────────────────
export { coreTransferHandler } from './handlers/transferHandler';
export { coreCombatHandler } from './handlers/combatHandler';
export { coreConquestHandler } from './handlers/conquestHandler';
