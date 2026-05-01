import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { ConquestEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import { territoryFrontierConfigDefaults } from '$lib/territory/frontier/config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    CanonicalGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { buildRenderFamilyInput } from '../buildRenderFamilyInput';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import {
    MetaballGridFamily,
    createMetaballGridFamily,
    createMetaballGridPhaseEdgesFamily,
} from './MetaballGridFamily';
import {
    metaballGridPhaseEdgesGeometryDefaults,
    metaballGridPhaseEdgesModeDefaults,
} from './config';
import { metaballGridStats } from './metaballGridStats';

function makeSnapshot(
    regions: TerritoryRegionShape[],
): CanonicalGeometrySnapshot {
    return {
        version: 'test',
        sourceMode: 'unified_vector',
        sourceStyle: 'canonical',
        ownershipVersion: 'test',
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: regions,
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: 'topo',
            ownershipVersion: 'test',
            worldBounds: { width: 100, height: 40 },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells: [],
        shellLoops: [],
        provenance: { derivedFromField: false, notes: [] },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    };
}

function rect(
    ownerId: string,
    regionId: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): TerritoryRegionShape {
    return {
        regionId,
        ownerId,
        points: [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
        ],
        confidence: 1,
    };
}

function makeEvent(previousOwner: string, newOwner: string): ConquestEvent {
    return {
        tick: 1,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [10],
        previousOwner,
        newOwner,
        shipsCaptured: 10,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 10,
        conquestType: 'complete',
    };
}

function makeStar(params: {
    id: string;
    x: number;
    y: number;
    ownerId: string;
    activeShips: number;
    damagedShips: number;
    radius?: number;
    starType?: string;
}): StarState {
    return {
        id: params.id,
        x: params.x,
        y: params.y,
        ownerId: params.ownerId,
        activeShips: params.activeShips,
        damagedShips: params.damagedShips,
        radius: params.radius ?? 20,
        starType: params.starType ?? 'blue',
        productionOverflow: 0,
        repairOverflow: 0,
        lastCombatTick: 0,
        lastAttackTick: 0,
        targetId: null,
        queuedOrderTargetId: null,
        productionRate: 1,
        repairRate: 0,
        transferRate: 0.5,
        activationRate: 1,
        defensivePosture: 1,
        defenseStrength: 1,
    };
}

function makeLane(sourceId: string, targetId: string, distance: number): StarConnection {
    return { sourceId, targetId, distance };
}

function makeTunables(
    entries: ReadonlyArray<readonly [string, RenderFamilyTunableValue]>,
): ReadonlyMap<string, RenderFamilyTunableValue> {
    return new Map<string, RenderFamilyTunableValue>(entries);
}

function makeActiveTransition(
    event: ConquestEvent,
    progress: number,
    durationMs: number,
): RenderFamilyActiveTransition {
    return {
        sessionKey: `tick:${event.tick}:test`,
        conquestEvents: [event],
        events: [
            {
                event,
                startedAtMs: 1_000,
                durationMs,
                progress,
                rawProgress: progress,
            },
        ],
        startedAtMs: 1_000,
        durationMs,
        progress,
        rawProgress: progress,
    };
}

