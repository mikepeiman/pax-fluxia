import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";

export interface ProviderCacheConfig {
    stablePrefixLabel: string;
    minimumCacheableTokens: number;
    prefixMode: "artifact-index" | "full-artifacts";
    maxPrefixEstimatedTokens: number;
    includeFullArtifactIds: string[];
    openai: {
        promptCacheKey: string;
        retentionPolicy: "prefer-24h-when-supported-otherwise-omit";
    };
    anthropic: {
        cacheControl: {
            type: "ephemeral";
            ttl?: "5m" | "1h";
        };
        maxExplicitBreakpoints: number;
    };
}

export interface ProviderCachePaths {
    providerCachePrefix?: string;
    providerCacheStrategy?: string;
}

export interface ProviderCacheArtifactInput {
    id: string;
    title: string;
    description: string;
    relativeOutputPath: string;
    sources: string[];
    content: string;
    artifactHash: string;
    estimatedTokens: number;
    bytes: number;
}

export interface ProviderCacheBuildResult {
    enabled: boolean;
    prefixPath?: string;
    strategyPath?: string;
    prefixHash?: string;
    prefixBytes?: number;
    prefixEstimatedTokens?: number;
    meetsMinimumTokenThreshold?: boolean;
}

const DEFAULT_PROVIDER_CACHE_CONFIG: ProviderCacheConfig = {
    stablePrefixLabel: "pax-fluxia-agentic-stable-v2",
    minimumCacheableTokens: 1024,
    prefixMode: "artifact-index",
    maxPrefixEstimatedTokens: 4096,
    includeFullArtifactIds: [],
    openai: {
        promptCacheKey: "pax-fluxia-agentic-stable-v2",
        retentionPolicy: "prefer-24h-when-supported-otherwise-omit",
    },
    anthropic: {
        cacheControl: {
            type: "ephemeral",
        },
        maxExplicitBreakpoints: 4,
    },
};

