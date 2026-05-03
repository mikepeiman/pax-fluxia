import { writable } from "svelte/store";
import {
    completeTerritoryTuningCompile,
    resetTerritoryTuningStatus,
} from "./territoryTuningStatusStore";

export type ArrowRendererMode = "overlay_canvas" | "pixi_link_graphics" | "none";

export interface TerritoryRenderStatus {
    territoryMode: string;
    geometryReady: boolean | null;
    arrowRenderer: ArrowRendererMode;
    lastRenderFailure: string | null;
    msrRequestedMarginPx: number | null;
    msrStarBias: number | null;
    msrAnchorCount: number;
    msrIntervalCount: number;
    msrViolatedIntervalCount: number;
    msrAcceptedRepairCount: number;
    msrRejectedRepairCount: number;
    msrLastInvariantFailure: string | null;
    updatedAtMs: number;
}

const initialStatus: TerritoryRenderStatus = {
    territoryMode: "none",
    geometryReady: null,
    arrowRenderer: "overlay_canvas",
    lastRenderFailure: null,
    msrRequestedMarginPx: null,
    msrStarBias: null,
    msrAnchorCount: 0,
    msrIntervalCount: 0,
    msrViolatedIntervalCount: 0,
    msrAcceptedRepairCount: 0,
    msrRejectedRepairCount: 0,
    msrLastInvariantFailure: null,
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
