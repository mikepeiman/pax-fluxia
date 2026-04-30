import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { ConquestEvent } from '@pax/common';
import { territoryFrontierConfigDefaults, TERRITORY_FRONTIER_BENCHMARK_PRESETS } from '$lib/territory/frontier';
import type {
    CanonicalGeometrySnapshot,
    TerritoryRegionShape,
} from '$lib/territory/contracts/GeometryContracts';
import { buildRenderFamilyInput } from '$lib/territory/families/buildRenderFamilyInput';
import { createMetaballGridPhaseEdgesFamily } from '$lib/territory/families/metaballGrid/MetaballGridFamily';
import {
    metaballGridPhaseEdgesGeometryDefaults,
    metaballGridPhaseEdgesModeDefaults,
} from '$lib/territory/families/metaballGrid/config';
import { metaballGridStats } from '$lib/territory/families/metaballGrid/metaballGridStats';

interface FrontierScenarioMetrics {
    readonly requestedTechnique: string;
    readonly appliedTechnique: string;
    readonly fallbackReason: string | null;
    readonly updateMs: number;
    readonly paintMs: number;
    readonly blurMs: number;
    readonly contourMs: number;
    readonly smoothingMs: number;
    readonly phaseLayerCount: number;
    readonly phaseGridCols: number;
    readonly phaseGridRows: number;
    readonly polylineCount: number;
    readonly vertexCount: number;
}

interface FrontierBenchmarkReport {
    readonly generatedAt: string;
    readonly presets: ReadonlyArray<{
        readonly presetId: string;
        readonly label: string;
        readonly steadyState: FrontierScenarioMetrics;
        readonly conquestTransition: FrontierScenarioMetrics;
    }>;
}

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(THIS_DIR, '..', '..');
const METRICS_DIR = path.join(ROOT, '.agent-harness', 'metrics');
const OUTPUT_PATH = path.join(
    METRICS_DIR,
    'frontier-techniques-benchmark-latest.json',
);
const frontierColorUtils = {
    getPlayerColor(ownerId: string): number {
        return ownerId === 'A' ? 0x3366ff : 0xff6633;
    },
} as never;
const frontierTunableKeys = (() => {
    const family = createMetaballGridPhaseEdgesFamily(frontierColorUtils);
    const keys = family.tunableKeys;
    family.dispose();
    return keys;
})();

function makeSnapshot(
    regions: TerritoryRegionShape[],
): CanonicalGeometrySnapshot {
    return {
        version: 'benchmark',
        sourceMode: 'unified_vector',
        sourceStyle: 'canonical',
        ownershipVersion: 'benchmark',
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: regions,
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: 'benchmark-topology',
            ownershipVersion: 'benchmark',
            worldBounds: { width: 120, height: 60 },
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
        tick: 7,
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

function makeInput(
    presetValues: Record<string, unknown>,
    progress: number | null,
) {
    const prevGeometry = makeSnapshot([
        rect('A', 'left', 0, 0, 60, 60),
        rect('B', 'right', 60, 0, 120, 60),
    ]);
    const nextGeometry = makeSnapshot([
        rect('B', 'all', 0, 0, 120, 60),
    ]);
    const event = makeEvent('A', 'B');
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
        METABALL_BORDER_WIDTH: 3,
        METABALL_ALPHA: 1,
        METABALL_SATURATION: 1,
        METABALL_LIGHTNESS: 0.5,
        ...territoryFrontierConfigDefaults,
        ...metaballGridPhaseEdgesGeometryDefaults,
        ...metaballGridPhaseEdgesModeDefaults,
        ...presetValues,
    };

    return buildRenderFamilyInput({
        stars: [
            {
                id: 'attacker',
                x: 90,
                y: 30,
                ownerId: 'B',
                activeShips: 24,
                damagedShips: 0,
                radius: 20,
                starType: 'blue',
            },
            {
                id: 'target',
                x: 30,
                y: 30,
                ownerId: 'B',
                activeShips: 18,
                damagedShips: 0,
                radius: 20,
                starType: 'blue',
            },
        ],
        lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 60 }],
        worldWidth: 120,
        worldHeight: 60,
        nowMs: progress == null ? 3_000 : 1_000 + progress * 1_500,
        gameTick: 7,
        ownership: null,
        geometry: progress == null ? nextGeometry : nextGeometry,
        prevGeometry: progress == null ? nextGeometry : prevGeometry,
        activeTransition:
            progress == null
                ? null
                : {
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
        tunableKeys: frontierTunableKeys,
        configSource,
    });
}

function readScenarioMetrics(): FrontierScenarioMetrics {
    const stats = get(metaballGridStats);
    return {
        requestedTechnique: stats.frontierRequestedTechnique,
        appliedTechnique: stats.frontierTechnique,
        fallbackReason: stats.frontierFallbackReason,
        updateMs: stats.lastUpdateMs,
        paintMs: stats.lastPaintMs,
        blurMs: stats.frontierBlurMs,
        contourMs: stats.frontierContourExtractionMs,
        smoothingMs: stats.frontierSmoothingMs,
        phaseLayerCount: stats.frontierPhaseLayerCount,
        phaseGridCols: stats.frontierPhaseGridCols,
        phaseGridRows: stats.frontierPhaseGridRows,
        polylineCount: stats.frontierPolylineCount,
        vertexCount: stats.frontierEmittedVertexCount,
    };
}

describe('frontier technique benchmark matrix', () => {
    it('writes a benchmark report and every preset completes with populated metrics', () => {
        const report: FrontierBenchmarkReport = {
            generatedAt: new Date().toISOString(),
            presets: TERRITORY_FRONTIER_BENCHMARK_PRESETS.map((preset) => {
                const family = createMetaballGridPhaseEdgesFamily(
                    frontierColorUtils,
                );

                family.update(makeInput(preset.values, null));
                const steadyState = readScenarioMetrics();

                family.update(makeInput(preset.values, 0.35));
                const conquestTransition = readScenarioMetrics();
                family.dispose();

                expect(steadyState.updateMs).toBeGreaterThanOrEqual(0);
                expect(conquestTransition.updateMs).toBeGreaterThanOrEqual(0);
                expect(conquestTransition.phaseGridCols).toBeGreaterThanOrEqual(0);
                expect(conquestTransition.phaseGridRows).toBeGreaterThanOrEqual(0);
                expect(conquestTransition.phaseLayerCount).toBeGreaterThanOrEqual(0);
                expect(conquestTransition.requestedTechnique).toBeTruthy();
                expect(conquestTransition.appliedTechnique).toBeTruthy();

                return {
                    presetId: preset.id,
                    label: preset.label,
                    steadyState,
                    conquestTransition,
                };
            }),
        };

        mkdirSync(METRICS_DIR, { recursive: true });
        writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8');
        expect(report.presets).toHaveLength(
            TERRITORY_FRONTIER_BENCHMARK_PRESETS.length,
        );
    });
});
