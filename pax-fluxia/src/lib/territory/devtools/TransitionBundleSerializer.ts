import JSZip from 'jszip';
import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { compositeOverlayOnScreenshot } from './TransitionDebugOverlay';
import { renderPerimeterFieldDiagnosticCanvas } from '../families/perimeterField/perimeterFieldDiagnostics';
import type { PerimeterFieldDebugSnapshot } from '../families/perimeterField/buildPerimeterFieldScene';
import type { PerimeterFieldSnapshotMode } from '../families/perimeterField/perimeterFieldDiagnostics';
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
    snapshotMode?: PerimeterFieldSnapshotMode;
}): HTMLCanvasElement | null {
    if (!args.baseCanvas) return null;
    if (!args.snapshot) return args.baseCanvas;
    return renderPerimeterFieldDiagnosticCanvas({
        width: args.baseCanvas.width,
        height: args.baseCanvas.height,
        snapshot: args.snapshot,
        baseCanvas: args.baseCanvas,
        snapshotMode: args.snapshotMode,
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
                    snapshotMode: 'transition',
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
    const manifest = buildDiagnosticManifest(bundle, selectedFrames);
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
    zip.file('debug/diagnostic.json', JSON.stringify(manifest, null, 2));
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
                snapshotMode: 'prev',
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
                snapshotMode: 'transition',
            }) ?? source.canvas;
        await addCanvasToZip(zip, `render/${frame.filename}`, frameCanvas);
    }

    if (bundle.nextCanvas) {
        const nextCanvas =
            renderPerimeterFieldExportCanvas({
                baseCanvas: bundle.nextCanvas,
                snapshot: perimeterDiagnostics?.nextFrame.fullSnapshot ?? null,
                snapshotMode: 'next',
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
