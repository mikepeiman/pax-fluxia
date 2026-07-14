import { describe, it, expect, vi } from "vitest";
import {
    createTerritoryPresentationQueue,
    type TerritoryPresentationQueue,
    type TerritoryPresentationQueueRequest,
} from "./territoryPresentationQueue";

function makeQueue() {
    const logGridGradientTransition = vi.fn();
    const queue = createTerritoryPresentationQueue({
        logGridGradientTransition,
        runTerritoryUpdate: (_label, fn) => fn(),
    });
    return { queue, logGridGradientTransition };
}

function request(
    signature: string,
    run: () => void,
    activeMode = "power_vector",
): TerritoryPresentationQueueRequest {
    return {
        signature,
        activeMode,
        isPaused: false,
        stars: [],
        pendingConquests: [],
        run,
        territoryScheduler: { cadenceMs: 0, staleMs: 0, reason: "test" },
    };
}

/** Telemetry field read back by name, as the benchmark bridge does. */
function tel(queue: TerritoryPresentationQueue, key: string) {
    return queue.getTelemetry()[key];
}

describe("territoryPresentationQueue", () => {
    describe("commit", () => {
        it("commits a queued present immediately", () => {
            const { queue } = makeQueue();
            const run = vi.fn();
            queue.queue(request("sig-a", run));
            expect(run).toHaveBeenCalledTimes(1);
            expect(tel(queue, "territoryPresentationCompletedCount")).toBe(1);
        });

        it("records the committed signature", () => {
            const { queue } = makeQueue();
            expect(queue.getLastCommittedSignature()).toBe("");
            queue.queue(request("sig-a", () => {}));
            expect(queue.getLastCommittedSignature()).toBe("sig-a");
        });

        it("holds no pending request once the flush drains", () => {
            const { queue } = makeQueue();
            queue.queue(request("sig-a", () => {}));
            expect(queue.getPendingSignature()).toBeNull();
        });

        it("runs the commit through runTerritoryUpdate so cost telemetry sees it", () => {
            // Kept generic (not vi.fn()) so it still satisfies the dep's
            // <T>(label, fn: () => T) => T signature.
            const labels: string[] = [];
            const queue = createTerritoryPresentationQueue({
                logGridGradientTransition: vi.fn(),
                runTerritoryUpdate: <T,>(label: string, fn: () => T): T => {
                    labels.push(label);
                    return fn();
                },
            });
            queue.queue(request("sig-a", () => {}, "grid_gradient"));
            expect(labels).toHaveLength(1);
            expect(labels[0]).toContain("grid_gradient");
        });
    });

    describe("coalescing", () => {
        // The flush is synchronous, so a request only finds a pending one when
        // queue() is re-entered from inside a commit — which is exactly when
        // coalescing matters: the in-flight present must not be starved by a
        // burst, and only the newest state should land.
        it("dedupes a re-entrant request with the same signature", () => {
            const { queue } = makeQueue();
            const inner = vi.fn();
            let reentered = false;

            queue.queue(
                request("outer", () => {
                    if (reentered) return;
                    reentered = true;
                    queue.queue(request("same", inner));
                    queue.queue(request("same", inner)); // duplicate -> dropped
                }),
            );

            expect(tel(queue, "territoryPresentationDedupedCount")).toBe(1);
            expect(inner).toHaveBeenCalledTimes(1);
        });

        it("supersedes a re-entrant request with a different signature", () => {
            const { queue } = makeQueue();
            const stale = vi.fn();
            const fresh = vi.fn();
            let reentered = false;

            queue.queue(
                request("outer", () => {
                    if (reentered) return;
                    reentered = true;
                    queue.queue(request("stale", stale));
                    queue.queue(request("fresh", fresh));
                }),
            );

            // The superseded request must never run — presenting it would draw
            // a state that is already known to be out of date.
            expect(tel(queue, "territoryPresentationSupersededCount")).toBe(1);
            expect(stale).not.toHaveBeenCalled();
            expect(fresh).toHaveBeenCalledTimes(1);
            expect(queue.getLastCommittedSignature()).toBe("fresh");
        });

        it("drains a re-entrant request after the in-flight commit, not during", () => {
            const { queue } = makeQueue();
            const order: string[] = [];
            let reentered = false;

            queue.queue(
                request("first", () => {
                    order.push("first:start");
                    if (!reentered) {
                        reentered = true;
                        queue.queue(request("second", () => order.push("second")));
                    }
                    order.push("first:end");
                }),
            );

            expect(order).toEqual(["first:start", "first:end", "second"]);
        });
    });

    describe("lifecycle", () => {
        it("abort drops the pending request without committing it", () => {
            const { queue } = makeQueue();
            const dropped = vi.fn();
            let reentered = false;

            queue.queue(
                request("outer", () => {
                    if (reentered) return;
                    reentered = true;
                    queue.queue(request("pending", dropped));
                    queue.abort();
                }),
            );

            expect(dropped).not.toHaveBeenCalled();
            expect(queue.getPendingSignature()).toBeNull();
        });

        it("reset clears telemetry and the committed signature", () => {
            const { queue } = makeQueue();
            queue.queue(request("sig-a", () => {}));
            expect(tel(queue, "territoryPresentationCompletedCount")).toBe(1);

            queue.reset();
            expect(tel(queue, "territoryPresentationCompletedCount")).toBe(0);
            expect(tel(queue, "territoryPresentationLastRequestId")).toBe(0);
            expect(queue.getLastCommittedSignature()).toBe("");
        });

        it("request ids keep increasing across commits", () => {
            const { queue } = makeQueue();
            queue.queue(request("a", () => {}));
            const first = tel(queue, "territoryPresentationLastRequestId");
            queue.queue(request("b", () => {}));
            const second = tel(queue, "territoryPresentationLastRequestId");
            expect(Number(second)).toBeGreaterThan(Number(first));
        });
    });

    describe("trace logging", () => {
        it("traces grid_gradient presents", () => {
            const { queue, logGridGradientTransition } = makeQueue();
            queue.queue(request("sig", () => {}, "grid_gradient"));
            expect(logGridGradientTransition).toHaveBeenCalled();
        });

        it("stays silent for other modes", () => {
            const { queue, logGridGradientTransition } = makeQueue();
            queue.queue(request("sig", () => {}, "power_vector"));
            expect(logGridGradientTransition).not.toHaveBeenCalled();
        });
    });

    describe("telemetry contract", () => {
        // The release benchmark tools read these by name; dropping one silently
        // degrades their reports rather than failing loudly.
        it("exposes every field the benchmark snapshot reports", () => {
            const { queue } = makeQueue();
            const keys = Object.keys(queue.getTelemetry());
            for (const key of [
                "territoryPresentationScheduled",
                "territoryPresentationRunning",
                "territoryPresentationPostedCount",
                "territoryPresentationCompletedCount",
                "territoryPresentationSupersededCount",
                "territoryPresentationDedupedCount",
                "territoryPresentationLastQueuedAtMs",
                "territoryPresentationLastStartedAtMs",
                "territoryPresentationLastFinishedAtMs",
                "territoryPresentationLastQueueWaitMs",
                "territoryPresentationLastCommitLagMs",
                "territoryPresentationLastRequestId",
                "territoryPresentationYieldCount",
                "territoryPresentationForcedCount",
                "territoryPresentationLastYieldAtMs",
                "territoryPresentationLastYieldAgeMs",
                "territoryPresentationLastYieldRequestId",
                "territoryPresentationLastYieldReason",
                "territoryPresentationLastScheduleMode",
                "territoryPresentationPendingRequestId",
                "territoryPresentationPendingMode",
                "territoryPresentationPendingAgeMs",
            ]) {
                expect(keys).toContain(key);
            }
        });

        it("pins the vestigial yield fields as always-zero", () => {
            // The deferred/yield path was removed; these survive only because the
            // benchmark tools read them. If a yielding path is ever restored,
            // this test should fail and be deleted deliberately.
            const { queue } = makeQueue();
            queue.queue(request("sig-a", () => {}));
            expect(tel(queue, "territoryPresentationYieldCount")).toBe(0);
            expect(tel(queue, "territoryPresentationPostedCount")).toBe(0);
            expect(tel(queue, "territoryPresentationScheduled")).toBe(false);
            expect(tel(queue, "territoryPresentationLastYieldReason")).toBe("");
        });
    });
});
