/**
 * territory/render/TerritoryRenderer.ts
 *
 * Unified render entry point.
 * Branches between steady-state pass and transition pass.
 * Both passes call buildFillMeshCache and buildBorderMeshCache
 * with the SAME frame-time canonical state (fill/border alignment guaranteed).
 *
 * Rules:
 * - All state is class-encapsulated (no module-level globals)
 * - Does not compute ownership
 * - Does not fabricate geometry
 * - Transition interpolation applied BEFORE cache building so fills and
 *   borders are always derived from identical geometry
 */

import * as PIXI from 'pixi.js';
import type { CanonicalTerritoryStateOk, TransitionPlan, FrontierGraph, TerritoryRegion } from '../compiler/types';
import { buildFillMeshCache } from './buildFillMeshCache';
import { buildBorderMeshCache, buildBorderMeshCacheFromGraph, type BorderRenderConfig } from './buildBorderMeshCache';
import { OwnerFillLayerRenderer, type FillRenderConfig } from './OwnerFillLayerRenderer';
import { BorderLayerRenderer } from './BorderLayerRenderer';

export interface TerritoryRenderConfig {
    fill?: FillRenderConfig;
    border?: BorderRenderConfig;
}

export class TerritoryRenderer {
    private fillRenderer: OwnerFillLayerRenderer;
    private borderRenderer: BorderLayerRenderer;

    constructor(
        container: PIXI.Container,
        private getPlayerColor: (ownerIdx: number, playerIds: string[]) => number,
        private playerIds: string[],
    ) {
        const getColorById = (ownerId: string) => {
            const idx = this.playerIds.indexOf(ownerId);
            return this.getPlayerColor(idx >= 0 ? idx : 0, this.playerIds);
        };
        const getColorByIdx = (ownerIdx: number) => this.getPlayerColor(ownerIdx, this.playerIds);

        this.fillRenderer = new OwnerFillLayerRenderer(container, getColorById);
        this.borderRenderer = new BorderLayerRenderer(container, getColorByIdx, playerIds);
    }

    render(
        state: CanonicalTerritoryStateOk,
        transitionPlan: TransitionPlan | null,
        nowMs: number,
        config: TerritoryRenderConfig = {},
    ): void {
        if (transitionPlan && state.transitionActive) {
            this._executeTransitionPass(state, transitionPlan, nowMs, config);
        } else {
            this._executeSteadyStatePass(state, config);
        }
    }

    updatePlayerIds(playerIds: string[]): void {
        this.playerIds = playerIds;
        this.borderRenderer.updatePlayerIds(playerIds);
    }

    destroy(): void {
        this.fillRenderer.destroy();
        this.borderRenderer.destroy();
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    private _executeSteadyStatePass(
        state: CanonicalTerritoryStateOk,
        config: TerritoryRenderConfig,
    ): void {
        const fillCache = buildFillMeshCache(state.regions);
        const borderCache = state.fittedFrontiers.length > 0
            ? buildBorderMeshCache(state.fittedFrontiers, config.border ?? { width: 4 })
            : buildBorderMeshCacheFromGraph(state.frontierGraph, config.border ?? { width: 4 });

        this.fillRenderer.draw(fillCache, config.fill);
        this.borderRenderer.draw(borderCache, config.border ?? { width: 4 });
    }

    private _executeTransitionPass(
        state: CanonicalTerritoryStateOk,
        plan: TransitionPlan,
        nowMs: number,
        config: TerritoryRenderConfig,
    ): void {
        const elapsed = nowMs - plan.startedAtMs;
        const rawT = Math.max(0, Math.min(1, elapsed / plan.durationMs));
        const t = this._easeInOutCubic(rawT);

        // Interpolate frame frontier and regions from the plan
        const frameFrontier = this._interpolateFrontier(plan, t);
        const frameRegions = this._interpolateRegions(plan, t);

        // Build both caches from the SAME interpolated frame data
        const fillCache = buildFillMeshCache(frameRegions);
        const borderCache = buildBorderMeshCacheFromGraph(frameFrontier, config.border ?? { width: 4 });

        this.fillRenderer.draw(fillCache, config.fill);
        this.borderRenderer.draw(borderCache, config.border ?? { width: 4 });

        // Mark transition complete when eased reaches 1
        if (t >= 1.0) {
            state.transitionActive = false;
        }
    }

    private _easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /** Interpolate frontier node positions between prev and next states. */
    private _interpolateFrontier(plan: TransitionPlan, t: number): FrontierGraph {
        const { prevState, nextState, frontierCorrespondences } = plan;

        // Build interpolated graph from correspondences
        const nodes = new Map(nextState.frontierGraph.nodes);
        const edges = new Map(nextState.frontierGraph.edges);
        const adjacency = new Map(nextState.frontierGraph.adjacency);

        for (const corr of frontierCorrespondences) {
            const prevA = corr.prevControlPoints[0];
            const prevB = corr.prevControlPoints[1];
            const nextA = corr.nextControlPoints[0];
            const nextB = corr.nextControlPoints[1];
            if (!prevA || !prevB || !nextA || !nextB) continue;

            const nextEdge = nextState.frontierGraph.edges.get(corr.nextEdgeId);
            if (!nextEdge) continue;

            // Interpolate node A position
            const nodeA = nextState.frontierGraph.nodes.get(nextEdge.a);
            if (nodeA) {
                nodes.set(nextEdge.a, {
                    ...nodeA,
                    x: prevA[0] + (nextA[0] - prevA[0]) * t,
                    y: prevA[1] + (nextA[1] - prevA[1]) * t,
                });
            }
            // Interpolate node B position
            const nodeB = nextState.frontierGraph.nodes.get(nextEdge.b);
            if (nodeB) {
                nodes.set(nextEdge.b, {
                    ...nodeB,
                    x: prevB[0] + (nextB[0] - prevB[0]) * t,
                    y: prevB[1] + (nextB[1] - prevB[1]) * t,
                });
            }
        }

        return { nodes, edges, adjacency };
    }

    /** Interpolate region loop points between prev and next states. */
    private _interpolateRegions(plan: TransitionPlan, t: number): TerritoryRegion[] {
        const { prevState, nextState } = plan;

        // Match regions by ownerId + componentId; lerp their loop points
        const prevByKey = new Map<string, TerritoryRegion>();
        for (const r of prevState.regions) {
            prevByKey.set(`${r.ownerId}:${r.componentId}`, r);
        }

        return nextState.regions.map((nextRegion) => {
            const key = `${nextRegion.ownerId}:${nextRegion.componentId}`;
            const prevRegion = prevByKey.get(key);

            if (!prevRegion) return nextRegion; // Spawned region — show at full position

            // Lerp loop points
            const loops = nextRegion.loops.map((nextLoop, loopIdx) => {
                const prevLoop = prevRegion.loops[loopIdx];
                if (!prevLoop || prevLoop.length !== nextLoop.length) return nextLoop;
                return nextLoop.map((v, i) => {
                    const pv = prevLoop[i];
                    return pv + (v - pv) * t;
                });
            });

            return { ...nextRegion, loops };
        });
    }
}
