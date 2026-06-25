import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { ConquestEvent } from '@pax/common';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import {
    disablePerfCapture,
    enablePerfCapture,
    snapshotPerfCapture,
} from '$lib/perf/perfProbe';
import { createGridGradientFamily } from './GridGradientFamily';
import { gridGradientStats } from './gridGradientStats';

const TRANSITION_START_MS = 1_000;
const TRANSITION_DURATION_MS = 1_000;

function makeSnapshot(
    version: string,
    regions: TerritoryRegionShape[],
): ResolvedGeometrySnapshot {
    return {
        version,
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
        ownershipVersion: version,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: regions,
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: `topo:${version}`,
            ownershipVersion: version,
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

function makeEvent(): ConquestEvent {
    return {
        tick: 1,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [10],
        previousOwner: 'A',
        newOwner: 'B',
        shipsCaptured: 10,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 10,
        conquestType: 'complete',
    };
}

function makeStar(id: string, x: number, y: number, ownerId: string): StarState {
    return {
        id,
        x,
        y,
        ownerId,
        activeShips: 20,
        damagedShips: 0,
        radius: 20,
        starType: 'blue',
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

function makeActiveTransition(
    event: ConquestEvent,
    progress: number,
): RenderFamilyActiveTransition {
    return {
        sessionKey: `tick:${event.tick}:grid-gradient-test`,
        conquestEvents: [event],
        events: [
            {
                event,
                startedAtMs: TRANSITION_START_MS,
                durationMs: TRANSITION_DURATION_MS,
                progress,
                rawProgress: progress,
            },
        ],
        startedAtMs: TRANSITION_START_MS,
        durationMs: TRANSITION_DURATION_MS,
        progress,
        rawProgress: progress,
    };
}

function makeTunables(): ReadonlyMap<string, RenderFamilyTunableValue> {
    return new Map<string, RenderFamilyTunableValue>([
        ['GRID_GRADIENT_ENABLED', true],
        ['GRID_GRADIENT_DRAW_BACKEND', 'graphics'],
        ['GRID_GRADIENT_FILL_STYLE', 'pointillist'],
        ['GRID_GRADIENT_SPACING_PX', 10],
        ['GRID_GRADIENT_MAX_CELLS', 0],
        ['GRID_GRADIENT_ORIGIN_MODE', 'centered'],
        ['GRID_GRADIENT_DISTRIBUTION', 'square'],
        ['GRID_GRADIENT_POSITION_JITTER', 0],
        ['GRID_GRADIENT_CENTER_SIZE_PX', 8],
        ['GRID_GRADIENT_EDGE_SIZE_PX', 2],
        ['GRID_GRADIENT_CURVE_POWER', 1],
        ['GRID_GRADIENT_BORDER_OFFSET_PX', 0],
        ['GRID_GRADIENT_CELL_SHAPE', 'circle'],
        ['GRID_GRADIENT_VECTOR_BORDERS_ENABLED', false],
        ['GRID_GRADIENT_BORDER_DOTS_ENABLED', false],
        ['CELL_GRID_ADJACENCY', '4'],
        ['CELL_GRID_WAVE_GEOMETRY', 'conquered_star_radial'],
        ['CELL_GRID_WAVE_SEEDING', 'conquered_star_center'],
        ['CELL_GRID_FLIP_TRANSITION', 'dual_pass_blend'],
        ['CELL_GRID_FLIP_WINDOW', 0.18],
        ['TERRITORY_SURFACE_ALPHA', 1],
        ['TERRITORY_SURFACE_SATURATION', 1],
        ['TERRITORY_SURFACE_LIGHTNESS', 1],
        ['TERRITORY_SURFACE_BORDER_ALPHA', 0],
    ]);
}

function makeInput(progress: number): RenderFamilyInput {
    const event = makeEvent();
    const lanes: StarConnection[] = [
        { sourceId: 'attacker', targetId: 'target', distance: 55 },
    ];
    return {
        ownership: null,
        geometry: makeSnapshot('post', [rect('B', 'all', 0, 0, 100, 40)]),
        prevGeometry: makeSnapshot('pre', [
            rect('A', 'left', 0, 0, 50, 40),
            rect('B', 'right', 50, 0, 100, 40),
        ]),
        nowMs: TRANSITION_START_MS + progress * TRANSITION_DURATION_MS,
        gameTick: 1,
        stars: [
            makeStar('attacker', 80, 20, 'B'),
            makeStar('target', 25, 20, 'B'),
        ],
        lanes,
        world: { width: 100, height: 40 },
        tunables: makeTunables(),
        activeTransition: makeActiveTransition(event, progress),
    };
}

describe('GridGradientFamily transitions', () => {
    it('keeps non-native transition cells and advancing progress for PREV to NEXT fills', () => {
        const family = createGridGradientFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        family.update(makeInput(0));
        family.update(makeInput(0.35));

        const stats = get(gridGradientStats);
        expect(stats.transitionEventCount).toBe(1);
        expect(stats.activeTransitionCells).toBeGreaterThan(0);
        expect(stats.activeMixingTransitionCells).toBeGreaterThan(0);
        expect(stats.rawProgress).toBeCloseTo(0.35);
        expect(stats.clockSource).toBe('local');
        expect(stats.drawBackend).toBe('graphics');
        expect(stats.fillStyle).toBe('pointillist');

        family.dispose();
    });

    it('emits stage-level perf measures when capture is enabled', () => {
        const family = createGridGradientFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);

        enablePerfCapture();
        try {
            family.update(makeInput(0));
            const snapshot = snapshotPerfCapture();
            expect(snapshot?.measures['territory.gridGradient.planResolve']?.count).toBe(1);
            expect(snapshot?.measures['territory.gridGradient.graphicsPaint']?.count).toBe(1);
            expect(snapshot?.measures['territory.gridGradient.vectorBorders']?.count).toBe(1);
        } finally {
            disablePerfCapture();
            family.dispose();
        }
    });
});
