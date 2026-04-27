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

function findMeasure(measures: any, name: string): any | null {
    if (!Array.isArray(measures)) return null;
    return measures.find((measure) => String(measure?.name ?? "") === name) ?? null;
}

function formatInvalidReason(reason: any): string {
    return `${String(reason?.reason ?? "unknown")}=${Number(reason?.count ?? 0)}`;
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
    const longAnimationFrames = scenario?.perf?.longAnimationFrames;
    if (Number(longAnimationFrames?.count ?? 0) > 0) {
        console.log(
            `longAnimationFrames count=${Number(longAnimationFrames.count ?? 0)} blockingMax=${round(Number(longAnimationFrames?.blockingDuration?.maxMs ?? 0))}ms durationMax=${round(Number(longAnimationFrames?.duration?.maxMs ?? 0))}ms`,
        );
    }
    const frameMeasures = (scenario?.perf?.frameMeasures ?? []).slice(0, 10);
    if (frameMeasures.length > 0) {
        console.log("top frame phases:");
        for (const measure of frameMeasures) {
            console.log(`  - ${formatMeasure(measure)}`);
        }
    }
    const focusMeasures = (scenario?.perf?.focusMeasures ?? []).slice(0, 12);
    if (focusMeasures.length > 0) {
        console.log("focus measures:");
        for (const measure of focusMeasures) {
            console.log(`  - ${formatMeasure(measure)}`);
        }
    }
    const clientRectRefresh = findMeasure(
        scenario?.perf?.focusMeasures,
        "game.input.clientRect.refresh",
    );
    const dragPreviewPresent = findMeasure(
        scenario?.perf?.focusMeasures,
        "game.input.dragPreview.present",
    );
    if (clientRectRefresh || dragPreviewPresent) {
        console.log("interaction infra:");
        if (clientRectRefresh) {
            console.log(`  - ${formatMeasure(clientRectRefresh)}`);
        }
        if (dragPreviewPresent) {
            console.log(`  - ${formatMeasure(dragPreviewPresent)}`);
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
        const pointerIntegrity = orderLatency?.pointerSampleIntegrity;
        const directIntegrity = orderLatency?.directSampleIntegrity;
        if (pointerIntegrity || directIntegrity) {
            console.log("  - sample integrity:");
            if (pointerIntegrity) {
                console.log(
                    `    pointer valid=${Number(pointerIntegrity?.validCount ?? 0)}/${Number(pointerIntegrity?.totalCount ?? 0)} invalid=${Number(pointerIntegrity?.invalidCount ?? 0)} reasons=${((pointerIntegrity?.invalidReasons ?? []) as any[]).map(formatInvalidReason).join(", ") || "none"}`,
                );
            }
            if (directIntegrity) {
                console.log(
                    `    direct valid=${Number(directIntegrity?.validCount ?? 0)}/${Number(directIntegrity?.totalCount ?? 0)} invalid=${Number(directIntegrity?.invalidCount ?? 0)} reasons=${((directIntegrity?.invalidReasons ?? []) as any[]).map(formatInvalidReason).join(", ") || "none"}`,
                );
            }
        }
        console.log(
            `  - source-select=${round(Number(orderLatency?.pointerSourceSelect?.avgMs ?? 0))}ms order-path-event=${round(Number(orderLatency?.pointerIssueOrderPathEvent?.avgMs ?? 0))}ms after-target=${round(Number(orderLatency?.pointerIssueOrderPathEventAfterTargetClick?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - source handled down=${round(Number(orderLatency?.pointerSourcePointerDownHandled?.avgMs ?? 0))}ms up=${round(Number(orderLatency?.pointerSourcePointerUpHandled?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - source synthetic dispatch=${round(Number(orderLatency?.pointerSourcePointerDownDispatchLead?.avgMs ?? 0))}ms browser-queue=${round(Number(orderLatency?.pointerSourcePointerDownQueueDelay?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - target handled down=${round(Number(orderLatency?.pointerTargetPointerDownHandled?.avgMs ?? 0))}ms up=${round(Number(orderLatency?.pointerTargetPointerUpHandled?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - target synthetic dispatch=${round(Number(orderLatency?.pointerTargetPointerDownDispatchLead?.avgMs ?? 0))}ms browser-queue=${round(Number(orderLatency?.pointerTargetPointerDownQueueDelay?.avgMs ?? 0))}ms handled->localAck=${round(Number(orderLatency?.pointerIssueHandledToLocalAckAfterTargetClick?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - target handled->visualAck=${round(Number(orderLatency?.pointerIssueHandledToVisualAckAfterTargetClick?.avgMs ?? 0))}ms handled->commit=${round(Number(orderLatency?.pointerIssueHandledToCommitAfterTargetClick?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - issue local-ack=${round(Number(orderLatency?.pointerIssueLocalAckAfterTargetClick?.avgMs ?? 0))}ms visual-ack=${round(Number(orderLatency?.pointerIssueVisualAckAfterTargetClick?.avgMs ?? 0))}ms visual-gap=${round(Number(orderLatency?.pointerIssueLocalToVisualGapMs ?? 0))}ms`,
        );
        console.log(
            `  - pointer issue=${round(Number(orderLatency?.pointerIssueCommit?.avgMs ?? 0))}ms direct issue=${round(Number(orderLatency?.directIssueCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerVsDirectIssueGapMs ?? 0))}ms`,
        );
        console.log(
            `  - target-click issue=${round(Number(orderLatency?.pointerIssueAfterTargetClick?.avgMs ?? 0))}ms direct issue=${round(Number(orderLatency?.directIssueCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerTargetClickVsDirectIssueGapMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel local-ack=${round(Number(orderLatency?.pointerCancelLocalAck?.avgMs ?? 0))}ms visual-ack=${round(Number(orderLatency?.pointerCancelVisualAck?.avgMs ?? 0))}ms visual-gap=${round(Number(orderLatency?.pointerCancelLocalToVisualGapMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel handled down=${round(Number(orderLatency?.pointerCancelPointerDownHandled?.avgMs ?? 0))}ms up=${round(Number(orderLatency?.pointerCancelPointerUpHandled?.avgMs ?? 0))}ms rightclick=${round(Number(orderLatency?.pointerCancelContextMenuHandled?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel synthetic dispatch=${round(Number(orderLatency?.pointerCancelPointerDownDispatchLead?.avgMs ?? 0))}ms browser-queue=${round(Number(orderLatency?.pointerCancelPointerDownQueueDelay?.avgMs ?? 0))}ms rightclick-dispatch=${round(Number(orderLatency?.pointerCancelContextMenuDispatchLead?.avgMs ?? 0))}ms rightclick-queue=${round(Number(orderLatency?.pointerCancelContextMenuQueueDelay?.avgMs ?? 0))}ms handled->localAck=${round(Number(orderLatency?.pointerCancelHandledToLocalAck?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel handled->visualAck=${round(Number(orderLatency?.pointerCancelHandledToVisualAck?.avgMs ?? 0))}ms handled->commit=${round(Number(orderLatency?.pointerCancelHandledToCommit?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - pointer cancel=${round(Number(orderLatency?.pointerCancelCommit?.avgMs ?? 0))}ms cancel-event=${round(Number(orderLatency?.pointerCancelOrderPathEvent?.avgMs ?? 0))}ms direct cancel=${round(Number(orderLatency?.directCancelCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerVsDirectCancelGapMs ?? 0))}ms`,
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
        console.log(
            `  - territoryAsync scheduleMode=${String(scheduler?.territoryAsync?.scheduleMode ?? "n/a")} yields=${Number(scheduler?.territoryAsync?.yieldCount ?? 0)} forced=${Number(scheduler?.territoryAsync?.forcedCount ?? 0)} lastYield=${String(scheduler?.territoryAsync?.lastYieldReason ?? "n/a")} age=${round(Number(scheduler?.territoryAsync?.lastYieldAgeMs ?? 0))}ms`,
        );
        console.log(
            `  - orderQueue scheduleMode=${String(scheduler?.orders?.scheduleMode ?? "n/a")} queueDelay=${round(Number(scheduler?.orders?.lastQueueDelayMs ?? 0))}ms flushCount=${Number(scheduler?.orders?.lastQueueFlushMutationCount ?? 0)}`,
        );
        console.log(
            `  - interaction pendingAcks=${Number(scheduler?.interactions?.pendingVisualAckCount ?? 0)} lastLocal=${String(scheduler?.interactions?.lastLocalAck?.path ?? "n/a")} lastVisual=${String(scheduler?.interactions?.lastVisualAck?.path ?? "n/a")}`,
        );
    }
    const interactionEvents = (scenario?.perf?.interactionEvents ?? []).slice(0, 8);
    if (interactionEvents.length > 0) {
        console.log("interaction events:");
        for (const event of interactionEvents) {
            console.log(
                `  - ${String(event?.name ?? "unknown")} count=${Number(event?.count ?? 0)} span=${round(Number(event?.spanMs ?? 0))}ms`,
            );
        }
    }
    const pipelineEvents = (scenario?.perf?.pipelineEvents ?? []).slice(0, 8);
    if (pipelineEvents.length > 0) {
        console.log("pipeline events:");
        for (const event of pipelineEvents) {
            console.log(
                `  - ${String(event?.name ?? "unknown")} count=${Number(event?.count ?? 0)} span=${round(Number(event?.spanMs ?? 0))}ms`,
            );
        }
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
    const cpuFocusHotspots = (scenario?.cpuFocusHotspots ?? []).slice(0, 8);
    if (cpuFocusHotspots.length > 0) {
        console.log("cpu focus hotspots:");
        for (const hotspot of cpuFocusHotspots) {
            console.log(
                `  - ${String(hotspot?.label ?? "unknown")} self=${round(Number(hotspot?.selfMs ?? 0))}ms samples=${Number(hotspot?.sampleCount ?? 0)}`,
            );
        }
    }
    const traceMainThread = (
        scenario?.trace?.mainThreadTopByTotalMs ?? []
    ).slice(0, 8);
    if (traceMainThread.length > 0) {
        console.log("trace main thread:");
        for (const bucket of traceMainThread) {
            console.log(
                `  - ${String(bucket?.name ?? "unknown")} total=${round(Number(bucket?.totalMs ?? 0))}ms max=${round(Number(bucket?.maxMs ?? 0))}ms count=${Number(bucket?.count ?? 0)}`,
            );
        }
    }
    const traceCategories = (
        scenario?.trace?.mainThreadCategoriesTopByTotalMs ?? []
    ).slice(0, 6);
    if (traceCategories.length > 0) {
        console.log("trace categories:");
        for (const bucket of traceCategories) {
            console.log(
                `  - ${String(bucket?.name ?? "unknown")} total=${round(Number(bucket?.totalMs ?? 0))}ms max=${round(Number(bucket?.maxMs ?? 0))}ms count=${Number(bucket?.count ?? 0)}`,
            );
        }
    }
    const traceFocusBuckets = (scenario?.traceFocusBuckets ?? []).slice(0, 8);
    if (traceFocusBuckets.length > 0) {
        console.log("trace focus buckets:");
        for (const bucket of traceFocusBuckets) {
            console.log(
                `  - ${String(bucket?.name ?? "unknown")} total=${round(Number(bucket?.totalMs ?? 0))}ms max=${round(Number(bucket?.maxMs ?? 0))}ms count=${Number(bucket?.count ?? 0)}`,
            );
        }
    }
    const devtoolsMetricsDelta = scenario?.devtoolsMetricsDelta;
    if (devtoolsMetricsDelta) {
        console.log("devtools delta:");
        for (const [key, value] of Object.entries(devtoolsMetricsDelta)) {
            console.log(`  - ${key}=${round(Number(value ?? 0))}`);
        }
    }
    const perfEventTail = (scenario?.perfEventTail ?? []).slice(-8);
    if (perfEventTail.length > 0) {
        console.log("perf tail:");
        for (const event of perfEventTail) {
            console.log(
                `  - ${String(event?.name ?? "unknown")} at=${round(Number(event?.atMs ?? 0))}ms`,
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
    if (report?.benchmarkTarget) {
        console.log(
            `benchmarkTarget map=${String(report.benchmarkTarget?.resolvedMapName ?? "none")} stars=${Number(report.benchmarkTarget?.starCount ?? 0)} connections=${Number(report.benchmarkTarget?.connectionCount ?? 0)} reason=${String(report.benchmarkTarget?.selectionReason ?? "unknown")}`,
        );
    }

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
