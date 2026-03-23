import type {
    FillTransitionFrame,
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    TransitionSampleContext,
} from '../FillTransitionMode';
import type { FrontierPolylineShape } from '../../geometry/GeometryMode';
import { interpolateMatchedPolylines } from '../interpolatePolylines';
import { executeChainWalk, flattenLoopPoints } from '../../../compiler/chainWalkCore';
import type { SharedPolyline } from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';

interface FrontierMorphFillPlan extends FillTransitionPlan {
    previousFrontiers: readonly FrontierPolylineShape[];
    targetFrontiers: readonly FrontierPolylineShape[];
    /** World-boundary polylines — needed for re-chaining fill rings from
     *  interpolated borders. These don't interpolate (world stays fixed). */
    worldBorderPolylines: readonly FrontierPolylineShape[];
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
            previousFrontiers: input.previousGeometry?.frontierPolylines ?? input.nextGeometry.frontierPolylines,
            targetFrontiers: input.nextGeometry.frontierPolylines,
            worldBorderPolylines: input.nextGeometry.worldBorderPolylines,
        };

        return plan;
    }

    sample(
        plan: FillTransitionPlan,
        ctx: TransitionSampleContext,
    ): FillTransitionFrame {
        const typedPlan = plan as FrontierMorphFillPlan;

        // Step 1: Interpolate border polylines (same as border mode)
        const interpolatedBorders = interpolateMatchedPolylines(
            typedPlan.previousFrontiers,
            typedPlan.targetFrontiers,
            ctx.progress,
        );

        // Step 2: Convert to SharedPolyline format for executeChainWalk
        const sharedPolylines: SharedPolyline[] = interpolatedBorders.map(p => ({
            ownerPairKey: p.ownerPairKey,
            points: p.points,
            color: 0,
        }));

        const worldPolylines: SharedPolyline[] = typedPlan.worldBorderPolylines.map(p => ({
            ownerPairKey: p.ownerPairKey,
            points: [...p.points],
            color: 0,
        }));

        // Step 3: Re-chain into closed fill rings using the same algorithm
        // the compiler uses — guaranteeing fills follow borders exactly.
        const walkResult = executeChainWalk(sharedPolylines, worldPolylines);

        const regions: { ownerId: string; points: [number, number][] }[] = [];
        for (const loop of walkResult.loops) {
            if (!loop.closed) continue;
            const chain = flattenLoopPoints(loop);
            if (chain.length >= 3) {
                regions.push({
                    ownerId: loop.ownerId,
                    points: chain,
                });
            }
        }

        return { regions };
    }
}
