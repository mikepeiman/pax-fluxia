import type {
    BorderTransitionFrame,
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
    TransitionSampleContext,
} from '../BorderTransitionMode';
import type { FrontierPolylineShape } from '../../geometry/GeometryMode';
import { interpolateMatchedPolylines } from '../interpolatePolylines';

interface OptimalTransportBorderPlan extends BorderTransitionPlan {
    previousFrontiers: readonly FrontierPolylineShape[];
    targetFrontiers: readonly FrontierPolylineShape[];
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
            previousFrontiers: input.previousGeometry?.frontierPolylines ?? input.nextGeometry.frontierPolylines,
            targetFrontiers: input.nextGeometry.frontierPolylines,
        };

        return plan;
    }

    sample(
        plan: BorderTransitionPlan,
        ctx: TransitionSampleContext,
    ): BorderTransitionFrame {
        const typedPlan = plan as OptimalTransportBorderPlan;

        // Interpolate: static polylines pass through unchanged,
        // drifted polylines get arc-length resampled and lerped,
        // spawned/vanished fade from/to midpoint.
        const interpolated = interpolateMatchedPolylines(
            typedPlan.previousFrontiers,
            typedPlan.targetFrontiers,
            ctx.progress,
        );

        return {
            frontiers: interpolated,
        };
    }
}
