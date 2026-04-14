import { describe, expect, it } from 'vitest';
import { selectDiagnosticIntermediateFrames } from './TransitionBundleSerializer';

describe('selectDiagnosticIntermediateFrames', () => {
    it('selects the five interior frames from the standard seven-frame capture', () => {
        const frames = [
            { progress: 0.0, canvas: {} as HTMLCanvasElement },
            { progress: 0.17, canvas: {} as HTMLCanvasElement },
            { progress: 0.33, canvas: {} as HTMLCanvasElement },
            { progress: 0.5, canvas: {} as HTMLCanvasElement },
            { progress: 0.67, canvas: {} as HTMLCanvasElement },
            { progress: 0.83, canvas: {} as HTMLCanvasElement },
            { progress: 1.0, canvas: {} as HTMLCanvasElement },
        ];

        expect(selectDiagnosticIntermediateFrames(frames)).toEqual([
            { progress: 0.17, filename: 'frame_01_t017.png', sourceIndex: 1 },
            { progress: 0.33, filename: 'frame_02_t033.png', sourceIndex: 2 },
            { progress: 0.5, filename: 'frame_03_t050.png', sourceIndex: 3 },
            { progress: 0.67, filename: 'frame_04_t067.png', sourceIndex: 4 },
            { progress: 0.83, filename: 'frame_05_t083.png', sourceIndex: 5 },
        ]);
    });

    it('returns the available interior subset when fewer than five frames exist', () => {
        const frames = [
            { progress: 0.0, canvas: {} as HTMLCanvasElement },
            { progress: 0.25, canvas: {} as HTMLCanvasElement },
            { progress: 0.5, canvas: {} as HTMLCanvasElement },
            { progress: 0.75, canvas: {} as HTMLCanvasElement },
            { progress: 1.0, canvas: {} as HTMLCanvasElement },
        ];

        expect(selectDiagnosticIntermediateFrames(frames)).toEqual([
            { progress: 0.25, filename: 'frame_01_t025.png', sourceIndex: 1 },
            { progress: 0.5, filename: 'frame_02_t050.png', sourceIndex: 2 },
            { progress: 0.75, filename: 'frame_03_t075.png', sourceIndex: 3 },
        ]);
    });
});
