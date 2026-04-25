import { writable } from "svelte/store";

export type ArrowRendererMode = "overlay_canvas" | "pixi_link_graphics" | "none";

export interface TerritoryRenderStatus {
    territoryMode: string;
    geometryReady: boolean | null;
    arrowRenderer: ArrowRendererMode;
    lastRenderFailure: string | null;
    updatedAtMs: number;
}

const initialStatus: TerritoryRenderStatus = {
    territoryMode: "unknown",
    geometryReady: null,
    arrowRenderer: "overlay_canvas",
    lastRenderFailure: null,
    updatedAtMs: 0,
};

export const territoryRenderStatus = writable<TerritoryRenderStatus>(
    initialStatus,
);

export function setTerritoryRenderStatus(
    patch: Partial<TerritoryRenderStatus>,
): void {
    territoryRenderStatus.update((status) => ({
        ...status,
        ...patch,
        updatedAtMs: Date.now(),
    }));
}

export function resetTerritoryRenderStatus(): void {
    territoryRenderStatus.set({
        ...initialStatus,
        updatedAtMs: Date.now(),
    });
}
