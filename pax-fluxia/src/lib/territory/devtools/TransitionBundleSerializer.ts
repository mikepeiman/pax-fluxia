import JSZip from 'jszip';
import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { compositeOverlayOnScreenshot } from './TransitionDebugOverlay';
import { renderPerimeterFieldDiagnosticCanvas } from '../families/perimeterField/perimeterFieldDiagnostics';
import type { PerimeterFieldDebugSnapshot } from '../families/perimeterField/buildPerimeterFieldScene';
import {
    compactGeometrySnapshotForExport,
    compactFrontierTopologyForExport,
    filePrefixFromIsoTimestamp,
    boundsOf,
    downsamplePoints,
} from './snapshotExport';

export const DIAGNOSTIC_INTERMEDIATE_PROGRESS_VALUES = [
    1 / 6,
    2 / 6,
    3 / 6,
    4 / 6,
    5 / 6,
] as const;

type TransitionFrameEntry = NonNullable<TransitionDebugBundle['transitionFrames']>[number];

export interface DiagnosticPackageFrame {
    progress: number;
    filename: string;
    sourceIndex: number;
}

interface DiagnosticPackageManifest {
    exportKind: 'transition_diagnostic_package';
    bundleId: string;
    timestamp: string;
    transitionId: string;
    conquestEvents: TransitionDebugBundle['conquestEvents'];
    selectedFrames: DiagnosticPackageFrame[];
    notes: string[];
    modes: TransitionDebugBundle['meta']['modes'];
    previousOwnershipVersion: string;
    nextOwnershipVersion: string;
    previousGeometry: unknown;
    nextGeometry: unknown;
    previousTopology: unknown;
    nextTopology: unknown;
    starPositions: Record<string, { x: number; y: number }>;
    captureDiagnostics?: unknown;
}

interface PerimeterFieldCaptureFrameDiagnostics {
    fullSnapshot: PerimeterFieldDebugSnapshot | null;
    compactSnapshot: Record<string, unknown> | null;
}

interface PerimeterFieldCaptureTransitionDiagnostics
    extends PerimeterFieldCaptureFrameDiagnostics {
    frameIndex: number;
    progress: number;
}

interface PerimeterFieldLiveCaptureDiagnostics {
    kind: 'perimeter_field_live_capture';
    previousFrame: PerimeterFieldCaptureFrameDiagnostics;
    nextFrame: PerimeterFieldCaptureFrameDiagnostics;
    transitionFrames: PerimeterFieldCaptureTransitionDiagnostics[];
}

function roundCoord(value: number): number {
    return Math.round(value * 100) / 100;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('canvas.toBlob returned null'));
            },
            'image/png',
        );
    });
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }, 100);
}

function canvasToImageBitmap(canvas: HTMLCanvasElement): Promise<ImageBitmap> {
    return createImageBitmap(canvas);
}

function buildCompositeSheet(
    panels: { label: string; canvas: HTMLCanvasElement }[],
): HTMLCanvasElement {
    if (panels.length === 0) {
        const empty = document.createElement('canvas');
        empty.width = 200;
        empty.height = 100;
        return empty;
    }

    const cols = 3;
    const rows = Math.ceil(panels.length / cols);
    const panelWidth = panels[0].canvas.width;
    const panelHeight = panels[0].canvas.height;
    const labelHeight = 24;

    const composite = document.createElement('canvas');
    composite.width = panelWidth * cols;
    composite.height = (panelHeight + labelHeight) * rows;
    const ctx = composite.getContext('2d');
    if (!ctx) return composite;

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, composite.width, composite.height);

    for (let i = 0; i < panels.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * panelWidth;
        const y = row * (panelHeight + labelHeight);

        ctx.fillStyle = '#222222';
        ctx.fillRect(x, y, panelWidth, labelHeight);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#cccccc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(panels[i].label, x + 8, y + labelHeight / 2);

        ctx.drawImage(panels[i].canvas, x, y + labelHeight);
    }

    return composite;
}

function serializeTopologyPairCompact(bundle: TransitionDebugBundle) {
    const ctx = bundle.context;
    return {
        conquestEvents: ctx.conquestEvents,
        exportNote: 'Compact: section points are downsampled; use pointsSampled and bounds.',
        prevTopology: compactFrontierTopologyForExport(
            ctx.previousGeometry?.frontierTopology ?? null,
        ),
        nextTopology: compactFrontierTopologyForExport(
            ctx.nextGeometry?.frontierTopology ?? null,
        ),
    };
}

