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
        pvv4ProgressProfile: t.pvv4ProgressProfile ?? 'smoothstep',
        pvv4ProgressBlend: Math.max(0, Math.min(1, t.pvv4ProgressBlend ?? 0.4)),
        pvv4StableAnchorEps: Math.max(
            0,
            Math.min(12, t.pvv4StableAnchorEps ?? 2),
        ),
        pvv4ChangeSpanEps: Math.max(
            0,
            Math.min(12, t.pvv4ChangeSpanEps ?? 2),
        ),
        pvv4ChangeSpanPadPoints: Math.max(
            0,
            Math.min(8, Math.round(t.pvv4ChangeSpanPadPoints ?? 0)),
        ),
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
