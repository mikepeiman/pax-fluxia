import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as PIXI from 'pixi.js';
import {
    createMetaballRuntime,
    renderMetaball,
    type MetaballRenderMetrics,
} from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildMetaballScene,
    buildMetaballStaticScene,
} from '$lib/territory/families/metaball/buildMetaballScene';
import { reconcileMetaballConquestCache } from '$lib/territory/families/metaball/metaballConquestTransitions';
import { buildPerimeterFieldScene } from '$lib/territory/families/perimeterField/buildPerimeterFieldScene';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '$lib/territory/families/RenderFamilyTypes';
import type { CanonicalGeometrySnapshot } from '$lib/territory/contracts/GeometryContracts';

interface ScenarioMetrics {
    iterations: number;
    sceneBuildMsAvg: number;
    rendererSolveMsAvg: number;
    textureUploadMsAvg: number;
    borderMsAvg: number;
    renderTotalMsAvg: number;
    frameTotalMsAvg: number;
}

interface BenchmarkReport {
    generatedAt: string;
    warmupIterations: number;
    steadyIterations: number;
    transitionIterations: number;
    metaballGrid: {
        steadyState: ScenarioMetrics;
        conquestTransition: ScenarioMetrics;
    };
    perimeterField: {
        steadyState: ScenarioMetrics;
        conquestTransition: ScenarioMetrics;
    };
}

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(THIS_DIR, '..', '..', '..');
const METRICS_DIR = path.join(ROOT, '.agent-harness', 'metrics');
const OUTPUT_PATH = path.join(
    METRICS_DIR,
    'territory-metaball-benchmark-latest.json',
);

const colorUtils = {
    getPlayerColor(ownerId: string): number {
        switch (ownerId) {
            case 'blue':
                return 0x2f7dff;
            case 'red':
                return 0xff5b3a;
            case 'green':
                return 0x3fbe68;
            case 'gold':
                return 0xe0b438;
            default:
                return 0xffffff;
        }
    },
} as unknown as ColorUtils;

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function makeTunables(
    entries: Record<string, RenderFamilyTunableValue>,
): Map<string, RenderFamilyTunableValue> {
    return new Map(Object.entries(entries));
}

function makeStar(params: {
    id: string;
    x: number;
    y: number;
    ownerId: string;
    ships?: number;
}): StarState {
    const ships = params.ships ?? 18;
    return {
        id: params.id,
        x: params.x,
        y: params.y,
        ownerId: params.ownerId,
        activeShips: ships,
        damagedShips: Math.round(ships * 0.15),
        radius: 20,
        starType: 'blue',
    } as StarState;
}

function makeTransition(progress: number): RenderFamilyActiveTransition {
    const conquestEvent = {
        tick: 42,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [8],
        previousOwner: 'red',
        newOwner: 'blue',
        shipsCaptured: 8,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 8,
        conquestType: 'complete' as const,
    };

    return {
        conquestEvents: [conquestEvent],
        events: [
            {
                event: conquestEvent,
                startedAtMs: 1_000,
                durationMs: 1_000,
                rawProgress: progress,
                progress,
            },
        ],
        startedAtMs: 1_000,
        durationMs: 1_000,
        rawProgress: progress,
        progress,
    };
}

function buildMetaballInput(progress: number | null): RenderFamilyInput {
    const stars = [
        makeStar({ id: 'attacker', x: 110, y: 150, ownerId: 'blue', ships: 26 }),
        makeStar({ id: 'blue-mid', x: 240, y: 190, ownerId: 'blue', ships: 21 }),
        makeStar({ id: 'blue-east', x: 360, y: 150, ownerId: 'blue', ships: 20 }),
        makeStar({ id: 'target', x: 510, y: 190, ownerId: 'blue', ships: 22 }),
        makeStar({ id: 'red-anchor', x: 510, y: 340, ownerId: 'red', ships: 24 }),
        makeStar({ id: 'red-east', x: 650, y: 330, ownerId: 'red', ships: 19 }),
        makeStar({ id: 'green-south', x: 280, y: 470, ownerId: 'green', ships: 17 }),
        makeStar({ id: 'gold-north', x: 690, y: 110, ownerId: 'gold', ships: 15 }),
    ];
    const lanes: StarConnection[] = [
        { sourceId: 'attacker', targetId: 'blue-mid', distance: 136 },
        { sourceId: 'blue-mid', targetId: 'blue-east', distance: 126 },
        { sourceId: 'blue-east', targetId: 'target', distance: 155 },
        { sourceId: 'target', targetId: 'red-anchor', distance: 150 },
        { sourceId: 'red-anchor', targetId: 'red-east', distance: 140 },
        { sourceId: 'blue-mid', targetId: 'green-south', distance: 290 },
        { sourceId: 'red-east', targetId: 'gold-north', distance: 220 },
    ];

    return {
        ownership: null,
        nowMs: progress == null ? 2_000 : 1_000 + progress * 1_000,
        gameTick: 42,
        stars,
        lanes,
        world: { width: 900, height: 640 },
        tunables: makeTunables({
            VS_TRANSITION_MODE: 'metaball_lane_push',
            MODIFIED_VORONOI_CORRIDOR_ENABLED: true,
            MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
            METABALL_CELL_SIZE: 6,
            METABALL_INFLUENCE_RADIUS: 110,
            METABALL_COVERAGE: 0.22,
        }),
        activeTransition: progress == null ? null : makeTransition(progress),
    };
}

