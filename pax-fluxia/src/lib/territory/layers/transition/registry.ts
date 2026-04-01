import type { BorderTransitionMode } from './BorderTransitionMode';
import type { FillTransitionMode } from './FillTransitionMode';
import { ActiveFrontFillMode } from './modes/ActiveFrontFillMode';
import { AlphaCrossfadeFillMode } from './modes/AlphaCrossfadeFillMode';
import { FrontierTopologyMorphFillMode } from './modes/FrontierTopologyMorphFillMode';
import { OptimalTransportCorrespondenceBorderMode } from './modes/OptimalTransportCorrespondenceBorderMode';
import { RopeInterpolatedBorderMode } from './modes/RopeInterpolatedBorderMode';

export const FILL_TRANSITION_MODES: readonly FillTransitionMode[] = [
    new FrontierTopologyMorphFillMode(),
    ActiveFrontFillMode, // object literal, not a class — implements FillTransitionMode directly
    new AlphaCrossfadeFillMode(),
];

export const BORDER_TRANSITION_MODES: readonly BorderTransitionMode[] = [
    new OptimalTransportCorrespondenceBorderMode(),
    new RopeInterpolatedBorderMode(),
];

export const FILL_TRANSITION_MODE_BY_ID: ReadonlyMap<string, FillTransitionMode> =
    new Map(FILL_TRANSITION_MODES.map((mode) => [mode.id, mode]));

export const BORDER_TRANSITION_MODE_BY_ID: ReadonlyMap<string, BorderTransitionMode> =
    new Map(BORDER_TRANSITION_MODES.map((mode) => [mode.id, mode]));
