import * as PIXI from 'pixi.js';
import type { FrontierTopology } from '../../contracts/FrontierTopologyContracts';
import type { ActiveFrontTransitionPlan } from '../../layers/transition/ActiveFrontTransition';
import {
    buildActiveFrontClassificationOverlayModel,
    formatOverlaySectionLabel,
    type OverlaySectionClassification,
    type OverlaySubSectionClassification,
    type OverlayVertexClassification,
} from '../../devtools/activeFrontClassificationOverlay';
import { overlayConfig } from '../../devtools/overlayConfig';

const COL = {
    unchangedSection: 0x4b5573,
    activeSection: 0xf0b400,
    activeSubSection: 0x52ff8f,
    defectGap: 0xff4d6d,
    defectSplit: 0xff8c42,
    defectNoSpan: 0xd06bff,
    stableAnchor: 0x3cdcff,
    frontAnchor: 0x72ff5e,
    defectAnchor: 0xff4d6d,
    structuralVertex: 0xa0a8c8,
    sampleDot: 0xc88dff,
    bridge: 0x52ff8f,
    labelFill: 0xf4f7ff,
} as const;

function sectionColor(section: OverlaySectionClassification): number {
    switch (section.role) {
        case 'active_section':
            return COL.activeSection;
        case 'defect_topology_gap':
            return COL.defectGap;
        case 'defect_unsupported_split':
            return COL.defectSplit;
        case 'defect_no_change_span':
            return COL.defectNoSpan;
        default:
            return COL.unchangedSection;
    }
}

function vertexColor(vertex: OverlayVertexClassification): number {
    switch (vertex.role) {
        case 'front_anchor':
            return COL.frontAnchor;
        case 'defect_anchor':
            return COL.defectAnchor;
        case 'stable_anchor':
            return COL.stableAnchor;
        default:
            return COL.structuralVertex;
    }
}

export class PixiTerritoryDebugOverlay {
    private readonly gfx: PIXI.Graphics;
    private readonly labelContainer: PIXI.Container;
    private readonly labelPool: PIXI.Text[] = [];

    constructor(container: PIXI.Container) {
        this.gfx = new PIXI.Graphics();
        this.labelContainer = new PIXI.Container();
        container.addChild(this.gfx);
        container.addChild(this.labelContainer);
    }

    private acquireLabel(text: string, x: number, y: number): PIXI.Text {
        let label = this.labelPool.find((item) => !item.visible);
        if (!label) {
            label = new PIXI.Text({
                text: '',
                style: {
                    fill: COL.labelFill,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 'bold',
                    stroke: { color: 0x10131d, width: 3 },
                },
                resolution: 2,
            });
            this.labelPool.push(label);
            this.labelContainer.addChild(label);
        }
        label.text = text;
        label.position.set(x + 8, y - 10);
        label.visible = true;
        return label;
    }

    private hideLabels(): void {
        for (const label of this.labelPool) label.visible = false;
    }

