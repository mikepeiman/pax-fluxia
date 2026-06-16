#!/usr/bin/env bun

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rootDir = resolve(process.cwd());
const tempMirrorDir = join(tmpdir(), "pax-fluxia-graphify-code-mirror");
const outputDir = join(rootDir, ".agent-harness/graphify/full-code-graph");
const outputGraphDir = join(outputDir, "graphify-out");
const defaultGraphDir = join(rootDir, "graphify-out");
const metricsDir = join(rootDir, ".agent-harness/metrics");
const metricsJsonPath = join(metricsDir, "graphify-build-latest.json");
const metricsReportPath = join(metricsDir, "graphify-build-latest.md");

const sourceRoots = ["common/src", "pax-server/src", "pax-fluxia/src"];
const sourceExtensions = new Set([".ts", ".svelte", ".js", ".mjs", ".cjs", ".css", ".ps1"]);

interface GraphJson {
    nodes?: unknown[];
    edges?: unknown[];
}

async function safeRm(target: string, allowedParent: string): Promise<void> {
    const resolvedTarget = resolve(target);
    const resolvedParent = resolve(allowedParent);

    if (!resolvedTarget.startsWith(resolvedParent)) {
        throw new Error(`Refusing to remove ${resolvedTarget}; outside allowed parent ${resolvedParent}`);
    }

    await rm(resolvedTarget, { recursive: true, force: true });
}

async function walkFiles(dir: string): Promise<string[]> {
    const entries = await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: dir, onlyFiles: true }));
    return entries.map((entry) => join(dir, entry));
}

function extensionOf(path: string): string {
    const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    const basename = path.slice(lastSlash + 1);
    const dot = basename.lastIndexOf(".");
    return dot === -1 ? "" : basename.slice(dot).toLowerCase();
}

async function mirrorCodeFiles(): Promise<string[]> {
    const copied: string[] = [];

    await safeRm(tempMirrorDir, tmpdir());
    await mkdir(tempMirrorDir, { recursive: true });

    for (const sourceRoot of sourceRoots) {
        const absoluteSourceRoot = join(rootDir, sourceRoot);
        const files = await walkFiles(absoluteSourceRoot);

        for (const file of files) {
            if (!sourceExtensions.has(extensionOf(file))) continue;

            const relativePath = resolve(file).slice(rootDir.length + 1);
            const destination = join(tempMirrorDir, relativePath);
            await mkdir(dirname(destination), { recursive: true });
            await cp(file, destination);
            copied.push(relativePath.replace(/\\/g, "/"));
        }
    }

    return copied.sort();
}

function normalizeJsonPaths(content: string): string {
    const tempRaw = tempMirrorDir;
    const rootRaw = rootDir;
    const tempEscaped = tempRaw.replace(/\\/g, "\\\\");
    const rootEscaped = rootRaw.replace(/\\/g, "\\\\");

    return content.replaceAll(tempEscaped, rootEscaped).replaceAll(tempRaw, rootRaw);
}

async function rewriteJsonPath(file: string): Promise<void> {
    if (!existsSync(file)) return;
    const content = await readFile(file, "utf8");
    await writeFile(file, normalizeJsonPaths(content), "utf8");
}

async function copyDefaultGraph(): Promise<void> {
    await mkdir(defaultGraphDir, { recursive: true });
    await cp(join(outputGraphDir, "graph.json"), join(defaultGraphDir, "graph.json"));

    const manifestPath = join(outputGraphDir, "manifest.json");
    if (existsSync(manifestPath)) {
        await cp(manifestPath, join(defaultGraphDir, "manifest.json"));
    }
}

function hashText(content: string): string {
    return createHash("sha256").update(content).digest("hex");
}

async function readGraphStats(): Promise<{ nodes: number; edges: number; hash: string; bytes: number }> {
    const graphPath = join(defaultGraphDir, "graph.json");
    const content = await readFile(graphPath, "utf8");
    const graph = JSON.parse(content) as GraphJson;

    return {
        nodes: graph.nodes?.length ?? 0,
        edges: graph.edges?.length ?? 0,
        hash: hashText(content),
        bytes: Buffer.byteLength(content, "utf8"),
    };
}

await safeRm(outputDir, join(rootDir, ".agent-harness/graphify"));
const copiedFiles = await mirrorCodeFiles();

const startedAt = performance.now();
const extraction = await execFileAsync("graphify", ["extract", tempMirrorDir, "--no-cluster", "--out", outputDir], {
    cwd: rootDir,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
});
const extractionMs = Math.round(performance.now() - startedAt);

await rewriteJsonPath(join(outputGraphDir, "graph.json"));
await rewriteJsonPath(join(outputGraphDir, "manifest.json"));
await copyDefaultGraph();

const graphStats = await readGraphStats();
const metrics = {
    timestamp: new Date().toISOString(),
    sourceRoots,
    sourceExtensions: [...sourceExtensions].sort(),
    mirroredFiles: copiedFiles.length,
    extractionMs,
    graph: {
        path: "graphify-out/graph.json",
        ...graphStats,
    },
    stdout: extraction.stdout.toString(),
    stderr: extraction.stderr.toString(),
};

await mkdir(metricsDir, { recursive: true });
await writeFile(metricsJsonPath, JSON.stringify(metrics, null, 2), "utf8");

const report = `# Graphify Full-Code Graph Build

Generated: ${metrics.timestamp}

## Scope

- Source roots: ${sourceRoots.map((sourceRoot) => `\`${sourceRoot}\``).join(", ")}
- Included extensions: ${[...sourceExtensions].sort().map((extension) => `\`${extension}\``).join(", ")}
- Mirrored source files: ${copiedFiles.length}
- Extraction mode: AST-only, \`--no-cluster\`

## Result

- Extraction duration: ${extractionMs}ms
- Default graph: \`graphify-out/graph.json\`
- Nodes: ${graphStats.nodes}
- Edges: ${graphStats.edges}
- Bytes: ${graphStats.bytes}
- SHA-256: \`${graphStats.hash}\`

## Graphify Output

\`\`\`text
${metrics.stdout.trim()}
${metrics.stderr.trim()}
\`\`\`
`;

await writeFile(metricsReportPath, report, "utf8");
console.log(report);
