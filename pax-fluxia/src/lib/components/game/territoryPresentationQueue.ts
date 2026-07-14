/**
 * Territory presentation queue — holds at most ONE pending territory present
 * and commits it, collapsing redundant requests.
 *
 * Two coalescing rules, both load-bearing:
 *  - a request with the SAME signature as the pending one is deduped (dropped)
 *  - a request with a different signature REPLACES the pending one (supersedes),
 *    so a burst of ticks presents once, at the newest state.
 *
 * Extracted from GameCanvas.svelte (Stage 5), with its telemetry — the counters
 * belong to the scheduler that moves them, not to the component.
 *
 * VESTIGIAL FIELDS: this queue once had a deferred/yielding path (background
 * postTask scheduling); it now always flushes immediately. The yield/posted
 * counters and `scheduled` survive as always-0/false because the release
 * benchmark tools read them by name (tools/debug/benchmark-browser-gameplay.ts,
 * tools/debug/review-release-gameplay-benchmark.ts). They are reported as-is
 * rather than silently dropped — see the plan's Stage 5 notes.
 */
import type { StarState } from "$lib/types/game.types";
import { measurePerf } from "$lib/perf/perfProbe";

export type TerritoryPresentationRequest = {
    requestId: number;
    enqueuedAtMs: number;
    signature: string;
    activeMode: string;
    isPaused: boolean;
    stars: StarState[];
    pendingConquests: readonly import("@pax/common").ConquestEvent[];
    run: () => void;
    territoryScheduler: {
        cadenceMs: number;
        staleMs: number;
        reason: string;
    };
};

export type TerritoryPresentationQueueRequest = Omit<
    TerritoryPresentationRequest,
    "requestId" | "enqueuedAtMs"
>;

export interface TerritoryPresentationQueueDeps {
    /** grid_gradient transition trace; called only for that mode. */
    logGridGradientTransition: (
        stage: string,
        data: Record<string, unknown>,
    ) => void;
    /** Wraps the commit so territory-update cost/cadence telemetry sees it. */
    runTerritoryUpdate: <T>(label: string, fn: () => T) => T;
}

export interface TerritoryPresentationQueue {
    /** Enqueue a present; dedupes or supersedes the pending one, then flushes. */
    queue: (request: TerritoryPresentationQueueRequest) => void;
    getPendingSignature: () => string | null;
    getLastCommittedSignature: () => string;
    /** Drop the pending request without committing it (teardown). */
    abort: () => void;
    /** Full reset including telemetry (new game session). */
    reset: () => void;
    /** The fields the benchmark scheduler snapshot reports. */
    getTelemetry: () => Record<string, unknown>;
}

