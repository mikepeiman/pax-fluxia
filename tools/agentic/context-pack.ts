#!/usr/bin/env bun

import { appendFile, mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import { createHash, randomUUID } from "crypto";
import { dirname, join, resolve } from "path";
import { type ProviderCacheArtifactInput, type ProviderCacheConfig, writeProviderCacheArtifacts } from "./provider-cache";

export interface AgenticConfig {
    version: number;
    localMemoization: boolean;
    providerCaching: boolean;
    providerCache?: Partial<ProviderCacheConfig>;
    metricsLogging: boolean;
    tokenEstimation: "chars_div_4";
    paths: {
        artifactsDir: string;
        cacheManifest: string;
        providerCachePrefix?: string;
        providerCacheStrategy?: string;
        metricsLog: string;
        benchmarkReport: string;
    };
}

export interface ArtifactSpec {
    id: string;
    title: string;
    description: string;
    output: string;
    sources: string[];
}

export interface ContextManifest {
    version: number;
    artifacts: ArtifactSpec[];
}

interface CacheManifestEntry {
    inputSignature: string;
    artifactHash: string;
    output: string;
    estimatedTokens: number;
    bytes: number;
    sourcePaths: string[];
}

interface CacheManifestFile {
    version: number;
    artifacts: Record<string, CacheManifestEntry>;
}

export interface BuildArtifactResult {
    id: string;
    outputPath: string;
    reused: boolean;
    invalidationReason: "cache-hit" | "cold" | "source-changed" | "artifact-missing" | "forced" | "cache-disabled";
    bytes: number;
    estimatedTokens: number;
    inputSignature: string;
    artifactHash: string;
}

export interface BuildContextPackResult {
    runId: string;
    durationMs: number;
    cacheEnabled: boolean;
    metricsEnabled: boolean;
    artifacts: BuildArtifactResult[];
    cacheHits: number;
    cacheMisses: number;
    stableBlocksReused: number;
    stableBlocksRegenerated: number;
    totalBytes: number;
    totalEstimatedTokens: number;
    reusedBytes: number;
    reusedEstimatedTokens: number;
    regeneratedBytes: number;
    regeneratedEstimatedTokens: number;
    providerCachingEnabled: boolean;
    providerCachePrefixPath?: string;
    providerCacheStrategyPath?: string;
    providerCachePrefixHash?: string;
    providerCachePrefixEstimatedTokens?: number;
    providerCacheMeetsMinimumTokenThreshold?: boolean;
}

export interface BuildContextPackOptions {
    rootDir?: string;
    artifactIds?: string[];
    force?: boolean;
    clearCache?: boolean;
    noCache?: boolean;
    noMetrics?: boolean;
    label?: string;
}

const CONFIG_PATH = ".agent/agentic/config.json";
const MANIFEST_PATH = ".agent/agentic/context-manifest.json";

function stableStringify(value: unknown): string {
    return JSON.stringify(value, null, 2) + "\n";
}

async function readJson<T>(filePath: string): Promise<T> {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
}

async function ensureDir(filePath: string): Promise<void> {
    await mkdir(filePath, { recursive: true });
}

function normalizeText(content: string): string {
    const normalized = content
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .trim();

    return normalized.length > 0 ? normalized + "\n" : "";
}

function hashText(content: string): string {
    return createHash("sha256").update(content).digest("hex");
}

function estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
}

function renderArtifact(spec: ArtifactSpec, sourceContents: Array<{ path: string; content: string }>): string {
    const sourcesBlock = spec.sources.map((source) => `- \`${source}\``).join("\n");
    const sections = sourceContents.map(({ path, content }, index) => {
        const separator = index === 0 ? "" : "\n---\n\n";
        return `${separator}## Source ${index + 1}: \`${path}\`\n\n${content}`;
    });

    return normalizeText(
        [
            `# ${spec.title}`,
            "",
            `Artifact ID: \`${spec.id}\``,
            "",
            spec.description,
            "",
            "## Sources",
            sourcesBlock,
            "",
            "---",
            "",
            sections.join(""),
        ].join("\n")
    );
}

async function loadConfig(rootDir: string): Promise<AgenticConfig> {
    return readJson<AgenticConfig>(join(rootDir, CONFIG_PATH));
}

async function loadManifest(rootDir: string): Promise<ContextManifest> {
    return readJson<ContextManifest>(join(rootDir, MANIFEST_PATH));
}

