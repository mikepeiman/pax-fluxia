import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
    buildLaneAwareConnections,
    generateConnections,
    generateStarPositions,
    listDelaunayConnections,
    type LaneBuildPerfStats,
} from '../../common/src/mapgen/index.ts';

interface BenchmarkCase {
    laneMarginPx: number;
    reshapeBias: number;
}

interface BenchmarkRow {
    laneMarginPx: number;
    reshapeBias: number;
    placementMs: number;
    generateConnectionsMs: number;
    candidateListMs: number;
    preferredSolveMs: number;
    candidateBridgeMs: number;
    fallbackBridgeMs: number;
    connectivityRestoreMs: number;
    laneBuildMs: number;
    totalMs: number;
    edgeSolveMs: number;
    edgeSolveCount: number;
    edgeCacheHits: number;
    finalConnectionCount: number;
}

const ROOT = path.resolve(import.meta.dir, '..', '..');
const METRICS_DIR = path.join(ROOT, '.agent-harness', 'metrics');

function mulberry32(seed: number): () => number {
    return function next(): number {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function withSeed<T>(seed: number, fn: () => T): T {
    const previousRandom = Math.random;
    Math.random = mulberry32(seed) as typeof Math.random;
    try {
        return fn();
    } finally {
        Math.random = previousRandom;
    }
}

function round(value: number, digits = 2): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function benchmarkCase(testCase: BenchmarkCase, seed: number): BenchmarkRow {
    return withSeed(seed, () => {
        const totalStart = performance.now();

        const placementStart = performance.now();
        const placement = generateStarPositions({
            width: 1600,
            height: 900,
            totalStars: 30,
            spacingMultiplier: 1.1,
            hexRadius: 50,
            boardFit: 0.69,
        });
        const placementMs = performance.now() - placementStart;

        const nodes = placement.positions.map((position, index) => ({
            id: `star-${index}`,
            x: position.x,
            y: position.y,
        }));

        const preferredStart = performance.now();
        const preferredConnections = generateConnections(
            nodes,
            Infinity,
            1,
            6,
            testCase.laneMarginPx,
            testCase.reshapeBias,
        );
        const generateConnectionsMs = performance.now() - preferredStart;

        const candidateStart = performance.now();
        const candidateConnections = listDelaunayConnections(nodes, Infinity);
        const candidateListMs = performance.now() - candidateStart;

        const debugPerf: LaneBuildPerfStats = {
            preferredSolveMs: 0,
            candidateBridgeMs: 0,
            fallbackBridgeMs: 0,
            connectivityRestoreMs: 0,
            edgeSolveMs: 0,
            edgeSolveCount: 0,
            edgeCacheHits: 0,
        };

        const laneStart = performance.now();
        const finalConnections = buildLaneAwareConnections(
            nodes,
            preferredConnections,
            candidateConnections,
            'curved',
            testCase.laneMarginPx,
            testCase.reshapeBias,
            'curved',
            { debugPerf },
        );
        const laneBuildMs = performance.now() - laneStart;

        const totalMs = performance.now() - totalStart;

        return {
            laneMarginPx: testCase.laneMarginPx,
            reshapeBias: testCase.reshapeBias,
            placementMs: round(placementMs),
            generateConnectionsMs: round(generateConnectionsMs),
            candidateListMs: round(candidateListMs),
            preferredSolveMs: round(debugPerf.preferredSolveMs),
            candidateBridgeMs: round(debugPerf.candidateBridgeMs),
            fallbackBridgeMs: round(debugPerf.fallbackBridgeMs),
            connectivityRestoreMs: round(debugPerf.connectivityRestoreMs),
            laneBuildMs: round(laneBuildMs),
            totalMs: round(totalMs),
            edgeSolveMs: round(debugPerf.edgeSolveMs),
            edgeSolveCount: debugPerf.edgeSolveCount,
            edgeCacheHits: debugPerf.edgeCacheHits,
            finalConnectionCount: finalConnections.length,
        };
    });
}

function main(): void {
    const benchmarkCases: BenchmarkCase[] = [
        { laneMarginPx: 120, reshapeBias: 0.8 },
        { laneMarginPx: 150, reshapeBias: 0.8 },
        { laneMarginPx: 175, reshapeBias: 0.8 },
        { laneMarginPx: 195, reshapeBias: 0.8 },
        { laneMarginPx: 215, reshapeBias: 0.8 },
        { laneMarginPx: 195, reshapeBias: 1.0 },
    ];

    const seed = 12001;
    const warmupRows = benchmarkCases.map((testCase) => benchmarkCase(testCase, seed));
    void warmupRows;
    const rows = benchmarkCases.map((testCase) => benchmarkCase(testCase, seed));

    mkdirSync(METRICS_DIR, { recursive: true });
    const outputPath = path.join(METRICS_DIR, 'main-menu-preview-benchmark-latest.json');
    writeFileSync(
        outputPath,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                seed,
                rows,
            },
            null,
            2,
        ),
        'utf8',
    );

    console.table(
        rows.map((row) => ({
            lane: row.laneMarginPx,
            bias: row.reshapeBias,
            totalMs: row.totalMs,
            laneBuildMs: row.laneBuildMs,
            preferredSolveMs: row.preferredSolveMs,
            fallbackBridgeMs: row.fallbackBridgeMs,
            edgeSolveMs: row.edgeSolveMs,
            edgeSolveCount: row.edgeSolveCount,
            connections: row.finalConnectionCount,
        })),
    );
    console.log(JSON.stringify({ ok: true, outputPath, rows }, null, 2));
}

main();
