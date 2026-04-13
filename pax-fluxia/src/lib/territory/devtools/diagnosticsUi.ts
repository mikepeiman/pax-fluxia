import { writable } from "svelte/store";

export interface DiagnosticsUiState {
    open: boolean;
    height: number;
}

const store = writable<DiagnosticsUiState>({
    open: false,
    height: 0,
});

function setOpen(open: boolean): void {
    store.update((state) => ({
        ...state,
        open,
        height: open ? state.height : 0,
    }));
}

function toggle(): void {
    store.update((state) => ({
        open: !state.open,
        height: state.open ? 0 : state.height,
    }));
}

function setHeight(height: number): void {
    store.update((state) => ({
        ...state,
        height: Math.max(0, Math.round(height)),
    }));
}

export const diagnosticsUi = {
    subscribe: store.subscribe,
    setOpen,
    setHeight,
    toggle,
};
