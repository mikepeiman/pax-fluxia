import { describe, it, expect, vi } from 'vitest';
import {
    createOrderMutationQueue,
    removeQueuedOrderEntriesFromSource,
    type OrderMutationQueueDeps,
    type OrderQueueInteractionSnapshot,
} from './orderMutationQueue';

function makeDeps(
    overrides: Partial<OrderMutationQueueDeps> = {},
    interaction: Partial<OrderQueueInteractionSnapshot> = {},
): OrderMutationQueueDeps {
    return {
        store: {
            issueOrder: () => {},
            cancelOrder: () => {},
            setDeferredOrder: () => {},
        },
        getInteraction: () => ({
            activeStarId: null,
            dragSourceId: null,
            pendingOrders: new Set<string>(),
            deferredOrders: new Set<string>(),
            ...interaction,
        }),
        getStarById: () => null,
        // No stars => presentVisualStateNow() bails, so an acknowledgment
        // recorded here stays pending. That is the state reset() must clear.
        ensureStarCount: () => 0,
        renderOverlayNow: () => false,
        noteInteractivePressure: () => {},
        orderMutationPriorityWindowMs: 100,
        ...overrides,
    };
}

function pendingCount(queue: ReturnType<typeof createOrderMutationQueue>): number {
    return (queue.getTelemetry().pendingInteractionVisualAcknowledgmentCount ?? 0) as number;
}

describe('orderMutationQueue', () => {
    describe('reset', () => {
        it('clears pending acknowledgments so none survive into a new session', () => {
            const queue = createOrderMutationQueue(makeDeps());
            queue.recordLocalAcknowledgment({
                kind: 'issue',
                path: 'test',
                sourceId: 'A',
                targetId: 'B',
            });
            expect(pendingCount(queue)).toBe(1);

            queue.reset();

            // An acknowledgment only retires when a painted frame satisfies it.
            // One carried across a session boundary describes an action in a game
            // that no longer exists, so it could never retire on its own.
            expect(pendingCount(queue)).toBe(0);
        });

        it('drops queued mutations and restarts the request sequence', () => {
            const queue = createOrderMutationQueue(makeDeps());
            const first = queue.enqueue({
                kind: 'issue',
                sourceId: 'A',
                targetId: 'B',
                persist: false,
                path: 'test',
            });
            expect(first).toBe(1);
            expect(queue.getTelemetry().queuedOrderMutations).toBe(1);

            queue.reset();

            expect(queue.getTelemetry().queuedOrderMutations).toBe(0);
            expect(
                queue.enqueue({
                    kind: 'issue',
                    sourceId: 'C',
                    targetId: 'D',
                    persist: false,
                    path: 'test',
                }),
            ).toBe(1);
        });

        it('leaves nothing for flushAcknowledgments to re-check every frame', () => {
            const renderOverlayNow = vi.fn(() => false);
            const queue = createOrderMutationQueue(makeDeps({ renderOverlayNow }));
            queue.recordLocalAcknowledgment({ kind: 'select', path: 'test', activeStarId: 'A' });

            queue.reset();
            renderOverlayNow.mockClear();
            queue.flushAcknowledgments();

            expect(pendingCount(queue)).toBe(0);
        });
    });

    describe('removeQueuedOrderEntriesFromSource', () => {
        it('drops only the entries belonging to that source', () => {
            const set = new Set(['A|B', 'A|C', 'B|C', 'AA|D']);
            removeQueuedOrderEntriesFromSource('A', set);
            expect([...set].sort()).toEqual(['AA|D', 'B|C']);
        });

        it('does not treat a source as a prefix of a longer id', () => {
            const set = new Set(['AB|C']);
            removeQueuedOrderEntriesFromSource('A', set);
            expect([...set]).toEqual(['AB|C']);
        });
    });
});
