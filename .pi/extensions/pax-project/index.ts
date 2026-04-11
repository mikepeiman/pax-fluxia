import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildContextPack } from "../../../tools/agentic/context-pack.ts";

type ArtifactSpec = {
	id: string;
	title: string;
	output: string;
};

type ContextManifest = {
	version: number;
	artifacts: ArtifactSpec[];
};

type CacheManifestEntry = {
	artifactHash: string;
	estimatedTokens: number;
	bytes: number;
	output: string;
};

type CacheManifestFile = {
	version: number;
	artifacts: Record<string, CacheManifestEntry>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, "../../..");
const CONTEXT_MANIFEST_PATH = join(ROOT_DIR, ".agent/agentic/context-manifest.json");
const CACHE_MANIFEST_PATH = join(ROOT_DIR, ".agent-harness/context-cache/cache-manifest.json");
const ARTIFACTS_DIR = join(ROOT_DIR, ".agent-harness/context-cache/artifacts");

function readJson<T>(filePath: string): T {
	return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function loadContextManifest(): ContextManifest {
	return readJson<ContextManifest>(CONTEXT_MANIFEST_PATH);
}

function loadCacheManifest(): CacheManifestFile | null {
	return existsSync(CACHE_MANIFEST_PATH) ? readJson<CacheManifestFile>(CACHE_MANIFEST_PATH) : null;
}

function getArtifactMap(): Map<string, ArtifactSpec> {
	return new Map(loadContextManifest().artifacts.map((artifact) => [artifact.id, artifact]));
}

function parseArtifactIds(args: string, artifactMap: Map<string, ArtifactSpec>): string[] {
	const tokens = args
		.split(/[,\s]+/)
		.map((token) => token.trim())
		.filter(Boolean);

	if (tokens.length === 0) {
		return [];
	}

	if (tokens.includes("all")) {
		return [...artifactMap.keys()];
	}

	return [...new Set(tokens.filter((token) => artifactMap.has(token)))];
}

function buildStatusSummary(): string {
	const manifest = loadContextManifest();
	const cacheManifest = loadCacheManifest();
	const lines = [
		"[Pax Context Cache]",
		`Artifacts configured: ${manifest.artifacts.length}`,
		cacheManifest ? "Cache manifest: present" : "Cache manifest: missing",
		"",
	];

	for (const artifact of manifest.artifacts) {
		const cached = cacheManifest?.artifacts[artifact.id];
		if (cached) {
			lines.push(
				`- ${artifact.id}: cached (${cached.estimatedTokens} est tokens, ${cached.bytes} bytes, hash ${cached.artifactHash.slice(0, 12)})`,
			);
		} else {
			lines.push(`- ${artifact.id}: not built`);
		}
	}

	return lines.join("\n");
}

function buildInjectedContext(selectedArtifacts: ArtifactSpec[]): string {
	const sections = selectedArtifacts.map((artifact) => {
		const artifactPath = join(ARTIFACTS_DIR, artifact.output);
		const content = readFileSync(artifactPath, "utf8").trim();
		return `## ${artifact.title} (\`${artifact.id}\`)\n\n${content}`;
	});

	return [
		"[Pax Fluxia Stable Context Injection]",
		"Use the cached stable context below as the reusable project baseline for this Pi session.",
		"Prefer these repo-local artifacts over broad raw-doc sweeps unless you specifically need source-level detail that has changed since the cache was built.",
		"",
		sections.join("\n\n---\n\n"),
	].join("\n");
}

function buildSystemPromptNotice(): string {
	const artifactIds = loadContextManifest().artifacts.map((artifact) => artifact.id).join(", ");

	return [
		"Project note: Pax Fluxia keeps stable project context memoized in repo-local artifacts under `.agent-harness/context-cache/artifacts/`.",
		"Prefer those cached artifacts before broad rereads of raw docs.",
		`Available artifact ids: ${artifactIds}.`,
		"Use `/pax-context:status` to inspect cache state, `/pax-context:rebuild` to refresh it, and `/pax-context:inject <artifact-id|all>` to inject cached contents on demand.",
	].join("\n");
}

export default function paxProjectExtension(pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setStatus("pax-context", existsSync(CACHE_MANIFEST_PATH) ? "pax-context ready" : "pax-context cache missing");
	});

	pi.on("before_agent_start", async (event) => {
		return {
			systemPrompt: `${event.systemPrompt}\n\n${buildSystemPromptNotice()}`,
		};
	});

	pi.registerCommand("pax-context:status", {
		description: "Show the current repo-local stable context cache status",
		handler: async (_args, _ctx) => {
			pi.sendMessage({
				customType: "pax-context-status",
				content: buildStatusSummary(),
				display: true,
			});
		},
	});

	pi.registerCommand("pax-context:rebuild", {
		description: "Rebuild the repo-local stable context artifacts",
		handler: async (args, ctx) => {
			const rawTokens = args
				.split(/[,\s]+/)
				.map((token) => token.trim())
				.filter(Boolean);
			const force = rawTokens.includes("--force");
			const clearCache = rawTokens.includes("--clear-cache");
			const artifactMap = getArtifactMap();
			const artifactTokens = rawTokens.filter((token) => !token.startsWith("--"));
			const artifactIds = artifactTokens.length > 0 ? parseArtifactIds(artifactTokens.join(" "), artifactMap) : undefined;

			if (artifactTokens.length > 0 && (!artifactIds || artifactIds.length === 0)) {
				ctx.ui.notify("No valid artifact ids were provided. Use /pax-context:status to inspect available ids.", "warning");
				return;
			}

			const result = await buildContextPack({
				rootDir: ROOT_DIR,
				artifactIds,
				force,
				clearCache,
				label: "pi-rebuild",
			});

			ctx.ui.setStatus("pax-context", "pax-context ready");
			pi.sendMessage({
				customType: "pax-context-status",
				content: [
					"[Pax Context Cache Rebuilt]",
					`Artifacts processed: ${result.artifacts.length}`,
					`Cache hits: ${result.cacheHits}`,
					`Cache misses: ${result.cacheMisses}`,
					`Estimated tokens regenerated: ${result.regeneratedEstimatedTokens}`,
				].join("\n"),
				display: true,
				details: result,
			});
		},
	});

	pi.registerCommand("pax-context:inject", {
		description: "Inject selected cached stable artifacts into the current Pi session",
		handler: async (args, ctx) => {
			const artifactMap = getArtifactMap();
			const artifactIds = parseArtifactIds(args, artifactMap);

			if (artifactIds.length === 0) {
				ctx.ui.notify("Usage: /pax-context:inject <artifact-id|all>", "warning");
				return;
			}

			const selectedArtifacts = artifactIds.map((id) => artifactMap.get(id)).filter((artifact): artifact is ArtifactSpec => Boolean(artifact));
			const missingArtifacts = selectedArtifacts.filter((artifact) => !existsSync(join(ARTIFACTS_DIR, artifact.output)));

			if (missingArtifacts.length > 0) {
				ctx.ui.notify(
					`Missing cached artifact files for: ${missingArtifacts.map((artifact) => artifact.id).join(", ")}. Run /pax-context:rebuild first.`,
					"warning",
				);
				return;
			}

			pi.sendUserMessage(buildInjectedContext(selectedArtifacts));
		},
	});
}