function makeGeometry(params: {
    version: string;
    ownerId: string;
    loopId: string;
    points: Array<[number, number]>;
    starIds: string[];
}): CanonicalGeometrySnapshot {
    const [p0, p1, p2, p3] = params.points;
    return {
        version: params.version,
        ownershipVersion: params.version,
        sourceMode: 'territory',
        sourceStyle: 'perimeter_field',
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [
            {
                regionId: `${params.loopId}:region`,
                ownerId: params.ownerId,
                points: params.points,
                starIds: params.starIds,
                confidence: 1,
            },
        ],
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: `${params.version}:topology`,
            sections: new Map([
                [`${params.loopId}:top`, { id: `${params.loopId}:top`, kind: 'frontier', points: [p0, p1] }],
                [`${params.loopId}:right`, { id: `${params.loopId}:right`, kind: 'frontier', points: [p1, p2] }],
                [`${params.loopId}:bottom`, { id: `${params.loopId}:bottom`, kind: 'frontier', points: [p2, p3] }],
                [`${params.loopId}:left`, { id: `${params.loopId}:left`, kind: 'frontier', points: [p3, p0] }],
            ]),
            loops: [
                {
                    id: params.loopId,
                    ownerId: params.ownerId,
                    signedArea: 1,
                    sectionRefs: [
                        { sectionId: `${params.loopId}:top`, direction: 'forward' as const },
                        { sectionId: `${params.loopId}:right`, direction: 'forward' as const },
                        { sectionId: `${params.loopId}:bottom`, direction: 'forward' as const },
                        { sectionId: `${params.loopId}:left`, direction: 'forward' as const },
                    ],
                },
            ],
            vertices: new Map(),
            vertexToSections: new Map(),
            sectionToVertices: new Map(),
            ownerAdjacency: new Map(),
        },
        shells: [
            {
                shellId: `${params.loopId}:shell`,
                ownerId: params.ownerId,
                starIds: params.starIds,
                anchorStarIds: params.starIds,
                points: params.points,
                area: 1,
                absArea: 1,
                confidence: 1,
                holeLoopIds: [],
            },
        ],
        shellLoops: [
            {
                shellLoopId: `${params.loopId}:shell-loop`,
                shellId: `${params.loopId}:shell`,
                ownerId: params.ownerId,
                starIds: params.starIds,
                anchorStarIds: params.starIds,
                points: params.points,
                classification: 'outer',
                confidence: 1,
            },
        ],
        provenance: { derivedFromField: false, notes: [] },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    } as CanonicalGeometrySnapshot;
}

function buildPerimeterBenchmarkCase(progress: number | null): {
    input: RenderFamilyInput;
    displayStars: ReadonlyArray<StarState>;
    geometry: CanonicalGeometrySnapshot;
    transitionTargetGeometry: CanonicalGeometrySnapshot | null;
} {
    const displayStars = [
        makeStar({ id: 'attacker', x: 180, y: 220, ownerId: 'blue', ships: 24 }),
        makeStar({ id: 'target', x: 520, y: 220, ownerId: 'blue', ships: 21 }),
        makeStar({ id: 'red-anchor', x: 520, y: 400, ownerId: 'red', ships: 20 }),
    ];
    const geometry = makeGeometry({
        version: 'pf-prev',
        ownerId: 'red',
        loopId: 'pf-red-loop',
        points: [
            [420, 140],
            [650, 140],
            [650, 420],
            [420, 420],
        ],
        starIds: ['target', 'red-anchor'],
    });
    const transitionTargetGeometry =
        progress == null
            ? null
            : makeGeometry({
                  version: 'pf-next',
                  ownerId: 'blue',
                  loopId: 'pf-blue-loop',
                  points: [
                      [350, 90],
                      [720, 90],
                      [720, 470],
                      [350, 470],
                  ],
                  starIds: ['attacker', 'target'],
              });

    return {
        displayStars,
        geometry,
        transitionTargetGeometry,
        input: {
            ownership: null,
            geometry,
            nowMs: progress == null ? 2_000 : 1_000 + progress * 1_000,
            gameTick: 42,
            stars: displayStars,
            lanes: [{ sourceId: 'attacker', targetId: 'target', distance: 340 }],
            world: { width: 900, height: 640 },
            tunables: makeTunables({
                PERIMETER_FIELD_TRANSITION_ENGINE: 'plan',
                PERIMETER_FIELD_SAMPLE_SPACING: 18,
                PERIMETER_FIELD_INWARD_OFFSET_PX: 9,
                PERIMETER_FIELD_INFLUENCE_RADIUS: 48,
                PERIMETER_FIELD_INFLUENCE_WEIGHT: 1.4,
                METABALL_CELL_SIZE: 6,
                METABALL_COVERAGE: 0.22,
            }),
            activeTransition: progress == null ? null : makeTransition(progress),
        },
    };
}

