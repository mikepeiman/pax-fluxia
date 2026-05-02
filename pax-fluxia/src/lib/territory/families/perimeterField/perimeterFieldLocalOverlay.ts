import type { MetaballSolveBounds } from '../../../renderers/MetaballRenderer';
import type { FrontierSection } from '../../contracts/FrontierTopologyContracts';
export {
    buildDerivedMetaballSceneInput,
    buildLocalizedMetaballSceneInput,
} from '../metaball/metaballLocalOverlay';
import type { TransitionPlan } from './perimeterFieldTransitionTypes';

type MutableBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

function includePoint(
    bounds: MutableBounds | null,
    x: number,
    y: number,
): MutableBounds {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return bounds ?? {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
        };
    }
    if (!bounds) {
        return {
            minX: x,
            minY: y,
            maxX: x,
            maxY: y,
        };
    }
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    return bounds;
}

function includePolyline(
    bounds: MutableBounds | null,
    points: ReadonlyArray<[number, number]>,
): MutableBounds | null {
    let nextBounds = bounds;
    for (const [x, y] of points) {
        nextBounds = includePoint(nextBounds, x, y);
    }
    return nextBounds;
}

function includeChangedSections(
    bounds: MutableBounds | null,
    sections: ReadonlyMap<string, FrontierSection>,
    sectionIds: ReadonlySet<string>,
): MutableBounds | null {
    let nextBounds = bounds;
    for (const sectionId of sectionIds) {
        const section = sections.get(sectionId);
        if (!section) continue;
        nextBounds = includePolyline(nextBounds, section.points);
    }
    return nextBounds;
}

function finalizeBounds(
    bounds: MutableBounds,
    padding: number,
): MetaballSolveBounds {
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const maxX = bounds.maxX + padding;
    const maxY = bounds.maxY + padding;
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
    };
}

export function buildPerimeterFieldSolveBounds(params: {
    plan: TransitionPlan;
    influenceRadiusPx: number;
    blurPx: number;
    borderWidth: number;
    cellSize: number;
}): MetaballSolveBounds | null {
    let bounds: MutableBounds | null = null;

    bounds = includeChangedSections(
        bounds,
        params.plan.prevGeometry.frontierTopology.sections,
        params.plan.changedSections.removedSectionIds,
    );
    bounds = includeChangedSections(
        bounds,
        params.plan.nextGeometry.frontierTopology.sections,
        params.plan.changedSections.addedSectionIds,
    );

    for (const mover of params.plan.movers) {
        bounds = includePoint(bounds, mover.prevPos.x, mover.prevPos.y);
        bounds = includePoint(bounds, mover.nextPos.x, mover.nextPos.y);
        if (mover.pathControlPoint) {
            bounds = includePoint(
                bounds,
                mover.pathControlPoint.x,
                mover.pathControlPoint.y,
            );
        }
    }

    for (const appearing of params.plan.appearing) {
        bounds = includePoint(bounds, appearing.v.x, appearing.v.y);
    }

    for (const disappearing of params.plan.disappearing) {
        bounds = includePoint(bounds, disappearing.v.x, disappearing.v.y);
    }

    if (!bounds) return null;

    const padding = Math.max(
        params.cellSize * 2,
        params.influenceRadiusPx * 2 +
            params.blurPx * 6 +
            params.borderWidth * 2,
    );

    return finalizeBounds(bounds, padding);
}
