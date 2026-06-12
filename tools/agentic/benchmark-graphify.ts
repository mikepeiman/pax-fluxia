#!/usr/bin/env bun

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface CommandSpec {
    command: string;
    args: string[];
}

interface BenchmarkTask {
    id: string;
    question: string;
    graphify: CommandSpec;
    baseline: CommandSpec;
}

interface CommandResult {
    commandLine: string;
    durationMs: number;
    exitCode: number;
    stdout: string;
    stderr: string;
    outputChars: number;
    estimatedTokens: number;
    outputLines: number;
    referencedFiles: string[];
}

const rootDir = resolve(process.cwd());
const reportPath = join(rootDir, ".agent-harness/metrics/graphify-comparison-latest.md");
const jsonPath = join(rootDir, ".agent-harness/metrics/graphify-comparison-latest.json");

const tasks: BenchmarkTask[] = [
    {
        id: "territory-geometry-modes",
        question: "What modules implement territory geometry modes?",
        graphify: {
            command: "graphify",
            args: ["query", "What modules implement territory geometry modes?", "--budget", "2000"],
        },
        baseline: {
            command: "rg",
            args: [
                "-n",
                "GeometryMode|GEOMETRY_MODES|GeometryModeId|GeometryLayerCoordinator|implements GeometryMode|register",
                "pax-fluxia/src/lib/territory/layers/geometry",
                "pax-fluxia/src/lib/territory/contracts",
                "pax-fluxia/src/lib/territory/ui",
            ],
        },
    },
    {
        id: "settings-panel-flow",
        question: "How do settings panel sliders flow through panelSync and settingsDefs into game config?",
        graphify: {
            command: "graphify",
            args: [
                "query",
                "How do settings panel sliders flow through panelSync and settingsDefs into game config?",
                "--budget",
                "2000",
            ],
        },
        baseline: {
            command: "rg",
            args: [
                "-n",
                "PANEL_CONFIG_MAP|panelSync|syncPanelFromConfig|updatePanel|settingsDefs|GAME_CONFIG",
                "pax-fluxia/src/lib/components/ui",
                "pax-fluxia/src/lib/config",
            ],
        },
    },
    {
        id: "lane-margin-constraints",
        question: "What code implements lane margin and lane geometry constraints?",
        graphify: {
            command: "graphify",
            args: ["query", "What code implements lane margin and lane geometry constraints?", "--budget", "2000"],
        },
        baseline: {
            command: "rg",
            args: [
                "-n",
                "laneMargin|LaneMargin|geometryLaneConstraints|applyLaneTravelPath|lanePolyline|margin",
                "common/src",
                "pax-fluxia/src/lib/lanes",
                "pax-fluxia/src/lib/components/ui/settings",
                "pax-fluxia/src/lib/config",
            ],
        },
    },
    {
        id: "server-shared-state",
        question: "How do server rooms and common GameState schema connect?",
        graphify: {
            command: "graphify",
            args: ["query", "How do server rooms and common GameState schema connect?", "--budget", "2000"],
        },
        baseline: {
            command: "rg",
            args: [
                "-n",
                "GameState|defineTypes|Schema|GameRoom|TestRoom|MinimalState|@pax/common",
                "pax-server/src",
                "common/src",
            ],
        },
    },
];

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

function commandLine(spec: CommandSpec): string {
    return [spec.command, ...spec.args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg))].join(" ");
}

function unique(values: string[]): string[] {
    return [...new Set(values)].sort();
}

function extractReferencedFiles(output: string): string[] {
    const files: string[] = [];
    const graphifySourceRegex = /src=([^ \]\r\n]+(?: [^ \]\r\n]+)*)/g;
    const baselineRegex = /^([^:\r\n]+):\d+:/gm;

    for (const match of output.matchAll(graphifySourceRegex)) {
        if (match[1]) files.push(match[1].trim());
    }

    for (const match of output.matchAll(baselineRegex)) {
        if (match[1]) files.push(match[1].trim());
    }

    return unique(files);
}