export function createTerritoryPresentationQueue(
    deps: TerritoryPresentationQueueDeps,
): TerritoryPresentationQueue {
    let scheduled = false;
    let running = false;
    let requestSeq = 0;
    let postedCount = 0;
    let completedCount = 0;
    let supersededCount = 0;
    let dedupedCount = 0;
    let lastQueuedAtMs = 0;
    let lastStartedAtMs = 0;
    let lastFinishedAtMs = 0;
    let lastQueueWaitMs = 0;
    let lastCommitLagMs = 0;
    let lastRequestId = 0;
    let yieldCount = 0;
    let forcedCount = 0;
    let lastYieldAtMs = 0;
    let lastYieldAgeMs = 0;
    let lastYieldRequestId = 0;
    let lastYieldReason = "";
    let lastScheduleMode = "";
    let lastCommittedSignature = "";
    let pendingRequest: TerritoryPresentationRequest | null = null;

    function schedule(): void {
        if (scheduled || running) return;
        if (!pendingRequest) return;
        lastScheduleMode = "immediate";
        void flush();
    }

    async function flush(): Promise<void> {
        if (running) return;
        scheduled = false;
        if (!pendingRequest) return;
        running = true;
        try {
            while (pendingRequest) {
                const request = pendingRequest;
                if (request.activeMode === "grid_gradient") {
                    deps.logGridGradientTransition(
                        "presentation_queue.decision",
                        {
                            requestId: request.requestId,
                            activeMode: request.activeMode,
                            signature: request.signature,
                            requestAgeMs:
                                performance.now() - request.enqueuedAtMs,
                            yield: false,
                            forced: true,
                            reason: "immediate",
                            pendingConquestCount:
                                request.pendingConquests.length,
                            territoryScheduler: request.territoryScheduler,
                        },
                    );
                }
                pendingRequest = null;
                lastRequestId = request.requestId;
                lastStartedAtMs = performance.now();
                lastQueueWaitMs = lastStartedAtMs - request.enqueuedAtMs;
                forcedCount += 1;

                deps.runTerritoryUpdate(
                    `game.renderFrame.territory.${request.activeMode}`,
                    () => {
                        measurePerf(
                            `game.renderFrame.territory.present.${request.activeMode}`,
                            () => {
                                request.run();
                            },
                        );
                    },
                );
                lastCommittedSignature = request.signature;
                lastFinishedAtMs = performance.now();
                lastCommitLagMs = lastFinishedAtMs - request.enqueuedAtMs;
                completedCount += 1;
            }
        } finally {
            running = false;
            if (pendingRequest && !scheduled) {
                schedule();
            }
        }
    }

    return {
        queue: (request) => {
            const nextRequest: TerritoryPresentationRequest = {
                requestId: requestSeq + 1,
                enqueuedAtMs: performance.now(),
                signature: request.signature,
                activeMode: request.activeMode,
                isPaused: request.isPaused,
                stars: request.stars,
                pendingConquests: request.pendingConquests,
                run: request.run,
                territoryScheduler: request.territoryScheduler,
            };
            if (nextRequest.activeMode === "grid_gradient") {
                deps.logGridGradientTransition(
                    "presentation_queue.enqueue_attempt",
                    {
                        requestId: nextRequest.requestId,
                        signature: nextRequest.signature,
                        hasExistingPending: Boolean(pendingRequest),
                        existingPendingSignature:
                            pendingRequest?.signature ?? null,
                        pendingConquestCount:
                            nextRequest.pendingConquests.length,
                        territoryScheduler: nextRequest.territoryScheduler,
                    },
                );
            }
            if (
                pendingRequest &&
                pendingRequest.signature === nextRequest.signature
            ) {
                if (nextRequest.activeMode === "grid_gradient") {
                    deps.logGridGradientTransition(
                        "presentation_queue.deduped",
                        {
                            requestId: nextRequest.requestId,
                            pendingRequestId: pendingRequest.requestId,
                            signature: nextRequest.signature,
                        },
                    );
                }
                dedupedCount += 1;
                return;
            }
            requestSeq = nextRequest.requestId;
            lastQueuedAtMs = nextRequest.enqueuedAtMs;
            if (pendingRequest) {
                if (nextRequest.activeMode === "grid_gradient") {
                    deps.logGridGradientTransition(
                        "presentation_queue.replace_pending",
                        {
                            replacedRequestId: pendingRequest.requestId,
                            nextRequestId: nextRequest.requestId,
                            replacedSignature: pendingRequest.signature,
                            nextSignature: nextRequest.signature,
                        },
                    );
                }
                supersededCount += 1;
            }
            pendingRequest = nextRequest;
            schedule();
        },

        getPendingSignature: () => pendingRequest?.signature ?? null,
        getLastCommittedSignature: () => lastCommittedSignature,

        abort: () => {
            scheduled = false;
            running = false;
            pendingRequest = null;
        },

        reset: () => {
            scheduled = false;
            running = false;
            requestSeq = 0;
            postedCount = 0;
            completedCount = 0;
            supersededCount = 0;
            dedupedCount = 0;
            lastQueuedAtMs = 0;
            lastStartedAtMs = 0;
            lastFinishedAtMs = 0;
            lastQueueWaitMs = 0;
            lastCommitLagMs = 0;
            lastRequestId = 0;
            yieldCount = 0;
            forcedCount = 0;
            lastYieldAtMs = 0;
            lastYieldAgeMs = 0;
            lastYieldRequestId = 0;
            lastYieldReason = "";
            lastScheduleMode = "";
            lastCommittedSignature = "";
            pendingRequest = null;
        },

        getTelemetry: () => ({
            territoryPresentationScheduled: scheduled,
            territoryPresentationRunning: running,
            territoryPresentationPostedCount: postedCount,
            territoryPresentationCompletedCount: completedCount,
            territoryPresentationSupersededCount: supersededCount,
            territoryPresentationDedupedCount: dedupedCount,
            territoryPresentationLastQueuedAtMs: lastQueuedAtMs,
            territoryPresentationLastStartedAtMs: lastStartedAtMs,
            territoryPresentationLastFinishedAtMs: lastFinishedAtMs,
            territoryPresentationLastQueueWaitMs: lastQueueWaitMs,
            territoryPresentationLastCommitLagMs: lastCommitLagMs,
            territoryPresentationLastRequestId: lastRequestId,
            territoryPresentationYieldCount: yieldCount,
            territoryPresentationForcedCount: forcedCount,
            territoryPresentationLastYieldAtMs: lastYieldAtMs,
            territoryPresentationLastYieldAgeMs: lastYieldAgeMs,
            territoryPresentationLastYieldRequestId: lastYieldRequestId,
            territoryPresentationLastYieldReason: lastYieldReason,
            territoryPresentationLastScheduleMode: lastScheduleMode,
            territoryPresentationPendingRequestId: pendingRequest?.requestId ?? null,
            territoryPresentationPendingMode: pendingRequest?.activeMode ?? null,
            territoryPresentationPendingAgeMs: pendingRequest
                ? performance.now() - pendingRequest.enqueuedAtMs
                : 0,
        }),
    };
}
