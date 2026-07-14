/**
 * Order mutation queue + interaction visual acknowledgment.
 *
 * Two coupled jobs, which is why they live together:
 *
 * 1. DISPATCH. Order mutations (issue/cancel/defer) are batched off the pointer
 *    event and flushed on the earliest available high-priority task, so a click
 *    never pays for the store write inside the input handler. Dispatch falls
 *    back scheduler.postTask -> MessageChannel -> setTimeout(0).
 *
 * 2. ACKNOWLEDGMENT. The UI paints the order optimistically before the store
 *    confirms it. Each local action queues an acknowledgment, and the
 *    acknowledgment is only retired once the overlay has actually drawn a frame
 *    in which that order is VISIBLE — that is what isVisible() checks. This is
 *    how "the arrow appeared" is measured rather than assumed.
 *
 * Reads interaction state (selection, the optimistic order sets) through a
 * snapshot; never writes it. The pointer handlers remain the single writer.
 *
 * Extracted from GameCanvas.svelte (Stage 5).
 */
import { measurePerf } from "$lib/perf/perfProbe";
import type { StarState } from "$lib/types/game.types";

export type QueuedOrderMutation =
    | {
          kind: "issue";
          sourceId: string;
          targetId: string;
          persist: boolean;
          requestId: number;
          enqueuedAtMs: number;
          path: string;
      }
    | {
          kind: "cancel";
          starId: string;
          requestId: number;
          enqueuedAtMs: number;
          path: string;
      }
    | {
          kind: "defer";
          sourceId: string;
          targetId: string;
          persist: boolean;
          requestId: number;
          enqueuedAtMs: number;
          path: string;
      };

export type OrderDispatchMode = "queued" | "immediate";

export type InteractionVisualAcknowledgmentKind =
    | "issue"
    | "defer"
    | "cancel"
    | "select"
    | "clear";

export interface PendingInteractionVisualAcknowledgment {
    requestId: number;
    kind: InteractionVisualAcknowledgmentKind;
    path: string;
    sourceId: string | null;
    targetId: string | null;
    activeStarId: string | null;
    recordedAtMs: number;
}

export type EnqueueableOrderMutation =
    | Omit<
          Extract<QueuedOrderMutation, { kind: "issue" }>,
          "requestId" | "enqueuedAtMs"
      >
    | Omit<
          Extract<QueuedOrderMutation, { kind: "cancel" }>,
          "requestId" | "enqueuedAtMs"
      >
    | Omit<
          Extract<QueuedOrderMutation, { kind: "defer" }>,
          "requestId" | "enqueuedAtMs"
      >;

type BackgroundTaskScheduler = {
    postTask?: (
        callback: () => void | Promise<void>,
        options?: { priority?: "user-blocking" | "user-visible" | "background" },
    ) => Promise<void>;
};

/** What the queue reads about the current interaction. Read-only. */
export interface OrderQueueInteractionSnapshot {
    activeStarId: string | null;
    dragSourceId: string | null;
    pendingOrders: ReadonlySet<string>;
    deferredOrders: ReadonlySet<string>;
}

/**
 * The sink a flushed order mutation is applied to (the game store in the app).
 * Injected rather than imported: importing the store module directly pulls the
 * whole game state — and localStorage — in at module load, which made this queue
 * impossible to test in isolation.
 */
export interface OrderMutationStore {
    issueOrder: (sourceId: string, targetId: string, persist: boolean) => void;
    cancelOrder: (starId: string) => void;
    setDeferredOrder: (sourceId: string, targetId: string, persist: boolean) => void;
}

export interface OrderMutationQueueDeps {
    store: OrderMutationStore;
    getInteraction: () => OrderQueueInteractionSnapshot;
    getStarById: (starId: string) => StarState | null;
    /** Stars currently in play; an empty map means nothing can be drawn yet. */
    ensureStarCount: () => number;
    /** Draw the overlay now; returns true if a frame was actually painted. */
    renderOverlayNow: () => boolean;
    /** Bias the render loop toward input responsiveness for a window. */
    noteInteractivePressure: (reason: string, windowMs: number) => void;
    orderMutationPriorityWindowMs: number;
}

