import type {
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
} from '../BorderTransitionMode';
import type {
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
} from '../FillTransitionMode';

export function planFillTransition(
    mode: FillTransitionMode,
    input: FillTransitionPlanInput,
): FillTransitionPlan {
    return mode.plan(input);
}

export function planBorderTransition(
    mode: BorderTransitionMode,
    input: BorderTransitionPlanInput,
): BorderTransitionPlan {
    return mode.plan(input);
}
