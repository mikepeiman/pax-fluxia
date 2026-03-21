import type {
    FillTransitionFrame,
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    TransitionSampleContext,
} from '../FillTransitionMode';

interface FrontierMorphFillPlan extends FillTransitionPlan {
    targetRegions: FillTransitionFrame['regions'];
}

export class FrontierMorphFillMode implements FillTransitionMode {
    readonly id = 'frontier_morph' as const;
    readonly label = 'Frontier Topology Morph Fill';

    plan(input: FillTransitionPlanInput): FillTransitionPlan {
        const plan: FrontierMorphFillPlan = {
            planId: `fill:frontier_morph:${input.nowMs}`,
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
        const typedPlan = plan as FrontierMorphFillPlan;
        return {
            regions: typedPlan.targetRegions,
        };
    }
}
