// ── PixiJS Territory Debug Overlay ──────────────────────────────────────────
// Live in-game overlay: structural vertices, polyline samples, active sections,
// change-anchor pairs joined by an "active front" bridge line.

import * as PIXI from 'pixi.js';
import type { FrontierTopology } from '../../contracts/FrontierTopologyContracts';
import type { ActiveFrontTransitionPlan } from '../../layers/transition/ActiveFrontTransition';
import { overlayConfig } from '../../devtools/overlayConfig';

const COL = {
    staticSection:  0x555577,
    activeSection:  0xffb000,
    vertex:         0x9999cc,
    sampleDot:      0xcc88ff,
    anchor:         0x00ffff,
    anchorOutline:  0xffffff,
    afBridge:       0x44ff66,
} as const;

export class PixiTerritoryDebugOverlay {
    private readonly gfx: PIXI.Graphics;
    private readonly labelContainer: PIXI.Container;
    private readonly labelPool: PIXI.Text[] = [];
    private readonly afLabelPool: PIXI.Text[] = [];

    constructor(container: PIXI.Container) {
        this.gfx = new PIXI.Graphics();
        this.labelContainer = new PIXI.Container();
        container.addChild(this.gfx);
        container.addChild(this.labelContainer);
    }

    private acquireLabel(
        text: string,
        x: number,
        y: number,
        pool: PIXI.Text[],
        fill: number,
    ): PIXI.Text {
        let label = pool.find(l => !l.visible);
        if (!label) {
            label = new PIXI.Text({
                text: '',
                style: {
                    fill,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 'bold',
                },
                resolution: 2,
            });
            pool.push(label);
            this.labelContainer.addChild(label);
        }
        label.text = text;
        label.position.set(x + 12, y - 10);
        label.visible = true;
        return label;
    }

    private hidePools(): void {
        for (const l of this.labelPool) l.visible = false;
        for (const l of this.afLabelPool) l.visible = false;
    }

    update(
        topology: FrontierTopology | null,
        plan: ActiveFrontTransitionPlan | null,
    ): void {
        this.gfx.clear();
        this.hidePools();

        if (!overlayConfig.enabled || !topology) return;

        const { showAllVertices, showActiveFront, showPolylineSamples, polylineSampleStride } =
            overlayConfig;

        const activeSectionIds = new Set<string>();
        const anchorIds = new Set<string>();
        const anchorLabel = new Map<string, string>();
        if (showActiveFront && plan) {
            plan.fronts.forEach((front, fi) => {
                for (const id of front.activeSectionIds) activeSectionIds.add(id);
                anchorIds.add(front.anchorStartId);
                anchorIds.add(front.anchorEndId);
                anchorLabel.set(front.anchorStartId, `AF${fi}-start`);
                anchorLabel.set(front.anchorEndId, `AF${fi}-end`);
            });
        }

        for (const [, section] of topology.sections) {
            if (section.points.length < 2) continue;
            this.gfx.beginPath();
            this.gfx.moveTo(section.points[0][0], section.points[0][1]);
            for (let i = 1; i < section.points.length; i++) {
                this.gfx.lineTo(section.points[i][0], section.points[i][1]);
            }
            const isActive = activeSectionIds.has(section.id);
            this.gfx.stroke({
                color: isActive ? COL.activeSection : COL.staticSection,
                alpha: isActive ? 1.0 : 0.7,
                width: isActive ? 3.5 : 1.5,
            });

            if (showPolylineSamples) {
                const stride = Math.max(1, polylineSampleStride);
                for (let i = stride; i < section.points.length - 1; i += stride) {
                    const [x, y] = section.points[i];
                    this.gfx.beginPath();
                    this.gfx.circle(x, y, 1.8);
                    this.gfx.fill({ color: COL.sampleDot, alpha: 0.8 });
                }
            }
        }

        if (showAllVertices) {
            for (const [vertexId, vertex] of topology.vertices) {
                if (anchorIds.has(vertexId)) continue;
                const [x, y] = vertex.point;
                this.gfx.beginPath();
                this.gfx.circle(x, y, 3.5);
                this.gfx.fill({ color: COL.vertex, alpha: 0.9 });
            }
        }

        // Active-front bridge: line + label between each front's anchor pair
        if (showActiveFront && plan) {
            plan.fronts.forEach((front, fi) => {
                const a = topology.vertices.get(front.anchorStartId);
                const b = topology.vertices.get(front.anchorEndId);
                if (!a || !b) return;
                const [ax, ay] = a.point;
                const [bx, by] = b.point;
                // Dashed bridge line between anchor pair (visual pairing indicator)
                const dx = bx - ax;
                const dy = by - ay;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const dash = 6;
                const gap = 4;
                const step = dash + gap;
                this.gfx.beginPath();
                for (let d = 0; d < dist; d += step) {
                    const d1 = d / dist;
                    const d2 = Math.min((d + dash) / dist, 1);
                    this.gfx.moveTo(ax + dx * d1, ay + dy * d1);
                    this.gfx.lineTo(ax + dx * d2, ay + dy * d2);
                }
                this.gfx.stroke({ color: COL.afBridge, alpha: 0.7, width: 1.5 });

                const mx = (ax + bx) / 2;
                const my = (ay + by) / 2;
                this.acquireLabel(`AF${fi}  (${front.activeSectionIds.size} secs)`, mx - 30, my - 18, this.afLabelPool, COL.afBridge);
            });
        }

        for (const anchorId of anchorIds) {
            const v = topology.vertices.get(anchorId);
            if (!v) continue;
            const [x, y] = v.point;
            const s = 8;

            this.gfx.beginPath();
            this.gfx.moveTo(x, y - s);
            this.gfx.lineTo(x + s, y);
            this.gfx.lineTo(x, y + s);
            this.gfx.lineTo(x - s, y);
            this.gfx.closePath();
            this.gfx.fill({ color: COL.anchor, alpha: 0.95 });
            this.gfx.stroke({ color: COL.anchorOutline, alpha: 0.9, width: 1.5 });

            const lbl = anchorLabel.get(anchorId) ?? anchorId.slice(0, 10);
            const [rx, ry] = v.point;
            this.acquireLabel(`⚓ ${lbl} (${Math.round(rx)},${Math.round(ry)})`, x, y, this.labelPool, COL.anchor);
        }

    }

    destroy(): void {
        for (const l of this.labelPool) l.destroy();
        for (const l of this.afLabelPool) l.destroy();
        this.labelPool.length = 0;
        this.afLabelPool.length = 0;
        this.labelContainer.destroy();
        this.gfx.destroy();
    }
}