export interface OrderMutationQueue {
    /** Dispatch an order mutation. Returns its request id. */
    enqueue: (
        mutation: EnqueueableOrderMutation,
        dispatchMode?: OrderDispatchMode,
    ) => number;
    /** Record a local (optimistic) action and try to retire it immediately. */
    recordLocalAcknowledgment: (params: {
        kind: InteractionVisualAcknowledgmentKind;
        path: string;
        sourceId?: string | null;
        targetId?: string | null;
        activeStarId?: string | null;
        requestId?: number;
        dispatchMode?: OrderDispatchMode;
        extra?: Record<string, unknown>;
    }) => number;
    /** Retire any acknowledgment now visible. Called once per rendered frame. */
    flushAcknowledgments: () => void;
    /**
     * The order target the player should currently SEE for this star: the
     * newest queued mutation if one is in flight, else the store's own state.
     * Queued state wins so the UI never flickers back to a stale target.
     */
    getVisibleOrderTargetId: (sourceId: string) => string | null;
    hasQueuedOrderEntryForSource: (sourceId: string) => boolean;
    getTelemetry: () => Record<string, unknown>;
    /**
     * New game session: drop queued mutations, pending acknowledgments, the
     * dispatch flag, the request sequence and the telemetry.
     *
     * Clearing the acknowledgments matters. An acknowledgment retires only when
     * a painted frame satisfies it, so one carried across a session boundary
     * describes an action in a game that no longer exists and can never be
     * retired: it is re-checked on every frame forever, keeps the pending list
     * permanently non-empty in telemetry, and — because star ids can recur in a
     * later session — risks matching by coincidence and committing a visual-lag
     * measurement spanning the whole gap between sessions.
     */
    reset: () => void;
    resetTelemetry: () => void;
}

/** Drop every `${sourceId}|*` key from an optimistic-order set, in place. */
export function removeQueuedOrderEntriesFromSource(
    sourceId: string,
    collection: Set<string>,
): void {
    for (const key of collection) {
        if (key.startsWith(`${sourceId}|`)) {
            collection.delete(key);
        }
    }
}

