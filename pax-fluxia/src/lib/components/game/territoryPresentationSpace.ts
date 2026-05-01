import type {
    CanonicalFrontierPolyline,
    CanonicalGeometrySnapshot,
    CanonicalShell,
    CanonicalShellLoop,
    TerritoryRegionShape,
} from "$lib/territory/contracts/GeometryContracts";
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
} from "$lib/territory/contracts/FrontierTopologyContracts";
import type { StarState } from "$lib/types/game.types";

export interface TerritoryPresentationFrame {
    minX: number;
    minY: number;
    width: number;
    height: number;
}

const FRAME_KEY_PRECISION = 1000;
const ZERO_EPSILON = 0.000001;

const localizedGeometryCache = new WeakMap<
    CanonicalGeometrySnapshot,
    Map<string, CanonicalGeometrySnapshot>
>();

function quantizeFrameValue(value: number): number {
    return Math.round(value * FRAME_KEY_PRECISION) / FRAME_KEY_PRECISION;
}

function buildOffset(frame: TerritoryPresentationFrame): {
    dx: number;
    dy: number;
} {
    return {
        dx: -frame.minX,
        dy: -frame.minY,
    };
}

function translatePoint(
    point: readonly [number, number],
    dx: number,
    dy: number,
): [number, number] {
    return [point[0] + dx, point[1] + dy];
}

function translatePoints(
    points: readonly [number, number][],
    dx: number,
    dy: number,
): [number, number][] {
    return points.map((point) => translatePoint(point, dx, dy));
}

function translateRegion(
    region: TerritoryRegionShape,
    dx: number,
    dy: number,
): TerritoryRegionShape {
    return {
        ...region,
        points: translatePoints(region.points, dx, dy),
    };
}

function translatePolyline(
    polyline: CanonicalFrontierPolyline,
    dx: number,
    dy: number,
): CanonicalFrontierPolyline {
    return {
        ...polyline,
        points: translatePoints(polyline.points, dx, dy),
    };
}

function translateShell(
    shell: CanonicalShell,
    dx: number,
    dy: number,
): CanonicalShell {
    return {
        ...shell,
        points: translatePoints(shell.points, dx, dy),
    };
}

function translateShellLoop(
    shellLoop: CanonicalShellLoop,
    dx: number,
    dy: number,
): CanonicalShellLoop {
    return {
        ...shellLoop,
        points: translatePoints(shellLoop.points, dx, dy),
    };
}

function translateVertex(
    vertex: FrontierVertex,
    dx: number,
    dy: number,
): FrontierVertex {
    return {
        ...vertex,
        point: translatePoint(vertex.point, dx, dy),
    };
}

function translateSection(
    section: FrontierSection,
    dx: number,
    dy: number,
): FrontierSection {
    return {
        ...section,
        points: translatePoints(section.points, dx, dy),
    };
}

function translateTopology(
    topology: FrontierTopology,
    frame: TerritoryPresentationFrame,
    dx: number,
    dy: number,
    frameKey: string,
): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>();
    for (const [vertexId, vertex] of topology.vertices) {
        vertices.set(vertexId, translateVertex(vertex, dx, dy));
    }

    const sections = new Map<string, FrontierSection>();
    for (const [sectionId, section] of topology.sections) {
        sections.set(sectionId, translateSection(section, dx, dy));
    }

    return {
        ...topology,
        version: `${topology.version}@presentation:${frameKey}`,
        worldBounds: {
            width: frame.width,
            height: frame.height,
        },
        vertices,
        sections,
    };
}

export function buildTerritoryPresentationFrameKey(
    frame: TerritoryPresentationFrame,
): string {
    return [
        quantizeFrameValue(frame.minX),
        quantizeFrameValue(frame.minY),
        quantizeFrameValue(frame.width),
        quantizeFrameValue(frame.height),
    ].join(":");
}

export function localizeTerritoryPresentationStars(
    stars: ReadonlyArray<StarState>,
    frame: TerritoryPresentationFrame,
): StarState[] {
    if (
        Math.abs(frame.minX) <= ZERO_EPSILON &&
        Math.abs(frame.minY) <= ZERO_EPSILON
    ) {
        return stars as StarState[];
    }
    const { dx, dy } = buildOffset(frame);
    return stars.map((star) => ({
        ...star,
        x: star.x + dx,
        y: star.y + dy,
    }));
}

export function localizeCanonicalGeometrySnapshot(
    geometry: CanonicalGeometrySnapshot,
    frame: TerritoryPresentationFrame,
): CanonicalGeometrySnapshot {
    const frameKey = buildTerritoryPresentationFrameKey(frame);
    const { dx, dy } = buildOffset(frame);
    const currentBounds = geometry.frontierTopology.worldBounds;
    const alreadyLocal =
        Math.abs(dx) <= ZERO_EPSILON &&
        Math.abs(dy) <= ZERO_EPSILON &&
        Math.abs(currentBounds.width - frame.width) <= ZERO_EPSILON &&
        Math.abs(currentBounds.height - frame.height) <= ZERO_EPSILON;
    if (alreadyLocal) {
        return geometry;
    }

    let frameCache = localizedGeometryCache.get(geometry);
    if (!frameCache) {
        frameCache = new Map<string, CanonicalGeometrySnapshot>();
        localizedGeometryCache.set(geometry, frameCache);
    }
    const cached = frameCache.get(frameKey);
    if (cached) {
        return cached;
    }

    const frontierPolylines = geometry.frontierPolylines.map((polyline) =>
        translatePolyline(polyline, dx, dy),
    );
    const frontierPolylineById = new Map(
        frontierPolylines.map((polyline) => [polyline.frontierId, polyline]),
    );
    const worldBorderPolylines = geometry.worldBorderPolylines.map((polyline) =>
        translatePolyline(polyline, dx, dy),
    );

    const sharedFrontierMap = new Map<string, CanonicalFrontierPolyline[]>();
    for (const [ownerPairKey, polylines] of geometry.sharedFrontierMap) {
        sharedFrontierMap.set(
            ownerPairKey,
            polylines.map(
                (polyline) =>
                    frontierPolylineById.get(polyline.frontierId) ??
                    translatePolyline(polyline, dx, dy),
            ),
        );
    }

    const localized: CanonicalGeometrySnapshot = {
        ...geometry,
        version: `${geometry.version}@presentation:${frameKey}`,
        territoryRegions: geometry.territoryRegions.map((region) =>
            translateRegion(region, dx, dy),
        ),
        frontierPolylines,
        worldBorderPolylines,
        sharedFrontierMap,
        frontierTopology: translateTopology(
            geometry.frontierTopology,
            frame,
            dx,
            dy,
            frameKey,
        ),
        shells: geometry.shells.map((shell) => translateShell(shell, dx, dy)),
        shellLoops: geometry.shellLoops.map((shellLoop) =>
            translateShellLoop(shellLoop, dx, dy),
        ),
    };
    frameCache.set(frameKey, localized);
    return localized;
}
