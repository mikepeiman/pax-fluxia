import type {
    FrontierSection,
    FrontierTopology,
    RegionLoop,
    SectionRef,
} from '../contracts/FrontierTopologyContracts';

const DEFAULT_MAX_FAILURES = 50;
const POINT_EPSILON_PX = 0.02;

export interface FrontierTopologyOracleOptions {
    readonly maxFailures?: number;
}

export interface FrontierTopologyOracleResult {
    readonly ok: boolean;
    readonly failureCount: number;
    readonly failures: readonly string[];
}

function pointsMatch(
    a: readonly [number, number],
    b: readonly [number, number],
): boolean {
    return (
        Math.abs(a[0] - b[0]) <= POINT_EPSILON_PX &&
        Math.abs(a[1] - b[1]) <= POINT_EPSILON_PX
    );
}

function includesId(ids: readonly string[] | undefined, id: string): boolean {
    return ids?.includes(id) ?? false;
}

function uniqueOwners(section: FrontierSection): readonly string[] {
    return section.leftOwnerId === section.rightOwnerId
        ? [section.leftOwnerId]
        : [section.leftOwnerId, section.rightOwnerId];
}

function segmentStartVertex(section: FrontierSection, ref: SectionRef): string {
    return ref.direction === 'forward' ? section.startVertexId : section.endVertexId;
}

function segmentEndVertex(section: FrontierSection, ref: SectionRef): string {
    return ref.direction === 'forward' ? section.endVertexId : section.startVertexId;
}

function segmentPoints(
    section: FrontierSection,
    ref: SectionRef,
): readonly [number, number][] {
    return ref.direction === 'forward' ? section.points : [...section.points].reverse();
}

function loopKey(loop: RegionLoop, index: number): string {
    return loop.id || `loop#${index}`;
}

