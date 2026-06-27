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
    const frames = scenario?.actionResult?.frames ?? scenario?.frames ?? null;
    if (frames) {
        console.log(
            `frames count=${Number(frames.frameCount ?? 0)} avg=${round(Number(frames.avgFrameMs ?? 0))}ms p95=${round(Number(frames.p95FrameMs ?? 0))}ms max=${round(Number(frames.maxFrameMs ?? 0))}ms duration=${round(Number(frames.durationMs ?? 0))}ms`,
        );
        console.log(
            `warmup duration=${round(Number(frames.warmupDurationMs ?? 0))}ms frames=${Number(frames.warmupFrameCount ?? 0)} max=${round(Number(frames.warmupMaxFrameMs ?? 0))}ms over20=${Number(frames.warmupOver20MsCount ?? 0)}`,
        );
        console.log(
            `frameBudget=${round(Number(frames.frameBudgetMs ?? 0))}ms overBudget=${Number(frames.overBudgetCount ?? 0)} over20=${Number(frames.over20MsCount ?? 0)} over33=${Number(frames.over33MsCount ?? 0)}`,
        );
        const histogram = Array.isArray(frames.intervalHistogram)
            ? frames.intervalHistogram
            : [];
        if (histogram.length > 0) {
            console.log(
                `frame cadence dominant=${round(Number(frames.dominantIntervalMs ?? 0))}ms count=${Number(frames.dominantIntervalCount ?? 0)} share=${round(Number(frames.dominantIntervalShare ?? 0))} histogram=${histogram.map((entry: any) => `${round(Number(entry?.bucketMs ?? 0))}ms:${Number(entry?.count ?? 0)}`).join(",")}`,
            );
        }
        const framePacing = scenario?.analysis?.framePacing;
        if (framePacing) {
            const reasons = Array.isArray(framePacing?.reasons)
                ? framePacing.reasons.join(",")
                : "";
            console.log(
                `frame pacing=${String(framePacing?.classification ?? "unknown")} reasons=${reasons || "none"}`,
            );
        }
        const browserPerformance = frames.browserPerformance;
        if (browserPerformance) {
            const counts = Object.entries(
                browserPerformance?.observedEntryCounts ?? {},
            )
                .map(([name, count]) => `${name}:${Number(count ?? 0)}`)
                .join(",");
            console.log(
                `browser perf entries active=${Array.isArray(browserPerformance?.activeEntryTypes) ? browserPerformance.activeEntryTypes.join(",") || "none" : "none"} supported=${Array.isArray(browserPerformance?.supportedEntryTypes) ? browserPerformance.supportedEntryTypes.join(",") || "none" : "none"} counts=${counts || "none"}`,
            );
            const failures = Array.isArray(browserPerformance?.observerFailures)
                ? browserPerformance.observerFailures
                : [];
            if (failures.length > 0) {
                console.log(`browser perf observer failures=${failures.join(" | ")}`);
            }
        }
    }
    const longTasks = scenario?.perf?.longTasks;
    if (longTasks) {
        console.log(
            `longTasks count=${Number(longTasks.count ?? 0)} total=${round(Number(longTasks.totalMs ?? 0))}ms max=${round(Number(longTasks.maxMs ?? 0))}ms`,
        );
        const attributionGroups = Array.isArray(longTasks?.attributionGroups)
            ? longTasks.attributionGroups.slice(0, 4)
            : [];
        for (const group of attributionGroups) {
            console.log(
                `  - longTask ${String(group?.name ?? "unknown")} count=${Number(group?.count ?? 0)} total=${round(Number(group?.totalMs ?? 0))}ms max=${round(Number(group?.maxMs ?? 0))}ms`,
            );
        }
    }
    const longAnimationFrames = scenario?.perf?.longAnimationFrames;
    if (Number(longAnimationFrames?.count ?? 0) > 0) {
        console.log(
            `longAnimationFrames count=${Number(longAnimationFrames.count ?? 0)} blockingMax=${round(Number(longAnimationFrames?.blockingDuration?.maxMs ?? 0))}ms durationMax=${round(Number(longAnimationFrames?.duration?.maxMs ?? 0))}ms`,
        );
        const topScripts = Array.isArray(longAnimationFrames?.topScripts)
            ? longAnimationFrames.topScripts.slice(0, 4)
            : [];
        for (const script of topScripts) {
            console.log(
                `  - longFrameScript ${String(script?.scriptUrl ?? "unknown")} count=${Number(script?.count ?? 0)} total=${round(Number(script?.totalMs ?? 0))}ms max=${round(Number(script?.maxMs ?? 0))}ms`,
            );
        }
    }
    const frameSpikeDiagnostics =
        scenario?.perf?.frameSpikeDiagnostics
        ?? scenario?.analysis?.frameSpikeDiagnostics
        ?? null;
    const spikes = (frameSpikeDiagnostics?.spikes ?? []).slice(0, 4);
    if (spikes.length > 0) {
        console.log("frame spikes:");
        console.log(
            `  - unattributed avg=${round(Number(scenario?.perf?.frameSpikeDiagnostics?.avgUnattributedGapMs ?? 0))}ms max=${round(Number(scenario?.perf?.frameSpikeDiagnostics?.maxUnattributedGapMs ?? 0))}ms fullMisses=${Number(scenario?.perf?.frameSpikeDiagnostics?.fullyUnattributedSpikeCount ?? 0)}`,
        );
        for (const spike of spikes) {
            console.log(
                `  - #${Number(spike?.index ?? 0)} frame=${round(Number(spike?.frameMs ?? 0))}ms measured=${round(Number(spike?.measuredWorkMs ?? 0))}ms gap=${round(Number(spike?.unattributedGapMs ?? 0))}ms attribution=${String(spike?.attribution ?? "unknown")} window=${round(Number(spike?.startAtMs ?? 0))}-${round(Number(spike?.endAtMs ?? 0))}ms`,
            );
            const overlapMeasures = (spike?.overlappingMeasures ?? []).slice(0, 4);
            for (const measure of overlapMeasures) {
                console.log(
                    `    measure ${String(measure?.name ?? "unknown")} duration=${round(Number(measure?.durationMs ?? 0))}ms`,
                );
            }
            const overlapEvents = (spike?.overlappingBrowserEvents ?? []).slice(0, 3);
            for (const event of overlapEvents) {
                console.log(
                    `    event ${String(event?.name ?? "unknown")} duration=${round(Number(event?.durationMs ?? 0))}ms`,
                );
            }
        }
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
    const starVisualRedraws = scenario?.perf?.starVisualRedraws;
    if (starVisualRedraws) {
        const reasons = Array.isArray(starVisualRedraws?.reasons)
            ? starVisualRedraws.reasons
                  .map((entry: any) => `${String(entry?.reason ?? "unknown")}:${Number(entry?.count ?? 0)}`)
                  .join(",")
            : "";
        console.log(
            `star visual redraws events=${Number(starVisualRedraws?.eventCount ?? 0)} redraws=${Number(starVisualRedraws?.redrawCount ?? 0)} reasons=${reasons || "none"}`,
        );
    }
    const shipDiagnostics = scenario?.perf?.shipDiagnostics ?? scenario?.shipDiagnostics ?? null;
    if (shipDiagnostics) {
        console.log("ship diagnostics:");
        console.log(
            `  - policy=${String(shipDiagnostics?.visualPolicy ?? shipDiagnostics?.lodLevel ?? "unknown")} particles=${Number(shipDiagnostics?.usedParticles ?? 0)}`,
        );
        console.log(
            `  - active=${Number(shipDiagnostics?.totalActiveOrbitShips ?? 0)} travel=${Number(shipDiagnostics?.totalTravelingShips ?? 0)} damaged=${Number(shipDiagnostics?.totalDamagedShips ?? 0)} potentialVisuals=${Number(shipDiagnostics?.totalPotentialVisuals ?? shipDiagnostics?.totalVisualPressure ?? 0)}`,
        );
        console.log(
            `  - orbit base=${Number(shipDiagnostics?.baseOrbitVisuals ?? 0)} capPerStar=${Number(shipDiagnostics?.maxOrbitVisualsPerStar ?? 0)} rendered=${Number(shipDiagnostics?.renderedOrbitVisuals ?? 0)}`,
        );
        console.log(
            `  - damaged base=${Number(shipDiagnostics?.baseDamagedVisuals ?? 0)} capPerStar=${Number(shipDiagnostics?.maxDamagedVisualsPerStar ?? 0)} rendered=${Number(shipDiagnostics?.renderedDamagedVisuals ?? 0)}`,
        );
        console.log(
            `  - travel rendered=${Number(shipDiagnostics?.renderedTravelVisuals ?? 0)} groupedShips=${Number(shipDiagnostics?.groupedTravelShips ?? 0)} orbGroups=${Number(shipDiagnostics?.travelOrbGroupCount ?? 0)} totalRendered=${Number(shipDiagnostics?.totalRenderedVisuals ?? 0)}`,
        );
        console.log(
            `  - outline=${Boolean(shipDiagnostics?.outlineOn ?? shipDiagnostics?.effectiveOutlineOn)} glow=${Boolean(shipDiagnostics?.glowOn ?? shipDiagnostics?.effectiveGlowOn)}`,
        );
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
            `  - target synthetic dispatch=${round(Number(orderLatency?.pointerTargetPointerDownDispatchLead?.avgMs ?? 0))}ms browser-queue=${round(Number(orderLatency?.pointerTargetPointerDownQueueDelay?.avgMs ?? 0))}ms handled->local-confirmation=${round(Number(orderLatency?.pointerIssueHandledToLocalAcknowledgmentAfterTargetClick?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - target handled->visual-confirmation=${round(Number(orderLatency?.pointerIssueHandledToVisualAcknowledgmentAfterTargetClick?.avgMs ?? 0))}ms handled->commit=${round(Number(orderLatency?.pointerIssueHandledToCommitAfterTargetClick?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - issue local-confirmation=${round(Number(orderLatency?.pointerIssueLocalAcknowledgmentAfterTargetClick?.avgMs ?? 0))}ms visual-confirmation=${round(Number(orderLatency?.pointerIssueVisualAcknowledgmentAfterTargetClick?.avgMs ?? 0))}ms visual-gap=${round(Number(orderLatency?.pointerIssueLocalToVisualGapMs ?? 0))}ms`,
        );
        console.log(
            `  - pointer issue=${round(Number(orderLatency?.pointerIssueCommit?.avgMs ?? 0))}ms direct issue=${round(Number(orderLatency?.directIssueCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerVsDirectIssueGapMs ?? 0))}ms`,
        );
        console.log(
            `  - target-click issue=${round(Number(orderLatency?.pointerIssueAfterTargetClick?.avgMs ?? 0))}ms direct issue=${round(Number(orderLatency?.directIssueCommit?.avgMs ?? 0))}ms gap=${round(Number(orderLatency?.pointerTargetClickVsDirectIssueGapMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel local-confirmation=${round(Number(orderLatency?.pointerCancelLocalAcknowledgment?.avgMs ?? 0))}ms visual-confirmation=${round(Number(orderLatency?.pointerCancelVisualAcknowledgment?.avgMs ?? 0))}ms visual-gap=${round(Number(orderLatency?.pointerCancelLocalToVisualGapMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel handled down=${round(Number(orderLatency?.pointerCancelPointerDownHandled?.avgMs ?? 0))}ms up=${round(Number(orderLatency?.pointerCancelPointerUpHandled?.avgMs ?? 0))}ms rightclick=${round(Number(orderLatency?.pointerCancelContextMenuHandled?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel synthetic dispatch=${round(Number(orderLatency?.pointerCancelPointerDownDispatchLead?.avgMs ?? 0))}ms browser-queue=${round(Number(orderLatency?.pointerCancelPointerDownQueueDelay?.avgMs ?? 0))}ms rightclick-dispatch=${round(Number(orderLatency?.pointerCancelContextMenuDispatchLead?.avgMs ?? 0))}ms rightclick-queue=${round(Number(orderLatency?.pointerCancelContextMenuQueueDelay?.avgMs ?? 0))}ms handled->local-confirmation=${round(Number(orderLatency?.pointerCancelHandledToLocalAcknowledgment?.avgMs ?? 0))}ms`,
        );
        console.log(
            `  - cancel handled->visual-confirmation=${round(Number(orderLatency?.pointerCancelHandledToVisualAcknowledgment?.avgMs ?? 0))}ms handled->commit=${round(Number(orderLatency?.pointerCancelHandledToCommit?.avgMs ?? 0))}ms`,
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
        const geometryKeyCache = scheduler?.renderFamilyGeometryKeyCache;
        if (geometryKeyCache) {
            console.log(
                `  - geometry key cache hits=${Number(geometryKeyCache?.hitCount ?? 0)} misses=${Number(geometryKeyCache?.missCount ?? 0)} lastStars=${Number(geometryKeyCache?.lastStarCount ?? 0)} lastLanes=${Number(geometryKeyCache?.lastLaneCount ?? 0)}`,
            );
        }
        console.log(
            `  - orderQueue scheduleMode=${String(scheduler?.orders?.scheduleMode ?? "n/a")} queueDelay=${round(Number(scheduler?.orders?.lastQueueDelayMs ?? 0))}ms flushCount=${Number(scheduler?.orders?.lastQueueFlushMutationCount ?? 0)}`,
        );
        console.log(
            `  - interaction pendingVisualConfirmations=${Number(scheduler?.interactions?.pendingVisualAcknowledgmentCount ?? 0)} lastLocal=${String(scheduler?.interactions?.lastLocalAcknowledgment?.path ?? "n/a")} lastVisual=${String(scheduler?.interactions?.lastVisualAcknowledgment?.path ?? "n/a")}`,
        );
        const transitionReliability = scheduler?.transitionReliability;
        if (transitionReliability) {
            const fallbackReason =
                typeof transitionReliability?.fallbackReason === "string" &&
                transitionReliability.fallbackReason.length > 0
                    ? transitionReliability.fallbackReason
                    : "none";
            const messages = Array.isArray(transitionReliability?.messages)
                ? transitionReliability.messages.slice(0, 2).join(" | ")
                : "";
            console.log(
                `  - transition fallback=${fallbackReason} runtime=${round(Number(transitionReliability?.runtimeDurationMs ?? 0))}ms mode=${String(transitionReliability?.modeDiagnosticsKind ?? "n/a")} messages=${messages || "none"}`,
            );
        }
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
    if (scenario?.actionResult?.gameplayPrep) {
        console.log("gameplay prep:");
        console.log(
            `  - started=${String(scenario.actionResult.gameplayPrep?.started ?? false)} attempts=${Number(scenario.actionResult.gameplayPrep?.attempts ?? 0)} elapsedMs=${round(Number(scenario.actionResult.gameplayPrep?.elapsedMs ?? 0))} initialTick=${Number(scenario.actionResult.gameplayPrep?.initialTick ?? 0)} requiredTick=${Number(scenario.actionResult.gameplayPrep?.requiredTick ?? 0)}`,
        );
    }
    if (typeof scenario?.screenshotPath === "string" && scenario.screenshotPath.length > 0) {
        console.log(`screenshot=${scenario.screenshotPath}`);
    }
    const diagnosticAction = scenario?.actionResult;
    const diagnosticBundle = scenario?.actionResult?.diagnosticBundle;
    if (diagnosticBundle) {
        console.log("transition diagnostic:");
        console.log(
            `  - schema=${String(diagnosticBundle?.schemaVersion ?? "unknown")} conquest=${String(diagnosticBundle?.conquestId ?? "n/a")} target=${String(diagnosticBundle?.targetStarId ?? "n/a")}`,
        );
        const steps = Array.isArray(diagnosticBundle?.steps)
            ? diagnosticBundle.steps
            : [];
        const failingSteps = steps.filter((step: any) =>
            Array.isArray(step?.failIf)
                ? step.failIf.some((entry: any) => entry?.triggered === true)
                : false,
        );
        console.log(
            `  - steps=${steps.length} failing=${failingSteps.map((step: any) => String(step?.stepId ?? "?")).join(", ") || "none"}`,
        );
        const finalStep = steps.find((step: any) => String(step?.stepId ?? "") === "R04");
        if (finalStep?.text) {
            console.log(
                `  - finalCompare withinTolerance=${String(finalStep.text?.withinTolerance ?? "n/a")} changedPixels=${Number(finalStep.text?.changedPixels ?? 0)} maxChannelDiff=${round(Number(finalStep.text?.maxChannelDiff ?? 0))}`,
            );
        }
    } else if (
        diagnosticAction
        && Object.prototype.hasOwnProperty.call(diagnosticAction, "issued")
    ) {
        console.log("transition diagnostic:");
        console.log(
            `  - status=missing_bundle issued=${String(diagnosticAction?.issued ?? false)} matched=${String(diagnosticAction?.bundleWait?.matched ?? false)} bundleCount=${Number(diagnosticAction?.recorderSummary?.bundleCount ?? 0)}`,
        );
    }
}

function main(): void {
    if (!existsSync(INPUT_PATH)) {
        throw new Error(`Missing benchmark artifact: ${INPUT_PATH}`);
    }
    const report = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
    console.log(`artifact=${INPUT_PATH}`);
    console.log(`generatedAt=${String(report?.generatedAt ?? "unknown")}`);
    if (report?.savedMapWait) {
        console.log(
            `savedMapWait ready=${String(report.savedMapWait?.ready ?? false)} count=${Number(report.savedMapWait?.count ?? 0)} elapsedMs=${round(Number(report.savedMapWait?.elapsedMs ?? 0))}`,
        );
    }
    if (report?.benchmarkTarget) {
        console.log(
            `benchmarkTarget map=${String(report.benchmarkTarget?.resolvedMapName ?? "none")} stars=${Number(report.benchmarkTarget?.starCount ?? 0)} lanes=${Number(report.benchmarkTarget?.laneCount ?? 0)} runtimeConnections=${Number(report.benchmarkTarget?.runtimeConnectionCount ?? 0)} reason=${String(report.benchmarkTarget?.selectionReason ?? "unknown")}`,
        );
    }
    if (report?.captureConfig) {
        console.log(
            `captureConfig trace=${String(report.captureConfig?.trace ?? false)} cpu=${String(report.captureConfig?.cpu ?? false)} warmupMs=${round(Number(report.captureConfig?.frameWarmupMs ?? 0))} gameplayFrameMs=${round(Number(report.captureConfig?.gameplayFrameMs ?? 0))}`,
        );
    }
    if (report?.analysis) {
        const transitionFallbackReasonCounts = Array.isArray(
            report.analysis?.transitionFallbackReasonCounts,
        )
            ? report.analysis.transitionFallbackReasonCounts
            : [];
        const reasons =
            transitionFallbackReasonCounts
                .map(formatInvalidReason)
                .join(", ") || "none";
        console.log(
            `transitionFallbacks scenarios=${Number(report.analysis?.transitionFallbackScenarioCount ?? 0)} reasons=${reasons}`,
        );
    }
    if (typeof report?.scenarioScreenshotDir === "string" && report.scenarioScreenshotDir.length > 0) {
        console.log(`scenarioScreenshotDir=${report.scenarioScreenshotDir}`);
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
