/**
 * territory/render/TerritoryRenderer.ts
 *
 * Unified render entry point.
 * Branches between steady-state pass and transition pass.
 * Both passes call buildFillMeshCache and buildBorderMeshCache
 * with the SAME frame-time compiled state (fill/border alignment guaranteed).
 *
 * Rules:
 * - All state is class-encapsulated (no module-level globals)
 * - Does not compute ownership
 * - Does not fabricate geometry
 * - Transition interpolation applied BEFORE cache building so fills and
 *   borders are always derived from identical geometry
 */

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import { log } from '$lib/utils/logger';
import type { CompiledTerritoryStateOk, TransitionPlan, FrontierGraph, TerritoryRegion, FittedFrontier } from '../compiler/types';
import { buildFillMeshCache } from './buildFillMeshCache';
import { buildBorderMeshCache, buildBorderMeshCacheFromGraph, type BorderRenderConfig } from './buildBorderMeshCache';
import { OwnerFillLayerRenderer, type FillRenderConfig } from './OwnerFillLayerRenderer';
import { BorderLayerRenderer } from './BorderLayerRenderer';
import type { SharedPolyline } from '$lib/renderers/geometry/types';
import { buildLerpedPolylines } from '$lib/renderers/geometry/morphUtils';
import { substituteSmoothedEdges } from '$lib/renderers/geometry/borderPipeline';

export interface TerritoryRenderConfig {
    fill?: FillRenderConfig;
    border?: BorderRenderConfig;
}

// Map FittedFrontiers to SharedPolyline interface for interpolation
function mapFittedToShared(fitted: FittedFrontier[], colorLookup: (a: number, b: number) => number): SharedPolyline[] {
    return fitted.flatMap(f => f.polylines.map(pts => {
        // pts is [x1,y1, x2,y2, ...] flat array, SharedPolyline expects [[x,y], ...]
        const points: [number, number][] = [];
        for (let i = 0; i < pts.length; i += 2) points.push([pts[i], pts[i + 1]]);
        return {
            points,
            ownerPairKey: f.ownerA < f.ownerB ? `${f.ownerA}|${f.ownerB}` : `${f.ownerB}|${f.ownerA}`,
            color: colorLookup(f.ownerA, f.ownerB)
        };
    }));
}

export class TerritoryRenderer {
    private fillRenderer: OwnerFillLayerRenderer;
    private borderRenderer: BorderLayerRenderer;
    private playerIds: string[];

    constructor(
        container: PIXI.Container,
        private getPlayerColor: (ownerIdx: number, playerIds: string[]) => number,
        playerIds: string[],
    ) {
        this.playerIds = playerIds;
        const getColorById = (ownerId: string) => {
            const idx = this.playerIds.indexOf(ownerId);
            return this.getPlayerColor(idx >= 0 ? idx : 0, this.playerIds);
        };
        const getColorByIdx = (ownerIdx: number) => this.getPlayerColor(ownerIdx, this.playerIds);

        this.fillRenderer = new OwnerFillLayerRenderer(container, getColorById);
        this.borderRenderer = new BorderLayerRenderer(container, getColorByIdx, playerIds);
    }

    render(
        state: CompiledTerritoryStateOk,
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
        state: CompiledTerritoryStateOk,
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
        state: CompiledTerritoryStateOk,
        plan: TransitionPlan,
        nowMs: number,
        config: TerritoryRenderConfig,
    ): void {
        // 1. Compute time parameter t
        const elapsed = nowMs - plan.startedAtMs;
        const rawProgress = Math.max(0, Math.min(1, elapsed / plan.durationMs));
        const t = this._easeInOutCubic(rawProgress);

        log.renderer('DY4:TRACE', JSON.stringify({
            frame: 'transition',
            fillActive: true,
            smoothBorderActive: true,
            segmentBorderActive: false,
            targetFillCount: plan.nextState.regions.length,
            targetBorderCount: plan.nextState.fittedFrontiers.length,
            elapsed: {
                fill: elapsed,
                smooth: elapsed,
                segment: elapsed,
            },
        }));

        // 2. Map resolved fitted frontiers -> Geometry Layer SharedPolylines
        const blendColor = (a: number, b: number) => {
            const hexA = this.borderRenderer['getPlayerColor'](a);
            const hexB = this.borderRenderer['getPlayerColor'](b);
            // Poor man's blend, PVV3 extracts this later, just pass 0 for now as it's ignored by the cache
            return 0;
        };

        const prevShared = mapFittedToShared(plan.prevState.fittedFrontiers, blendColor);
        const nextShared = mapFittedToShared(plan.nextState.fittedFrontiers, blendColor);

        // 3. Interpolate the frontiers
        const lerpedData = GAME_CONFIG.DEBUG_DY4_DISABLE_BORDER_TRANSITION 
            ? nextShared 
            : buildLerpedPolylines(prevShared, nextShared, t);
        const frameFrontiers = lerpedData as SharedPolyline[];

        // 4. Force fills to snap to the interpolated frontiers (Zero Divergence rule!)
        const frameRegions = this.cloneRegions(plan.nextState.regions);

        if (!GAME_CONFIG.DEBUG_DY4_DISABLE_FILL_CROSSFADE) {
            // Map TerritoryRegion (flat loops) to MergedTerritory (tuple points) for substitution
            const mergedForSubstitution: any[] = frameRegions.flatMap(region =>
                region.loops.map((loop, idx) => {
                    const points: [number, number][] = [];
                    for (let i = 0; i < loop.length; i += 2) {
                        points.push([loop[i], loop[i + 1]]);
                    }
                    return {
                        ownerId: region.ownerId,
                        color: 0,
                        points,
                        _originalRegion: region,
                        _originalLoopIdx: idx
                    };
                })
            );

            substituteSmoothedEdges(mergedForSubstitution as any, nextShared, frameFrontiers);

            // Map back to flat loops
            for (const merged of mergedForSubstitution) {
                merged._originalRegion.loops[merged._originalLoopIdx] = merged.points.flat();
            }
        }

        // 5. Re-pack frameFrontiers into FittedFrontier structure for the Mesh cache
        const frameFitted: FittedFrontier[] = frameFrontiers
            .filter(f => f.ownerPairKey) // Guard: buildLerpedPolylines may produce entries without ownerPairKey
            .map(f => {
                const [ownerA, ownerB] = f.ownerPairKey.split('|').map(Number);
                return {
                    pairId: f.ownerPairKey,
                    family: 'curved',
                    ownerA,
                    ownerB,
                    polylines: [f.points.flat()]
                };
            });

        // 6. Build caches and draw
        const borderCache = buildBorderMeshCache(frameFitted, config.border ?? { width: 4 });
        const fillCache = buildFillMeshCache(frameRegions);

        this.fillRenderer.draw(fillCache, config.fill);
        this.borderRenderer.draw(borderCache, config.border ?? { width: 4 });

        // 7. Cleanup
        if (rawProgress >= 1.0) {
            state.transitionActive = false;
        }
    }

    private cloneRegions(regions: TerritoryRegion[]): TerritoryRegion[] {
        return regions.map(region => ({
            ...region,
            loops: region.loops.map(loop => [...loop]) // clone coordinate arrays
        }));
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
