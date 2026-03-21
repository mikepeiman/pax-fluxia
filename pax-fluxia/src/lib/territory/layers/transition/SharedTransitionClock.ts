import type { TransitionEnvelope } from '../../contracts/TransitionContracts';

export class SharedTransitionClock {
    buildEnvelope(
        transitionId: string,
        startedAtMs: number,
        durationMs: number,
        conquestEvents: TransitionEnvelope['conquestEvents'],
    ): TransitionEnvelope {
        return {
            transitionId,
            startedAtMs,
            durationMs,
            progress: durationMs <= 0 ? 1 : 0,
            conquestEvents,
        };
    }

    sampleProgress(envelope: TransitionEnvelope, nowMs: number): number {
        if (envelope.durationMs <= 0) {
            return 1;
        }

        const elapsed = Math.max(0, nowMs - envelope.startedAtMs);
        return Math.min(1, elapsed / envelope.durationMs);
    }
}