function averageMetrics(rows: Array<{ sceneBuildMs: number; render: MetaballRenderMetrics }>): ScenarioMetrics {
    const iterations = rows.length;
    const totals = rows.reduce(
        (acc, row) => {
            acc.sceneBuildMs += row.sceneBuildMs;
            acc.solveMs += row.render.solveMs;
            acc.textureUploadMs += row.render.textureUploadMs;
            acc.borderMs += row.render.borderMs;
            acc.renderTotalMs += row.render.totalMs;
            acc.frameTotalMs += row.sceneBuildMs + row.render.totalMs;
            return acc;
        },
        {
            sceneBuildMs: 0,
            solveMs: 0,
            textureUploadMs: 0,
            borderMs: 0,
            renderTotalMs: 0,
            frameTotalMs: 0,
        },
    );

    return {
        iterations,
        sceneBuildMsAvg: round(totals.sceneBuildMs / iterations),
        rendererSolveMsAvg: round(totals.solveMs / iterations),
        textureUploadMsAvg: round(totals.textureUploadMs / iterations),
        borderMsAvg: round(totals.borderMs / iterations),
        renderTotalMsAvg: round(totals.renderTotalMs / iterations),
        frameTotalMsAvg: round(totals.frameTotalMs / iterations),
    };
}

function benchmarkMetaball(progressFrames: Array<number | null>): ScenarioMetrics {
    const runtime = createMetaballRuntime();
    const container = new PIXI.Container();
    const conquestCache = new Map();
    const staticScene = buildMetaballStaticScene(
        buildMetaballInput(progressFrames[0] ?? null),
        colorUtils,
    );

    for (let i = 0; i < 10; i++) {
        const input = buildMetaballInput(progressFrames[i % progressFrames.length] ?? null);
        reconcileMetaballConquestCache({ input, colorUtils, conquestCache });
        const scene = buildMetaballScene(input, colorUtils, conquestCache, staticScene);
        renderMetaball(
            input.stars,
            container,
            colorUtils,
            input.world.width,
            input.world.height,
            input.lanes,
            {
                gameTick: input.gameTick,
                sceneInput: scene,
                runtime,
                metrics: {
                    solveMs: 0,
                    textureUploadMs: 0,
                    borderMs: 0,
                    totalMs: 0,
                    reusedFingerprint: false,
                },
            },
        );
    }

    const rows: Array<{ sceneBuildMs: number; render: MetaballRenderMetrics }> = [];
    for (const progress of progressFrames) {
        const input = buildMetaballInput(progress);
        reconcileMetaballConquestCache({ input, colorUtils, conquestCache });
        const sceneBuildStart = performance.now();
        const scene = buildMetaballScene(input, colorUtils, conquestCache, staticScene);
        const sceneBuildMs = performance.now() - sceneBuildStart;
        const metrics: MetaballRenderMetrics = {
            solveMs: 0,
            textureUploadMs: 0,
            borderMs: 0,
            totalMs: 0,
            reusedFingerprint: false,
        };
        renderMetaball(
            input.stars,
            container,
            colorUtils,
            input.world.width,
            input.world.height,
            input.lanes,
            { gameTick: input.gameTick, sceneInput: scene, runtime, metrics },
        );
        rows.push({ sceneBuildMs, render: { ...metrics } });
    }

    runtime.dispose();
    return averageMetrics(rows);
}