function makeInput(progress: number): RenderFamilyInput {
    const prevGeometry = makeSnapshot([
        rect('A', 'left', 0, 0, 50, 40),
        rect('B', 'right', 50, 0, 100, 40),
    ]);
    const nextGeometry = makeSnapshot([rect('B', 'all', 0, 0, 100, 40)]);
    const event = makeEvent('A', 'B');
    return {
        ownership: null,
        geometry: nextGeometry,
        prevGeometry,
        nowMs: 1_000 + progress * 1_500,
        gameTick: 1,
        world: { width: 100, height: 40 },
        stars: [
            makeStar({
                id: 'attacker',
                x: 80,
                y: 20,
                ownerId: 'B',
                activeShips: 24,
                damagedShips: 0,
            }),
            makeStar({
                id: 'target',
                x: 25,
                y: 20,
                ownerId: 'B',
                activeShips: 18,
                damagedShips: 0,
            }),
        ],
        lanes: [makeLane('attacker', 'target', 55)],
        tunables: makeTunables([
            ['METABALL_GRID_ENABLED', true],
            ['METABALL_GRID_SPACING_PX', 10],
            ['METABALL_GRID_ORIGIN_MODE', 'centered'],
            ['METABALL_GRID_DISTRIBUTION', 'square'],
            ['METABALL_GRID_POSITION_JITTER', 0],
            ['METABALL_GRID_MAX_CELLS', 0],
            ['METABALL_GRID_ADJACENCY', '4'],
            ['METABALL_GRID_WAVE_GEOMETRY', 'grid_bfs'],
            ['METABALL_GRID_WAVE_SEEDING', 'conquered_star_center'],
            ['METABALL_GRID_FLIP_TRANSITION', 'dual_pass_blend'],
            ['METABALL_GRID_FLIP_WINDOW', 0.08],
            ['METABALL_GRID_FLIP_WINDOW_JITTER', 0],
            ['METABALL_GRID_CELL_SHAPE', 'square'],
            ['METABALL_GRID_CELL_INSET_PX', 0],
            ['METABALL_GRID_CELL_CORNER_PX', 0],
            ['METABALL_GRID_BORDER_MODE', 'off'],
            ['METABALL_BORDER_ALPHA', 0],
            ['METABALL_ALPHA', 1],
            ['METABALL_SATURATION', 1],
            ['METABALL_LIGHTNESS', 0.5],
        ]),
        activeTransition: makeActiveTransition(event, progress, 1_500),
    };
}

function makeInputWithDuration(
    progress: number,
    durationMs: number,
): RenderFamilyInput {
    const input = makeInput(progress);
    const startedAtMs = 1_000;
    return {
        ...input,
        nowMs: startedAtMs + progress * durationMs,
        activeTransition: input.activeTransition
            ? {
                  ...input.activeTransition,
                  durationMs,
                  events: input.activeTransition.events.map((event) => ({
                      ...event,
                      durationMs,
                  })),
              }
            : null,
    };
}

function makeSteadyInput(): RenderFamilyInput {
    const geometry = makeSnapshot([rect('B', 'all', 0, 0, 100, 40)]);
    return {
        ownership: null,
        geometry,
        prevGeometry: geometry,
        nowMs: 2_500,
        gameTick: 2,
        world: { width: 100, height: 40 },
        stars: [
            makeStar({
                id: 'attacker',
                x: 80,
                y: 20,
                ownerId: 'B',
                activeShips: 24,
                damagedShips: 0,
            }),
            makeStar({
                id: 'target',
                x: 25,
                y: 20,
                ownerId: 'B',
                activeShips: 18,
                damagedShips: 0,
            }),
        ],
        lanes: [makeLane('attacker', 'target', 55)],
        tunables: makeTunables([
            ['METABALL_GRID_ENABLED', true],
            ['METABALL_GRID_SPACING_PX', 10],
            ['METABALL_GRID_ORIGIN_MODE', 'centered'],
            ['METABALL_GRID_DISTRIBUTION', 'square'],
            ['METABALL_GRID_POSITION_JITTER', 0],
            ['METABALL_GRID_MAX_CELLS', 0],
            ['METABALL_GRID_ADJACENCY', '4'],
            ['METABALL_GRID_WAVE_GEOMETRY', 'grid_bfs'],
            ['METABALL_GRID_WAVE_SEEDING', 'conquered_star_center'],
            ['METABALL_GRID_FLIP_TRANSITION', 'dual_pass_blend'],
            ['METABALL_GRID_FLIP_WINDOW', 0.08],
            ['METABALL_GRID_FLIP_WINDOW_JITTER', 0],
            ['METABALL_GRID_CELL_SHAPE', 'square'],
            ['METABALL_GRID_CELL_INSET_PX', 0],
            ['METABALL_GRID_CELL_CORNER_PX', 0],
            ['METABALL_GRID_BORDER_MODE', 'off'],
            ['METABALL_BORDER_ALPHA', 0],
            ['METABALL_ALPHA', 1],
            ['METABALL_SATURATION', 1],
            ['METABALL_LIGHTNESS', 0.5],
        ]),
    };
}