async function loadCacheManifest(cacheManifestPath: string): Promise<CacheManifestFile> {
    if (!(await pathExists(cacheManifestPath))) {
        return { version: 1, artifacts: {} };
    }

    return readJson<CacheManifestFile>(cacheManifestPath);
}

async function writeCacheManifest(cacheManifestPath: string, data: CacheManifestFile): Promise<void> {
    await ensureDir(dirname(cacheManifestPath));
    await writeFile(cacheManifestPath, stableStringify(data), "utf8");
}

async function appendMetrics(metricsPath: string, payload: Record<string, unknown>): Promise<void> {
    await ensureDir(dirname(metricsPath));
    await appendFile(metricsPath, JSON.stringify(payload) + "\n", "utf8");
}

async function clearCachePaths(config: AgenticConfig, rootDir: string): Promise<void> {
    await rm(join(rootDir, config.paths.artifactsDir), { recursive: true, force: true });
    await rm(join(rootDir, config.paths.cacheManifest), { force: true });
}

async function collectProviderCacheArtifacts(
    rootDir: string,
    config: AgenticConfig,
    manifest: ContextManifest,
    cacheManifest: CacheManifestFile
): Promise<ProviderCacheArtifactInput[]> {
    const artifacts: ProviderCacheArtifactInput[] = [];

    for (const artifact of manifest.artifacts) {
        const outputPath = join(rootDir, config.paths.artifactsDir, artifact.output);
        if (!(await pathExists(outputPath))) {
            return [];
        }

        const content = await readFile(outputPath, "utf8");
        const cacheEntry = cacheManifest.artifacts[artifact.id];
        const artifactHash = cacheEntry?.artifactHash ?? hashText(content);
        const bytes = Buffer.byteLength(content, "utf8");
        const estimatedTokens = cacheEntry?.estimatedTokens ?? estimateTokens(content);

        artifacts.push({
            id: artifact.id,
            title: artifact.title,
            relativeOutputPath: `${config.paths.artifactsDir.replace(/\\/g, "/")}/${artifact.output}`,
            content,
            artifactHash,
            estimatedTokens,
            bytes,
        });
    }

    return artifacts;
}

