import type { TerritoryFrameInput, TerritoryTunables } from '../contracts/TerritoryFrameInput';
import {
    DEFAULT_TERRITORY_MODE_SELECTION,
    type TerritoryModeSelection,
} from '../contracts/TerritoryModeSelection';

function normalizeTunables(t: TerritoryTunables): TerritoryTunables {
    return {
        // Transition timing
        transitionDurationMs: Math.max(0, Math.round(t.transitionDurationMs)),
        // Presentation
        borderWidth: Math.max(0, t.borderWidth),
        fillAlpha: Math.min(1, Math.max(0, t.fillAlpha)),
        borderAlpha: Math.min(1, Math.max(0, t.borderAlpha)),
        // Geometry: smoothing
        geometrySmoothingPasses: Math.max(0, Math.min(5, Math.round(t.geometrySmoothingPasses))),
        frontierResolution: Math.max(1, Math.min(32, Math.round(t.frontierResolution))),
        boundaryPad: Math.max(0, Math.round(t.boundaryPad)),
        boundaryEps: Math.max(0, Math.round(t.boundaryEps)),
        // Geometry: MSR
        starMargin: Math.max(0, Math.min(500, t.starMargin ?? 45)),
        // Geometry: CX
        corridorEnabled: t.corridorEnabled ?? true,
        corridorSpacing: Math.max(10, Math.min(200, t.corridorSpacing ?? 60)),
        corridorCount: Math.max(0, Math.min(10, Math.round(t.corridorCount ?? 0))),
        corridorWeight: Math.max(0, Math.min(1, t.corridorWeight ?? 0.5)),
        // Geometry: DX
        disconnectEnabled: t.disconnectEnabled ?? true,
        disconnectDistance: Math.max(0, Math.min(1000, t.disconnectDistance ?? 400)),
        disconnectWeight: Math.max(0, Math.min(1, t.disconnectWeight ?? 0.3)),
        // Geometry: cluster splitting
        clusterSplitThreshold: Math.max(0, Math.min(1, t.clusterSplitThreshold ?? 0)),
    };
}

function normalizeSelection(selection: TerritoryModeSelection): TerritoryModeSelection {
    return {
        ownershipMode: selection.ownershipMode ?? DEFAULT_TERRITORY_MODE_SELECTION.ownershipMode,
        geometryMode: selection.geometryMode ?? DEFAULT_TERRITORY_MODE_SELECTION.geometryMode,
        fillTransitionMode:
            selection.fillTransitionMode ?? DEFAULT_TERRITORY_MODE_SELECTION.fillTransitionMode,
        borderTransitionMode:
            selection.borderTransitionMode ??
            DEFAULT_TERRITORY_MODE_SELECTION.borderTransitionMode,
        styleMode: selection.styleMode ?? DEFAULT_TERRITORY_MODE_SELECTION.styleMode,
    };
}

export function normalizeTerritoryFrameInput(input: TerritoryFrameInput): TerritoryFrameInput {
    return {
        ...input,
        selection: normalizeSelection(input.selection),
        tunables: normalizeTunables(input.tunables),
    };
}
