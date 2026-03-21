import type { BorderTransitionMode } from './BorderTransitionMode';
import type { FillTransitionMode } from './FillTransitionMode';
import { CrossfadeFillMode } from './modes/CrossfadeFillMode';
import { FrontierMorphFillMode } from './modes/FrontierMorphFillMode';
import { OptimalTransportBorderMode } from './modes/OptimalTransportBorderMode';
import { RopeMorphBorderMode } from './modes/RopeMorphBorderMode';

export const FILL_TRANSITION_MODES: readonly FillTransitionMode[] = [
    new FrontierMorphFillMode(),
    new CrossfadeFillMode(),
];

export const BORDER_TRANSITION_MODES: readonly BorderTransitionMode[] = [
    new OptimalTransportBorderMode(),
    new RopeMorphBorderMode(),
];

export const FILL_TRANSITION_MODE_BY_ID: ReadonlyMap<string, FillTransitionMode> =
    new Map(FILL_TRANSITION_MODES.map((mode) => [mode.id, mode]));

export const BORDER_TRANSITION_MODE_BY_ID: ReadonlyMap<string, BorderTransitionMode> =
    new Map(BORDER_TRANSITION_MODES.map((mode) => [mode.id, mode]));
