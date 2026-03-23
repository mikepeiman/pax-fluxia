import type {
    BorderTransitionFrame,
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
    TransitionSampleContext,
} from '../BorderTransitionMode';

interface OptimalTransportBorderPlan extends BorderTransitionPlan {
    targetFrontiers: BorderTransitionFrame['frontiers'];
}

export class OptimalTransportBorderMode implements BorderTransitionMode {
    readonly id = 'optimal_transport' as const;
    readonly label = 'Optimal-Transport Correspondence Border';

    plan(input: BorderTransitionPlanInput): BorderTransitionPlan {
        const plan: OptimalTransportBorderPlan = {
            planId: `border:optimal_transport:${input.nowMs}`,
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
        const typedPlan = plan as OptimalTransportBorderPlan;
        // SNAP TO TARGET — real interpolation requires ring-based boundary
        // snapshots with span provenance (see Perplexity guidance 2026-03-20)
        return {
            frontiers: typedPlan.targetFrontiers,
        };
    }
}