function makePhaseEdgesInput(
    family: MetaballGridFamily,
    progress: number,
    overrides?: Record<string, unknown>,
): RenderFamilyInput {
    const base = makeInput(progress);
    const configSource: Record<string, unknown> = {
        METABALL_GRID_ENABLED: true,
        METABALL_GRID_SPACING_PX: 10,
        METABALL_GRID_ORIGIN_MODE: 'centered',
        METABALL_GRID_DISTRIBUTION: 'square',
        METABALL_GRID_POSITION_JITTER: 0,
        METABALL_GRID_MAX_CELLS: 0,
        METABALL_GRID_ADJACENCY: '4',
        METABALL_GRID_WAVE_SEEDING: 'conquered_star_center',
        METABALL_GRID_FLIP_TRANSITION: 'dual_pass_blend',
        METABALL_GRID_FLIP_WINDOW: 0.08,
        METABALL_GRID_FLIP_WINDOW_JITTER: 0,
        METABALL_GRID_CELL_SHAPE: 'square',
        METABALL_GRID_CELL_INSET_PX: 0,
        METABALL_GRID_CELL_CORNER_PX: 0,
        METABALL_BORDER_ALPHA: 1,
        METABALL_FILL_ENABLED: true,
        METABALL_BORDER_ENABLED: true,
        METABALL_ALPHA: 1,
        METABALL_SATURATION: 1,
        METABALL_LIGHTNESS: 0.5,
        ...territoryFrontierConfigDefaults,
        ...metaballGridPhaseEdgesGeometryDefaults,
        ...metaballGridPhaseEdgesModeDefaults,
        ...overrides,
    };
    return buildRenderFamilyInput({
        stars: [...base.stars],
        lanes: [...base.lanes],
        worldWidth: base.world.width,
        worldHeight: base.world.height,
        nowMs: base.nowMs,
        gameTick: base.gameTick,
        ownership: base.ownership,
        geometry: base.geometry,
        prevGeometry: base.prevGeometry,
        activeTransition: base.activeTransition,
        tunableKeys: family.tunableKeys,
        configSource,
    });
}

