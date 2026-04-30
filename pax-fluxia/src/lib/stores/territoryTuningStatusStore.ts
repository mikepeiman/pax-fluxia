import { writable } from "svelte/store";

export interface TerritoryTuningStatus {
    pending: boolean;
    label: string | null;
    startedAtMs: number | null;
    lastDurationMs: number | null;
    lastCompletedAtMs: number | null;
    lastCompletedLabel: string | null;
}

const initialStatus: TerritoryTuningStatus = {
    pending: false,
    label: null,
    startedAtMs: null,
    lastDurationMs: null,
    lastCompletedAtMs: null,
    lastCompletedLabel: null,
};

export const territoryTuningStatus = writable<TerritoryTuningStatus>(
    initialStatus,
);

export function beginTerritoryTuningCompile(label: string): void {
    territoryTuningStatus.set({
        pending: true,
        label,
        startedAtMs: Date.now(),
        lastDurationMs: null,
        lastCompletedAtMs: null,
        lastCompletedLabel: null,
    });
}

export function completeTerritoryTuningCompile(): void {
    territoryTuningStatus.update((status) => {
        if (!status.pending || status.startedAtMs == null) {
            return status;
        }
        const finishedAtMs = Date.now();
        return {
            pending: false,
            label: null,
            startedAtMs: null,
            lastDurationMs: Math.max(0, finishedAtMs - status.startedAtMs),
            lastCompletedAtMs: finishedAtMs,
            lastCompletedLabel: status.label,
        };
    });
}

export function resetTerritoryTuningStatus(): void {
    territoryTuningStatus.set(initialStatus);
}