export async function buildContextPack(options: BuildContextPackOptions = {}): Promise<BuildContextPackResult> {
    const rootDir = resolve(options.rootDir ?? process.cwd());
    const config = await loadConfig(rootDir);
    const manifest = await loadManifest(rootDir);
    const cacheEnabled = config.localMemoization && !options.noCache;
    const metricsEnabled = config.metricsLogging && !options.noMetrics;

    if (options.clearCache) {
        await clearCachePaths(config, rootDir);
    }

    const requestedArtifacts = options.artifactIds?.length
        ? manifest.artifacts.filter((artifact) => options.artifactIds?.includes(artifact.id))
        : manifest.artifacts;

    const cacheManifestPath = join(rootDir, config.paths.cacheManifest);
    const artifactsDir = join(rootDir, config.paths.artifactsDir);
    const metricsLogPath = join(rootDir, config.paths.metricsLog);

    await ensureDir(artifactsDir);

    const cacheManifest = await loadCacheManifest(cacheManifestPath);
    const runId = randomUUID();
    const startedAt = Date.now();
    const results: BuildArtifactResult[] = [];

    for (const artifact of requestedArtifacts) {
        const sourceContents = [];
        const sourceHashes = [];

        for (const source of artifact.sources) {
            const sourcePath = join(rootDir, source);
            const raw = await readFile(sourcePath, "utf8");
            const normalized = normalizeText(raw);
            sourceContents.push({ path: source, content: normalized });
            sourceHashes.push({ path: source, hash: hashText(normalized) });
        }

        const inputSignature = hashText(
            stableStringify({
                manifestVersion: manifest.version,
                artifactId: artifact.id,
                sources: sourceHashes,
            })
        );

        const outputPath = join(artifactsDir, artifact.output);
        const prior = cacheManifest.artifacts[artifact.id];
        const outputExists = await pathExists(outputPath);

        let content: string;
        let reused = false;
        let invalidationReason: BuildArtifactResult["invalidationReason"];

        if (!cacheEnabled) {
            invalidationReason = "cache-disabled";
        } else if (options.force) {
            invalidationReason = "forced";
        } else if (!prior) {
            invalidationReason = "cold";
        } else if (!outputExists) {
            invalidationReason = "artifact-missing";
        } else if (prior.inputSignature !== inputSignature) {
            invalidationReason = "source-changed";
        } else {
            invalidationReason = "cache-hit";
        }

        if (invalidationReason === "cache-hit") {
            content = await readFile(outputPath, "utf8");
            reused = true;
        } else {
            content = renderArtifact(artifact, sourceContents);
            await writeFile(outputPath, content, "utf8");
        }

        const bytes = Buffer.byteLength(content, "utf8");
        const artifactHash = hashText(content);
        const estimatedTokens = estimateTokens(content);

        cacheManifest.artifacts[artifact.id] = {
            inputSignature,
            artifactHash,
            output: artifact.output,
            estimatedTokens,
            bytes,
            sourcePaths: artifact.sources,
        };

        results.push({
            id: artifact.id,
            outputPath,
            reused,
            invalidationReason,
            bytes,
            estimatedTokens,
            inputSignature,
            artifactHash,
        });
    }

    await writeCacheManifest(cacheManifestPath, cacheManifest);

    const providerCacheArtifacts = await collectProviderCacheArtifacts(rootDir, config, manifest, cacheManifest);
    const providerCacheResult = await writeProviderCacheArtifacts({
        rootDir,
        enabled: config.providerCaching && providerCacheArtifacts.length === manifest.artifacts.length,
        paths: config.paths,
        config: config.providerCache,
        artifacts: providerCacheArtifacts,
    });

    const durationMs = Date.now() - startedAt;
    const cacheHits = results.filter((artifact) => artifact.reused).length;
    const cacheMisses = results.length - cacheHits;
    const totalBytes = results.reduce((sum, artifact) => sum + artifact.bytes, 0);
    const totalEstimatedTokens = results.reduce((sum, artifact) => sum + artifact.estimatedTokens, 0);
    const reusedBytes = results.filter((artifact) => artifact.reused).reduce((sum, artifact) => sum + artifact.bytes, 0);
    const reusedEstimatedTokens = results.filter((artifact) => artifact.reused).reduce((sum, artifact) => sum + artifact.estimatedTokens, 0);
    const regeneratedBytes = results.filter((artifact) => !artifact.reused).reduce((sum, artifact) => sum + artifact.bytes, 0);
    const regeneratedEstimatedTokens = results.filter((artifact) => !artifact.reused).reduce((sum, artifact) => sum + artifact.estimatedTokens, 0);

    const summary: BuildContextPackResult = {
        runId,
        durationMs,
        cacheEnabled,
        metricsEnabled,
        artifacts: results,
        cacheHits,
        cacheMisses,
        stableBlocksReused: cacheHits,
        stableBlocksRegenerated: cacheMisses,
        totalBytes,
        totalEstimatedTokens,
        reusedBytes,
        reusedEstimatedTokens,
        regeneratedBytes,
        regeneratedEstimatedTokens,
        providerCachingEnabled: providerCacheResult.enabled,
        providerCachePrefixPath: providerCacheResult.prefixPath,
        providerCacheStrategyPath: providerCacheResult.strategyPath,
        providerCachePrefixHash: providerCacheResult.prefixHash,
        providerCachePrefixEstimatedTokens: providerCacheResult.prefixEstimatedTokens,
        providerCacheMeetsMinimumTokenThreshold: providerCacheResult.meetsMinimumTokenThreshold,
    };

    if (metricsEnabled) {
        const invalidationReasons = results.reduce<Record<string, number>>((acc, artifact) => {
            acc[artifact.invalidationReason] = (acc[artifact.invalidationReason] ?? 0) + 1;
            return acc;
        }, {});

        await appendMetrics(metricsLogPath, {
            timestamp: new Date().toISOString(),
            runId,
            label: options.label ?? "manual-build",
            cacheEnabled,
            cacheHits,
            cacheMisses,
            stableBlocksReused: cacheHits,
            stableBlocksRegenerated: cacheMisses,
            invalidationReasons,
            totalBytes,
            totalEstimatedTokens,
            reusedBytes,
            reusedEstimatedTokens,
            regeneratedBytes,
            regeneratedEstimatedTokens,
            providerCachingEnabled: providerCacheResult.enabled,
            providerCachePrefixHash: providerCacheResult.prefixHash,
            providerCachePrefixEstimatedTokens: providerCacheResult.prefixEstimatedTokens,
            providerCacheMeetsMinimumTokenThreshold: providerCacheResult.meetsMinimumTokenThreshold,
            durationMs,
            artifacts: results.map((artifact) => ({
                id: artifact.id,
                reused: artifact.reused,
                invalidationReason: artifact.invalidationReason,
                bytes: artifact.bytes,
                estimatedTokens: artifact.estimatedTokens,
            })),
        });
    }

    return summary;
}