function benchmarkPerimeterField(progressFrames: Array<number | null>): ScenarioMetrics {
    const runtime = createMetaballRuntime();
    const container = new PIXI.Container();

    for (let i = 0; i < 10; i++) {
        const params = buildPerimeterBenchmarkCase(progressFrames[i % progressFrames.length] ?? null);
        const scene = buildPerimeterFieldScene({
            input: params.input,
            starsForDisplay: params.displayStars,
            geometry: params.geometry,
            transitionTargetGeometry: params.transitionTargetGeometry,
            colorUtils,
        });
        renderMetaball(
            params.displayStars,
            container,
            colorUtils,
            params.input.world.width,
            params.input.world.height,
            params.input.lanes,
            {
                gameTick: params.input.gameTick,
                sceneInput: scene.sceneInput,
                runtime,
                metrics: {
                    solveMs: 0,
                    textureUploadMs: 0,
                    borderMs: 0,
                    totalMs: 0,
                    reusedFingerprint: false,
                },
            },
        );
    }

    const rows: Array<{ sceneBuildMs: number; render: MetaballRenderMetrics }> = [];
    for (const progress of progressFrames) {
        const params = buildPerimeterBenchmarkCase(progress);
        const sceneBuildStart = performance.now();
        const scene = buildPerimeterFieldScene({
            input: params.input,
            starsForDisplay: params.displayStars,
            geometry: params.geometry,
            transitionTargetGeometry: params.transitionTargetGeometry,
            colorUtils,
        });
        const sceneBuildMs = performance.now() - sceneBuildStart;
        const metrics: MetaballRenderMetrics = {
            solveMs: 0,
            textureUploadMs: 0,
            borderMs: 0,
            totalMs: 0,
            reusedFingerprint: false,
        };
        renderMetaball(
            params.displayStars,
            container,
            colorUtils,
            params.input.world.width,
            params.input.world.height,
            params.input.lanes,
            { gameTick: params.input.gameTick, sceneInput: scene.sceneInput, runtime, metrics },
        );
        rows.push({ sceneBuildMs, render: { ...metrics } });
    }

    runtime.dispose();
    return averageMetrics(rows);
}

describe('territory benchmark harness', () => {
    it('writes repeatable territory performance metrics', () => {
        const steadyIterations = 60;
        const transitionIterations = 60;
        const steadyFrames = Array.from({ length: steadyIterations }, () => null);
        const transitionFrames = Array.from(
            { length: transitionIterations },
            (_, index) => index / Math.max(1, transitionIterations - 1),
        );

        const report: BenchmarkReport = {
            generatedAt: new Date().toISOString(),
            warmupIterations: 10,
            steadyIterations,
            transitionIterations,
            metaballGrid: {
                steadyState: benchmarkMetaball(steadyFrames),
                conquestTransition: benchmarkMetaball(transitionFrames),
            },
            perimeterField: {
                steadyState: benchmarkPerimeterField(steadyFrames),
                conquestTransition: benchmarkPerimeterField(transitionFrames),
            },
        };

        mkdirSync(METRICS_DIR, { recursive: true });
        writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf8');

        expect(report.metaballGrid.steadyState.frameTotalMsAvg).toBeGreaterThanOrEqual(0);
        expect(report.perimeterField.conquestTransition.frameTotalMsAvg).toBeGreaterThanOrEqual(0);

        console.table([
            {
                scenario: 'metaball-steady',
                frameTotalMsAvg: report.metaballGrid.steadyState.frameTotalMsAvg,
                sceneBuildMsAvg: report.metaballGrid.steadyState.sceneBuildMsAvg,
                renderTotalMsAvg: report.metaballGrid.steadyState.renderTotalMsAvg,
                solveMsAvg: report.metaballGrid.steadyState.rendererSolveMsAvg,
            },
            {
                scenario: 'metaball-transition',
                frameTotalMsAvg: report.metaballGrid.conquestTransition.frameTotalMsAvg,
                sceneBuildMsAvg: report.metaballGrid.conquestTransition.sceneBuildMsAvg,
                renderTotalMsAvg: report.metaballGrid.conquestTransition.renderTotalMsAvg,
                solveMsAvg: report.metaballGrid.conquestTransition.rendererSolveMsAvg,
            },
            {
                scenario: 'perimeter-steady',
                frameTotalMsAvg: report.perimeterField.steadyState.frameTotalMsAvg,
                sceneBuildMsAvg: report.perimeterField.steadyState.sceneBuildMsAvg,
                renderTotalMsAvg: report.perimeterField.steadyState.renderTotalMsAvg,
                solveMsAvg: report.perimeterField.steadyState.rendererSolveMsAvg,
            },
            {
                scenario: 'perimeter-transition',
                frameTotalMsAvg: report.perimeterField.conquestTransition.frameTotalMsAvg,
                sceneBuildMsAvg: report.perimeterField.conquestTransition.sceneBuildMsAvg,
                renderTotalMsAvg: report.perimeterField.conquestTransition.renderTotalMsAvg,
                solveMsAvg: report.perimeterField.conquestTransition.rendererSolveMsAvg,
            },
        ]);
        console.log(JSON.stringify({ ok: true, outputPath: OUTPUT_PATH, report }, null, 2));
    });
});
