import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..", "..");
const INPUT_PATH = path.join(
    ROOT,
    ".agent-harness",
    "metrics",
    "browser-gameplay-benchmark-latest.json",
);

function round(value: number, digits = 3): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function formatMeasure(measure: any): string {
    return `${String(measure?.name ?? "unknown")} avg=${round(Number(measure?.avgMs ?? 0))}ms max=${round(Number(measure?.maxMs ?? 0))}ms count=${Number(measure?.count ?? 0)}`;
}

function printScenario(name: string, scenario: any): void {
    console.log(`\n[${name}]`);
    console.log(
        `elapsed=${round(Number(scenario?.elapsedMs ?? 0))}ms mode=${String(scenario?.requestedMode ?? "n/a")}`,
    );
    const longTasks = scenario?.perf?.longTasks;
    if (longTasks) {
        console.log(
            `longTasks count=${Number(longTasks.count ?? 0)} total=${round(Number(longTasks.totalMs ?? 0))}ms max=${round(Number(longTasks.maxMs ?? 0))}ms`,
        );
    }
    const frameMeasures = (scenario?.perf?.frameMeasures ?? []).slice(0, 10);
    if (frameMeasures.length > 0) {
        console.log("top frame phases:");
        for (const measure of frameMeasures) {
            console.log(`  - ${formatMeasure(measure)}`);
        }
    }
    const renderLineItems = (scenario?.perf?.renderLineItems ?? []).slice(0, 12);
    if (renderLineItems.length > 0) {
        console.log("render line items:");
        for (const measure of renderLineItems) {
            console.log(`  - ${formatMeasure(measure)}`);
        }
    }
    const inputGroups = (scenario?.perf?.inputLatency?.groups ?? []).slice(0, 8);
    if (inputGroups.length > 0) {
        console.log("input latency:");
        for (const group of inputGroups) {
            console.log(
                `  - ${String(group?.name ?? "unknown")} avg=${round(Number(group?.avgMs ?? 0))}ms max=${round(Number(group?.maxMs ?? 0))}ms count=${Number(group?.count ?? 0)}`,
            );
        }
    }
    const orderLatency = scenario?.analysis?.orderLatency ?? scenario?.orderLatency;
    if (orderLatency) {
        console.log("order path:");
        console.log(
            `  - pointer issue=${round(Number(orderLatency?.pointerIssueCommit?.avgMs ?? 0))}ms direct issue=${round(Number(orderLatency?.directIssueCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerVsDirectIssueGapMs ?? 0))}ms`,
        );
        console.log(
            `  - target-click issue=${round(Number(orderLatency?.pointerIssueAfterTargetClick?.avgMs ?? 0))}ms direct issue=${round(Number(orderLatency?.directIssueCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerTargetClickVsDirectIssueGapMs ?? 0))}ms`,
        );
        console.log(
            `  - pointer cancel=${round(Number(orderLatency?.pointerCancelCommit?.avgMs ?? 0))}ms direct cancel=${round(Number(orderLatency?.directCancelCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerVsDirectCancelGapMs ?? 0))}ms`,
        );
    }
    const scheduler = scenario?.territoryScheduler;
    if (scheduler) {
        console.log("scheduler:");
        console.log(
            `  - territory last=${round(Number(scheduler?.territory?.lastUpdateMs ?? 0))}ms ship last=${round(Number(scheduler?.ships?.lastRenderMs ?? 0))}ms queuedOrders=${Number(scheduler?.orders?.queuedMutations ?? 0)}`,
        );
        console.log(
            `  - territoryDeferred=${Boolean(scheduler?.territory?.deferralActive)} shipDeferred=${Boolean(scheduler?.ships?.deferralActive)}`,
        );
        console.log(
            `  - territoryAsync scheduled=${Boolean(scheduler?.territoryAsync?.scheduled)} running=${Boolean(scheduler?.territoryAsync?.running)} queueWait=${round(Number(scheduler?.territoryAsync?.queueWaitMs ?? 0))}ms commitLag=${round(Number(scheduler?.territoryAsync?.commitLagMs ?? 0))}ms superseded=${Number(scheduler?.territoryAsync?.supersededCount ?? 0)}`,
        );
    }
    const cpuHotspots = (scenario?.cpuHotspots ?? []).slice(0, 8);
    if (cpuHotspots.length > 0) {
        console.log("cpu hotspots:");
        for (const hotspot of cpuHotspots) {
            console.log(
                `  - ${String(hotspot?.label ?? "unknown")} self=${round(Number(hotspot?.selfMs ?? 0))}ms samples=${Number(hotspot?.sampleCount ?? 0)}`,
            );
        }
    }
}

function main(): void {
    if (!existsSync(INPUT_PATH)) {
        throw new Error(`Missing benchmark artifact: ${INPUT_PATH}`);
    }
    const report = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
    console.log(`artifact=${INPUT_PATH}`);
    console.log(`generatedAt=${String(report?.generatedAt ?? "unknown")}`);

    const scenarios = report?.scenarios ?? {};
    const analysisByName = new Map<string, any>(
        (report?.analysis?.scenarios ?? []).map((entry: any) => [
            String(entry?.name ?? ""),
            entry,
        ]),
    );
    for (const [name, scenario] of Object.entries(scenarios)) {
        printScenario(name, {
            ...(scenario as Record<string, unknown>),
            analysis: analysisByName.get(name),
        });
    }
}

main();
