import type { TerritoryFrameInput, TerritoryTunables } from '../contracts/TerritoryFrameInput';
import {
    DEFAULT_TERRITORY_MODE_SELECTION,
    type TerritoryModeSelection,
} from '../contracts/TerritoryModeSelection';
import { normalizeTerritoryGeometryTunables } from '../geometry/geometryTuning';

function normalizeTunables(t: TerritoryTunables): TerritoryTunables {
    const geometry = normalizeTerritoryGeometryTunables(t);
    return {
        // Transition timing
        transitionDurationMs: Math.max(0, Math.round(t.transitionDurationMs)),
        // Presentation
        borderWidth: Math.max(0, t.borderWidth),
        fillAlpha: Math.min(1, Math.max(0, t.fillAlpha)),
        borderAlpha: Math.min(1, Math.max(0, t.borderAlpha)),
        ...geometry,
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
