import { writable } from 'svelte/store';
import type { TerritoryTraceRun } from './types';

function createTerritoryTraceRunStore() {
    const { subscribe, set } = writable<TerritoryTraceRun | null>(null);

    return {
        subscribe,
        set,
        clear: () => set(null),
    };
}

export const territoryTraceRun = createTerritoryTraceRunStore();
