import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { ConquestEvent } from '@pax/common';
import { GAME_CONFIG } from '$lib/config/game.config';
import { territoryFrontierConfigDefaults } from '$lib/territory/frontier/config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { buildRenderFamilyInput } from '../buildRenderFamilyInput';
import type {
    RenderFamily,
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import { createCellGridFamily } from './CellGridFamily';
import {
    createCellGridEmberLatticeFamily,
    createCellGridPhaseEdgesFamily,
} from './CellGridPhaseEdgesFamily';
import {
    cellGridPhaseEdgesGeometryDefaults,
    cellGridPhaseEdgesModeDefaults,
} from './config';
import { cellGridStats } from './cellGridStats';

function makeSnapshot(
    regions: TerritoryRegionShape[],
): ResolvedGeometrySnapshot {
    return {
        version: 'test',
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
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
            ['CELL_GRID_ENABLED', true],
            ['CELL_GRID_SPACING_PX', 10],
            ['CELL_GRID_ORIGIN_MODE', 'centered'],
            ['CELL_GRID_DISTRIBUTION', 'square'],
            ['CELL_GRID_POSITION_JITTER', 0],
            ['CELL_GRID_MAX_CELLS', 0],
            ['CELL_GRID_ADJACENCY', '4'],
            ['CELL_GRID_WAVE_GEOMETRY', 'grid_bfs'],
            ['CELL_GRID_WAVE_SEEDING', 'conquered_star_center'],
            ['CELL_GRID_FLIP_TRANSITION', 'dual_pass_blend'],
            ['CELL_GRID_FLIP_WINDOW', 0.08],
            ['CELL_GRID_FLIP_WINDOW_JITTER', 0],
            ['CELL_GRID_CELL_SHAPE', 'square'],
            ['CELL_GRID_CELL_INSET_PX', 0],
            ['CELL_GRID_CELL_CORNER_PX', 0],
            ['CELL_GRID_BORDER_MODE', 'off'],
            ['TERRITORY_SURFACE_BORDER_ALPHA', 0],
            ['TERRITORY_SURFACE_ALPHA', 1],
            ['TERRITORY_SURFACE_SATURATION', 1],
            ['TERRITORY_SURFACE_LIGHTNESS', 0.5],
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
            ['CELL_GRID_ENABLED', true],
            ['CELL_GRID_SPACING_PX', 10],
            ['CELL_GRID_ORIGIN_MODE', 'centered'],
            ['CELL_GRID_DISTRIBUTION', 'square'],
            ['CELL_GRID_POSITION_JITTER', 0],
            ['CELL_GRID_MAX_CELLS', 0],
            ['CELL_GRID_ADJACENCY', '4'],
            ['CELL_GRID_WAVE_GEOMETRY', 'grid_bfs'],
            ['CELL_GRID_WAVE_SEEDING', 'conquered_star_center'],
            ['CELL_GRID_FLIP_TRANSITION', 'dual_pass_blend'],
            ['CELL_GRID_FLIP_WINDOW', 0.08],
            ['CELL_GRID_FLIP_WINDOW_JITTER', 0],
            ['CELL_GRID_CELL_SHAPE', 'square'],
            ['CELL_GRID_CELL_INSET_PX', 0],
            ['CELL_GRID_CELL_CORNER_PX', 0],
            ['CELL_GRID_BORDER_MODE', 'off'],
            ['TERRITORY_SURFACE_BORDER_ALPHA', 0],
            ['TERRITORY_SURFACE_ALPHA', 1],
            ['TERRITORY_SURFACE_SATURATION', 1],
            ['TERRITORY_SURFACE_LIGHTNESS', 0.5],
        ]),
    };
}

