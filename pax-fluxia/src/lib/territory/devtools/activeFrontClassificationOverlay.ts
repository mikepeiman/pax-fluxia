import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type {
    ActiveFrontPairDiagnostic,
    ActiveFrontPairOutcome,
    ActiveFrontTransitionPlan,
} from '../layers/transition/ActiveFrontTransition';

export type OverlayVertexRole =
    | 'structural_vertex'
    | 'stable_anchor'
    | 'defect_anchor'
    | 'front_anchor';

export type OverlaySectionRole =
    | 'unchanged_section'
    | 'no_motion_section'
    | 'active_section'
    | 'source_section'
    | 'source_no_motion_section'
    | 'defect_topology_gap'
    | 'defect_unsupported_split';

export interface OverlaySubSectionClassification {
    role: 'unchanged_subsection' | 'active_subsection' | 'defect_subsection';
    startPointIndex: number;
    endPointIndex: number;
}

export interface OverlaySectionClassification {
    sectionId: string;
    role: OverlaySectionRole;
    labels: string[];
    subSections: OverlaySubSectionClassification[];
}

export interface OverlayVertexClassification {
    vertexId: string;
    role: OverlayVertexRole;
    labels: string[];
}

export interface ActiveFrontClassificationOverlayModel {
    nextSections: ReadonlyMap<string, OverlaySectionClassification>;
    nextVertices: ReadonlyMap<string, OverlayVertexClassification>;
    prevSections: ReadonlyMap<string, OverlaySectionClassification>;
    prevVertices: ReadonlyMap<string, OverlayVertexClassification>;
}

const VERTEX_ROLE_PRIORITY: Record<OverlayVertexRole, number> = {
    structural_vertex: 0,
    stable_anchor: 1,
    defect_anchor: 2,
    front_anchor: 3,
};

const SECTION_ROLE_PRIORITY: Record<OverlaySectionRole, number> = {
    unchanged_section: 0,
    no_motion_section: 1,
    source_section: 1,
    source_no_motion_section: 2,
    active_section: 3,
    defect_topology_gap: 4,
    defect_unsupported_split: 4,
};

function fullRange(
    pointCount: number,
    role: 'unchanged_subsection' | 'active_subsection' | 'defect_subsection',
): OverlaySubSectionClassification[] {
    if (pointCount <= 0) return [];
    return [{ role, startPointIndex: 0, endPointIndex: pointCount - 1 }];
}

function buildActiveRanges(
    pointCount: number,
    localStartIndex: number,
    localEndIndex: number,
): OverlaySubSectionClassification[] {
    if (pointCount <= 0) return [];
    const start = Math.max(0, Math.min(localStartIndex, pointCount - 1));
    const end = Math.max(start, Math.min(localEndIndex, pointCount - 1));
    const out: OverlaySubSectionClassification[] = [];
    if (start > 0) {
        out.push({
            role: 'unchanged_subsection',
            startPointIndex: 0,
            endPointIndex: start - 1,
        });
    }
    out.push({
        role: 'active_subsection',
        startPointIndex: start,
        endPointIndex: end,
    });
    if (end < pointCount - 1) {
        out.push({
            role: 'unchanged_subsection',
            startPointIndex: end + 1,
            endPointIndex: pointCount - 1,
        });
    }
    return out;
}

function roleLabel(role: OverlaySectionRole | OverlayVertexRole): string {
    switch (role) {
        case 'active_section':
            return 'active';
        case 'source_section':
            return 'source';
        case 'source_no_motion_section':
            return 'source-still';
        case 'no_motion_section':
            return 'still';
        case 'unchanged_section':
            return 'unchanged';
        case 'defect_topology_gap':
            return 'gap';
        case 'defect_unsupported_split':
            return 'split';
        case 'front_anchor':
            return 'front';
        case 'defect_anchor':
            return 'defect';
        case 'stable_anchor':
            return 'stable';
        default:
            return 'vertex';
    }
}

function sectionRoleForDefect(outcome: ActiveFrontPairOutcome): OverlaySectionRole {
    switch (outcome) {
        case 'defect_topology_gap':
            return 'defect_topology_gap';
        case 'defect_unsupported_split_mode':
            return 'defect_unsupported_split';
        default:
            return 'unchanged_section';
    }
}

function mergeVertexRole(
    vertices: Map<string, OverlayVertexClassification>,
    vertexId: string,
    role: OverlayVertexRole,
    label: string,
): void {
    const existing = vertices.get(vertexId);
    if (!existing) {
        vertices.set(vertexId, { vertexId, role, labels: [label] });
        return;
    }
    const nextRole =
        VERTEX_ROLE_PRIORITY[role] > VERTEX_ROLE_PRIORITY[existing.role]
            ? role
            : existing.role;
    const labels = existing.labels.includes(label)
        ? existing.labels
        : [...existing.labels, label];
    vertices.set(vertexId, {
        ...existing,
        role: nextRole,
        labels,
    });
}

