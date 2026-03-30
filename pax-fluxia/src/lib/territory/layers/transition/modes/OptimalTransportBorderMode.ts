import type {
    BorderTransitionFrame,
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
    TransitionSampleContext,
} from '../BorderTransitionMode';
import type { FrontierTopology, FrontierSection } from '../../../contracts/FrontierTopologyContracts';
import { otInterpolatePolyline, polylineMidpoint } from '../interpolatePolylines';

interface OptimalTransportBorderPlan extends BorderTransitionPlan {
    previousTopology?: FrontierTopology;
    targetTopology?: FrontierTopology;
}

export class OptimalTransportBorderMode implements BorderTransitionMode {
    readonly id = 'optimal_transport' as const;
    readonly label = 'Optimal-Transport Correspondence Border';

    plan(input: BorderTransitionPlanInput): BorderTransitionPlan {
        return {
            planId: `border:optimal_transport:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            previousTopology: input.previousGeometry?.frontierTopology,
            targetTopology: input.nextGeometry.frontierTopology,
        } as OptimalTransportBorderPlan;
    }

    sample(
        plan: BorderTransitionPlan,
        ctx: TransitionSampleContext,
    ): BorderTransitionFrame {
        const typedPlan = plan as OptimalTransportBorderPlan;
        const t = ctx.progress;
        
        const frontiers: { ownerPairKey: string; points: [number, number][] }[] = [];

        if (!typedPlan.previousTopology || !typedPlan.targetTopology) {
            return { frontiers: [] };
        }

        const prevTopology = typedPlan.previousTopology;
        const nextTopology = typedPlan.targetTopology;

        const matchedIds = new Set<string>();
        const unmatchedNext = new Map<string, FrontierSection[]>();
        const unmatchedPrev = new Map<string, FrontierSection[]>();

        // 1) Find matches + group unmatched NEXT sections
        for (const section of nextTopology.sections.values()) {
            if (section.kind !== 'owner_border') continue;
            
            if (prevTopology.sections.has(section.id)) {
                matchedIds.add(section.id);
                // Matched static sections pass through unchanged (or lerped slightly if points drifted)
                // We assume strict topological identity means strict geometric identity
                frontiers.push({
                    ownerPairKey: section.ownerPairKey,
                    points: section.points,
                });
            } else {
                const arr = unmatchedNext.get(section.ownerPairKey) || [];
                arr.push(section);
                unmatchedNext.set(section.ownerPairKey, arr);
            }
        }

        // 2) Group unmatched PREV sections
        for (const section of prevTopology.sections.values()) {
            if (section.kind !== 'owner_border') continue;
            if (matchedIds.has(section.id)) continue;

            const arr = unmatchedPrev.get(section.ownerPairKey) || [];
            arr.push(section);
            unmatchedPrev.set(section.ownerPairKey, arr);
        }

        // 3) OT Morph the unmatched sections (Pairing by ownerPairKey)
        const allKeys = new Set([...unmatchedNext.keys(), ...unmatchedPrev.keys()]);

        for (const key of allKeys) {
            const nextSections = unmatchedNext.get(key) || [];
            const prevSections = unmatchedPrev.get(key) || [];

            const maxLen = Math.max(nextSections.length, prevSections.length);
            for (let i = 0; i < maxLen; i++) {
                if (i >= prevSections.length) {
                    // Spawned: only in next. Fade in from midpoint.
                    const targetPoints = nextSections[i].points;
                    const mid = polylineMidpoint(targetPoints);
                    const sampleCount = Math.max(targetPoints.length, 4);
                    frontiers.push({
                        ownerPairKey: key,
                        points: otInterpolatePolyline([mid, mid], targetPoints, t, sampleCount),
                    });
                } else if (i >= nextSections.length) {
                    // Vanished: only in prev. Fade out to midpoint.
                    const sourcePoints = prevSections[i].points;
                    const mid = polylineMidpoint(sourcePoints);
                    const sampleCount = Math.max(sourcePoints.length, 4);
                    frontiers.push({
                        ownerPairKey: key,
                        points: otInterpolatePolyline(sourcePoints, [mid, mid], t, sampleCount),
                    });
                } else {
                    // Drifted: match them by arbitrary array index (OT morph)
                    // Since the unchanged sections are protected and perfectly static above, 
                    // this index heuristic only affects the localized, newly drawn boundary.
                    const sourcePoints = prevSections[i].points;
                    const targetPoints = nextSections[i].points;
                    const sampleCount = Math.max(sourcePoints.length, targetPoints.length, 4);
                    frontiers.push({
                        ownerPairKey: key,
                        points: otInterpolatePolyline(sourcePoints, targetPoints, t, sampleCount),
                    });
                }
            }
        }

        return { frontiers };
    }
}