function makePhaseEdgesInput(
    family: Pick<RenderFamily, 'tunableKeys'>,
    progress: number,
    overrides?: Record<string, unknown>,
): RenderFamilyInput {
    const base = makeInput(progress);
    const configSource: Record<string, unknown> = {
        CELL_GRID_ENABLED: true,
        CELL_GRID_SPACING_PX: 10,
        CELL_GRID_ORIGIN_MODE: 'centered',
        CELL_GRID_DISTRIBUTION: 'square',
        CELL_GRID_POSITION_JITTER: 0,
        CELL_GRID_MAX_CELLS: 0,
        CELL_GRID_ADJACENCY: '4',
        CELL_GRID_WAVE_SEEDING: 'conquered_star_center',
        CELL_GRID_FLIP_TRANSITION: 'dual_pass_blend',
        CELL_GRID_FLIP_WINDOW: 0.08,
        CELL_GRID_FLIP_WINDOW_JITTER: 0,
        CELL_GRID_CELL_SHAPE: 'square',
        CELL_GRID_CELL_INSET_PX: 0,
        CELL_GRID_CELL_CORNER_PX: 0,
        TERRITORY_SURFACE_BORDER_ALPHA: 1,
        TERRITORY_SURFACE_FILL_ENABLED: true,
        TERRITORY_SURFACE_BORDER_ENABLED: true,
        TERRITORY_SURFACE_ALPHA: 1,
        TERRITORY_SURFACE_SATURATION: 1,
        TERRITORY_SURFACE_LIGHTNESS: 0.5,
        ...territoryFrontierConfigDefaults,
        ...cellGridPhaseEdgesGeometryDefaults,
        ...cellGridPhaseEdgesModeDefaults,
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

interface GraphicsInstructionSnapshot {
    readonly action: string;
    readonly styleFingerprint: string;
    readonly pathInstructions: readonly string[];
}

function sanitizeInstructionData(
    value: unknown,
    seen: WeakSet<object> = new WeakSet(),
): unknown {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeInstructionData(entry, seen));
    }
    if (typeof value !== 'object') {
        return String(value);
    }
    if (seen.has(value)) {
        return '[Circular]';
    }
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (key === 'path') continue;
        out[key] = sanitizeInstructionData(entry, seen);
    }
    seen.delete(value);
    return out;
}

function captureGraphicsInstructionSnapshot(target: unknown): GraphicsInstructionSnapshot[] {
    const instructions = (
        target as {
            context?: {
                instructions?: Array<{
                    action: string;
                    data?: {
                        path?: {
                            instructions?: Array<{
                                action: string;
                                data: unknown[];
                            }>;
                        };
                    };
                }>;
            };
        }
    ).context?.instructions;

    if (!instructions) return [];

    return instructions.map((instruction) => ({
        action: instruction.action,
        styleFingerprint: JSON.stringify(
            sanitizeInstructionData(instruction.data),
        ),
        pathInstructions:
            instruction.data?.path?.instructions?.map((pathInstruction) =>
                JSON.stringify([
                    pathInstruction.action,
                    ...(pathInstruction.data ?? []),
                ]),
            ) ?? [],
    }));
}

function captureFillSnapshot(target: unknown): readonly string[] {
    return captureGraphicsInstructionSnapshot(target)
        .filter((instruction) => instruction.action === 'fill')
        .flatMap((instruction) => instruction.pathInstructions);
}

function captureFillRenderSnapshot(target: unknown): readonly string[] {
    return captureGraphicsInstructionSnapshot(target)
        .filter((instruction) => instruction.action === 'fill')
        .map((instruction) =>
            JSON.stringify([
                instruction.styleFingerprint,
                ...instruction.pathInstructions,
            ]),
        );
}

function captureStrokeSnapshot(target: unknown): readonly string[] {
    return captureGraphicsInstructionSnapshot(target)
        .filter((instruction) => instruction.action === 'stroke')
        .flatMap((instruction) => instruction.pathInstructions);
}

