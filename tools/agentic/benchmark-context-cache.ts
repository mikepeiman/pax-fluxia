#!/usr/bin/env bun

import { join, resolve } from "path";
import { buildContextPack } from "./context-pack";

interface AgenticConfigShape {
    paths: {
        benchmarkReport: string;
    };
}

const rootDir = resolve(process.cwd());
const configPath = join(rootDir, ".agent/agentic/config.json");
const config = JSON.parse(await Bun.file(configPath).text()) as AgenticConfigShape;

const cold = await buildContextPack({
    rootDir,
    clearCache: true,
    label: "benchmark-cold",
});

const warm = await buildContextPack({
    rootDir,
    label: "benchmark-warm",
});

const estimatedTokenSavings = cold.regeneratedEstimatedTokens - warm.regeneratedEstimatedTokens;
const estimatedByteSavings = cold.regeneratedBytes - warm.regeneratedBytes;
const hitRate = warm.artifacts.length === 0 ? 0 : Math.round((warm.cacheHits / warm.artifacts.length) * 100);

const report = `# Context Cache Benchmark

## Scenario

- Workspace: \`pax-fluxia\`
- Benchmark type: cold build followed by warm build
- Stable artifacts: ${cold.artifacts.length}

## Cold Run

- Requests/build passes: 1
- Stable blocks reused: ${cold.stableBlocksReused}
- Stable blocks regenerated: ${cold.stableBlocksRegenerated}
- Total bytes: ${cold.totalBytes}
- Estimated tokens: ${cold.totalEstimatedTokens}
- Regenerated estimated tokens: ${cold.regeneratedEstimatedTokens}
- Cache hit rate: ${cold.artifacts.length === 0 ? 0 : Math.round((cold.cacheHits / cold.artifacts.length) * 100)}%
- Duration: ${cold.durationMs}ms

## Warm Run

- Requests/build passes: 1
- Stable blocks reused: ${warm.stableBlocksReused}
- Stable blocks regenerated: ${warm.stableBlocksRegenerated}
- Total bytes: ${warm.totalBytes}
- Estimated tokens: ${warm.totalEstimatedTokens}
- Reused estimated tokens: ${warm.reusedEstimatedTokens}
- Regenerated estimated tokens: ${warm.regeneratedEstimatedTokens}
- Cache hit rate: ${hitRate}%
- Duration: ${warm.durationMs}ms

## Delta

- Estimated regenerated-token savings: ${estimatedTokenSavings}
- Estimated regenerated-byte savings: ${estimatedByteSavings}
- Cache hit delta: ${warm.cacheHits - cold.cacheHits}
- Duration delta: ${cold.durationMs - warm.durationMs}ms

## Tradeoffs

- Stable artifact bytes remain the same between cold and warm runs; savings come from reuse and skipped regeneration.
- This benchmark measures the local deterministic context layer only. It does not include provider-side caching.
`;

const reportPath = join(rootDir, config.paths.benchmarkReport);
await Bun.write(reportPath, report);

console.log(`Benchmark report written to ${reportPath}`);
console.log(report);
