import { writable } from "svelte/store";

export interface DiagnosticsUiState {
    open: boolean;
}

const store = writable<DiagnosticsUiState>({
    open: false,
});

function setOpen(open: boolean): void {
    store.set({ open });
}

function toggle(): void {
    store.update((state) => ({ open: !state.open }));
}

export const diagnosticsUi = {
    subscribe: store.subscribe,
    setOpen,
    toggle,
};