export function createOrderMutationQueue(
    deps: OrderMutationQueueDeps,
): OrderMutationQueue {
    const queuedOrderMutations: QueuedOrderMutation[] = [];
    const orderDispatchChannel =
        typeof MessageChannel !== "undefined" ? new MessageChannel() : null;
    const pendingAcknowledgments: PendingInteractionVisualAcknowledgment[] = [];

    let orderDispatchScheduled = false;
    let orderMutationRequestSeq = 0;
    let lastOrderMutationQueuedAtMs = 0;
    let lastOrderMutationQueueDelayMs = 0;
    let lastOrderQueueScheduleAtMs = 0;
    let lastOrderQueueFlushStartedAtMs = 0;
    let lastOrderQueueFlushFinishedAtMs = 0;
    let lastOrderQueueFlushMutationCount = 0;
    let lastOrderQueueFlushKinds: string[] = [];
    let lastOrderQueueFlushRequestIds: number[] = [];
    let lastOrderQueueScheduleMode = "";
    let lastInteractionLocalAcknowledgment: Record<string, unknown> | null = null;
    let lastInteractionVisualAcknowledgment: Record<string, unknown> | null = null;

    function nextRequestId(): number {
        orderMutationRequestSeq += 1;
        return orderMutationRequestSeq;
    }

    function resetTelemetryFields(): void {
        lastOrderMutationQueuedAtMs = 0;
        lastOrderMutationQueueDelayMs = 0;
        lastOrderQueueScheduleAtMs = 0;
        lastOrderQueueFlushStartedAtMs = 0;
        lastOrderQueueFlushFinishedAtMs = 0;
        lastOrderQueueFlushMutationCount = 0;
        lastOrderQueueFlushKinds = [];
        lastOrderQueueFlushRequestIds = [];
        lastOrderQueueScheduleMode = "";
    }

    function getTaskScheduler(): BackgroundTaskScheduler | null {
        const scheduler = (globalThis as { scheduler?: BackgroundTaskScheduler })
            .scheduler;
        if (scheduler?.postTask) return scheduler;
        return null;
    }

    function hasQueuedOrderEntryForSource(sourceId: string): boolean {
        const { pendingOrders, deferredOrders } = deps.getInteraction();
        for (const key of pendingOrders) {
            if (key.startsWith(`${sourceId}|`)) return true;
        }
        for (const key of deferredOrders) {
            if (key.startsWith(`${sourceId}|`)) return true;
        }
        return false;
    }

    /** undefined = no queued mutation for this source; null = a queued cancel. */
    function getQueuedVisibleOrderTargetId(
        sourceId: string,
    ): string | null | undefined {
        for (let index = queuedOrderMutations.length - 1; index >= 0; index -= 1) {
            const mutation = queuedOrderMutations[index]!;
            switch (mutation.kind) {
                case "cancel":
                    if (mutation.starId === sourceId) return null;
                    break;
                case "issue":
                case "defer":
                    if (mutation.sourceId === sourceId) return mutation.targetId;
                    break;
            }
        }
        return undefined;
    }

    function getVisibleOrderTargetId(sourceId: string): string | null {
        const queuedTargetId = getQueuedVisibleOrderTargetId(sourceId);
        if (queuedTargetId !== undefined) return queuedTargetId;
        const sourceStar = deps.getStarById(sourceId) as
            | (StarState & {
                  targetId?: string | null;
                  queuedOrderTargetId?: string | null;
              })
            | null;
        return sourceStar?.queuedOrderTargetId ?? sourceStar?.targetId ?? null;
    }

    function queueAcknowledgment(
        acknowledgment: Omit<
            PendingInteractionVisualAcknowledgment,
            "requestId" | "recordedAtMs"
        > & { requestId?: number },
    ): number {
        const requestId = acknowledgment.requestId ?? nextRequestId();
        pendingAcknowledgments.push({
            ...acknowledgment,
            requestId,
            recordedAtMs: performance.now(),
        });
        return requestId;
    }

    /** Has the painted frame caught up with what this acknowledgment claimed? */
    function isVisible(
        acknowledgment: PendingInteractionVisualAcknowledgment,
    ): boolean {
        const { activeStarId, pendingOrders, deferredOrders } =
            deps.getInteraction();
        const orderKey =
            acknowledgment.sourceId && acknowledgment.targetId
                ? `${acknowledgment.sourceId}|${acknowledgment.targetId}`
                : null;
        if (acknowledgment.kind === "issue") {
            const visibleTargetId = acknowledgment.sourceId
                ? getVisibleOrderTargetId(acknowledgment.sourceId)
                : null;
            return Boolean(
                (orderKey && pendingOrders.has(orderKey)) ||
                    (acknowledgment.targetId &&
                        visibleTargetId === acknowledgment.targetId),
            );
        }
        if (acknowledgment.kind === "defer") {
            return Boolean(orderKey && deferredOrders.has(orderKey));
        }
        if (acknowledgment.kind === "cancel") {
            const visibleTargetId = acknowledgment.sourceId
                ? getVisibleOrderTargetId(acknowledgment.sourceId)
                : null;
            return Boolean(
                acknowledgment.sourceId &&
                    !hasQueuedOrderEntryForSource(acknowledgment.sourceId) &&
                    !visibleTargetId,
            );
        }
        return activeStarId === acknowledgment.activeStarId;
    }

    function commit(
        acknowledgment: PendingInteractionVisualAcknowledgment,
        reason: "immediate" | "frame",
    ): void {
        const nowMs = performance.now();
        const { pendingOrders, deferredOrders } = deps.getInteraction();
        lastInteractionVisualAcknowledgment = {
            atMs: nowMs,
            requestId: acknowledgment.requestId,
            kind: acknowledgment.kind,
            path: acknowledgment.path,
            sourceId: acknowledgment.sourceId,
            targetId: acknowledgment.targetId,
            activeStarId: acknowledgment.activeStarId,
            pendingOrders: pendingOrders.size,
            deferredOrders: deferredOrders.size,
            visualLagMs: nowMs - acknowledgment.recordedAtMs,
            reason,
        };
    }

    /** Retire every acknowledgment the current frame already satisfies. */
    function retireVisible(reason: "immediate" | "frame"): void {
        for (let index = pendingAcknowledgments.length - 1; index >= 0; index -= 1) {
            const acknowledgment = pendingAcknowledgments[index]!;
            if (!isVisible(acknowledgment)) continue;
            commit(acknowledgment, reason);
            pendingAcknowledgments.splice(index, 1);
        }
    }

    function presentVisualStateNow(): boolean {
        if (deps.ensureStarCount() === 0) return false;
        const interaction = deps.getInteraction();
        measurePerf(
            "game.input.visualAcknowledgment.present",
            () => {
                deps.renderOverlayNow();
            },
            {
                pendingOrders: interaction.pendingOrders.size,
                deferredOrders: interaction.deferredOrders.size,
                activeStarId: interaction.activeStarId,
                dragSourceId: interaction.dragSourceId,
            },
        );
        return true;
    }

    function applyOrderMutation(mutation: QueuedOrderMutation): void {
        switch (mutation.kind) {
            case "issue":
                deps.store.issueOrder(
                    mutation.sourceId,
                    mutation.targetId,
                    mutation.persist,
                );
                break;
            case "cancel":
                deps.store.cancelOrder(mutation.starId);
                break;
            case "defer":
                deps.store.setDeferredOrder(
                    mutation.sourceId,
                    mutation.targetId,
                    mutation.persist,
                );
                break;
        }
    }

    function flushQueuedOrderMutations(): void {
        if (queuedOrderMutations.length === 0) {
            orderDispatchScheduled = false;
            return;
        }
        orderDispatchScheduled = false;
        const mutations = queuedOrderMutations.splice(0);
        lastOrderQueueFlushStartedAtMs = performance.now();
        lastOrderMutationQueueDelayMs = Math.max(
            0,
            lastOrderQueueFlushStartedAtMs -
                Math.min(...mutations.map((mutation) => mutation.enqueuedAtMs)),
        );
        lastOrderQueueFlushRequestIds = mutations.map(
            (mutation) => mutation.requestId,
        );
        lastOrderQueueFlushKinds = mutations.map((mutation) => mutation.kind);
        deps.noteInteractivePressure(
            "orderQueueFlush",
            deps.orderMutationPriorityWindowMs,
        );
        measurePerf(
            "game.input.orderQueue.flush",
            () => {
                for (const mutation of mutations) {
                    applyOrderMutation(mutation);
                }
            },
            {
                mutationCount: mutations.length,
                kinds: mutations.map((mutation) => mutation.kind),
                requestIds: mutations.map((mutation) => mutation.requestId),
            },
        );
        lastOrderQueueFlushFinishedAtMs = performance.now();
        lastOrderQueueFlushMutationCount = mutations.length;
    }

    function scheduleQueuedOrderMutations(): void {
        if (orderDispatchScheduled) return;
        orderDispatchScheduled = true;
        lastOrderQueueScheduleAtMs = performance.now();

        const scheduler = getTaskScheduler();
        if (scheduler?.postTask) {
            lastOrderQueueScheduleMode = "scheduler-user-blocking";
            void scheduler
                .postTask(
                    () => {
                        flushQueuedOrderMutations();
                    },
                    { priority: "user-blocking" },
                )
                .catch(() => {
                    // postTask can reject (e.g. aborted); fall back rather than
                    // strand the mutation in the queue forever.
                    orderDispatchScheduled = false;
                    scheduleQueuedOrderMutations();
                });
            return;
        }
        if (orderDispatchChannel) {
            lastOrderQueueScheduleMode = "message-channel";
            orderDispatchChannel.port2.postMessage(null);
            return;
        }
        lastOrderQueueScheduleMode = "timeout";
        setTimeout(() => {
            flushQueuedOrderMutations();
        }, 0);
    }

    if (orderDispatchChannel) {
        orderDispatchChannel.port1.onmessage = () => {
            flushQueuedOrderMutations();
        };
    }

    return {
        enqueue: (mutation, dispatchMode = "queued") => {
            const requestId = nextRequestId();
            const enqueuedAtMs = performance.now();
            const queuedMutation = {
                ...mutation,
                requestId,
                enqueuedAtMs,
            } as QueuedOrderMutation;
            deps.noteInteractivePressure(
                "orderMutationQueued",
                deps.orderMutationPriorityWindowMs,
            );
            if (dispatchMode === "immediate") {
                measurePerf(
                    "game.input.orderImmediate",
                    () => {
                        applyOrderMutation(queuedMutation);
                    },
                    { kind: mutation.kind, requestId },
                );
                return requestId;
            }
            queuedOrderMutations.push(queuedMutation);
            lastOrderMutationQueuedAtMs = enqueuedAtMs;
            scheduleQueuedOrderMutations();
            return requestId;
        },

        recordLocalAcknowledgment: (params) => {
            const requestId = queueAcknowledgment({
                requestId: params.requestId,
                kind: params.kind,
                path: params.path,
                sourceId: params.sourceId ?? null,
                targetId: params.targetId ?? null,
                activeStarId: params.activeStarId ?? null,
            });
            lastInteractionLocalAcknowledgment = {
                atMs: performance.now(),
                requestId,
                kind: params.kind,
                path: params.path,
                sourceId: params.sourceId ?? null,
                targetId: params.targetId ?? null,
                activeStarId: params.activeStarId ?? null,
                dispatchMode: params.dispatchMode ?? null,
                ...(params.extra ?? {}),
            };
            deps.noteInteractivePressure(
                "interactionLocalAcknowledgment",
                deps.orderMutationPriorityWindowMs,
            );
            if (pendingAcknowledgments.length > 0 && presentVisualStateNow()) {
                retireVisible("immediate");
            }
            return requestId;
        },

        flushAcknowledgments: () => {
            if (pendingAcknowledgments.length === 0) return;
            retireVisible("frame");
        },

        getVisibleOrderTargetId,
        hasQueuedOrderEntryForSource,

        getTelemetry: () => ({
            queuedOrderMutations: queuedOrderMutations.length,
            orderMutationRequestSeq,
            lastOrderMutationQueuedAtMs,
            lastOrderMutationQueueDelayMs,
            lastOrderQueueScheduleAtMs,
            lastOrderQueueFlushStartedAtMs,
            lastOrderQueueFlushFinishedAtMs,
            lastOrderQueueFlushMutationCount,
            lastOrderQueueFlushKinds,
            lastOrderQueueFlushRequestIds,
            lastOrderQueueScheduleMode,
            pendingInteractionVisualAcknowledgmentCount:
                pendingAcknowledgments.length,
            pendingInteractionVisualAcknowledgments: pendingAcknowledgments.map(
                (acknowledgment) => ({
                    ...acknowledgment,
                    ageMs: performance.now() - acknowledgment.recordedAtMs,
                }),
            ),
            lastInteractionLocalAcknowledgment,
            lastInteractionVisualAcknowledgment,
        }),

        reset: () => {
            queuedOrderMutations.splice(0, queuedOrderMutations.length);
            pendingAcknowledgments.splice(0, pendingAcknowledgments.length);
            orderDispatchScheduled = false;
            orderMutationRequestSeq = 0;
            resetTelemetryFields();
        },

        resetTelemetry: resetTelemetryFields,
    };
}