async function ensureParentDir(filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
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

function resolveProviderCacheConfig(config?: Partial<ProviderCacheConfig>): ProviderCacheConfig {
    return {
        ...DEFAULT_PROVIDER_CACHE_CONFIG,
        ...config,
        includeFullArtifactIds: config?.includeFullArtifactIds ?? DEFAULT_PROVIDER_CACHE_CONFIG.includeFullArtifactIds,
        openai: {
            ...DEFAULT_PROVIDER_CACHE_CONFIG.openai,
            ...config?.openai,
        },
        anthropic: {
            ...DEFAULT_PROVIDER_CACHE_CONFIG.anthropic,
            ...config?.anthropic,
            cacheControl: {
                ...DEFAULT_PROVIDER_CACHE_CONFIG.anthropic.cacheControl,
                ...config?.anthropic?.cacheControl,
            },
        },
    };
}

function renderArtifactIndex(artifacts: ProviderCacheArtifactInput[]): string {
    return artifacts
        .map((artifact) =>
            [
                `- ${artifact.id}`,
                `  - title: ${artifact.title}`,
                `  - description: ${artifact.description}`,
                `  - output: ${artifact.relativeOutputPath}`,
                `  - hash: ${artifact.artifactHash}`,
                `  - estimatedTokens: ${artifact.estimatedTokens}`,
                `  - bytes: ${artifact.bytes}`,
                `  - sources: ${artifact.sources.join(", ")}`,
            ].join("\n")
        )
        .join("\n");
}

function renderFullArtifactSections(artifacts: ProviderCacheArtifactInput[]): string {
    return artifacts
        .map((artifact) =>
            [
                `## ${artifact.title}`,
                "",
                `Artifact ID: ${artifact.id}`,
                `Artifact hash: ${artifact.artifactHash}`,
                "",
                normalizeText(artifact.content).trim(),
            ].join("\n")
        )
        .join("\n\n---\n\n");
}

function renderFullProviderCachePrefix(config: ProviderCacheConfig, artifacts: ProviderCacheArtifactInput[]): string {
    return normalizeText(
        [
            "# Pax Fluxia Stable Provider Cache Prefix",
            "",
            `Cache label: ${config.stablePrefixLabel}`,
            "",
            "This block is intentionally stable. Put it before task-specific prompts, current diffs, fresh errors, and user messages.",
            "If any source artifact changes, rebuild this prefix and let provider caches miss naturally on the new prefix hash.",
            "",
            "## Artifact Index",
            "",
            renderArtifactIndex(artifacts),
            "",
            "---",
            "",
            renderFullArtifactSections(artifacts),
        ].join("\n")
    );
}

function renderLeanProviderCachePrefix(config: ProviderCacheConfig, artifacts: ProviderCacheArtifactInput[]): string {
    const fullArtifactIds = new Set(config.includeFullArtifactIds);
    const selectedFullArtifacts = artifacts.filter((artifact) => fullArtifactIds.has(artifact.id));

    const lines = [
        "# Pax Fluxia Lean Provider Cache Prefix",
        "",
        `Cache label: ${config.stablePrefixLabel}`,
        "",
        "Purpose: stable provider-cache routing and a retrieval map. This is not full project memory.",
        "Put this block before task-specific prompts, current diffs, fresh errors, timestamps, and user messages.",
        "",
        "## Operating Contract",
        "",
        "- Use this prefix only as stable orientation; verify implementation details with source reads, Graphify, rg, and tests.",
        "- Prefer Graphify for broad code-structure discovery, then use rg and direct file reads for exact evidence.",
        "- Rebuild the source graph with `bun run agentic:graphify:build` after source changes in common/src, pax-server/src, or pax-fluxia/src.",
        "- Use Bun for repo commands; do not introduce npm, npx, or yarn commands for this workspace.",
        "- Keep volatile task context outside this cache prefix so provider cache keys remain stable.",
        "- Do not load the large artifacts below into every request; select them only when the task needs that domain context.",
        "",
        "## Task Routing Map",
        "",
        "- For exact symbol or string lookup, use `rg` first and keep the prompt suffix small.",
        "- For broad architecture discovery, use `graphify query` against graphify-out/graph.json, then verify the shortlist with source reads.",
        "- For repo-wide source graph freshness, run `bun run agentic:graphify:build`; the graph intentionally excludes docs, HTML prototypes, JSON data, static assets, and semantic extraction.",
        "- For provider prompt caching, prefer this lean prefix for repeated agent turns and attach large artifacts only after the breakpoint when the task needs them.",
        "- For project rules or user preferences, read stable-instructions and stable-coding-policy on demand instead of assuming this prefix contains every rule.",
        "- For territory rendering, geometry, and mechanics work, read stable-project-architecture only when the task touches that domain.",
        "- For workflow/tooling changes, read stable-workflow-stack only when changing agent harnesses, plugins, scripts, or automation surfaces.",
        "- For generated reports, compare token/time numbers against the metrics artifacts rather than relying on memory.",
        "- For provider telemetry, record cached input tokens, uncached input tokens, total latency, and task outcome quality separately.",
        "- For refactors, treat cached context as a navigation aid, not evidence; source files and tests remain the authority.",
        "",
        "## Stable Artifact Retrieval Index",
        "",
        renderArtifactIndex(artifacts),
    ];

    if (selectedFullArtifacts.length > 0) {
        const candidate = normalizeText(
            [
                ...lines,
                "",
                "---",
                "",
                "## Selected Full Artifact Content",
                "",
                renderFullArtifactSections(selectedFullArtifacts),
            ].join("\n")
        );

        if (estimateTokens(candidate) <= config.maxPrefixEstimatedTokens) {
            return candidate;
        }

        lines.push(
            "",
            "## Full Artifact Content Omitted",
            "",
            `Configured full artifact IDs would exceed the ${config.maxPrefixEstimatedTokens}-token provider-prefix budget. Load the artifact files on demand instead.`
        );
    }

    return normalizeText(lines.join("\n"));
}

function renderProviderCachePrefix(config: ProviderCacheConfig, artifacts: ProviderCacheArtifactInput[]): string {
    if (config.prefixMode === "full-artifacts") {
        return renderFullProviderCachePrefix(config, artifacts);
    }

    return renderLeanProviderCachePrefix(config, artifacts);
}

function sumEstimatedTokens(artifacts: ProviderCacheArtifactInput[]): number {
    return artifacts.reduce((sum, artifact) => sum + artifact.estimatedTokens, 0);
}

function sumBytes(artifacts: ProviderCacheArtifactInput[]): number {
    return artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0);
}