async function runCommand(spec: CommandSpec): Promise<CommandResult> {
    const startedAt = performance.now();
    try {
        const result = await execFileAsync(spec.command, spec.args, {
            cwd: rootDir,
            windowsHide: true,
            maxBuffer: 32 * 1024 * 1024,
        });
        const stdout = result.stdout.toString();
        const stderr = result.stderr.toString();
        const durationMs = Math.round(performance.now() - startedAt);
        return {
            commandLine: commandLine(spec),
            durationMs,
            exitCode: 0,
            stdout,
            stderr,
            outputChars: stdout.length + stderr.length,
            estimatedTokens: estimateTokens(stdout + stderr),
            outputLines: stdout.trim().length === 0 ? 0 : stdout.trim().split(/\r?\n/).length,
            referencedFiles: extractReferencedFiles(stdout),
        };
    } catch (error) {
        const err = error as Error & { code?: number; stdout?: Buffer | string; stderr?: Buffer | string };
        const stdout = err.stdout?.toString() ?? "";
        const stderr = err.stderr?.toString() ?? err.message;
        const durationMs = Math.round(performance.now() - startedAt);
        return {
            commandLine: commandLine(spec),
            durationMs,
            exitCode: typeof err.code === "number" ? err.code : 1,
            stdout,
            stderr,
            outputChars: stdout.length + stderr.length,
            estimatedTokens: estimateTokens(stdout + stderr),
            outputLines: stdout.trim().length === 0 ? 0 : stdout.trim().split(/\r?\n/).length,
            referencedFiles: extractReferencedFiles(stdout),
        };
    }
}

function renderResultSummary(result: CommandResult): string {
    return [
        `- Command: \`${result.commandLine}\``,
        `- Exit code: ${result.exitCode}`,
        `- Duration: ${result.durationMs}ms`,
        `- Output chars: ${result.outputChars}`,
        `- Estimated output tokens: ${result.estimatedTokens}`,
        `- Output lines: ${result.outputLines}`,
        `- Referenced files: ${result.referencedFiles.length}`,
    ].join("\n");
}

function renderExcerpt(result: CommandResult): string {
    const text = result.stdout.trim() || result.stderr.trim();
    const excerpt = text.length > 1600 ? `${text.slice(0, 1600)}\n...` : text;
    return excerpt || "(no output)";
}

const results = [];

for (const task of tasks) {
    const graphify = await runCommand(task.graphify);
    const baseline = await runCommand(task.baseline);
    results.push({ task, graphify, baseline });
}

await mkdir(join(rootDir, ".agent-harness/metrics"), { recursive: true });
await writeFile(
    jsonPath,
    JSON.stringify(
        {
            timestamp: new Date().toISOString(),
            graph: "graphify-out/graph.json",
            tokenEstimation: "chars_div_4",
            results,
        },
        null,
        2
    ),
    "utf8"
);

const tableRows = results
    .map(({ task, graphify, baseline }) => {
        const tokenDelta = baseline.estimatedTokens - graphify.estimatedTokens;
        const timeDelta = baseline.durationMs - graphify.durationMs;
        return `| ${task.id} | ${graphify.durationMs} | ${baseline.durationMs} | ${graphify.estimatedTokens} | ${baseline.estimatedTokens} | ${tokenDelta} | ${timeDelta} | ${graphify.referencedFiles.length} | ${baseline.referencedFiles.length} |`;
    })
    .join("\n");

const details = results
    .map(
        ({ task, graphify, baseline }) => `## ${task.id}

Question: ${task.question}

### Graphify

${renderResultSummary(graphify)}

\`\`\`text
${renderExcerpt(graphify)}
\`\`\`

### Baseline rg

${renderResultSummary(baseline)}

\`\`\`text
${renderExcerpt(baseline)}
\`\`\`
`
    )
    .join("\n");

const report = `# Graphify Comparison Benchmark

Generated: ${new Date().toISOString()}

Graph: \`graphify-out/graph.json\`

Token estimate: output characters divided by 4.

| Task | Graphify ms | rg ms | Graphify est tokens | rg est tokens | Token delta favoring Graphify | Time delta favoring Graphify | Graphify files | rg files |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${tableRows}

Positive token/time deltas mean Graphify returned less output or ran faster than the baseline command.

${details}
`;

await writeFile(reportPath, report, "utf8");
console.log(report);