export function validateFrontierTopologyInvariants(
    topology: FrontierTopology,
    options: FrontierTopologyOracleOptions = {},
): FrontierTopologyOracleResult {
    const maxFailures = options.maxFailures ?? DEFAULT_MAX_FAILURES;
    const failures: string[] = [];
    let failureCount = 0;

    function fail(message: string): void {
        failureCount += 1;
        if (failures.length < maxFailures) {
            failures.push(message);
        }
    }

    function checkNoDuplicateIds(
        context: string,
        ids: readonly string[],
    ): void {
        const seen = new Set<string>();
        for (const id of ids) {
            if (seen.has(id)) {
                fail(`${context}: duplicate id ${id}`);
            }
            seen.add(id);
        }
    }

    for (const vertex of topology.vertices.values()) {
        checkNoDuplicateIds(
            `vertex-incident-index ${vertex.id}`,
            vertex.incidentSectionIds,
        );
        for (const sectionId of vertex.incidentSectionIds) {
            const section = topology.sections.get(sectionId);
            if (!section) {
                fail(`vertex-incident-index ${vertex.id}: dangling section ${sectionId}`);
                continue;
            }
            if (
                section.startVertexId !== vertex.id &&
                section.endVertexId !== vertex.id
            ) {
                fail(
                    `vertex-incident-index ${vertex.id}: section ${sectionId} does not touch vertex`,
                );
            }
            if (!includesId(topology.sectionsByVertex.get(vertex.id), sectionId)) {
                fail(
                    `vertex-incident-index ${vertex.id}: section ${sectionId} missing from sectionsByVertex`,
                );
            }
        }
    }

    for (const section of topology.sections.values()) {
        const startVertex = topology.vertices.get(section.startVertexId);
        const endVertex = topology.vertices.get(section.endVertexId);

        if (section.startVertexId === section.endVertexId) {
            fail(
                `section ${section.id}: degenerate section start and end vertex are identical`,
            );
        }
        if (section.points.length < 2) {
            fail(`section ${section.id}: fewer than two points`);
        }
        if (!Number.isFinite(section.length) || section.length <= 0) {
            fail(`section ${section.id}: non-positive length ${section.length}`);
        }

        if (!startVertex) {
            fail(`section ${section.id}: missing start vertex ${section.startVertexId}`);
        }
        if (!endVertex) {
            fail(`section ${section.id}: missing end vertex ${section.endVertexId}`);
        }

        if (!includesId(topology.sectionsByVertex.get(section.startVertexId), section.id)) {
            fail(
                `section ${section.id}: missing from sectionsByVertex at start ${section.startVertexId}`,
            );
        }
        if (!includesId(topology.sectionsByVertex.get(section.endVertexId), section.id)) {
            fail(
                `section ${section.id}: missing from sectionsByVertex at end ${section.endVertexId}`,
            );
        }

        if (startVertex && !includesId(startVertex.incidentSectionIds, section.id)) {
            fail(
                `section ${section.id}: missing from start vertex incident sections ${section.startVertexId}`,
            );
        }
        if (endVertex && !includesId(endVertex.incidentSectionIds, section.id)) {
            fail(
                `section ${section.id}: missing from end vertex incident sections ${section.endVertexId}`,
            );
        }

        if (!includesId(topology.sectionsByOwnerPair.get(section.ownerPairKey), section.id)) {
            fail(
                `section ${section.id}: missing from owner-pair index ${section.ownerPairKey}`,
            );
        }
        for (const ownerId of uniqueOwners(section)) {
            if (!includesId(topology.sectionsByOwner.get(ownerId), section.id)) {
                fail(`section ${section.id}: missing from owner index ${ownerId}`);
            }
        }

        const firstPoint = section.points[0];
        const lastPoint = section.points[section.points.length - 1];
        if (!firstPoint || !lastPoint) {
            fail(`section ${section.id}: missing endpoint point data`);
            continue;
        }
        if (startVertex && !pointsMatch(firstPoint, startVertex.point)) {
            fail(`section ${section.id}: start point does not match start vertex`);
        }
        if (endVertex && !pointsMatch(lastPoint, endVertex.point)) {
            fail(`section ${section.id}: end point does not match end vertex`);
        }
    }

    for (const [vertexId, sectionIds] of topology.sectionsByVertex.entries()) {
        checkNoDuplicateIds(`sectionsByVertex ${vertexId}`, sectionIds);
        if (!topology.vertices.has(vertexId)) {
            fail(`sectionsByVertex ${vertexId}: missing vertex`);
        }
        for (const sectionId of sectionIds) {
            const section = topology.sections.get(sectionId);
            if (!section) {
                fail(`sectionsByVertex ${vertexId}: dangling section ${sectionId}`);
                continue;
            }
            if (
                section.startVertexId !== vertexId &&
                section.endVertexId !== vertexId
            ) {
                fail(
                    `sectionsByVertex ${vertexId}: section ${sectionId} does not touch vertex`,
                );
            }
        }
    }

    for (const [ownerPairKey, sectionIds] of topology.sectionsByOwnerPair.entries()) {
        checkNoDuplicateIds(`sectionsByOwnerPair ${ownerPairKey}`, sectionIds);
        for (const sectionId of sectionIds) {
            const section = topology.sections.get(sectionId);
            if (!section) {
                fail(`sectionsByOwnerPair ${ownerPairKey}: dangling section ${sectionId}`);
                continue;
            }
            if (section.ownerPairKey !== ownerPairKey) {
                fail(
                    `sectionsByOwnerPair ${ownerPairKey}: section ${sectionId} belongs to ${section.ownerPairKey}`,
                );
            }
        }
    }

    for (const [ownerId, sectionIds] of topology.sectionsByOwner.entries()) {
        checkNoDuplicateIds(`sectionsByOwner ${ownerId}`, sectionIds);
        for (const sectionId of sectionIds) {
            const section = topology.sections.get(sectionId);
            if (!section) {
                fail(`sectionsByOwner ${ownerId}: dangling section ${sectionId}`);
                continue;
            }
            if (section.leftOwnerId !== ownerId && section.rightOwnerId !== ownerId) {
                fail(
                    `sectionsByOwner ${ownerId}: section ${sectionId} does not include owner`,
                );
            }
        }
    }

    topology.loops.forEach((loop, index) => {
        const key = loopKey(loop, index);
        const seenLoopSections = new Set<string>();
        const loopPoints: [number, number][] = [];
        let firstVertexId: string | null = null;
        let previousEndVertexId: string | null = null;

        if (loop.sectionRefs.length === 0) {
            fail(`loop ${key}: empty sectionRefs`);
            return;
        }

        for (let refIndex = 0; refIndex < loop.sectionRefs.length; refIndex++) {
            const ref = loop.sectionRefs[refIndex]!;
            if (seenLoopSections.has(ref.sectionId)) {
                fail(`loop ${key}: duplicate section ref ${ref.sectionId}`);
            }
            seenLoopSections.add(ref.sectionId);

            const section = topology.sections.get(ref.sectionId);
            if (!section) {
                fail(`loop ${key}: dangling section ref ${ref.sectionId}`);
                continue;
            }
            if (section.leftOwnerId !== loop.ownerId && section.rightOwnerId !== loop.ownerId) {
                fail(
                    `loop ${key}: section ${ref.sectionId} does not include owner ${loop.ownerId}`,
                );
            }

            const currentStartVertexId = segmentStartVertex(section, ref);
            const currentEndVertexId = segmentEndVertex(section, ref);
            if (firstVertexId === null) {
                firstVertexId = currentStartVertexId;
            }
            if (
                previousEndVertexId !== null &&
                previousEndVertexId !== currentStartVertexId
            ) {
                fail(
                    `loop ${key}: disconnected section chain at ${previousEndVertexId} -> ${currentStartVertexId}`,
                );
            }
            previousEndVertexId = currentEndVertexId;

            const points = segmentPoints(section, ref);
            if (refIndex === 0) {
                loopPoints.push(...points);
            } else {
                loopPoints.push(...points.slice(1));
            }
        }

        if (
            firstVertexId !== null &&
            previousEndVertexId !== null &&
            firstVertexId !== previousEndVertexId
        ) {
            fail(`loop ${key}: open vertex chain ${firstVertexId} -> ${previousEndVertexId}`);
        }

        const firstPoint = loopPoints[0];
        const lastPoint = loopPoints[loopPoints.length - 1];
        if (!firstPoint || !lastPoint || !pointsMatch(firstPoint, lastPoint)) {
            fail(`loop ${key}: reconstructed point chain is open`);
        }
    });

    if (failureCount > failures.length) {
        failures.push(
            `frontier topology oracle truncated ${
                failureCount - failures.length
            } additional failure(s)`,
        );
    }

    return {
        ok: failureCount === 0,
        failureCount,
        failures,
    };
}