function renderBudgetStatus(config: ProviderCacheConfig, prefixEstimatedTokens: number): string {
    if (config.prefixMode === "full-artifacts") {
        return "Full-artifacts mode intentionally bypasses the lean prefix budget.";
    }

    return prefixEstimatedTokens <= config.maxPrefixEstimatedTokens
        ? `Within ${config.maxPrefixEstimatedTokens}-token lean prefix budget.`
        : `Exceeds ${config.maxPrefixEstimatedTokens}-token lean prefix budget.`;
}

function renderProviderCacheStrategy(
    config: ProviderCacheConfig,
    artifacts: ProviderCacheArtifactInput[],
    prefixPath: string,
    prefixHash: string,
    prefixEstimatedTokens: number,
    prefixBytes: number
): string {
    const artifactList = artifacts
        .map((artifact) => `- ${artifact.id}: ${artifact.estimatedTokens} est tokens, hash ${artifact.artifactHash.slice(0, 12)}`)
        .join("\n");
    const anthropicCacheControl = JSON.stringify(config.anthropic.cacheControl);
    const fullArtifactEstimatedTokens = sumEstimatedTokens(artifacts);
    const fullArtifactBytes = sumBytes(artifacts);

    return normalizeText(
        [
            "# Provider Prompt Cache Strategy",
            "",
            "## Stable Prefix",
            "",
            `- Prefix file: ${prefixPath}`,
            `- Prefix hash: ${prefixHash}`,
            `- Prefix mode: ${config.prefixMode}`,
            `- Prefix estimated tokens: ${prefixEstimatedTokens}`,
            `- Prefix bytes: ${prefixBytes}`,
            `- Full artifact bundle estimated tokens: ${fullArtifactEstimatedTokens}`,
            `- Full artifact bundle bytes: ${fullArtifactBytes}`,
            `- Lean prefix budget: ${config.maxPrefixEstimatedTokens} tokens`,
            `- Budget status: ${renderBudgetStatus(config, prefixEstimatedTokens)}`,
            `- Minimum useful cache threshold: ${config.minimumCacheableTokens} tokens`,
            `- Meets configured threshold: ${prefixEstimatedTokens >= config.minimumCacheableTokens ? "yes" : "no"}`,
            "",
            "## Stable Artifacts",
            "",
            artifactList,
            "",
            "## Prompt Order Contract",
            "",
            "1. Put the lean stable provider-cache prefix first.",
            "2. Put volatile task brief, current diff, latest runtime output, and user-specific instructions after the stable prefix.",
            "3. Load large artifact contents only when the task specifically needs them.",
            "4. Do not add timestamps, run IDs, random IDs, or fresh metrics before the cache breakpoint.",
            "5. If a task truly needs a large stable document bundle across many repeated calls, build a separate expanded prefix and measure it against this lean baseline.",
            "",
            "## OpenAI",
            "",
            "- Prompt caching is automatic for eligible prompts, but exact prefix stability is still required.",
            `- Use prompt_cache_key consistently as ${config.openai.promptCacheKey} for requests that share this stable prefix.`,
            "- Prefer prompt_cache_retention=\"24h\" only on models that support extended prompt cache retention; otherwise omit the field and use the model or organization default.",
            "- Track usage.prompt_tokens_details.cached_tokens, total input tokens, and latency per request.",
            "- Do not include the full artifact bundle by default; cached tokens are still input tokens and still consume context.",
            "",
            "```ts",
            "const providerCachePrefix = await Bun.file('.agent-harness/context-cache/provider-cache-prefix.md').text();",
            "await openai.responses.create({",
            "    model,",
            `    prompt_cache_key: '${config.openai.promptCacheKey}',`,
            "    // prompt_cache_retention: '24h', // set only when the selected model supports it",
            "    input: [",
            "        {",
            "            role: 'system',",
            "            content: [",
            "                { type: 'input_text', text: providerCachePrefix },",
            "                { type: 'input_text', text: volatileRunInstructions },",
            "            ],",
            "        },",
            "        { role: 'user', content: userTask },",
            "    ],",
            "});",
            "```",
            "",
            "## Anthropic",
            "",
            "- Cache the lean stable prefix as a system text block with cache_control on that block.",
            `- Current cache_control contract: ${anthropicCacheControl}`,
            `- Keep explicit breakpoints at or below ${config.anthropic.maxExplicitBreakpoints}; this strategy uses one explicit breakpoint for stable Pax context.`,
            "- Use top-level automatic cache_control separately only when the conversation history itself should move the cache breakpoint forward.",
            "- Track usage.cache_creation_input_tokens, usage.cache_read_input_tokens, total input tokens, and latency per request.",
            "- For Anthropic models whose minimum cacheable prompt length is higher than this prefix, omit cache_control or use an expanded prefix only when repeated calls justify it.",
            "",
            "```ts",
            "const providerCachePrefix = await Bun.file('.agent-harness/context-cache/provider-cache-prefix.md').text();",
            "await anthropic.messages.create({",
            "    model,",
            "    max_tokens,",
            "    system: [",
            "        {",
            "            type: 'text',",
            "            text: providerCachePrefix,",
            `            cache_control: ${anthropicCacheControl},`,
            "        },",
            "        { type: 'text', text: volatileRunInstructions },",
            "    ],",
            "    messages: [{ role: 'user', content: userTask }],",
            "});",
            "```",
        ].join("\n")
    );
}

