import { writable } from "svelte/store";
import {
    completeTerritoryTuningCompile,
    resetTerritoryTuningStatus,
} from "./territoryTuningStatusStore";
import type { ActiveFrontRuntimeDebugState } from "$lib/territory/layers/transition/TransitionLayerCoordinator";

export type ArrowRendererMode = "overlay_canvas" | "pixi_link_graphics" | "none";

export interface TerritoryRenderStatus {
    territoryMode: string;
    geometryReady: boolean | null;
    arrowRenderer: ArrowRendererMode;
    lastRenderFailure: string | null;
    activeFrontDiagnostics: ActiveFrontRuntimeDebugState | null;
    updatedAtMs: number;
}

const initialStatus: TerritoryRenderStatus = {
    territoryMode: "none",
    geometryReady: null,
    arrowRenderer: "overlay_canvas",
    lastRenderFailure: null,
    activeFrontDiagnostics: null,
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
    completeTerritoryTuningCompile();
}

export function resetTerritoryRenderStatus(): void {
    territoryRenderStatus.set({
        ...initialStatus,
        updatedAtMs: Date.now(),
    });
    resetTerritoryTuningStatus();
}