describe('CellGridFamily active frontier fast path', () => {
    it('uses retained frontier layers for square dual-pass conquest frames', () => {
        const family = createCellGridFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makeInput(0.12));
        const initialStats = get(cellGridStats);
        expect(initialStats.fastPathUsed).toBe(true);
        expect(initialStats.transitionTotalCount).toBeGreaterThan(0);
        expect(initialStats.activeWindowCount).toBeGreaterThan(0);
        expect(initialStats.transitionTotalCount).toBeGreaterThan(
            initialStats.activeWindowCount,
        );

        family.update(makeInput(0.2));
        const nextStats = get(cellGridStats);
        expect(nextStats.fastPathUsed).toBe(true);
        expect(nextStats.promotedToActiveCount).toBeGreaterThanOrEqual(0);
        expect(nextStats.demotedToSettledCount).toBeGreaterThanOrEqual(0);
        expect(nextStats.transitionSpriteWrites).toBeLessThan(
            nextStats.transitionTotalCount * 2,
        );

        family.dispose();
    });

    it('forces one cleanup repaint after conquest ends so retained frontier layers do not leak', () => {
        const family = createCellGridFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makeInput(1));
        const transitionStats = get(cellGridStats);
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
        const steadyStats = get(cellGridStats);
        expect(steadyStats.lastFrameSkipped).toBe(false);

        const internalAfterCleanup = family as unknown as {
            activeFrontierState: unknown;
        };
        expect(internalAfterCleanup.activeFrontierState).toBeNull();

        family.dispose();
    });

    it('reports Ember Lattice locked defaults through buildRenderFamilyInput and family stats', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makePhaseEdgesInput(family, 0.35));

        const stats = get(cellGridStats);
        expect(stats.familyId).toBe('ember_lattice');
        expect(stats.waveGeometry).toBe('pre_to_post_frontier');
        expect(stats.borderMode).toBe('territory_edge');
        expect(stats.borderBlend).toBe(true);
        expect(stats.borderChaikinPasses).toBe(4);
        expect(stats.disconnectEnabled).toBe(true);
        expect(stats.disconnectDistance).toBe(295);
        expect(stats.dxWeight).toBe(0.3);
        // Default is now shader_frontier_band (smooth phase-surface fill that meets
        // the border). Headless (no renderer) it falls back to control for the
        // RESOLVED technique — the requested technique still reflects the new default.
        expect(stats.frontierRequestedTechnique).toBe('shader_frontier_band');
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

    it('keeps Phase Edges on the dedicated session-overlay family after the Ember split', () => {
        const family = createCellGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makePhaseEdgesInput(family, 0.35));

        const stats = get(cellGridStats);
        expect(stats.familyId).toBe('phase_edges');
        expect(stats.waveGeometry).toBe('pre_to_post_frontier');
        expect(stats.borderMode).toBe('territory_edge');
        expect(stats.borderBlend).toBe(true);

        family.dispose();
    });

    it('keeps Ember Lattice wave semantics when shared live settings already match the edge defaults', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);
        const originalWaveGeometry = GAME_CONFIG.CELL_GRID_WAVE_GEOMETRY;
        const originalBorderMode = GAME_CONFIG.CELL_GRID_BORDER_MODE;
        const originalBorderBlend = GAME_CONFIG.CELL_GRID_BORDER_BLEND;
        const originalBorderChaikinPasses =
            GAME_CONFIG.CELL_GRID_BORDER_CHAIKIN_PASSES;
        const originalDisconnectEnabled =
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED;
        const originalDisconnectDistance =
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE;
        const originalDxWeight = GAME_CONFIG.TERRITORY_DX_WEIGHT;

        try {
            GAME_CONFIG.CELL_GRID_WAVE_GEOMETRY = 'euclidean_band';
            GAME_CONFIG.CELL_GRID_BORDER_MODE = 'territory_edge';
            GAME_CONFIG.CELL_GRID_BORDER_BLEND = true;
            GAME_CONFIG.CELL_GRID_BORDER_CHAIKIN_PASSES = 4;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED = true;
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE = 295;
            GAME_CONFIG.TERRITORY_DX_WEIGHT = 3;

            family.update(makePhaseEdgesInput(family, 0.35));

            const stats = get(cellGridStats);
            expect(stats.familyId).toBe('ember_lattice');
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
            GAME_CONFIG.CELL_GRID_WAVE_GEOMETRY = originalWaveGeometry;
            GAME_CONFIG.CELL_GRID_BORDER_MODE = originalBorderMode;
            GAME_CONFIG.CELL_GRID_BORDER_BLEND = originalBorderBlend;
            GAME_CONFIG.CELL_GRID_BORDER_CHAIKIN_PASSES =
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
        const family = createCellGridFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makeInputWithDuration(0.35, 200));
        const shortStats = get(cellGridStats);

        family.update(makeInputWithDuration(0.35, 1_500));
        const longStats = get(cellGridStats);

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
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );

        const stats = get(cellGridStats);
        expect(stats.frontierTechnique).toBe('control');
        expect(stats.frontierRequestedBorderGeometryMode).toBe('shared_edge');
        expect(stats.frontierBorderGeometryMode).toBe('shared_edge');
        expect(stats.frontierBorderGeometryFallbackReason).toBeNull();
        expect(stats.frontierSurfaceGeometryFamily).toBe('shared_edge');
        expect(stats.frontierSurfaceInvariantViolation).toBeNull();

        family.dispose();
    });

    it('keeps the selected surface geometry family stable across steady and transition frames', () => {
        const family = createCellGridEmberLatticeFamily({
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
        const steadyStats = get(cellGridStats);

        family.update(transitionInput);
        const transitionStats = get(cellGridStats);

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
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_DISTRIBUTION: 'hex_offset',
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
            }),
        );

        const stats = get(cellGridStats);
        expect(stats.frontierRequestedTechnique).toBe('marching_squares_scalar');
        expect(stats.frontierTechnique).toBe('control');
        expect(stats.frontierFallbackReason).toBe(
            'requires_square_distribution',
        );

        family.dispose();
    });

    it('falls back to control when shader frontier band has no renderer', () => {
        const family = createCellGridEmberLatticeFamily({
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

        const stats = get(cellGridStats);
        expect(stats.frontierRequestedTechnique).toBe('shader_frontier_band');
        expect(stats.frontierTechnique).toBe('control');
        expect(stats.frontierFallbackReason).toBe('renderer_unavailable');

        family.dispose();
    });

    it('populates frontier contour metrics for marching-squares evaluation rows', () => {
        const family = createCellGridEmberLatticeFamily({
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

        const stats = get(cellGridStats);
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
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_SURFACE_BORDER_ENABLED: true,
                CELL_GRID_BORDER_MODE: 'per_cell',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
            }),
        );

        const state = family as unknown as {
            borderGraphics: { visible: boolean };
        };

        expect(state.borderGraphics.visible).toBe(true);

        family.dispose();
    });

    it('keeps Ember Lattice fill coverage identical when centered-blended borders toggle on', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: false,
                CELL_GRID_CELL_INSET_PX: 2,
                CELL_GRID_BOUNDARY_FILL_FLUSH: true,
                CELL_GRID_INWARD_OFFSET_PX: 0,
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );
        const offState = family as unknown as {
            graphics: unknown;
            borderGraphics: unknown;
        };
        const fillOff = captureFillSnapshot(offState.graphics);
        const borderOff = captureStrokeSnapshot(offState.borderGraphics);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                CELL_GRID_CELL_INSET_PX: 2,
                CELL_GRID_BOUNDARY_FILL_FLUSH: true,
                CELL_GRID_INWARD_OFFSET_PX: 0,
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );
        const fillOn = captureFillSnapshot(offState.graphics);
        const borderOn = captureStrokeSnapshot(offState.borderGraphics);

        expect(fillOn).toEqual(fillOff);
        expect(borderOn).not.toEqual(borderOff);

        family.dispose();
    });

    it('keeps contour-technique fill coverage identical when centered-blended borders toggle on', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: false,
                CELL_GRID_CELL_INSET_PX: 0,
                CELL_GRID_BOUNDARY_FILL_FLUSH: false,
                CELL_GRID_INWARD_OFFSET_PX: 0,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            }),
        );
        const offState = family as unknown as {
            graphics: unknown;
            frontierFillMeshLayer: { visible: boolean };
            borderGraphics: unknown;
            frontierGraphics: unknown;
        };
        const fillOff = captureFillSnapshot(offState.graphics);
        const contourOff = captureStrokeSnapshot(offState.frontierGraphics);
        expect(offState.frontierFillMeshLayer.visible).toBe(false);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                CELL_GRID_CELL_INSET_PX: 0,
                CELL_GRID_BOUNDARY_FILL_FLUSH: false,
                CELL_GRID_INWARD_OFFSET_PX: 0,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            }),
        );
        const fillOn = captureFillSnapshot(offState.graphics);
        const contourOn = captureStrokeSnapshot(offState.frontierGraphics);

        expect(fillOn).toEqual(fillOff);
        expect(offState.frontierFillMeshLayer.visible).toBe(false);
        expect(contourOn).not.toEqual(contourOff);

        family.dispose();
    });

    it('applies flush boundary fill in both centered-blended border states', () => {
        for (const borderBlend of [false, true]) {
            const family = createCellGridEmberLatticeFamily({
                getPlayerColor(ownerId: string): number {
                    return ownerId === 'A' ? 0x3366ff : 0xff6633;
                },
            } as never);

            family.update(
                makePhaseEdgesInput(family, 0.35, {
                    CELL_GRID_BORDER_MODE: 'territory_edge',
                    CELL_GRID_BORDER_BLEND: borderBlend,
                    CELL_GRID_CELL_INSET_PX: 2,
                    CELL_GRID_EDGE_TRIM_PX: 2,
                    CELL_GRID_BOUNDARY_FILL_FLUSH: false,
                    CELL_GRID_INWARD_OFFSET_PX: 0,
                    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
                }),
            );
            const state = family as unknown as { graphics: unknown };
            const flushOff = captureFillSnapshot(state.graphics);

            family.update(
                makePhaseEdgesInput(family, 0.35, {
                    CELL_GRID_BORDER_MODE: 'territory_edge',
                    CELL_GRID_BORDER_BLEND: borderBlend,
                    CELL_GRID_CELL_INSET_PX: 2,
                    CELL_GRID_EDGE_TRIM_PX: 2,
                    CELL_GRID_BOUNDARY_FILL_FLUSH: true,
                    CELL_GRID_INWARD_OFFSET_PX: 0,
                    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
                }),
            );
            const flushOn = captureFillSnapshot(state.graphics);

            expect(flushOn).not.toEqual(flushOff);

            family.dispose();
        }
    });

    it('applies inward offset in both centered-blended border states', () => {
        for (const borderBlend of [false, true]) {
            const family = createCellGridEmberLatticeFamily({
                getPlayerColor(ownerId: string): number {
                    return ownerId === 'A' ? 0x3366ff : 0xff6633;
                },
            } as never);

            family.update(
                makePhaseEdgesInput(family, 0.35, {
                    CELL_GRID_BORDER_MODE: 'territory_edge',
                    CELL_GRID_BORDER_BLEND: borderBlend,
                    CELL_GRID_CELL_INSET_PX: 2,
                    CELL_GRID_BOUNDARY_FILL_FLUSH: true,
                    CELL_GRID_INWARD_OFFSET_PX: 0,
                    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
                }),
            );
            const state = family as unknown as { graphics: unknown };
            const offsetZero = captureFillSnapshot(state.graphics);

            family.update(
                makePhaseEdgesInput(family, 0.35, {
                    CELL_GRID_BORDER_MODE: 'territory_edge',
                    CELL_GRID_BORDER_BLEND: borderBlend,
                    CELL_GRID_CELL_INSET_PX: 2,
                    CELL_GRID_BOUNDARY_FILL_FLUSH: true,
                    CELL_GRID_INWARD_OFFSET_PX: 3,
                    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
                }),
            );
            const offsetThree = captureFillSnapshot(state.graphics);

            expect(offsetThree).not.toEqual(offsetZero);

            family.dispose();
        }
    });

    it('does not repaint suppressed square bands when inward offset crosses the old 24px cap', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_SPACING_PX: 12,
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                CELL_GRID_CELL_INSET_PX: 0,
                CELL_GRID_BOUNDARY_FILL_FLUSH: true,
                CELL_GRID_INWARD_OFFSET_PX: 23,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            }),
        );
        const state = family as unknown as { graphics: unknown };
        const offset23 = captureFillSnapshot(state.graphics);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_SPACING_PX: 12,
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                CELL_GRID_CELL_INSET_PX: 0,
                CELL_GRID_BOUNDARY_FILL_FLUSH: true,
                CELL_GRID_INWARD_OFFSET_PX: 24,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            }),
        );
        const offset24 = captureFillSnapshot(state.graphics);

        expect(offset24.length).toBeLessThanOrEqual(offset23.length);

        family.dispose();
    });

    it('applies soft-fade frontier FX on the live Ember Lattice fill path', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
                TERRITORY_FRONTIER_FX_MODE: 'off',
            }),
        );
        const state = family as unknown as { graphics: unknown };
        const offSnapshot = captureFillRenderSnapshot(state.graphics);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
                TERRITORY_FRONTIER_FX_MODE: 'soft_fade',
                TERRITORY_FRONTIER_FX_WIDTH_PX: 24,
                TERRITORY_FRONTIER_FX_STRENGTH: 0.8,
                TERRITORY_FRONTIER_FX_SOFTNESS: 1.2,
            }),
        );
        const softFadeSnapshot = captureFillRenderSnapshot(state.graphics);

        expect(softFadeSnapshot).not.toEqual(offSnapshot);

        family.dispose();
    });

    it('applies stepped-moat frontier FX on the live Ember Lattice fill path', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
                TERRITORY_FRONTIER_FX_MODE: 'off',
            }),
        );
        const state = family as unknown as { graphics: unknown };
        const offSnapshot = captureFillRenderSnapshot(state.graphics);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
                TERRITORY_FRONTIER_FX_MODE: 'stepped_moat',
                TERRITORY_FRONTIER_FX_WIDTH_PX: 30,
                TERRITORY_FRONTIER_FX_STRENGTH: 0.85,
                TERRITORY_FRONTIER_FX_STEPS: 5,
            }),
        );
        const steppedSnapshot = captureFillRenderSnapshot(state.graphics);

        expect(steppedSnapshot).not.toEqual(offSnapshot);

        family.dispose();
    });

    it('animates plasma-rim frontier FX over time on the live Ember Lattice fill path', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        const inputA = makePhaseEdgesInput(family, 0.35, {
            CELL_GRID_BORDER_MODE: 'territory_edge',
            CELL_GRID_BORDER_BLEND: true,
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            TERRITORY_FRONTIER_FX_MODE: 'plasma_rim',
            TERRITORY_FRONTIER_FX_WIDTH_PX: 26,
            TERRITORY_FRONTIER_FX_STRENGTH: 0.9,
            TERRITORY_FRONTIER_FX_PULSE_SPEED: 1.4,
        });
        family.update({ ...inputA, nowMs: 10_000 });
        const state = family as unknown as { graphics: unknown };
        const earlySnapshot = captureFillRenderSnapshot(state.graphics);

        const inputB = makePhaseEdgesInput(family, 0.35, {
            CELL_GRID_BORDER_MODE: 'territory_edge',
            CELL_GRID_BORDER_BLEND: true,
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            TERRITORY_FRONTIER_FX_MODE: 'plasma_rim',
            TERRITORY_FRONTIER_FX_WIDTH_PX: 26,
            TERRITORY_FRONTIER_FX_STRENGTH: 0.9,
            TERRITORY_FRONTIER_FX_PULSE_SPEED: 1.4,
        });
        family.update({ ...inputB, nowMs: 10_320 });
        const lateSnapshot = captureFillRenderSnapshot(state.graphics);

        expect(lateSnapshot).not.toEqual(earlySnapshot);

        family.dispose();
    });

    it('applies ion-drift frontier FX on the live Phase Edges fill path', () => {
        const family = createCellGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
                TERRITORY_FRONTIER_FX_MODE: 'off',
            }),
        );
        const state = family as unknown as { graphics: unknown };
        const offSnapshot = captureFillRenderSnapshot(state.graphics);

        const ionInput = makePhaseEdgesInput(family, 0.35, {
            CELL_GRID_BORDER_MODE: 'territory_edge',
            CELL_GRID_BORDER_BLEND: true,
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            TERRITORY_FRONTIER_FX_MODE: 'ion_drift',
            TERRITORY_FRONTIER_FX_WIDTH_PX: 22,
            TERRITORY_FRONTIER_FX_STRENGTH: 0.85,
            TERRITORY_FRONTIER_FX_EMISSIVE: 1.1,
            TERRITORY_FRONTIER_FX_PARTICLE_DENSITY: 0.8,
            TERRITORY_FRONTIER_FX_PULSE_SPEED: 1.5,
        });
        family.update({ ...ionInput, nowMs: 10_180 });
        const ionSnapshot = captureFillRenderSnapshot(state.graphics);

        expect(ionSnapshot).not.toEqual(offSnapshot);

        family.dispose();
    });

    it('animates geometry-strip frontier FX over time on the live Ember Lattice fill path', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        const inputA = makePhaseEdgesInput(family, 0.35, {
            CELL_GRID_BORDER_MODE: 'territory_edge',
            CELL_GRID_BORDER_BLEND: true,
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            TERRITORY_FRONTIER_FX_MODE: 'geometry_strip',
            TERRITORY_FRONTIER_FX_WIDTH_PX: 28,
            TERRITORY_FRONTIER_FX_STRENGTH: 0.9,
            TERRITORY_FRONTIER_FX_STEPS: 6,
            TERRITORY_FRONTIER_FX_EMISSIVE: 1.15,
            TERRITORY_FRONTIER_FX_PULSE_SPEED: 1.8,
        });
        family.update({ ...inputA, nowMs: 10_000 });
        const state = family as unknown as { graphics: unknown };
        const earlySnapshot = captureFillRenderSnapshot(state.graphics);

        const inputB = makePhaseEdgesInput(family, 0.35, {
            CELL_GRID_BORDER_MODE: 'territory_edge',
            CELL_GRID_BORDER_BLEND: true,
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            TERRITORY_FRONTIER_FX_MODE: 'geometry_strip',
            TERRITORY_FRONTIER_FX_WIDTH_PX: 28,
            TERRITORY_FRONTIER_FX_STRENGTH: 0.9,
            TERRITORY_FRONTIER_FX_STEPS: 6,
            TERRITORY_FRONTIER_FX_EMISSIVE: 1.15,
            TERRITORY_FRONTIER_FX_PULSE_SPEED: 1.8,
        });
        family.update({ ...inputB, nowMs: 10_360 });
        const lateSnapshot = captureFillRenderSnapshot(state.graphics);

        expect(lateSnapshot).not.toEqual(earlySnapshot);

        family.dispose();
    });

    it('keeps the completed terminal transition frame visually identical to the next steady frame', () => {
        const family = createCellGridPhaseEdgesFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        const completedInput = makePhaseEdgesInput(family, 1.01, {
            CELL_GRID_BORDER_MODE: 'territory_edge',
            CELL_GRID_BORDER_BLEND: true,
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            TERRITORY_FRONTIER_FX_MODE: 'plasma_rim',
            TERRITORY_FRONTIER_FX_WIDTH_PX: 24,
            TERRITORY_FRONTIER_FX_STRENGTH: 0.8,
            TERRITORY_FRONTIER_FX_PULSE_SPEED: 1.25,
        });
        family.update(completedInput);
        const state = family as unknown as { graphics: unknown };
        const completedSnapshot = captureFillRenderSnapshot(state.graphics);

        family.update({
            ...completedInput,
            activeTransition: null,
            prevGeometry: completedInput.geometry,
        });
        const steadySnapshot = captureFillRenderSnapshot(state.graphics);

        expect(completedSnapshot).toEqual(steadySnapshot);

        family.dispose();
    });

    it('suppresses base fill only inside the explicit frontier-replacement mask', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        const shouldSuppressSceneCellForFrontierFill = (
            family as unknown as {
                shouldSuppressSceneCellForFrontierFill: (
                    cell: { x: number; y: number; colorIdx: number },
                    layers: Array<{
                        ownerIndex?: number;
                        opposingOwnerIndex?: number | null;
                        originX: number;
                        originY: number;
                        cellSizePx: number;
                        cols: number;
                        rows: number;
                        values: Float32Array;
                        ownerIndexByCell: Int32Array;
                        validMask?: Uint8Array;
                        suppressMask?: Uint8Array;
                    }>,
                ) => boolean;
            }
        ).shouldSuppressSceneCellForFrontierFill.bind(family);

        const layer = {
            ownerIndex: 0,
            opposingOwnerIndex: 1,
            originX: 0,
            originY: 0,
            cellSizePx: 10,
            cols: 3,
            rows: 3,
            values: new Float32Array(9).fill(1),
            ownerIndexByCell: new Int32Array(9).fill(0),
            validMask: new Uint8Array(9).fill(1),
            suppressMask: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]),
        };

        expect(
            shouldSuppressSceneCellForFrontierFill(
                { x: 10, y: 10, colorIdx: 0 },
                [layer],
            ),
        ).toBe(true);
        expect(
            shouldSuppressSceneCellForFrontierFill(
                { x: 0, y: 0, colorIdx: 0 },
                [layer],
            ),
        ).toBe(false);

        family.dispose();
    });

    it('honors shared fill and border visibility toggles in Ember Lattice presentation', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_SURFACE_FILL_ENABLED: false,
                TERRITORY_SURFACE_BORDER_ENABLED: true,
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
                TERRITORY_SURFACE_FILL_ENABLED: true,
                TERRITORY_SURFACE_BORDER_ENABLED: false,
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

    it('clears dormant contour and shader border layers when border mode is off', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        const staleState = family as unknown as {
            borderGraphics: { visible: boolean };
            frontierGraphics: { visible: boolean };
            frontierMeshLayer: { visible: boolean };
        };
        staleState.borderGraphics.visible = true;
        staleState.frontierGraphics.visible = true;
        staleState.frontierMeshLayer.visible = true;

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_SURFACE_BORDER_ENABLED: true,
                CELL_GRID_BORDER_MODE: 'off',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );

        expect(staleState.borderGraphics.visible).toBe(false);
        expect(staleState.frontierGraphics.visible).toBe(false);
        expect(staleState.frontierMeshLayer.visible).toBe(false);

        family.dispose();
    });

    it('keeps shared-edge territory borders on the base border layer only', () => {
        const family = createCellGridEmberLatticeFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(
            makePhaseEdgesInput(family, 0.35, {
                TERRITORY_SURFACE_BORDER_ENABLED: true,
                CELL_GRID_BORDER_MODE: 'territory_edge',
                CELL_GRID_BORDER_BLEND: true,
                TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            }),
        );

        const state = family as unknown as {
            borderGraphics: { visible: boolean };
            frontierGraphics: { visible: boolean };
            frontierMeshLayer: { visible: boolean };
        };

        expect(state.borderGraphics.visible).toBe(true);
        expect(state.frontierGraphics.visible).toBe(false);
        expect(state.frontierMeshLayer.visible).toBe(false);

        family.dispose();
    });
});
