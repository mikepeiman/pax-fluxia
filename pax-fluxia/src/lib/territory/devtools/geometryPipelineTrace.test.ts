import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { log, logFlags, setGamePaused } from '$lib/utils/logger';
import { geometryTrace, summarizeOwners } from './geometryPipelineTrace';

const flags = logFlags as unknown as Record<string, boolean>;

describe('geometryPipelineTrace', () => {
    let spy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        spy = vi.spyOn(log, 'pipeline').mockImplementation(() => {});
        geometryTrace.reset();
        geometryTrace.setThrottleMs(0); // emit every frame by default
        flags.pipeline = true;
    });

    afterEach(() => {
        spy.mockRestore();
        flags.pipeline = false;
        setGamePaused(false);
        geometryTrace.reset();
    });

    it('no-ops entirely when the flag is off (zero cost)', () => {
        flags.pipeline = false;
        geometryTrace.begin({ mode: 'grid_gradient', frame: 1, phase: 'steady' });
        expect(geometryTrace.capturing).toBe(false);
        geometryTrace.step('0', 'input', { stars: 5 });
        geometryTrace.end(1000);
        expect(spy).not.toHaveBeenCalled();
    });

    it('captures steps and emits ONE compact block when enabled', () => {
        geometryTrace.begin({ mode: 'grid_gradient', frame: 7, phase: 'steady' });
        expect(geometryTrace.capturing).toBe(true);
        geometryTrace.step('0', 'input', {
            stars: 42,
            owners: summarizeOwners(['p1', 'p2', 'p1']),
        });
        geometryTrace.step('2', 'powerdiagram', { cells: 83 });
        geometryTrace.end(1000);

        expect(spy).toHaveBeenCalledTimes(1);
        const block = spy.mock.calls[0][0] as string;
        expect(block).toContain('[GEOMTRACE mode=grid_gradient frame=7 phase=steady]');
        expect(block).toContain('cells=83');
        expect(block).toContain('owners=p1:2,p2:1');
    });

    it('throttles repeated steady emits but ALWAYS emits on a mode or phase change', () => {
        geometryTrace.setThrottleMs(750);

        geometryTrace.begin({ mode: 'a', frame: 1, phase: 'steady' });
        geometryTrace.step('0', 'x', { a: 1 });
        geometryTrace.end(1000);
        expect(spy).toHaveBeenCalledTimes(1); // first emit (mode changed from '')

        geometryTrace.begin({ mode: 'a', frame: 2, phase: 'steady' });
        geometryTrace.step('0', 'x', { a: 1 });
        geometryTrace.end(1100); // within throttle, same mode/phase
        expect(spy).toHaveBeenCalledTimes(1); // suppressed

        geometryTrace.begin({ mode: 'b', frame: 3, phase: 'steady' });
        geometryTrace.step('0', 'x', { a: 1 });
        geometryTrace.end(1150); // within throttle but mode changed
        expect(spy).toHaveBeenCalledTimes(2);

        geometryTrace.begin({ mode: 'b', frame: 4, phase: 'transition', prog: 0.3 });
        geometryTrace.step('0', 'x', { a: 1 });
        geometryTrace.end(1160); // within throttle but phase changed
        expect(spy).toHaveBeenCalledTimes(3);
        const last = spy.mock.calls[2][0] as string;
        expect(last).toContain('phase=transition');
        expect(last).toContain('prog=0.30');
    });

    it('omits null/undefined fields and rounds floats', () => {
        geometryTrace.begin({ mode: 'm', frame: 1, phase: 'steady' });
        geometryTrace.step('9', 'snapshot', {
            v: 'ab12',
            regions: 3,
            skip: null,
            gone: undefined,
            ms: 3.14159,
        });
        geometryTrace.end(2000);
        const block = spy.mock.calls[0][0] as string;
        expect(block).toContain('v=ab12');
        expect(block).toContain('regions=3');
        expect(block).toContain('ms=3.14');
        expect(block).not.toContain('skip');
        expect(block).not.toContain('gone');
    });

    it('upserts a repeated step id in place (one line per stage, last value wins)', () => {
        geometryTrace.begin({ mode: 'm', frame: 1, phase: 'steady' });
        geometryTrace.step('g', 'geomcache', { hit: true, key: 'aaa' });
        geometryTrace.step('s', 'snapshot', { regions: 3 });
        geometryTrace.step('g', 'geomcache', { hit: false, key: 'bbb' }); // repeat — e.g. resolve called twice
        geometryTrace.end(1000);

        const block = spy.mock.calls[0][0] as string;
        const gLines = block.split('\n').filter((l) => l.includes('geomcache'));
        expect(gLines.length).toBe(1); // de-duped to one line
        expect(block).toContain('key=bbb'); // last value wins
        expect(block).not.toContain('key=aaa');
        // original position preserved: 'g' still before 's'
        expect(block.indexOf('geomcache')).toBeLessThan(block.indexOf('snapshot'));
    });

    it('the geometry trace is suppressed while the game is paused', () => {
        setGamePaused(true);
        geometryTrace.begin({ mode: 'm', frame: 1, phase: 'steady' });
        expect(geometryTrace.capturing).toBe(false);
        geometryTrace.step('0', 'input', { stars: 5 });
        geometryTrace.end(1000);
        expect(spy).not.toHaveBeenCalled();
    });

    it('all logger categories are suppressed while paused; the error channel is not', () => {
        const clSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        flags.state = true;
        try {
            setGamePaused(true);
            log.state('ctx', 'while-paused'); // gated category → suppressed
            expect(clSpy).not.toHaveBeenCalled();
            log.error('ctx', 'errors-always-surface'); // error channel → exempt from pause
            expect(errSpy).toHaveBeenCalledTimes(1);
            setGamePaused(false);
            log.state('ctx', 'after-resume'); // resumes once unpaused
            expect(clSpy).toHaveBeenCalled();
        } finally {
            flags.state = false;
            clSpy.mockRestore();
            errSpy.mockRestore();
        }
    });

    it('summarizeOwners counts per owner, sorted by id', () => {
        expect(summarizeOwners(['p2', 'p1', 'p2', 'p1', 'p2'])).toBe('p1:2,p2:3');
        expect(summarizeOwners([])).toBe('');
    });
});
