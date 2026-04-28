import type {
    FillTransitionFrame,
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    TransitionSampleContext,
} from '../FillTransitionMode';

interface CrossfadeFillPlan extends FillTransitionPlan {
    targetRegions: FillTransitionFrame['regions'];
}

export class CrossfadeFillMode implements FillTransitionMode {
    readonly id = 'legacy_fill_crossfade' as const;
    readonly label = 'Legacy Fill Crossfade';

    plan(input: FillTransitionPlanInput): FillTransitionPlan {
        const plan: CrossfadeFillPlan = {
            planId: `fill:legacy_fill_crossfade:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            targetRegions: input.nextGeometry.territoryRegions,
        };

        return plan;
    }

    sample(
        plan: FillTransitionPlan,
        _ctx: TransitionSampleContext,
    ): FillTransitionFrame {
        const typedPlan = plan as CrossfadeFillPlan;
        return {
            regions: typedPlan.targetRegions,
        };
    }
}