function serializeStarPositions(
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Record<string, { x: number; y: number }> {
    return Object.fromEntries(
        [...starPositions.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([starId, point]) => [starId, point]),
    );
}

function isPerimeterFieldLiveCaptureDiagnostics(
    value: unknown,
): value is PerimeterFieldLiveCaptureDiagnostics {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { kind?: unknown }).kind === 'perimeter_field_live_capture'
    );
}

function buildAffectedOwnerSet(bundle: TransitionDebugBundle): Set<string> {
    const owners = new Set<string>();
    for (const event of bundle.conquestEvents) {
        owners.add(event.previousOwner);
        owners.add(event.newOwner);
    }
    return owners;
}

function compactPerimeterFieldGeometry(
    geometry: TransitionDebugBundle['context']['nextGeometry'] | null | undefined,
    affectedOwners: ReadonlySet<string>,
): unknown {
    if (!geometry) return null;
    return {
        version: geometry.version,
        sourceMode: geometry.sourceMode,
        sourceStyle: geometry.sourceStyle,
        ownershipVersion: geometry.ownershipVersion,
        geometryFamily: geometry.geometryFamily,
        sourceMethod: geometry.sourceMethod,
        territoryRegions: geometry.territoryRegions
            .filter((region) => affectedOwners.has(region.ownerId))
            .map((region) => ({
                regionId: region.regionId,
                ownerId: region.ownerId,
                starIds: [...(region.starIds ?? [])].sort(),
                confidence: region.confidence,
                pointCount: region.points.length,
                bounds: boundsOf(region.points),
                pointsSampled: downsamplePoints(region.points, 24).map(
                    ([x, y]) => [roundCoord(x), roundCoord(y)] as const,
                ),
            })),
        shellLoops: geometry.shellLoops
            .filter(
                (loop) =>
                    loop.classification === 'outer' &&
                    Boolean(loop.ownerId) &&
                    affectedOwners.has(loop.ownerId),
            )
            .map((loop) => ({
                shellLoopId: loop.shellLoopId,
                shellId: loop.shellId,
                ownerId: loop.ownerId,
                starIds: [...(loop.starIds ?? [])].sort(),
                confidence: loop.confidence,
                pointCount: loop.points.length,
                bounds: boundsOf(loop.points),
                pointsSampled: downsamplePoints(loop.points, 24).map(
                    ([x, y]) => [roundCoord(x), roundCoord(y)] as const,
                ),
            })),
    };
}

function compactTopologySummary(
    topology:
        | TransitionDebugBundle['context']['prevFrontierTopology']
        | TransitionDebugBundle['context']['nextFrontierTopology']
        | null
        | undefined,
): unknown {
    if (!topology) return null;
    return {
        version: topology.version,
        ownershipVersion: topology.ownershipVersion,
        vertexCount: topology.vertices.size,
        sectionCount: topology.sections.size,
        loopCount: topology.loops.length,
    };
}

function serializeRelevantStarPositions(
    bundle: TransitionDebugBundle,
): Record<string, { x: number; y: number }> {
    const relevantIds = new Set<string>();
    for (const event of bundle.conquestEvents) {
        relevantIds.add(event.starId);
        const attackerStarIds = Array.isArray(
            (event as { attackerStarIds?: unknown }).attackerStarIds,
        )
            ? ((event as { attackerStarIds?: string[] }).attackerStarIds ?? [])
            : [];
        for (const attackerStarId of attackerStarIds) {
            relevantIds.add(attackerStarId);
        }
    }
    return Object.fromEntries(
        [...bundle.starPositions.entries()]
            .filter(([starId]) => relevantIds.has(starId))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([starId, point]) => [
                starId,
                { x: roundCoord(point.x), y: roundCoord(point.y) },
            ]),
    );
}

