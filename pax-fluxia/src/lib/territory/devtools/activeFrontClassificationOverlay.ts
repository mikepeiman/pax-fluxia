import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type {
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
    | 'active_section'
    | 'defect_topology_gap'
    | 'defect_unsupported_split'
    | 'defect_no_change_span';

export type OverlaySubSectionRole =
    | 'unchanged_subsection'
    | 'active_subsection'
    | 'defect_subsection';

export interface OverlaySubSectionClassification {
    role: OverlaySubSectionRole;
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
    sections: ReadonlyMap<string, OverlaySectionClassification>;
    vertices: ReadonlyMap<string, OverlayVertexClassification>;
}

const VERTEX_ROLE_PRIORITY: Record<OverlayVertexRole, number> = {
    structural_vertex: 0,
    stable_anchor: 1,
    defect_anchor: 2,
    front_anchor: 3,
};

const SECTION_ROLE_PRIORITY: Record<OverlaySectionRole, number> = {
    unchanged_section: 0,
    active_section: 1,
    defect_topology_gap: 2,
    defect_unsupported_split: 2,
    defect_no_change_span: 2,
};

function outcomeToSectionRole(outcome: ActiveFrontPairOutcome): OverlaySectionRole {
    switch (outcome) {
        case 'defect_topology_gap':
            return 'defect_topology_gap';
        case 'defect_unsupported_split_mode':
            return 'defect_unsupported_split';
        case 'defect_no_change_span':
            return 'defect_no_change_span';
        default:
            return 'unchanged_section';
    }
}

function roleLabel(role: OverlaySectionRole | OverlayVertexRole): string {
    switch (role) {
        case 'active_section':
            return 'active';
        case 'unchanged_section':
            return 'unchanged';
        case 'defect_topology_gap':
            return 'gap';
        case 'defect_unsupported_split':
            return 'split';
        case 'defect_no_change_span':
            return 'no-span';
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

function fullRange(pointCount: number, role: OverlaySubSectionRole): OverlaySubSectionClassification[] {
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

function mergeVertexRole(
    vertices: Map<string, OverlayVertexClassification>,
    vertexId: string,
    role: OverlayVertexRole,
    label: string,
): void {
    const existing = vertices.get(vertexId);
    if (!existing) {
        vertices.set(vertexId, {
            vertexId,
            role,
            labels: [label],
        });
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
        sections.set(sectionId, {
            sectionId,
            role,
            labels: [label],
            subSections,
        });
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

export function buildActiveFrontClassificationOverlayModel(
    topology: FrontierTopology | null,
    plan: ActiveFrontTransitionPlan | null,
): ActiveFrontClassificationOverlayModel {
    const sections = new Map<string, OverlaySectionClassification>();
    const vertices = new Map<string, OverlayVertexClassification>();

    if (!topology) {
        return { sections, vertices };
    }

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
            role: 'unchanged_section',
            labels: ['unchanged'],
            subSections: fullRange(section.points.length, 'unchanged_subsection'),
        });
    }

    if (!plan) {
        return { sections, vertices };
    }

    for (const vertexId of plan.diagnostics.stableAnchorIds) {
        mergeVertexRole(vertices, vertexId, 'stable_anchor', 'stable');
    }

    for (const pair of plan.diagnostics.pairDiagnostics) {
        if (pair.outcome === 'planned') continue;
        const role = outcomeToSectionRole(pair.outcome);
        const label = roleLabel(role);
        mergeVertexRole(vertices, pair.anchorStartId, 'defect_anchor', label);
        mergeVertexRole(vertices, pair.anchorEndId, 'defect_anchor', label);
        for (const sectionId of pair.defectSectionIds) {
            const pointCount = topology.sections.get(sectionId)?.points.length ?? 0;
            mergeSectionRole(
                sections,
                sectionId,
                role,
                label,
                fullRange(pointCount, 'defect_subsection'),
            );
        }
    }

    plan.fronts.forEach((front, frontIndex) => {
        mergeVertexRole(vertices, front.anchorStartId, 'front_anchor', `front:${frontIndex}:start`);
        mergeVertexRole(vertices, front.anchorEndId, 'front_anchor', `front:${frontIndex}:end`);
        for (const [sectionId, span] of front.sectionSpans) {
            if (!front.activeSectionIds.has(sectionId)) continue;
            const pointCount = topology.sections.get(sectionId)?.points.length ?? 0;
            const localStart =
                span.pathPointOffset + (span.activeStartIndex - span.startIndex);
            const localEnd =
                span.pathPointOffset + (span.activeEndIndex - span.startIndex);
            mergeSectionRole(
                sections,
                sectionId,
                'active_section',
                `active:${frontIndex}:${localStart}-${localEnd}`,
                buildActiveRanges(pointCount, localStart, localEnd),
            );
        }
    });

    return { sections, vertices };
}

export function formatOverlaySectionLabel(section: OverlaySectionClassification): string {
    const parts = [roleLabel(section.role)];
    const active = section.subSections.find((sub) => sub.role === 'active_subsection');
    if (active) {
        parts.push(`${active.startPointIndex}-${active.endPointIndex}`);
    }
    return parts.join(' ');
}