export async function writeProviderCacheArtifacts(params: {
    rootDir: string;
    enabled: boolean;
    paths: ProviderCachePaths;
    config?: Partial<ProviderCacheConfig>;
    artifacts: ProviderCacheArtifactInput[];
}): Promise<ProviderCacheBuildResult> {
    if (!params.enabled) {
        return { enabled: false };
    }

    const config = resolveProviderCacheConfig(params.config);
    const prefixRelativePath = params.paths.providerCachePrefix ?? ".agent-harness/context-cache/provider-cache-prefix.md";
    const strategyRelativePath = params.paths.providerCacheStrategy ?? ".agent-harness/context-cache/provider-cache-strategy.md";
    const prefixPath = join(params.rootDir, prefixRelativePath);
    const strategyPath = join(params.rootDir, strategyRelativePath);
    const prefix = renderProviderCachePrefix(config, params.artifacts);
    const prefixHash = hashText(prefix);
    const prefixBytes = Buffer.byteLength(prefix, "utf8");
    const prefixEstimatedTokens = estimateTokens(prefix);
    const strategy = renderProviderCacheStrategy(
        config,
        params.artifacts,
        prefixRelativePath,
        prefixHash,
        prefixEstimatedTokens,
        prefixBytes
    );

    await ensureParentDir(prefixPath);
    await writeFile(prefixPath, prefix, "utf8");
    await ensureParentDir(strategyPath);
    await writeFile(strategyPath, strategy, "utf8");

    return {
        enabled: true,
        prefixPath,
        strategyPath,
        prefixHash,
        prefixBytes,
        prefixEstimatedTokens,
        meetsMinimumTokenThreshold: prefixEstimatedTokens >= config.minimumCacheableTokens,
    };
}