function mergeSectionRole(
    sections: Map<string, OverlaySectionClassification>,
    sectionId: string,
    role: OverlaySectionRole,
    label: string,
    subSections: OverlaySubSectionClassification[],
): void {
    const existing = sections.get(sectionId);
    if (!existing) {
        sections.set(sectionId, { sectionId, role, labels: [label], subSections });
        return;
    }
    const nextRole =
        SECTION_ROLE_PRIORITY[role] > SECTION_ROLE_PRIORITY[existing.role]
            ? role
            : existing.role;
    const labels = existing.labels.includes(label)
        ? existing.labels
        : [...existing.labels, label];
    const nextSubSections =
        SECTION_ROLE_PRIORITY[role] >= SECTION_ROLE_PRIORITY[existing.role]
            ? subSections
            : existing.subSections;
    sections.set(sectionId, {
        ...existing,
        role: nextRole,
        labels,
        subSections: nextSubSections,
    });
}

function seedTopologyLayer(
    topology: FrontierTopology | null,
    sectionRole: OverlaySectionRole,
): {
    sections: Map<string, OverlaySectionClassification>;
    vertices: Map<string, OverlayVertexClassification>;
} {
    const sections = new Map<string, OverlaySectionClassification>();
    const vertices = new Map<string, OverlayVertexClassification>();
    if (!topology) return { sections, vertices };
    for (const [vertexId] of topology.vertices) {
        vertices.set(vertexId, {
            vertexId,
            role: 'structural_vertex',
            labels: ['vertex'],
        });
    }
    for (const [sectionId, section] of topology.sections) {
        sections.set(sectionId, {
            sectionId,
            role: sectionRole,
            labels: [roleLabel(sectionRole)],
            subSections: fullRange(
                section.points.length,
                sectionRole === 'active_section' ? 'active_subsection' : 'unchanged_subsection',
            ),
        });
    }
    return { sections, vertices };
}

function collectPathSectionIds(pathSectionIds: string[][]): string[] {
    return Array.from(new Set(pathSectionIds.flatMap((ids) => ids))).sort();
}

function collectVerticesForSections(
    topology: FrontierTopology | null,
    sectionIds: readonly string[],
): string[] {
    if (!topology) return [];
    const out = new Set<string>();
    for (const sectionId of sectionIds) {
        const section = topology.sections.get(sectionId);
        if (!section) continue;
        out.add(section.startVertexId);
        out.add(section.endVertexId);
    }
    return [...out];
}

function markPairDiagnostics(
    prevTopology: FrontierTopology | null,
    nextTopology: FrontierTopology | null,
    pair: ActiveFrontPairDiagnostic,
    prevSections: Map<string, OverlaySectionClassification>,
    nextSections: Map<string, OverlaySectionClassification>,
    prevVertices: Map<string, OverlayVertexClassification>,
    nextVertices: Map<string, OverlayVertexClassification>,
): void {
    if (pair.outcome === 'planned') return;

    if (pair.outcome === 'no_change_span') {
        const prevSectionIds = collectPathSectionIds(pair.prevPathSectionIds);
        const nextSectionIds = collectPathSectionIds(pair.nextPathSectionIds);
        for (const sectionId of prevSectionIds) {
            const pointCount = prevTopology?.sections.get(sectionId)?.points.length ?? 0;
            mergeSectionRole(
                prevSections,
                sectionId,
                'source_no_motion_section',
                'source-still',
                fullRange(pointCount, 'unchanged_subsection'),
            );
        }
        for (const sectionId of nextSectionIds) {
            const pointCount = nextTopology?.sections.get(sectionId)?.points.length ?? 0;
            mergeSectionRole(
                nextSections,
                sectionId,
                'no_motion_section',
                'still',
                fullRange(pointCount, 'unchanged_subsection'),
            );
        }
        return;
    }

    const role = sectionRoleForDefect(pair.outcome);
    const label = roleLabel(role);
    mergeVertexRole(prevVertices, pair.anchorStartId, 'defect_anchor', label);
    mergeVertexRole(prevVertices, pair.anchorEndId, 'defect_anchor', label);
    mergeVertexRole(nextVertices, pair.anchorStartId, 'defect_anchor', label);
    mergeVertexRole(nextVertices, pair.anchorEndId, 'defect_anchor', label);

    const prevSectionIds = collectPathSectionIds(pair.prevPathSectionIds);
    const nextSectionIds = collectPathSectionIds(pair.nextPathSectionIds);
    for (const sectionId of prevSectionIds) {
        const pointCount = prevTopology?.sections.get(sectionId)?.points.length ?? 0;
        mergeSectionRole(
            prevSections,
            sectionId,
            role,
            `prev-${label}`,
            fullRange(pointCount, 'defect_subsection'),
        );
    }
    for (const sectionId of nextSectionIds) {
        const pointCount = nextTopology?.sections.get(sectionId)?.points.length ?? 0;
        mergeSectionRole(
            nextSections,
            sectionId,
            role,
            label,
            fullRange(pointCount, 'defect_subsection'),
        );
    }
}

