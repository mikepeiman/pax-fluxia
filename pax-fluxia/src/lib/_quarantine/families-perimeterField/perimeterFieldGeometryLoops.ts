import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import { flattenRegionLoopPoints } from '../buildPowerVoronoiFrontierTopology';

export interface PerimeterGeometryLoop {
    ownerId: string;
    loopId: string;
    points: ReadonlyArray<[number, number]>;
    starIds?: readonly string[];
}

function hasUsableFrontierTopology(geometry: ResolvedGeometrySnapshot): boolean {
    return (
        geometry.diagnostics.topologyReliable &&
        geometry.frontierTopology.sections.size > 0 &&
        geometry.frontierTopology.loops.length > 0
    );
}

function buildTopologyLoopStarIds(
    geometry: ResolvedGeometrySnapshot,
    ownerId: string,
    sectionRefs: readonly { sectionId: string }[],
): string[] {
    const starIds = new Set<string>();
    for (const sectionRef of sectionRefs) {
        const section = geometry.frontierTopology.sections.get(sectionRef.sectionId);
        if (!section) continue;
        const influence =
            section.leftOwnerId === ownerId
                ? section.leftInfluence
                : section.rightOwnerId === ownerId
                  ? section.rightInfluence
                  : null;
        if (!influence) continue;
        if (influence.primaryStarId) starIds.add(influence.primaryStarId);
        if (influence.secondaryStarId) starIds.add(influence.secondaryStarId);
    }
    return [...starIds].sort();
}

function isUsableOwnedTopologyLoop(loop: { ownerId: string; signedArea: number }): boolean {
    return Boolean(loop.ownerId) && Math.abs(loop.signedArea) > 1e-6;
}

export function listPerimeterGeometryLoops(
    geometry: ResolvedGeometrySnapshot,
): PerimeterGeometryLoop[] {
    const shellStarIdsById = new Map(
        geometry.shells.map((shell) => [shell.shellId, shell.starIds] as const),
    );
    const shellLoops = geometry.shellLoops
        .filter((loop) => loop.classification === 'outer' && Boolean(loop.ownerId))
        .sort((a, b) => {
            if (a.ownerId !== b.ownerId) return a.ownerId.localeCompare(b.ownerId);
            return a.shellLoopId.localeCompare(b.shellLoopId);
        });
    const territoryRegionLoops = [...geometry.territoryRegions]
        .filter((region) => Boolean(region.ownerId))
        .sort((a, b) => {
            if (a.ownerId !== b.ownerId) {
                return a.ownerId.localeCompare(b.ownerId);
            }
            return a.regionId.localeCompare(b.regionId);
        })
        .map((region) => ({
            ownerId: region.ownerId,
            loopId: region.regionId,
            points: region.points,
            starIds: region.starIds,
        }));

    if (geometry.sourceMethod === 'power_voronoi') {
        if (shellLoops.length > 0) {
            return shellLoops.map((loop) => ({
                ownerId: loop.ownerId,
                loopId: loop.shellLoopId,
                points: loop.points,
                starIds:
                    loop.starIds ??
                    (loop.shellId ? shellStarIdsById.get(loop.shellId) : undefined),
            }));
        }
        if (territoryRegionLoops.length > 0) {
            return territoryRegionLoops;
        }
    }

    if (hasUsableFrontierTopology(geometry)) {
        const topologyLoops = geometry.frontierTopology.loops
            .filter(isUsableOwnedTopologyLoop)
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((loop) => {
                const points = flattenRegionLoopPoints(
                    loop,
                    geometry.frontierTopology.sections,
                );
                const starIds = buildTopologyLoopStarIds(
                    geometry,
                    loop.ownerId,
                    loop.sectionRefs,
                );
                return {
                    ownerId: loop.ownerId,
                    loopId: loop.id,
                    points,
                    starIds: starIds.length > 0 ? starIds : undefined,
                };
            })
            .filter((loop) => loop.points.length >= 3);
        if (topologyLoops.length > 0) {
            return topologyLoops;
        }
    }

    if (shellLoops.length > 0) {
        return shellLoops.map((loop) => ({
            ownerId: loop.ownerId,
            loopId: loop.shellLoopId,
            points: loop.points,
            starIds:
                loop.starIds ??
                (loop.shellId ? shellStarIdsById.get(loop.shellId) : undefined),
        }));
    }

    return territoryRegionLoops;
}
