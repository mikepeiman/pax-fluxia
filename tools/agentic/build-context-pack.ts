#!/usr/bin/env bun

import { buildContextPack } from "./context-pack";

function parseArgs(args: string[]) {
    const artifactIds: string[] = [];
    let force = false;
    let clearCache = false;
    let noCache = false;
    let noMetrics = false;
    let json = false;

    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (arg === "--artifact" && args[index + 1]) {
            artifactIds.push(args[index + 1]);
            index += 1;
        } else if (arg === "--force") {
            force = true;
        } else if (arg === "--clear-cache") {
            clearCache = true;
        } else if (arg === "--no-cache") {
            noCache = true;
        } else if (arg === "--no-metrics") {
            noMetrics = true;
        } else if (arg === "--json") {
            json = true;
        } else if (arg === "--help" || arg === "-h") {
            console.log(`Context pack builder

Usage:
  bun tools/agentic/build-context-pack.ts
  bun tools/agentic/build-context-pack.ts --force
  bun tools/agentic/build-context-pack.ts --clear-cache
  bun tools/agentic/build-context-pack.ts --artifact stable-instructions

Flags:
  --artifact <id>  Build one artifact by id (repeatable)
  --force          Regenerate artifacts even when cache would hit
  --clear-cache    Clear cache state before building
  --no-cache       Disable memoization for this run
  --no-metrics     Disable metrics logging for this run
  --json           Print machine-readable summary
`);
            process.exit(0);
        }
    }

    return { artifactIds, force, clearCache, noCache, noMetrics, json };
}

const parsed = parseArgs(process.argv.slice(2));
const result = await buildContextPack({
    artifactIds: parsed.artifactIds,
    force: parsed.force,
    clearCache: parsed.clearCache,
    noCache: parsed.noCache,
    noMetrics: parsed.noMetrics,
    label: "manual-build",
});

if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}

console.log("Stable context build summary");
console.log(`- Run ID: ${result.runId}`);
console.log(`- Duration: ${result.durationMs}ms`);
console.log(`- Cache enabled: ${result.cacheEnabled}`);
console.log(`- Metrics enabled: ${result.metricsEnabled}`);
console.log(`- Cache hits: ${result.cacheHits}`);
console.log(`- Cache misses: ${result.cacheMisses}`);
console.log(`- Total bytes: ${result.totalBytes}`);
console.log(`- Estimated tokens: ${result.totalEstimatedTokens}`);
console.log(`- Reused estimated tokens: ${result.reusedEstimatedTokens}`);
console.log(`- Regenerated estimated tokens: ${result.regeneratedEstimatedTokens}`);

for (const artifact of result.artifacts) {
    console.log(`- ${artifact.id}: ${artifact.reused ? "reused" : "regenerated"} (${artifact.invalidationReason})`);
}
