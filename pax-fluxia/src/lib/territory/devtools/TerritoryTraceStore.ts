/**
 * territory/devtools/TerritoryTraceStore.ts
 *
 * Canonical trace store for the new territory pipeline.
 * Wraps a Svelte writable store with typed accessors.
 *
 * This is a NEW store for the canonical compiler pipeline.
 * The legacy store at territory-engine/traceStore.ts is kept
 * intact to serve the legacy DY4 / FG2 render modes.
 *
 * Rules:
 * - No module-level mutable non-store state
 * - No PIXI imports
 * - No rendering logic
 */

import { writable, get } from 'svelte/store';
import type { CanonicalTerritoryStateOk, CompileError } from '../compiler/types';

export interface CanonicalTraceEntry {
    timestamp: number;
    frameId: number;
    stateKind: 'ok' | 'error';
    /** Only present when stateKind === 'ok' */
    state?: CanonicalTerritoryStateOk;
    /** Only present when stateKind === 'error' */
    error?: CompileError;
    /** Wall time in ms for the full compile + cache build */
    compileDurationMs?: number;
}

export interface CanonicalTraceHistory {
    entries: CanonicalTraceEntry[];
    maxEntries: number;
}

function createCanonicalTraceStore(maxEntries = 60) {
    const history = writable<CanonicalTraceHistory>({
        entries: [],
        maxEntries,
    });

    let frameCounter = 0;

    return {
        subscribe: history.subscribe,

        /** Record a successful compile result. */
        recordOk(
            state: CanonicalTerritoryStateOk,
            compileDurationMs?: number,
        ): void {
            history.update((h) => {
                const entry: CanonicalTraceEntry = {
                    timestamp: Date.now(),
                    frameId: ++frameCounter,
                    stateKind: 'ok',
                    state,
                    compileDurationMs,
                };
                const entries = [...h.entries, entry];
                if (entries.length > h.maxEntries) {
                    entries.splice(0, entries.length - h.maxEntries);
                }
                return { ...h, entries };
            });
        },

        /** Record a compile error. */
        recordError(error: CompileError): void {
            history.update((h) => {
                const entry: CanonicalTraceEntry = {
                    timestamp: Date.now(),
                    frameId: ++frameCounter,
                    stateKind: 'error',
                    error,
                };
                const entries = [...h.entries, entry];
                if (entries.length > h.maxEntries) {
                    entries.splice(0, entries.length - h.maxEntries);
                }
                return { ...h, entries };
            });
        },

        /** Get the most recent trace entry. */
        latest(): CanonicalTraceEntry | null {
            const h = get(history);
            return h.entries[h.entries.length - 1] ?? null;
        },

        /** Clear all trace history. */
        clear(): void {
            frameCounter = 0;
            history.set({ entries: [], maxEntries });
        },

        /** Change the rolling window size. */
        setMaxEntries(n: number): void {
            history.update((h) => ({ ...h, maxEntries: n }));
        },
    };
}

/**
 * Singleton canonical trace store.
 * Subscribe in Svelte devtools components to visualize compiler output.
 */
export const canonicalTraceStore = createCanonicalTraceStore();
