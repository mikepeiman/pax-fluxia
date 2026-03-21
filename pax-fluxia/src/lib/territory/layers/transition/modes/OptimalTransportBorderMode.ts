import type {
    BorderTransitionFrame,
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
    TransitionSampleContext,
} from '../BorderTransitionMode';
import { planFrontierCorrespondence } from '../planners/CorrespondencePlanner';

interface OptimalTransportBorderPlan extends BorderTransitionPlan {
    targetFrontiers: BorderTransitionFrame['frontiers'];
    correspondenceCount: number;
}

export class OptimalTransportBorderMode implements BorderTransitionMode {
    readonly id = 'optimal_transport' as const;
    readonly label = 'Optimal Transport Border';

    plan(input: BorderTransitionPlanInput): BorderTransitionPlan {
        const correspondences = input.previousGeometry
            ? planFrontierCorrespondence(input.previousGeometry, input.nextGeometry)
            : [];

        const plan: OptimalTransportBorderPlan = {
            planId: `border:optimal_transport:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            targetFrontiers: input.nextGeometry.frontierPolylines,
            correspondenceCount: correspondences.length,
        };

        return plan;
    }

    sample(
        plan: BorderTransitionPlan,
        _ctx: TransitionSampleContext,
    ): BorderTransitionFrame {
        const typedPlan = plan as OptimalTransportBorderPlan;
        return {
            frontiers: typedPlan.targetFrontiers,
        };
    }
}
