import { describe, expect, it } from 'vitest';
import { summarizeFramePerfAttribution } from './frameAttribution';

describe('summarizeFramePerfAttribution', () => {
    it('clips overlapping measure events to the frame window', () => {
        const summary = summarizeFramePerfAttribution(
            [
                {
                    name: 'before-and-into-frame',
                    atMs: 90,
                    detail: {
                        kind: 'measure',
                        durationMs: 30,
                        startTimeMs: 90,
                        endTimeMs: 120,
                    },
                },
                {
                    name: 'inside-frame',
                    atMs: 130,
                    detail: {
                        kind: 'measure',
                        durationMs: 12,
                        startTimeMs: 130,
                        endTimeMs: 142,
                    },
                },
                {
                    name: 'outside-frame',
                    atMs: 170,
                    detail: {
                        kind: 'measure',
                        durationMs: 10,
                        startTimeMs: 170,
                        endTimeMs: 180,
                    },
                },
            ],
            { frameMs: 50, startAtMs: 100, endAtMs: 150 },
        );

        expect(summary.measuredOverlapMs).toBe(32);
        expect(summary.unattributedFrameMs).toBe(18);
        expect(summary.measures.map((measure) => measure.name)).toEqual([
            'before-and-into-frame',
            'inside-frame',
        ]);
        expect(summary.measures[0].overlapMs).toBe(20);
    });

    it('merges nested intervals instead of double-counting attribution', () => {
        const summary = summarizeFramePerfAttribution(
            [
                {
                    name: 'outer',
                    atMs: 100,
                    detail: {
                        kind: 'measure',
                        durationMs: 40,
                        startTimeMs: 100,
                        endTimeMs: 140,
                    },
                },
                {
                    name: 'inner',
                    atMs: 110,
                    detail: {
                        kind: 'measure',
                        durationMs: 10,
                        startTimeMs: 110,
                        endTimeMs: 120,
                    },
                },
            ],
            { frameMs: 50, startAtMs: 100, endAtMs: 150 },
        );

        expect(summary.measuredOverlapMs).toBe(40);
        expect(summary.unattributedFrameMs).toBe(10);
    });

    it('ignores cadence-only frame loop intervals as CPU attribution', () => {
        const summary = summarizeFramePerfAttribution(
            [
                {
                    name: 'game.frameLoop.interval',
                    atMs: 100,
                    detail: {
                        kind: 'measure',
                        durationMs: 50,
                        startTimeMs: 100,
                        endTimeMs: 150,
                    },
                },
                {
                    name: 'game.renderFrame.ships',
                    atMs: 110,
                    detail: {
                        kind: 'measure',
                        durationMs: 4,
                        startTimeMs: 110,
                        endTimeMs: 114,
                    },
                },
            ],
            { frameMs: 50, startAtMs: 100, endAtMs: 150 },
        );

        expect(summary.measuredOverlapMs).toBe(4);
        expect(summary.unattributedFrameMs).toBe(46);
        expect(summary.measures.map((measure) => measure.name)).toEqual([
            'game.renderFrame.ships',
        ]);
    });
});