function selectPerimeterDiagnosticFrames(
    diagnostics: PerimeterFieldLiveCaptureDiagnostics,
    selectedFrames: readonly DiagnosticPackageFrame[],
): Array<{
    frameIndex: number;
    progress: number;
    snapshot: Record<string, unknown> | null;
}> {
    return selectedFrames
        .map((frame) => {
            const source = diagnostics.transitionFrames[frame.sourceIndex];
            if (!source) return null;
            return {
                frameIndex: source.frameIndex,
                progress: source.progress,
                snapshot: source.compactSnapshot,
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function renderPerimeterFieldExportCanvas(args: {
    baseCanvas: HTMLCanvasElement | null;
    snapshot: PerimeterFieldDebugSnapshot | null;
}): HTMLCanvasElement | null {
    if (!args.baseCanvas) return null;
    if (!args.snapshot) return args.baseCanvas;
    return renderPerimeterFieldDiagnosticCanvas({
        width: args.baseCanvas.width,
        height: args.baseCanvas.height,
        snapshot: args.snapshot,
        baseCanvas: args.baseCanvas,
        showGeometry: true,
        showVstars: true,
    });
}

export function selectDiagnosticIntermediateFrames(
    frames: readonly TransitionFrameEntry[] | null | undefined,
    targets = DIAGNOSTIC_INTERMEDIATE_PROGRESS_VALUES,
): DiagnosticPackageFrame[] {
    if (!frames || frames.length === 0) return [];

    const interiorFrames = frames
        .map((frame, index) => ({ frame, index }))
        .filter(({ frame }) => frame.progress > 0 && frame.progress < 1);

    const usedIndexes = new Set<number>();
    const selected: DiagnosticPackageFrame[] = [];

    for (const target of targets) {
        let best: { frame: TransitionFrameEntry; index: number } | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const candidate of interiorFrames) {
            if (usedIndexes.has(candidate.index)) continue;
            const distance = Math.abs(candidate.frame.progress - target);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        }

        if (!best) continue;
        usedIndexes.add(best.index);
        const pctString = Math.round(best.frame.progress * 100)
            .toString()
            .padStart(3, '0');
        selected.push({
            progress: best.frame.progress,
            filename: `frame_${String(selected.length + 1).padStart(2, '0')}_t${pctString}.png`,
            sourceIndex: best.index,
        });
    }

    return selected.sort((a, b) => a.progress - b.progress);
}

function buildDiagnosticManifest(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
): DiagnosticPackageManifest {
    const ctx = bundle.context;
    const perimeterDiagnostics = isPerimeterFieldLiveCaptureDiagnostics(
        bundle.extraDiagnostics,
    )
        ? bundle.extraDiagnostics
        : null;
    const affectedOwners = buildAffectedOwnerSet(bundle);
    return {
        exportKind: 'transition_diagnostic_package',
        bundleId: bundle.id,
        timestamp: bundle.timestamp,
        transitionId: bundle.meta.transitionId,
        conquestEvents: bundle.conquestEvents,
        selectedFrames: [...selectedFrames],
        notes: [
            'Package contains PREV, NEXT, and up to 5 evenly spaced intermediate transition frames.',
            'Geometry and topology are compact exports intended for deterministic diagnosis and human inspection.',
            'If fewer than 5 interior transition frames were captured, selectedFrames contains the available subset.',
        ],
        modes: bundle.meta.modes,
        previousOwnershipVersion: bundle.meta.prevOwnershipVersion,
        nextOwnershipVersion: bundle.meta.nextOwnershipVersion,
        previousGeometry: perimeterDiagnostics
            ? compactPerimeterFieldGeometry(
                  ctx.previousGeometry ?? null,
                  affectedOwners,
              )
            : compactGeometrySnapshotForExport(ctx.previousGeometry ?? null),
        nextGeometry: perimeterDiagnostics
            ? compactPerimeterFieldGeometry(ctx.nextGeometry, affectedOwners)
            : compactGeometrySnapshotForExport(ctx.nextGeometry),
        previousTopology: perimeterDiagnostics
            ? compactTopologySummary(ctx.previousGeometry?.frontierTopology ?? null)
            : compactFrontierTopologyForExport(
                  ctx.previousGeometry?.frontierTopology ?? null,
              ),
        nextTopology: perimeterDiagnostics
            ? compactTopologySummary(ctx.nextGeometry?.frontierTopology ?? null)
            : compactFrontierTopologyForExport(
                  ctx.nextGeometry?.frontierTopology ?? null,
              ),
        starPositions: perimeterDiagnostics
            ? serializeRelevantStarPositions(bundle)
            : serializeStarPositions(bundle.starPositions),
        captureDiagnostics: perimeterDiagnostics
            ? {
                  kind: perimeterDiagnostics.kind,
                  totalTransitionFrames: perimeterDiagnostics.transitionFrames.length,
                  previousFrame: perimeterDiagnostics.previousFrame.compactSnapshot,
                  nextFrame: perimeterDiagnostics.nextFrame.compactSnapshot,
                  selectedTransitionFrames: selectPerimeterDiagnosticFrames(
                      perimeterDiagnostics,
                      selectedFrames,
                  ),
              }
            : bundle.extraDiagnostics,
    };
}

function extractAttackerStarIds(bundle: TransitionDebugBundle): string[] {
    const attackerStarIds = new Set<string>();
    for (const event of bundle.conquestEvents) {
        const attackers = Array.isArray(
            (event as { attackerStarIds?: unknown }).attackerStarIds,
        )
            ? ((event as { attackerStarIds?: string[] }).attackerStarIds ?? [])
            : [];
        for (const attackerStarId of attackers) attackerStarIds.add(attackerStarId);
    }
    return [...attackerStarIds].sort();
}

function computeBundleBounds(bundle: TransitionDebugBundle): {
    x: number;
    y: number;
    w: number;
    h: number;
} {
    const points = Object.values(serializeRelevantStarPositions(bundle));
    if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        x: roundCoord(minX),
        y: roundCoord(minY),
        w: roundCoord(maxX - minX),
        h: roundCoord(maxY - minY),
    };
}

function compareCanvasesWithinTolerance(
    expected: HTMLCanvasElement | null | undefined,
    actual: HTMLCanvasElement | null | undefined,
    tolerance = 4,
): Record<string, unknown> {
    if (!expected || !actual) {
        return { available: false, withinTolerance: false, reason: 'missing_canvas' };
    }
    if (expected.width !== actual.width || expected.height !== actual.height) {
        return {
            available: true,
            withinTolerance: false,
            reason: 'dimension_mismatch',
            expected: { width: expected.width, height: expected.height },
            actual: { width: actual.width, height: actual.height },
        };
    }
    const expectedCtx = expected.getContext('2d');
    const actualCtx = actual.getContext('2d');
    if (!expectedCtx || !actualCtx) {
        return { available: false, withinTolerance: false, reason: 'missing_2d_context' };
    }
    const expectedData = expectedCtx.getImageData(0, 0, expected.width, expected.height).data;
    const actualData = actualCtx.getImageData(0, 0, actual.width, actual.height).data;
    let changedPixels = 0;
    let maxChannelDiff = 0;
    let totalChannelDiff = 0;
    for (let index = 0; index < expectedData.length; index += 4) {
        const channelDiff = Math.max(
            Math.abs(expectedData[index] - actualData[index]),
            Math.abs(expectedData[index + 1] - actualData[index + 1]),
            Math.abs(expectedData[index + 2] - actualData[index + 2]),
            Math.abs(expectedData[index + 3] - actualData[index + 3]),
        );
        if (channelDiff > 0) changedPixels += 1;
        maxChannelDiff = Math.max(maxChannelDiff, channelDiff);
        totalChannelDiff += channelDiff;
    }
    const pixelCount = expected.width * expected.height;
    return {
        available: true,
        withinTolerance: maxChannelDiff <= tolerance,
        tolerance,
        changedPixels,
        changedPixelRatio: pixelCount > 0 ? changedPixels / pixelCount : 0,
        maxChannelDiff,
        avgChannelDiff: pixelCount > 0 ? totalChannelDiff / pixelCount : 0,
    };
}

function buildDiagnosticBundleV1(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
): Record<string, unknown> {
    const legacyManifest = buildDiagnosticManifest(bundle, selectedFrames);
    const primaryEvent = bundle.conquestEvents[0];
    const attackerStarIds = extractAttackerStarIds(bundle);
    const firstFrameImage =
        selectedFrames[0] ? `render/${selectedFrames[0].filename}` : 'render/next.png';
    const lastFrameImage =
        selectedFrames.length > 0
            ? `render/${selectedFrames[selectedFrames.length - 1].filename}`
            : 'render/next.png';
    const frontierDiffSummary = {
        drifted: bundle.frontierDiff.drifted.length,
        static: bundle.frontierDiff.staticPolylines.length,
        appeared: bundle.frontierDiff.appearedKeyOrSegment.length,
        removed: bundle.frontierDiff.removedKeyOrSegment.length,
    };
    const relevantStarPositions = serializeRelevantStarPositions(bundle);
    const bundleBounds = computeBundleBounds(bundle);
    const lastTransitionFrame =
        bundle.transitionFrames && bundle.transitionFrames.length > 0
            ? bundle.transitionFrames[bundle.transitionFrames.length - 1]
            : null;
    const finalCompare = compareCanvasesWithinTolerance(
        bundle.nextCanvas,
        lastTransitionFrame?.canvas ?? bundle.nextCanvas,
    );
    const check = (name: string, pass: boolean, detail?: Record<string, unknown>) => ({
        name,
        pass,
        ...(detail ? { detail } : {}),
    });
    const failIf = (
        condition: string,
        triggered: boolean,
        detail?: Record<string, unknown>,
    ) => ({
        condition,
        triggered,
        ...(detail ? { detail } : {}),
    });
    const step = (
        stepId: string,
        stage: string,
        title: string,
        image: string,
        text: Record<string, unknown>,
        checks: Record<string, unknown>[],
        failures: Record<string, unknown>[],
    ) => ({
        stepId,
        stage,
        title,
        status: 'ok',
        inputs: [],
        outputs: [`${stepId}.${title.replace(/\s+/g, '')}`],
        visual: { image, legend: [title] },
        text,
        checks,
        failIf: failures,
    });

    return {
        schemaVersion: 'pv-transition-diagnostics-v1',
        captureId: bundle.id,
        tickId: String(bundle.meta.tick),
        conquestId: bundle.meta.transitionId,
        createdAt: bundle.timestamp,
        targetStarId: primaryEvent?.starId ?? null,
        preOwnerId: primaryEvent?.previousOwner ?? null,
        postOwnerId: primaryEvent?.newOwner ?? null,
        attackerStarIds,
        bounds: bundleBounds,
        tunables: {
            msr: {},
            laneMargin: {},
            cx: {},
            dx: {},
            transitionVertexSpacing: null,
            guideSmoothness: null,
            frontRelaxation: null,
            pathBias: null,
            modeSelection: bundle.context.selection,
            modes: bundle.meta.modes,
        },
        steps: [
            step('O01', 'ownership', 'Tick decision snapshot', 'render/prev.png', {
                tickId: bundle.meta.tick,
                conquestId: bundle.meta.transitionId,
                targetStarId: primaryEvent?.starId ?? null,
                attackerStarIds,
                modes: bundle.meta.modes,
            }, [
                check('has_conquest_event', bundle.conquestEvents.length > 0),
                check('pre_and_post_ownership_available', Boolean(bundle.context.previousOwnership) && Boolean(bundle.context.nextOwnership)),
            ], [failIf('missing_conquest_event', bundle.conquestEvents.length === 0)]),
            step('O02', 'ownership', 'PRE ownership state', 'render/prev.png', {
                stars: bundle.context.previousOwnership
                    ? [...bundle.context.previousOwnership.starOwners.entries()]
                          .sort(([left], [right]) => left.localeCompare(right))
                          .map(([starId, ownerId]) => ({ starId, ownerId }))
                    : [],
            }, [check('pre_ownership_available', Boolean(bundle.context.previousOwnership))], []),
            step('O03', 'ownership', 'POST ownership state', 'render/next.png', {
                stars: [...bundle.context.nextOwnership.starOwners.entries()]
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([starId, ownerId]) => ({ starId, ownerId })),
            }, [check('post_ownership_available', true)], []),
            step('G01', 'geometry', 'Geometry inputs PRE / POST', 'render/prev.png', {
                preGeometryVersion: bundle.context.previousGeometry?.version ?? null,
                postGeometryVersion: bundle.context.nextGeometry.version,
                bounds: bundleBounds,
            }, [
                check('previous_geometry_available', Boolean(bundle.context.previousGeometry)),
                check('next_geometry_available', Boolean(bundle.context.nextGeometry)),
            ], []),
            step('G02', 'geometry', 'Geometry primitives', 'render/prev.png', {
                previousGeometry: legacyManifest.previousGeometry,
                nextGeometry: legacyManifest.nextGeometry,
            }, [check('affected_territories_present', bundle.meta.changeSummary.affectedTerritoryCount > 0)], []),
            step('G03', 'geometry', 'Compiled PRE / POST frontiers', 'render/next.png', {
                previousTopology: legacyManifest.previousTopology,
                nextTopology: legacyManifest.nextTopology,
            }, [check('topology_summary_available', Boolean(legacyManifest.previousTopology) || Boolean(legacyManifest.nextTopology))], []),
            step('G04', 'geometry', 'Local frontier set selection', firstFrameImage, {
                affectedOwners: [...buildAffectedOwnerSet(bundle)].sort(),
                bounds: bundleBounds,
            }, [check('local_bounds_non_zero', bundleBounds.w > 0 && bundleBounds.h > 0)], []),
            step('G05', 'geometry', 'Overlay vertices', firstFrameImage, {
                relevantStarPositions,
            }, [check('relevant_star_positions_available', Object.keys(relevantStarPositions).length > 0)], []),
            step('G06', 'geometry', 'Split frontier segments', firstFrameImage, frontierDiffSummary, [check('frontier_diff_available', Object.values(frontierDiffSummary).some((value) => Number(value) > 0))], []),
            step('G07', 'geometry', 'Segment classification', firstFrameImage, {
                sharedSegments: frontierDiffSummary.static,
                preChangedSegments: frontierDiffSummary.removed,
                postChangedSegments: frontierDiffSummary.appeared,
                driftedSegments: frontierDiffSummary.drifted,
            }, [check('classification_counts_non_negative', Object.values(frontierDiffSummary).every((value) => Number(value) >= 0))], []),
            step('T01', 'transition', 'Change anchor detection', firstFrameImage, {
                transitionFrameCount: bundle.transitionFrames?.length ?? 0,
                transitionEnvelope: bundle.context.transition.envelope ?? null,
            }, [check('transition_capture_available', Boolean(bundle.transitionFrames?.length))], []),
            step('T02', 'transition', 'Conquest front extraction', firstFrameImage, {
                conquestEvents: bundle.conquestEvents,
            }, [check('conquest_front_available', bundle.conquestEvents.length > 0)], []),
            step('T03', 'transition', 'Transition vertex sampling', firstFrameImage, {
                selectedFrames,
            }, [check('selected_intermediate_frames_available', selectedFrames.length > 0)], []),
            step('T04', 'transition', 'Transition front construction', lastFrameImage, {
                transitionId: bundle.meta.transitionId,
                captureDiagnostics: legacyManifest.captureDiagnostics ?? null,
            }, [check('transition_id_available', Boolean(bundle.meta.transitionId))], []),
            step('T05', 'transition', 'Path construction', lastFrameImage, {
                modes: bundle.meta.modes,
            }, [check('mode_summary_available', true)], []),
            step('R01', 'render', 'TransientTransitionFrontline evaluation', firstFrameImage, {
                selectedFrames: selectedFrames.map((frame) => ({ progress: frame.progress, filename: frame.filename })),
            }, [check('transition_progress_samples_present', selectedFrames.length > 0)], []),
            step('R02', 'render', 'Adjacent loop rebuild', lastFrameImage, {
                previousGeometryVersion: bundle.context.previousGeometry?.version ?? null,
                nextGeometryVersion: bundle.context.nextGeometry.version,
            }, [check('geometry_versions_present', Boolean(bundle.context.nextGeometry.version))], []),
            step('R03', 'render', 'Current frame render', lastFrameImage, {
                frameCount: bundle.transitionFrames?.length ?? 0,
            }, [check('current_frame_image_available', Boolean(lastFrameImage))], []),
            step('R04', 'render', 'Final POST compare', 'render/next.png', finalCompare, [
                check('final_frame_within_tolerance', Boolean(finalCompare.withinTolerance), finalCompare),
            ], [
                failIf('final_frame_out_of_tolerance', finalCompare.available === true && finalCompare.withinTolerance !== true, finalCompare),
            ]),
        ],
        legacyManifest,
    };
}

export function buildDiagnosticBundleForInspection(
    bundle: TransitionDebugBundle,
): Record<string, unknown> {
    return buildDiagnosticBundleV1(
        bundle,
        selectDiagnosticIntermediateFrames(bundle.transitionFrames),
    );
}

function buildDiagnosticReadme(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
): string {
    const evt = bundle.conquestEvents[0];
    const conquestLine = evt
        ? `Conquest: ${evt.starId} ${evt.previousOwner} -> ${evt.newOwner}`
        : 'Conquest: unavailable';
    const renderFrameLines = selectedFrames.length
        ? selectedFrames.map(
              (frame) =>
                  `- render/${frame.filename} (progress=${frame.progress.toFixed(3)})`,
          )
        : ['- No intermediate transition frames were captured for this bundle.'];

    return [
        '# Transition Diagnostic Package',
        '',
        'Schema: pv-transition-diagnostics-v1',
        `Bundle ID: ${bundle.id}`,
        `Timestamp: ${bundle.timestamp}`,
        conquestLine,
        '',
        'Directories:',
        '- render/: captured images for previous, intermediate, and next frames',
        '- debug/: compact geometry, topology, and capture metadata',
        '',
        'Render files:',
        '- render/prev.png',
        ...renderFrameLines,
        '- render/next.png',
        '',
        'Debug files:',
        '- debug/diagnostic.json',
        '- debug/topology.json',
        '- debug/geometry_snapshot.json',
        '',
        'debug/diagnostic.json contains compact previous/next geometry, topology summaries, conquest metadata, modes, and capture diagnostics.',
    ].join('\n');
}

async function addCanvasToZip(zip: JSZip, path: string, canvas: HTMLCanvasElement): Promise<void> {
    const blob = await canvasToBlob(canvas);
    zip.file(path, await blob.arrayBuffer());
}

export async function downloadBundle(
    bundle: TransitionDebugBundle,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    const prefix = filePrefixFromIsoTimestamp(bundle.timestamp);
    const perimeterDiagnostics = isPerimeterFieldLiveCaptureDiagnostics(
        bundle.extraDiagnostics,
    )
        ? bundle.extraDiagnostics
        : null;
    const panels: { label: string; canvas: HTMLCanvasElement }[] = [];

    if (bundle.prevCanvas) {
        const prevCanvas =
            renderPerimeterFieldExportCanvas({
                baseCanvas: bundle.prevCanvas,
                snapshot: perimeterDiagnostics?.previousFrame.fullSnapshot ?? null,
            }) ?? bundle.prevCanvas;
        panels.push({ label: 'Previous geometry', canvas: prevCanvas });
        triggerDownload(await canvasToBlob(prevCanvas), `${prefix}_prev-geometry.png`);
    }

    if (bundle.nextCanvas) {
        const nextCanvas =
            renderPerimeterFieldExportCanvas({
                baseCanvas: bundle.nextCanvas,
                snapshot: perimeterDiagnostics?.nextFrame.fullSnapshot ?? null,
            }) ?? bundle.nextCanvas;
        panels.push({ label: 'Next geometry', canvas: nextCanvas });
        triggerDownload(await canvasToBlob(nextCanvas), `${prefix}_next-geometry.png`);
    }

    if (bundle.nextCanvas) {
        const nextBitmap = await canvasToImageBitmap(bundle.nextCanvas);
        const overlayCanvas = compositeOverlayOnScreenshot(
            nextBitmap,
            bundle.frontierDiff,
            bundle.conquestEvents,
            starPositions,
        );
        nextBitmap.close();
        panels.push({ label: 'Polyline diff overlay', canvas: overlayCanvas });
        triggerDownload(await canvasToBlob(overlayCanvas), `${prefix}_frontier-diff-overlay.png`);
    }

    if (panels.length > 0) {
        const composite = buildCompositeSheet(panels);
        triggerDownload(await canvasToBlob(composite), `${prefix}_composite.png`);
    }

    if (bundle.transitionFrames && bundle.transitionFrames.length > 0) {
        for (let i = 0; i < bundle.transitionFrames.length; i++) {
            const { progress, canvas } = bundle.transitionFrames[i];
            const transitionCanvas =
                renderPerimeterFieldExportCanvas({
                    baseCanvas: canvas,
                    snapshot:
                        perimeterDiagnostics?.transitionFrames[i]?.fullSnapshot ??
                        null,
                }) ?? canvas;
            const pctString = Math.round(progress * 100).toString().padStart(3, '0');
            triggerDownload(
                await canvasToBlob(transitionCanvas),
                `${prefix}_frame_${String(i).padStart(2, '0')}_t${pctString}.png`,
            );
            await new Promise((resolve) => setTimeout(resolve, 80));
        }
    }

    triggerDownload(
        new Blob([JSON.stringify(bundle.meta, null, 2)], { type: 'application/json' }),
        `${prefix}_meta.json`,
    );

    triggerDownload(
        new Blob([JSON.stringify(serializeTopologyPairCompact(bundle), null, 2)], {
            type: 'application/json',
        }),
        `${prefix}_topology.json`,
    );

    const compactGeometry = {
        exportKind: perimeterDiagnostics
            ? ('perimeter_field_compact' as const)
            : ('compact' as const),
        polylineDiffSemantics: bundle.meta.polylineDiffSemantics,
        conquestEvents: bundle.context.conquestEvents,
        previousGeometry: perimeterDiagnostics
            ? compactPerimeterFieldGeometry(
                  bundle.context.previousGeometry ?? null,
                  buildAffectedOwnerSet(bundle),
              )
            : compactGeometrySnapshotForExport(
                  bundle.context.previousGeometry ?? null,
              ),
        nextGeometry: perimeterDiagnostics
            ? compactPerimeterFieldGeometry(
                  bundle.context.nextGeometry,
                  buildAffectedOwnerSet(bundle),
              )
            : compactGeometrySnapshotForExport(bundle.context.nextGeometry),
        captureDiagnostics: perimeterDiagnostics
            ? buildDiagnosticManifest(
                  bundle,
                  selectDiagnosticIntermediateFrames(bundle.transitionFrames),
              ).captureDiagnostics
            : bundle.extraDiagnostics,
    };
    const geometryString = JSON.stringify(
        compactGeometry,
        (_key, value) => (value instanceof Map ? Object.fromEntries(value) : value),
        2,
    );
    triggerDownload(
        new Blob([geometryString], { type: 'application/json' }),
        `${prefix}_geometry_snapshot.json`,
    );

    console.log(
        `[SnapshotRecorder] downloaded bundle: ${prefix} (${panels.length} panels + json; compact geo ~${geometryString.length} chars)`,
    );
}

export async function downloadDiagnosticPackage(
    bundle: TransitionDebugBundle,
): Promise<void> {
    const prefix = filePrefixFromIsoTimestamp(bundle.timestamp);
    const zip = new JSZip();
    const selectedFrames = selectDiagnosticIntermediateFrames(bundle.transitionFrames);
    const diagnosticBundle = buildDiagnosticBundleV1(bundle, selectedFrames);
    const perimeterDiagnostics = isPerimeterFieldLiveCaptureDiagnostics(
        bundle.extraDiagnostics,
    )
        ? bundle.extraDiagnostics
        : null;
    const compactGeometry = {
        exportKind: perimeterDiagnostics
            ? ('perimeter_field_compact' as const)
            : ('compact' as const),
        polylineDiffSemantics: bundle.meta.polylineDiffSemantics,
        conquestEvents: bundle.context.conquestEvents,
        previousGeometry: perimeterDiagnostics
            ? compactPerimeterFieldGeometry(
                  bundle.context.previousGeometry ?? null,
                  buildAffectedOwnerSet(bundle),
              )
            : compactGeometrySnapshotForExport(
                  bundle.context.previousGeometry ?? null,
              ),
        nextGeometry: perimeterDiagnostics
            ? compactPerimeterFieldGeometry(
                  bundle.context.nextGeometry,
                  buildAffectedOwnerSet(bundle),
              )
            : compactGeometrySnapshotForExport(bundle.context.nextGeometry),
        captureDiagnostics: perimeterDiagnostics
            ? buildDiagnosticManifest(
                  bundle,
                  selectDiagnosticIntermediateFrames(bundle.transitionFrames),
              ).captureDiagnostics
            : bundle.extraDiagnostics,
    };

    zip.file('README.md', buildDiagnosticReadme(bundle, selectedFrames));
    zip.file(
        'debug/diagnostic.json',
        JSON.stringify(diagnosticBundle, null, 2),
    );
    zip.file(
        'debug/topology.json',
        JSON.stringify(serializeTopologyPairCompact(bundle), null, 2),
    );
    zip.file(
        'debug/geometry_snapshot.json',
        JSON.stringify(
            compactGeometry,
            (_key, value) => (value instanceof Map ? Object.fromEntries(value) : value),
            2,
        ),
    );

    if (bundle.prevCanvas) {
        const prevCanvas =
            renderPerimeterFieldExportCanvas({
                baseCanvas: bundle.prevCanvas,
                snapshot: perimeterDiagnostics?.previousFrame.fullSnapshot ?? null,
            }) ?? bundle.prevCanvas;
        await addCanvasToZip(zip, 'render/prev.png', prevCanvas);
    }

    for (const frame of selectedFrames) {
        const source = bundle.transitionFrames?.[frame.sourceIndex];
        if (!source) continue;
        const overlaySnapshot =
            perimeterDiagnostics?.transitionFrames[frame.sourceIndex]?.fullSnapshot ??
            null;
        const frameCanvas =
            renderPerimeterFieldExportCanvas({
                baseCanvas: source.canvas,
                snapshot: overlaySnapshot,
            }) ?? source.canvas;
        await addCanvasToZip(zip, `render/${frame.filename}`, frameCanvas);
    }

    if (bundle.nextCanvas) {
        const nextCanvas =
            renderPerimeterFieldExportCanvas({
                baseCanvas: bundle.nextCanvas,
                snapshot: perimeterDiagnostics?.nextFrame.fullSnapshot ?? null,
            }) ?? bundle.nextCanvas;
        await addCanvasToZip(zip, 'render/next.png', nextCanvas);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, `${prefix}_transition-diagnostic-package.zip`);
    console.log(
        `[SnapshotRecorder] downloaded diagnostic package: ${prefix} (${selectedFrames.length} intermediates)`,
    );
}

export async function downloadAllBundles(
    bundles: readonly TransitionDebugBundle[],
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    for (const bundle of bundles) {
        await downloadBundle(bundle, starPositions);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log(`[SnapshotRecorder] downloaded all ${bundles.length} bundles`);
}

export async function downloadAllDiagnosticPackages(
    bundles: readonly TransitionDebugBundle[],
): Promise<void> {
    for (const bundle of bundles) {
        await downloadDiagnosticPackage(bundle);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log(`[SnapshotRecorder] downloaded all ${bundles.length} diagnostic packages`);
}
