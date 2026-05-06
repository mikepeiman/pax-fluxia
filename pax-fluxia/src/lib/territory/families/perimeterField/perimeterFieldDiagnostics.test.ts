import { describe, expect, it } from 'vitest';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { PerimeterFieldDebugSnapshot } from './buildPerimeterFieldScene';
import { resolvePerimeterFieldDiagnosticCanvasSize } from './perimeterFieldDiagnostics';

function makeGeometry(
    width?: number,
    height?: number,
): ResolvedGeometrySnapshot {
    return {
        frontierTopology:
            width != null && height != null
                ? {
                      worldBounds: { width, height },
                  }
                : null,
    } as unknown as ResolvedGeometrySnapshot;
}

function makeSnapshot(args?: {
    displayWidth?: number;
    displayHeight?: number;
    targetWidth?: number;
    targetHeight?: number;
}): PerimeterFieldDebugSnapshot {
    return {
        displayGeometry: makeGeometry(args?.displayWidth, args?.displayHeight),
        transitionTargetGeometry:
            args?.targetWidth != null && args?.targetHeight != null
                ? makeGeometry(args.targetWidth, args.targetHeight)
                : null,
        playerColors: [],
        renderedSamples: [],
        staticSamples: [],
        targetStaticSamples: [],
        transitionSamples: [],
        effectiveProgress: null,
    };
}

describe('resolvePerimeterFieldDiagnosticCanvasSize', () => {
    it('prefers display geometry world bounds over requested canvas size', () => {
        expect(
            resolvePerimeterFieldDiagnosticCanvasSize({
                requestedWidth: 1561,
                requestedHeight: 881,
                snapshot: makeSnapshot({
                    displayWidth: 1600,
                    displayHeight: 1034,
                }),
            }),
        ).toEqual({ width: 1600, height: 1034 });
    });

    it('falls back to requested dimensions when no world bounds are available', () => {
        expect(
            resolvePerimeterFieldDiagnosticCanvasSize({
                requestedWidth: 1561,
                requestedHeight: 881,
                snapshot: makeSnapshot(),
            }),
        ).toEqual({ width: 1561, height: 881 });
    });
});
