// ============================================================================
// FX Registry — Handler Registration & Dispatch
// ============================================================================
// Manages FX handlers for each event type. Handlers are sorted by priority
// (lower = first) and dispatched in order. Supports multi-handler composition.
// ============================================================================

import type { TransferEvent, CombatEvent, ConquestEvent } from '@pax/common';
import type { FXContext } from './types';

// ── Handler Interface ────────────────────────────────────────────────────────

export type FXEventType = 'transfer' | 'combat' | 'conquest';

/**
 * An FX handler processes one type of game event and produces visual effects.
 * Use ctx.vsm methods for safe state mutation — never splice raw arrays.
 */
export interface FXHandler<T = unknown> {
    /** Unique id, e.g. 'core:transfer', 'fx:particle-trail' */
    id: string;
    /** Priority: lower runs first. Default handlers use 100. */
    priority: number;
    /** Process one event. */
    handle(event: T, ctx: FXContext): void;
    /** Per-frame update for continuous effects (particles, pulses). Optional. */
    update?(ctx: FXContext): void;
    /** Cleanup on unregister. Optional. */
    destroy?(): void;
}

// ── Registry ─────────────────────────────────────────────────────────────────

export class FXRegistry {
    private _transferHandlers: FXHandler<TransferEvent>[] = [];
    private _combatHandlers: FXHandler<CombatEvent>[] = [];
    private _conquestHandlers: FXHandler<ConquestEvent>[] = [];

    /** Register a transfer event handler. */
    registerTransfer(handler: FXHandler<TransferEvent>): void {
        this._transferHandlers.push(handler);
        this._transferHandlers.sort((a, b) => a.priority - b.priority);
    }

    /** Register a combat event handler. */
    registerCombat(handler: FXHandler<CombatEvent>): void {
        this._combatHandlers.push(handler);
        this._combatHandlers.sort((a, b) => a.priority - b.priority);
    }

    /** Register a conquest event handler. */
    registerConquest(handler: FXHandler<ConquestEvent>): void {
        this._conquestHandlers.push(handler);
        this._conquestHandlers.sort((a, b) => a.priority - b.priority);
    }

    /** Dispatch a transfer event to all registered handlers. */
    dispatchTransfer(event: TransferEvent, ctx: FXContext): void {
        for (const h of this._transferHandlers) {
            h.handle(event, ctx);
        }
    }

    /** Dispatch a combat event to all registered handlers. */
    dispatchCombat(event: CombatEvent, ctx: FXContext): void {
        for (const h of this._combatHandlers) {
            h.handle(event, ctx);
        }
    }

    /** Dispatch a conquest event to all registered handlers. */
    dispatchConquest(event: ConquestEvent, ctx: FXContext): void {
        for (const h of this._conquestHandlers) {
            h.handle(event, ctx);
        }
    }

    /** Run per-frame update on all handlers that have one. */
    updateAll(ctx: FXContext): void {
        for (const h of this._transferHandlers) h.update?.(ctx);
        for (const h of this._combatHandlers) h.update?.(ctx);
        for (const h of this._conquestHandlers) h.update?.(ctx);
    }

    /** Unregister a handler by id. */
    unregister(id: string): void {
        const remove = (arr: FXHandler<unknown>[]) => {
            const idx = arr.findIndex(h => h.id === id);
            if (idx >= 0) {
                arr[idx].destroy?.();
                arr.splice(idx, 1);
            }
        };
        remove(this._transferHandlers as FXHandler<unknown>[]);
        remove(this._combatHandlers as FXHandler<unknown>[]);
        remove(this._conquestHandlers as FXHandler<unknown>[]);
    }

    /** Destroy all handlers and clear registry. */
    destroy(): void {
        for (const h of this._transferHandlers) h.destroy?.();
        for (const h of this._combatHandlers) h.destroy?.();
        for (const h of this._conquestHandlers) h.destroy?.();
        this._transferHandlers.length = 0;
        this._combatHandlers.length = 0;
        this._conquestHandlers.length = 0;
    }
}
