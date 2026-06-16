#!/usr/bin/env bun

import { mkdir } from "fs/promises";
import { dirname, join, resolve } from "path";

interface AgenticConfigShape {
    providerCaching: boolean;
    providerCache?: {
        minimumCacheableTokens?: number;
        prefixMode?: string;
        maxPrefixEstimatedTokens?: number;
    };
    paths: {
        artifactsDir: string;
        providerCachePrefix?: string;
    };
}

interface ContextManifestShape {
    artifacts: Array<{
        id: string;
        title: string;
        output: string;
    }>;
}

function estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
}

async function readTextIfPresent(path: string): Promise<string | null> {
    try {
        return await Bun.file(path).text();
    } catch {
        return null;
    }
}

const rootDir = resolve(process.cwd());
const config = JSON.parse(await Bun.file(join(rootDir, ".agent/agentic/config.json")).text()) as AgenticConfigShape;
const manifest = JSON.parse(await Bun.file(join(rootDir, ".agent/agentic/context-manifest.json")).text()) as ContextManifestShape;

const artifacts = [];
for (const artifact of manifest.artifacts) {
    const artifactPath = join(rootDir, config.paths.artifactsDir, artifact.output);
    const content = await readTextIfPresent(artifactPath);
    const chars = content?.length ?? 0;
    artifacts.push({
        id: artifact.id,
        title: artifact.title,
        path: artifactPath,
        present: content !== null,
        chars,
        estimatedTokens: estimateTokens(content ?? ""),
    });
}

const prefixPath = join(rootDir, config.paths.providerCachePrefix ?? ".agent-harness/context-cache/provider-cache-prefix.md");
const prefix = await readTextIfPresent(prefixPath);
const prefixChars = prefix?.length ?? 0;
const prefixEstimatedTokens = estimateTokens(prefix ?? "");
const artifactEstimatedTokens = artifacts.reduce((sum, artifact) => sum + artifact.estimatedTokens, 0);
const artifactChars = artifacts.reduce((sum, artifact) => sum + artifact.chars, 0);
const avoidedEstimatedTokens = Math.max(artifactEstimatedTokens - prefixEstimatedTokens, 0);
const prefixPercentOfBundle = artifactEstimatedTokens === 0 ? 0 : (prefixEstimatedTokens / artifactEstimatedTokens) * 100;
const minimumCacheableTokens = config.providerCache?.minimumCacheableTokens ?? 1024;
const maxPrefixEstimatedTokens = config.providerCache?.maxPrefixEstimatedTokens ?? 4096;
const prefixMode = config.providerCache?.prefixMode ?? "unknown";
const thresholdStatus = prefixEstimatedTokens >= minimumCacheableTokens ? "pass" : "fail";
const budgetStatus = prefixEstimatedTokens <= maxPrefixEstimatedTokens ? "pass" : "fail";
const verdict =
    thresholdStatus === "pass" && budgetStatus === "pass"
        ? "pass: lean provider prefix is cache-eligible and inside budget"
        : "fail: provider prefix needs size adjustment before using it by default";

const rows = artifacts
    .map((artifact) => `| ${artifact.id} | ${artifact.present ? "yes" : "no"} | ${formatNumber(artifact.estimatedTokens)} | ${artifact.title} |`)
    .join("\n");

const report = `# Context Cache Audit

Generated: ${new Date().toISOString()}

## Verdict

${verdict}

## Provider Prefix

- Provider caching enabled: ${config.providerCaching}
- Prefix mode: ${prefixMode}
- Prefix path: ${config.paths.providerCachePrefix ?? ".agent-harness/context-cache/provider-cache-prefix.md"}
- Prefix present: ${prefix !== null}
- Prefix chars: ${formatNumber(prefixChars)}
- Prefix estimated tokens: ${formatNumber(prefixEstimatedTokens)}
- Minimum configured cacheable tokens: ${formatNumber(minimumCacheableTokens)} (${thresholdStatus})
- Max lean prefix budget: ${formatNumber(maxPrefixEstimatedTokens)} (${budgetStatus})

## Full Local Artifact Bundle

- Artifact chars: ${formatNumber(artifactChars)}
- Artifact estimated tokens: ${formatNumber(artifactEstimatedTokens)}
- Provider-prefix tokens avoided by index mode: ${formatNumber(avoidedEstimatedTokens)}
- Provider prefix as percent of full bundle: ${prefixPercentOfBundle.toFixed(1)}%

| Artifact | Present | Est tokens | Title |
| --- | --- | ---: | --- |
${rows}

## Policy

- Default provider requests should use the lean prefix, not the full local artifact bundle.
- Load full artifact files only for task-specific context after the cache breakpoint.
- If a large expanded prefix is proposed, benchmark it against this audit and live provider usage before making it default.
`;

const json = {
    generatedAt: new Date().toISOString(),
    verdict,
    providerCachingEnabled: config.providerCaching,
    prefixMode,
    prefixPath,
    prefixPresent: prefix !== null,
    prefixChars,
    prefixEstimatedTokens,
    minimumCacheableTokens,
    thresholdStatus,
    maxPrefixEstimatedTokens,
    budgetStatus,
    artifactChars,
    artifactEstimatedTokens,
    avoidedEstimatedTokens,
    prefixPercentOfBundle,
    artifacts,
};

const reportPath = join(rootDir, ".agent-harness/metrics/context-cache-audit-latest.md");
const jsonPath = join(rootDir, ".agent-harness/metrics/context-cache-audit-latest.json");
await mkdir(dirname(reportPath), { recursive: true });
await Bun.write(reportPath, report);
await Bun.write(jsonPath, JSON.stringify(json, null, 2) + "\n");

console.log(report);