describe('MetaballGridFamily active frontier fast path', () => {
    it('uses retained frontier layers for square dual-pass conquest frames', () => {
        const family = createMetaballGridFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makeInput(0.12));
        const initialStats = get(metaballGridStats);
        expect(initialStats.fastPathUsed).toBe(true);
        expect(initialStats.transitionTotalCount).toBeGreaterThan(0);
        expect(initialStats.activeWindowCount).toBeGreaterThan(0);
        expect(initialStats.transitionTotalCount).toBeGreaterThan(
            initialStats.activeWindowCount,
        );

        family.update(makeInput(0.2));
        const nextStats = get(metaballGridStats);
        expect(nextStats.fastPathUsed).toBe(true);
        expect(nextStats.promotedToActiveCount).toBeGreaterThanOrEqual(0);
        expect(nextStats.demotedToSettledCount).toBeGreaterThanOrEqual(0);
        expect(nextStats.transitionSpriteWrites).toBeLessThan(
            nextStats.transitionTotalCount * 2,
        );

        family.dispose();
    });

    it('forces one cleanup repaint after conquest ends so retained frontier layers do not leak', () => {
        const family = createMetaballGridFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makeInput(1));
        const transitionStats = get(metaballGridStats);
        expect(transitionStats.fastPathUsed).toBe(true);
        expect(transitionStats.lastFrameSkipped).toBe(false);

        const internalAfterTransition = family as unknown as {
            activeFrontierState: unknown;
            settledPrevSprites: Array<{ visible: boolean }>;
            settledNextSprites: Array<{ visible: boolean }>;
            activePrevSprites: Array<{ visible: boolean }>;
            activeNextSprites: Array<{ visible: boolean }>;
            transitionSprites: Array<{ visible: boolean }>;
        };
        expect(internalAfterTransition.activeFrontierState).not.toBeNull();
        expect(
            internalAfterTransition.settledPrevSprites.some((sprite) => sprite.visible)
                || internalAfterTransition.activePrevSprites.some((sprite) => sprite.visible)
                || internalAfterTransition.settledNextSprites.some((sprite) => sprite.visible)
                || internalAfterTransition.activeNextSprites.some((sprite) => sprite.visible)
                || internalAfterTransition.transitionSprites.some((sprite) => sprite.visible),
        ).toBe(true);

        family.update(makeSteadyInput());
        const steadyStats = get(metaballGridStats);
        expect(steadyStats.lastFrameSkipped).toBe(false);

        const internalAfterCleanup = family as unknown as {
            activeFrontierState: unknown;
        };
        expect(internalAfterCleanup.activeFrontierState).toBeNull();

        family.dispose();
    });

    it('reports phase-edges locked defaults through buildRenderFamilyInput and family stats', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makePhaseEdgesInput(family, 0.35));

        const stats = get(metaballGridStats);
        expect(stats.familyId).toBe('metaball_grid_phase_edges');
        expect(stats.waveGeometry).toBe('pre_to_post_frontier');
        expect(stats.borderMode).toBe('territory_edge');
        expect(stats.borderBlend).toBe(true);
        expect(stats.borderChaikinPasses).toBe(4);
        expect(stats.disconnectEnabled).toBe(true);
        expect(stats.disconnectDistance).toBe(295);
        expect(stats.dxWeight).toBe(0.3);
        expect(stats.frontierRequestedTechnique).toBe('control');
        expect(stats.frontierTechnique).toBe('control');
        expect(stats.frontierRequestedBorderGeometryMode).toBe('contour_matched');
        expect(stats.frontierBorderGeometryMode).toBe('shared_edge');
        expect(stats.frontierBorderGeometryFallbackReason).toBe('renderer_unavailable');
        expect(stats.frontierSurfaceGeometryFamily).toBe('shared_edge');
        expect(stats.frontierStableGeometryFamily).toBe('shared_edge');
        expect(stats.frontierTransitionGeometryFamily).toBe('shared_edge');
        expect(stats.frontierSurfaceInvariantViolation).toBeNull();
        expect(stats.frontierBlurPasses).toBe(0);
        expect(stats.frontierPhaseSampling).toBe('nearest');

        family.dispose();
    });

    it('keeps phase-edges wave semantics when shared live settings already match the edge defaults', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);
        const originalWaveGeometry = GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY;
        const originalBorderMode = GAME_CONFIG.METABALL_GRID_BORDER_MODE;
        const originalBorderBlend = GAME_CONFIG.METABALL_GRID_BORDER_BLEND;
        const originalBorderChaikinPasses =
            GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES;
        const originalDisconnectEnabled =
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED;
        const originalDisconnectDistance =
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE;
        const originalDxWeight = GAME_CONFIG.TERRITORY_DX_WEIGHT;

        try {
            GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY = 'euclidean_band';
            GAME_CONFIG.METABALL_GRID_BORDER_MODE = 'territory_edge';
            GAME_CONFIG.METABALL_GRID_BORDER_BLEND = true;
            GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES = 4;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED = true;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE = 295;
            GAME_CONFIG.TERRITORY_DX_WEIGHT = 3;

            family.update(makePhaseEdgesInput(family, 0.35));

            const stats = get(metaballGridStats);
            expect(stats.familyId).toBe('metaball_grid_phase_edges');
            expect(stats.waveGeometry).toBe('pre_to_post_frontier');
            expect(stats.borderMode).toBe('territory_edge');
            expect(stats.borderBlend).toBe(true);
            expect(stats.borderChaikinPasses).toBe(4);
            expect(stats.disconnectEnabled).toBe(true);
            expect(stats.disconnectDistance).toBe(295);
            expect(stats.dxWeight).toBe(0.3);
            expect(stats.frontierTechnique).toBe('control');
            expect(stats.frontierRequestedBorderGeometryMode).toBe('contour_matched');
            expect(stats.frontierBorderGeometryMode).toBe('shared_edge');
            expect(stats.frontierBorderGeometryFallbackReason).toBe('renderer_unavailable');
        } finally {
            GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY = originalWaveGeometry;
            GAME_CONFIG.METABALL_GRID_BORDER_MODE = originalBorderMode;
            GAME_CONFIG.METABALL_GRID_BORDER_BLEND = originalBorderBlend;
            GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES =
                originalBorderChaikinPasses;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED =
                originalDisconnectEnabled;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE =
                originalDisconnectDistance;
            GAME_CONFIG.TERRITORY_DX_WEIGHT = originalDxWeight;
            family.dispose();
        }
    });

    it('materially changes visible frontier lifetime when the transition duration changes', () => {
        const family = createMetaballGridFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makeInputWithDuration(0.35, 200));
        const shortStats = get(metaballGridStats);

        family.update(makeInputWithDuration(0.35, 1_500));
        const longStats = get(metaballGridStats);

        expect(shortStats.activeTransitionDurationMs).toBe(200);
        expect(longStats.activeTransitionDurationMs).toBe(1_500);
        expect(shortStats.frontierVisibleLifetimeMs).not.toBeNull();
        expect(longStats.frontierVisibleLifetimeMs).not.toBeNull();
        expect(longStats.frontierVisibleLifetimeMs!).toBeGreaterThan(
            shortStats.frontierVisibleLifetimeMs! * 4,
        );

        family.dispose();
    });

    it('allows toggling the control-path border geometry back to straight shared-edge mode', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );

        const stats = get(metaballGridStats);
        expect(stats.frontierTechnique).toBe('control');
        expect(stats.frontierRequestedBorderGeometryMode).toBe('shared_edge');
        expect(stats.frontierBorderGeometryMode).toBe('shared_edge');
        expect(stats.frontierBorderGeometryFallbackReason).toBeNull();
        expect(stats.frontierSurfaceGeometryFamily).toBe('shared_edge');
        expect(stats.frontierSurfaceInvariantViolation).toBeNull();

        family.dispose();
    });

    it('keeps the selected surface geometry family stable across steady and transition frames', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        const transitionInput = makePhaseEdgesInput(family, 0.35, {
            TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
        });
        const steadyInput = {
            ...transitionInput,
            activeTransition: null,
            transitionSessions: null,
            prevGeometry: transitionInput.geometry,
        };

        family.update(steadyInput);
        const steadyStats = get(metaballGridStats);

        family.update(transitionInput);
        const transitionStats = get(metaballGridStats);

        expect(steadyStats.frontierSurfaceGeometryFamily).toBe('shared_edge');
        expect(steadyStats.frontierStableGeometryFamily).toBe('shared_edge');
        expect(steadyStats.frontierTransitionGeometryFamily).toBe('shared_edge');
        expect(steadyStats.frontierSurfaceInvariantViolation).toBeNull();
        expect(transitionStats.frontierSurfaceGeometryFamily).toBe(
            steadyStats.frontierSurfaceGeometryFamily,
        );
        expect(transitionStats.frontierStableGeometryFamily).toBe(
            steadyStats.frontierStableGeometryFamily,
        );
        expect(transitionStats.frontierTransitionGeometryFamily).toBe(
            steadyStats.frontierTransitionGeometryFamily,
        );
        expect(transitionStats.frontierSurfaceInvariantViolation).toBeNull();

        family.dispose();
    });

    it('gates contour frontier techniques to the square distribution', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                METABALL_GRID_DISTRIBUTION: 'hex_offset',
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
            }),
        );

        const stats = get(metaballGridStats);
        expect(stats.frontierRequestedTechnique).toBe('marching_squares_scalar');
        expect(stats.frontierTechnique).toBe('control');
        expect(stats.frontierFallbackReason).toBe(
            'requires_square_distribution',
        );

        family.dispose();
    });

    it('falls back to control when shader frontier band has no renderer', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_FRONTIER_TECHNIQUE: 'shader_frontier_band',
                TERRITORY_FRONTIER_PHASE_SAMPLING: 'linear',
            }),
        );

        const stats = get(metaballGridStats);
        expect(stats.frontierRequestedTechnique).toBe('shader_frontier_band');
        expect(stats.frontierTechnique).toBe('control');
        expect(stats.frontierFallbackReason).toBe('renderer_unavailable');

        family.dispose();
    });

    it('populates frontier contour metrics for marching-squares evaluation rows', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
                TERRITORY_FRONTIER_CHAIKIN_PASSES: 1,
            }),
        );

        const stats = get(metaballGridStats);
        expect(stats.frontierTechnique).toBe('marching_squares_scalar');
        expect(stats.frontierPhaseLayerCount).toBeGreaterThanOrEqual(0);
        expect(stats.frontierPhaseGridCols).toBeGreaterThanOrEqual(0);
        expect(stats.frontierPhaseGridRows).toBeGreaterThanOrEqual(0);
        expect(stats.frontierContourExtractionMs).toBeGreaterThanOrEqual(0);
        expect(stats.frontierSmoothingMs).toBeGreaterThanOrEqual(0);
        expect(stats.frontierPolylineCount).toBeGreaterThanOrEqual(0);
        expect(stats.frontierEmittedVertexCount).toBeGreaterThanOrEqual(0);

        family.dispose();
    });

    it('keeps per-cell borders visible when a phase-derived frontier technique is selected', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                METABALL_BORDER_ENABLED: true,
                METABALL_GRID_BORDER_MODE: 'per_cell',
                METABALL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
            }),
        );

        const state = family as unknown as {
            borderGraphics: { visible: boolean };
        };

        expect(state.borderGraphics.visible).toBe(true);

        family.dispose();
    });

    it('honors shared fill and border visibility toggles in phase-edges presentation', () => {
        const family = createMetaballGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                METABALL_FILL_ENABLED: false,
                METABALL_BORDER_ENABLED: true,
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );

        const fillHiddenState = family as unknown as {
            graphics: { visible: boolean };
            nativeSpriteLayer: { visible: boolean };
            transitionSpriteLayer: { visible: boolean };
            frontierFillMeshLayer: { visible: boolean };
            borderGraphics: { visible: boolean };
        };

        expect(fillHiddenState.graphics.visible).toBe(false);
        expect(fillHiddenState.nativeSpriteLayer.visible).toBe(false);
        expect(fillHiddenState.transitionSpriteLayer.visible).toBe(false);
        expect(fillHiddenState.frontierFillMeshLayer.visible).toBe(false);
        expect(fillHiddenState.borderGraphics.visible).toBe(true);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                METABALL_FILL_ENABLED: true,
                METABALL_BORDER_ENABLED: false,
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );

        const borderHiddenState = family as unknown as {
            borderGraphics: { visible: boolean };
            frontierGraphics: { visible: boolean };
            frontierMeshLayer: { visible: boolean };
        };

        expect(borderHiddenState.borderGraphics.visible).toBe(false);
        expect(borderHiddenState.frontierGraphics.visible).toBe(false);
        expect(borderHiddenState.frontierMeshLayer.visible).toBe(false);

        family.dispose();
    });
});