export function buildActiveFrontClassificationOverlayModel(
    prevTopology: FrontierTopology | null,
    nextTopology: FrontierTopology | null,
    plan: ActiveFrontTransitionPlan | null,
): ActiveFrontClassificationOverlayModel {
    const nextLayer = seedTopologyLayer(nextTopology, 'unchanged_section');
    const prevLayer = seedTopologyLayer(null, 'source_section');

    if (!plan) {
        return {
            nextSections: nextLayer.sections,
            nextVertices: nextLayer.vertices,
            prevSections: prevLayer.sections,
            prevVertices: prevLayer.vertices,
        };
    }

    for (const vertexId of plan.diagnostics.stableAnchorIds) {
        mergeVertexRole(nextLayer.vertices, vertexId, 'stable_anchor', 'stable');
        if (prevTopology?.vertices.has(vertexId)) {
            mergeVertexRole(prevLayer.vertices, vertexId, 'stable_anchor', 'stable');
        }
    }

    for (const pair of plan.diagnostics.pairDiagnostics) {
        markPairDiagnostics(
            prevTopology,
            nextTopology,
            pair,
            prevLayer.sections,
            nextLayer.sections,
            prevLayer.vertices,
            nextLayer.vertices,
        );
    }

    plan.fronts.forEach((front, frontIndex) => {
        mergeVertexRole(nextLayer.vertices, front.anchorStartId, 'front_anchor', `front:${frontIndex}:start`);
        mergeVertexRole(nextLayer.vertices, front.anchorEndId, 'front_anchor', `front:${frontIndex}:end`);
        if (prevTopology?.vertices.has(front.anchorStartId)) {
            mergeVertexRole(prevLayer.vertices, front.anchorStartId, 'front_anchor', `front:${frontIndex}:start`);
        }
        if (prevTopology?.vertices.has(front.anchorEndId)) {
            mergeVertexRole(prevLayer.vertices, front.anchorEndId, 'front_anchor', `front:${frontIndex}:end`);
        }

        const prevSectionIds = new Set<string>();
        front.prevPaths.forEach((path) => path.sectionIds.forEach((id) => prevSectionIds.add(id)));
        for (const sectionId of prevSectionIds) {
            const pointCount = prevTopology?.sections.get(sectionId)?.points.length ?? 0;
            mergeSectionRole(
                prevLayer.sections,
                sectionId,
                'source_section',
                `source:${frontIndex}`,
                fullRange(pointCount, 'unchanged_subsection'),
            );
        }
        for (const vertexId of collectVerticesForSections(prevTopology, [...prevSectionIds])) {
            mergeVertexRole(prevLayer.vertices, vertexId, 'stable_anchor', 'source');
        }

        for (const [sectionId, span] of front.sectionSpans) {
            if (!front.activeSectionIds.has(sectionId)) continue;
            const pointCount = nextTopology?.sections.get(sectionId)?.points.length ?? 0;
            const localStart =
                span.pathPointOffset + (span.activeStartIndex - span.startIndex);
            const localEnd =
                span.pathPointOffset + (span.activeEndIndex - span.startIndex);
            mergeSectionRole(
                nextLayer.sections,
                sectionId,
                'active_section',
                `active:${frontIndex}:${localStart}-${localEnd}`,
                buildActiveRanges(pointCount, localStart, localEnd),
            );
        }
    });

    return {
        nextSections: nextLayer.sections,
        nextVertices: nextLayer.vertices,
        prevSections: prevLayer.sections,
        prevVertices: prevLayer.vertices,
    };
}

export function formatOverlaySectionLabel(section: OverlaySectionClassification): string {
    const parts = [roleLabel(section.role)];
    const active = section.subSections.find((sub) => sub.role === 'active_subsection');
    if (active) parts.push(`${active.startPointIndex}-${active.endPointIndex}`);
    return parts.join(' ');
}
