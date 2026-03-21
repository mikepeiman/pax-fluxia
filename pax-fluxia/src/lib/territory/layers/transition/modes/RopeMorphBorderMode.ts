import type {
    BorderTransitionFrame,
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
    TransitionSampleContext,
} from '../BorderTransitionMode';

interface RopeMorphBorderPlan extends BorderTransitionPlan {
    targetFrontiers: BorderTransitionFrame['frontiers'];
}

export class RopeMorphBorderMode implements BorderTransitionMode {
    readonly id = 'rope_morph' as const;
    readonly label = 'Rope Morph Border';

    plan(input: BorderTransitionPlanInput): BorderTransitionPlan {
        const plan: RopeMorphBorderPlan = {
            planId: `border:rope_morph:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            targetFrontiers: input.nextGeometry.frontierPolylines,
        };

        return plan;
    }

    sample(
        plan: BorderTransitionPlan,
        _ctx: TransitionSampleContext,
    ): BorderTransitionFrame {
        const typedPlan = plan as RopeMorphBorderPlan;
        return {
            frontiers: typedPlan.targetFrontiers,
        };
    }
}
