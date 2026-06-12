import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";

export interface ProviderCacheConfig {
    stablePrefixLabel: string;
    minimumCacheableTokens: number;
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
    relativeOutputPath: string;
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
    stablePrefixLabel: "pax-fluxia-agentic-stable-v1",
    minimumCacheableTokens: 1024,
    openai: {
        promptCacheKey: "pax-fluxia-agentic-stable-v1",
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

function renderProviderCachePrefix(config: ProviderCacheConfig, artifacts: ProviderCacheArtifactInput[]): string {
    const artifactIndex = artifacts
        .map((artifact) =>
            [
                `- ${artifact.id}`,
                `  - output: ${artifact.relativeOutputPath}`,
                `  - hash: ${artifact.artifactHash}`,
                `  - estimatedTokens: ${artifact.estimatedTokens}`,
                `  - bytes: ${artifact.bytes}`,
            ].join("\n")
        )
        .join("\n");

    const artifactSections = artifacts
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
            artifactIndex,
            "",
            "---",
            "",
            artifactSections,
        ].join("\n")
    );
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

    return normalizeText(
        [
            "# Provider Prompt Cache Strategy",
            "",
            "## Stable Prefix",
            "",
            `- Prefix file: ${prefixPath}`,
            `- Prefix hash: ${prefixHash}`,
            `- Prefix estimated tokens: ${prefixEstimatedTokens}`,
            `- Prefix bytes: ${prefixBytes}`,
            `- Minimum useful cache threshold: ${config.minimumCacheableTokens} tokens`,
            `- Meets threshold: ${prefixEstimatedTokens >= config.minimumCacheableTokens ? "yes" : "no"}`,
            "",
            "## Stable Artifacts",
            "",
            artifactList,
            "",
            "## Prompt Order Contract",
            "",
            "1. Put the stable provider-cache prefix first.",
            "2. Put tool definitions and structured output schemas in a stable order when they are reused.",
            "3. Put volatile task brief, current diff, latest runtime output, and user-specific instructions after the stable prefix.",
            "4. Do not add timestamps, run IDs, random IDs, or fresh metrics before the cache breakpoint.",
            "",
            "## OpenAI",
            "",
            "- Prompt caching is automatic for eligible prompts, but exact prefix stability is still required.",
            `- Use prompt_cache_key consistently as ${config.openai.promptCacheKey} for requests that share this stable prefix.`,
            "- Prefer prompt_cache_retention=\"24h\" only on models that support extended prompt cache retention; otherwise omit the field and use the model or organization default.",
            "- Track usage.prompt_tokens_details.cached_tokens and latency per request.",
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
            "- Cache the stable prefix as a system text block with cache_control on that block.",
            `- Current cache_control contract: ${anthropicCacheControl}`,
            `- Keep explicit breakpoints at or below ${config.anthropic.maxExplicitBreakpoints}; this strategy uses one explicit breakpoint for stable Pax context.`,
            "- Use top-level automatic cache_control separately only when the conversation history itself should move the cache breakpoint forward.",
            "- Track usage.cache_creation_input_tokens, usage.cache_read_input_tokens, and latency per request.",
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
