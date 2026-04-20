import { get, writable } from "svelte/store";
import type { MapDiagnosticMeasurement } from "$lib/types/game.types";

interface AuthoredMeasurementsUiState {
    visible: boolean;
    hasExplicitPreference: boolean;
}

const STORAGE_KEY = "pax-authored-measurements-visible";

function loadInitialState(): AuthoredMeasurementsUiState {
    if (typeof localStorage === "undefined") {
        return { visible: false, hasExplicitPreference: false };
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
        return { visible: false, hasExplicitPreference: false };
    }

    return {
        visible: raw === "true",
        hasExplicitPreference: true,
    };
}

const store = writable<AuthoredMeasurementsUiState>(loadInitialState());

function persist(visible: boolean): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, String(visible));
}

function setVisible(visible: boolean): void {
    persist(visible);
    store.set({
        visible,
        hasExplicitPreference: true,
    });
}

function toggle(): void {
    setVisible(!get(store).visible);
}

function syncDefault(measurements: readonly MapDiagnosticMeasurement[]): void {
    store.update((state) => {
        if (state.hasExplicitPreference) {
            return state;
        }

        return {
            ...state,
            visible: measurements.some(
                (measurement) => measurement.visibleByDefault !== false,
            ),
        };
    });
}

function shouldRender(measurements: readonly MapDiagnosticMeasurement[]): boolean {
    return get(store).visible && measurements.length > 0;
}

export const authoredMeasurementsUi = {
    subscribe: store.subscribe,
    setVisible,
    toggle,
    syncDefault,
    shouldRender,
};