    private drawPolyline(points: readonly [number, number][], color: number, width: number, alpha: number): void {
        if (points.length < 2) return;
        this.gfx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i += 1) {
            this.gfx.lineTo(points[i][0], points[i][1]);
        }
        this.gfx.stroke({ color, width, alpha });
    }

    private drawSubSection(
        points: readonly [number, number][],
        subSection: OverlaySubSectionClassification,
        color: number,
        width: number,
        alpha: number,
    ): void {
        if (points.length < 2) return;
        const start = Math.max(0, Math.min(subSection.startPointIndex, points.length - 1));
        const end = Math.max(start, Math.min(subSection.endPointIndex, points.length - 1));
        if (end <= start) return;
        this.gfx.moveTo(points[start][0], points[start][1]);
        for (let i = start + 1; i <= end; i += 1) {
            this.gfx.lineTo(points[i][0], points[i][1]);
        }
        this.gfx.stroke({ color, width, alpha });
    }

    update(
        topology: FrontierTopology | null,
        plan: ActiveFrontTransitionPlan | null,
    ): void {
        this.gfx.clear();
        this.hideLabels();

        if (!overlayConfig.enabled || !topology) return;

        const model = buildActiveFrontClassificationOverlayModel(topology, plan);
        const showLabels = overlayConfig.showClassificationLabels;

        for (const [sectionId, section] of topology.sections) {
            const classification = model.sections.get(sectionId);
            if (!classification) continue;

            this.gfx.beginPath();
            this.drawPolyline(section.points, sectionColor(classification), 1.8, 0.75);

            if (classification.role === 'active_section') {
                const activeSubSection = classification.subSections.find(
                    (sub) => sub.role === 'active_subsection',
                );
                if (activeSubSection) {
                    this.gfx.beginPath();
                    this.drawSubSection(
                        section.points,
                        activeSubSection,
                        COL.activeSubSection,
                        4.2,
                        0.95,
                    );
                }
            } else if (classification.role !== 'unchanged_section') {
                const defectSubSection = classification.subSections.find(
                    (sub) => sub.role === 'defect_subsection',
                );
                if (defectSubSection) {
                    this.gfx.beginPath();
                    this.drawSubSection(
                        section.points,
                        defectSubSection,
                        sectionColor(classification),
                        3.6,
                        0.95,
                    );
                }
            }

            if (overlayConfig.showPolylineSamples) {
                const stride = Math.max(1, overlayConfig.polylineSampleStride);
                for (let i = stride; i < section.points.length - 1; i += stride) {
                    const [x, y] = section.points[i];
                    this.gfx.beginPath();
                    this.gfx.circle(x, y, 1.8);
                    this.gfx.fill({ color: COL.sampleDot, alpha: 0.8 });
                }
            }

            if (showLabels && section.points.length > 0) {
                const mid = section.points[Math.floor(section.points.length / 2)]!;
                this.acquireLabel(
                    `${sectionId.split(':').slice(-1)[0]} ${formatOverlaySectionLabel(classification)}`,
                    mid[0],
                    mid[1],
                );
            }
        }

        for (const [vertexId, vertex] of topology.vertices) {
            const classification = model.vertices.get(vertexId);
            if (!classification) continue;
            const isStructuralOnly = classification.role === 'structural_vertex';
            if (isStructuralOnly && !overlayConfig.showAllVertices) continue;
            if (
                classification.role === 'front_anchor' &&
                !overlayConfig.showActiveFront
            ) {
                continue;
            }

            const [x, y] = vertex.point;
            const color = vertexColor(classification);

            this.gfx.beginPath();
            if (classification.role === 'front_anchor') {
                const s = 7;
                this.gfx.moveTo(x, y - s);
                this.gfx.lineTo(x + s, y);
                this.gfx.lineTo(x, y + s);
                this.gfx.lineTo(x - s, y);
                this.gfx.closePath();
            } else if (classification.role === 'defect_anchor') {
                this.gfx.rect(x - 5, y - 5, 10, 10);
            } else if (classification.role === 'stable_anchor') {
                this.gfx.circle(x, y, 5);
            } else {
                this.gfx.circle(x, y, 3.5);
            }
            this.gfx.fill({ color, alpha: 0.95 });
            this.gfx.stroke({ color: 0xffffff, alpha: 0.9, width: 1.2 });

            if (showLabels) {
                this.acquireLabel(
                    `${classification.labels.join('|')} ${Math.round(x)},${Math.round(y)}`,
                    x,
                    y,
                );
            }
        }

        if (overlayConfig.showActiveFront && plan) {
            plan.fronts.forEach((front, frontIndex) => {
                const a = topology.vertices.get(front.anchorStartId);
                const b = topology.vertices.get(front.anchorEndId);
                if (!a || !b) return;
                const [ax, ay] = a.point;
                const [bx, by] = b.point;
                const dx = bx - ax;
                const dy = by - ay;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= 0.001) return;
                const dash = 7;
                const gap = 4;
                const step = dash + gap;
                this.gfx.beginPath();
                for (let d = 0; d < dist; d += step) {
                    const d1 = d / dist;
                    const d2 = Math.min((d + dash) / dist, 1);
                    this.gfx.moveTo(ax + dx * d1, ay + dy * d1);
                    this.gfx.lineTo(ax + dx * d2, ay + dy * d2);
                }
                this.gfx.stroke({ color: COL.bridge, alpha: 0.7, width: 1.4 });
                if (showLabels) {
                    this.acquireLabel(
                        `front ${frontIndex} sections=${front.activeSectionIds.size}`,
                        (ax + bx) / 2,
                        (ay + by) / 2,
                    );
                }
            });
        }
    }

    destroy(): void {
        for (const label of this.labelPool) label.destroy();
        this.labelPool.length = 0;
        this.labelContainer.destroy();
        this.gfx.destroy();
    }
}
