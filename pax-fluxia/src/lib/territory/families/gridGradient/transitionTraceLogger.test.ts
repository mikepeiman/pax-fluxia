import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    createGridGradientTransitionTraceState,
    logGridGradientTransitionTrace,
} from './transitionTraceLogger';

describe('Grid Gradient transition trace logger', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('suppresses routine per-frame stages', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const state = createGridGradientTransitionTraceState();

        logGridGradientTransitionTrace({
            enabled: true,
            state,
            stage: 'update.entry',
            label: 'family.update.entry',
            data: {
                present: true,
                activeTransitionCells: 12,
                progress: 0.5,
            },
        });

        expect(logSpy).not.toHaveBeenCalled();
    });

    it('dedupes structural gates without progress churn', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const state = createGridGradientTransitionTraceState();

        logGridGradientTransitionTrace({
            enabled: true,
            state,
            stage: 'resolve_plan.gate',
            label: 'family.resolve_plan.gate',
            data: {
                present: true,
                planKey: 'plan-a',
                activeTransitionCells: 12,
                progress: 0.1,
            },
        });
        logGridGradientTransitionTrace({
            enabled: true,
            state,
            stage: 'resolve_plan.gate',
            label: 'family.resolve_plan.gate',
            data: {
                present: true,
                planKey: 'plan-a',
                activeTransitionCells: 12,
                progress: 0.6,
            },
        });

        expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it('emits summary stages at coarse progress buckets', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const state = createGridGradientTransitionTraceState();

        logGridGradientTransitionTrace({
            enabled: true,
            state,
            stage: 'update.exit',
            label: 'family.update.exit',
            data: {
                present: true,
                activeTransitionCells: 12,
                progress: 0.1,
            },
        });
        logGridGradientTransitionTrace({
            enabled: true,
            state,
            stage: 'update.exit',
            label: 'family.update.exit',
            data: {
                present: true,
                activeTransitionCells: 12,
                progress: 0.12,
            },
        });
        logGridGradientTransitionTrace({
            enabled: true,
            state,
            stage: 'update.exit',
            label: 'family.update.exit',
            data: {
                present: true,
                activeTransitionCells: 12,
                progress: 0.4,
            },
        });

        expect(logSpy).toHaveBeenCalledTimes(2);
    });

    it('does not duplicate the trace context in the message', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const state = createGridGradientTransitionTraceState();

        logGridGradientTransitionTrace({
            enabled: true,
            state,
            stage: 'update.exit',
            label: 'family.update.exit',
            data: {
                present: true,
                activeTransitionCells: 12,
                progress: 0.1,
            },
        });

        const format = String(logSpy.mock.calls[0]?.[0] ?? '');
        expect(format).toContain('[GG_TRANSITION] family.update.exit');
        expect(format).not.toContain('[GG_TRANSITION] [GG_TRANSITION]');
    });
});
