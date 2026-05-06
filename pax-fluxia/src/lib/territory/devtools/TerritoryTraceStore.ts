/**
 * territory/devtools/TerritoryTraceStore.ts
 *
 * Runtime trace store for the new territory pipeline.
 * Wraps a Svelte writable store with typed accessors.
 *
 * This is a NEW store for the vector compiler pipeline.
 * The legacy store at territory-engine/traceStore.ts is kept
 * intact to serve the legacy DY4 / FG2 render modes.
 *
 * Rules:
 * - No module-level mutable non-store state
 * - No PIXI imports
 * - No rendering logic
 */

import { writable, get } from 'svelte/store';
import type { CompiledTerritoryStateOk, CompileError } from '../compiler/types';

export interface RuntimeTraceEntry {
    timestamp: number;
    frameId: number;
    stateKind: 'ok' | 'error';
    /** Only present when stateKind === 'ok' */
    state?: CompiledTerritoryStateOk;
    /** Only present when stateKind === 'error' */
    error?: CompileError;
    /** Wall time in ms for the full compile + cache build */
    compileDurationMs?: number;
}

export interface RuntimeTraceHistory {
    entries: RuntimeTraceEntry[];
    maxEntries: number;
}

function createRuntimeTraceStore(maxEntries = 60) {
    const history = writable<RuntimeTraceHistory>({
        entries: [],
        maxEntries,
    });

    let frameCounter = 0;

    return {
        subscribe: history.subscribe,

        /** Record a successful compile result. */
        recordOk(
            state: CompiledTerritoryStateOk,
            compileDurationMs?: number,
        ): void {
            history.update((h) => {
                const entry: RuntimeTraceEntry = {
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
                const entry: RuntimeTraceEntry = {
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
        latest(): RuntimeTraceEntry | null {
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
 * Singleton runtime trace store.
 * Subscribe in Svelte devtools components to visualize compiler output.
 */
export const runtimeTraceStore = createRuntimeTraceStore();
