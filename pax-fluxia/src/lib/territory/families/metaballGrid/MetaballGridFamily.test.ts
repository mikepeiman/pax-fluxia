import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { ConquestEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import type {
    CanonicalGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { buildRenderFamilyInput } from '../buildRenderFamilyInput';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
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
            {
                id: 'attacker',
                x: 80,
                y: 20,
                ownerId: 'B',
                activeShips: 24,
                damagedShips: 0,
                radius: 20,
                starType: 'blue',
            },
            {
                id: 'target',
                x: 25,
                y: 20,
                ownerId: 'B',
                activeShips: 18,
                damagedShips: 0,
                radius: 20,
                starType: 'blue',
            },
        ],
        lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 55 }],
        tunables: new Map([
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
        activeTransition: {
            conquestEvents: [event],
            events: [
                {
                    event,
                    startedAtMs: 1_000,
                    durationMs: 1_500,
                    progress,
                    rawProgress: progress,
                },
            ],
            startedAtMs: 1_000,
            durationMs: 1_500,
            progress,
            rawProgress: progress,
        },
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
            {
                id: 'attacker',
                x: 80,
                y: 20,
                ownerId: 'B',
                activeShips: 24,
                damagedShips: 0,
                radius: 20,
                starType: 'blue',
            },
            {
                id: 'target',
                x: 25,
                y: 20,
                ownerId: 'B',
                activeShips: 18,
                damagedShips: 0,
                radius: 20,
                starType: 'blue',
            },
        ],
        lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 55 }],
        tunables: new Map([
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
        METABALL_ALPHA: 1,
        METABALL_SATURATION: 1,
        METABALL_LIGHTNESS: 0.5,
        MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
        MODIFIED_VORONOI_DISCONNECT_DISTANCE: 295,
        TERRITORY_DX_WEIGHT: 0.3,
        ...metaballGridPhaseEdgesGeometryDefaults,
        ...metaballGridPhaseEdgesModeDefaults,
    };
    return buildRenderFamilyInput({
        stars: base.stars,
        lanes: base.lanes,
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

        try {
            GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY = 'euclidean_band';
            GAME_CONFIG.METABALL_GRID_BORDER_MODE = 'territory_edge';
            GAME_CONFIG.METABALL_GRID_BORDER_BLEND = true;
            GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES = 4;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED = true;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE = 295;

            family.update(makePhaseEdgesInput(family, 0.35));

            const stats = get(metaballGridStats);
            expect(stats.familyId).toBe('metaball_grid_phase_edges');
            expect(stats.waveGeometry).toBe('pre_to_post_frontier');
            expect(stats.borderMode).toBe('territory_edge');
            expect(stats.borderBlend).toBe(true);
            expect(stats.borderChaikinPasses).toBe(4);
            expect(stats.disconnectEnabled).toBe(true);
            expect(stats.disconnectDistance).toBe(295);
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
});
