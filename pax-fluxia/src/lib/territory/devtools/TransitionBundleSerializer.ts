import JSZip from 'jszip';
import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { compositeOverlayOnScreenshot } from './TransitionDebugOverlay';
import {
    compactFrontierTopologyForExport,
    compactGeometrySnapshotForExport,
    formatLocalCaptureTimeFromIsoTimestamp,
} from './snapshotExport';
import {
    resolveTransitionDiagnosticsExportAdapter,
    type DiagnosticPackageFrameRef,
} from './TransitionDiagnosticsAdapters';
import {
    buildConquestFilePrefix,
    formatConquestEventGroupLabel,
} from './conquestNaming';
import { writable } from 'svelte/store';

export const DIAGNOSTIC_INTERMEDIATE_PROGRESS_VALUES = [
    1 / 6,
    2 / 6,
    3 / 6,
    4 / 6,
    5 / 6,
] as const;

type TransitionFrameEntry = NonNullable<TransitionDebugBundle['transitionFrames']>[number];

export interface DiagnosticPackageFrame extends DiagnosticPackageFrameRef {}

type ExportPermissionState = 'unknown' | 'granted' | 'prompt' | 'denied';

interface FileSystemPermissionDescriptorLike {
    mode?: 'read' | 'readwrite';
}

interface FileSystemWritableFileStreamLike {
    write(data: Blob | BufferSource | string): Promise<void>;
    close(): Promise<void>;
}

interface FileSystemFileHandleLike {
    createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

interface FileSystemDirectoryHandleLike {
    name: string;
    getFileHandle(
        name: string,
        options?: { create?: boolean },
    ): Promise<FileSystemFileHandleLike>;
    queryPermission?(
        descriptor?: FileSystemPermissionDescriptorLike,
    ): Promise<PermissionState>;
    requestPermission?(
        descriptor?: FileSystemPermissionDescriptorLike,
    ): Promise<PermissionState>;
}

interface WindowWithDirectoryPicker extends Window {
    showDirectoryPicker?: (options?: {
        mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandleLike>;
}

export interface DiagnosticExportTargetState {
    fsAccessSupported: boolean;
    mode: 'browser_downloads' | 'directory';
    directoryName: string | null;
    permission: ExportPermissionState;
}

const EXPORT_TARGET_DB_NAME = 'pax-transition-diagnostics';
const EXPORT_TARGET_STORE_NAME = 'export-targets';
const EXPORT_TARGET_KEY = 'diagnostic-export-directory';

const defaultExportTargetState: DiagnosticExportTargetState = {
    fsAccessSupported: false,
    mode: 'browser_downloads',
    directoryName: null,
    permission: 'unknown',
};

export const diagnosticExportTargetStore =
    writable<DiagnosticExportTargetState>(defaultExportTargetState);

let diagnosticExportDirectoryHandle: FileSystemDirectoryHandleLike | null = null;
let exportTargetLoadPromise: Promise<void> | null = null;

interface DiagnosticPackageManifest {
    exportKind: 'transition_diagnostic_package';
    bundleId: string;
    conquestLabel: string;
    timestamp: string;
    transitionId: string;
    conquestEvents: TransitionDebugBundle['conquestEvents'];
    debugFiles: {
        diagnostic: string;
        topology: string;
        geometrySnapshot: string;
    };
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

function supportsDirectoryExport(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof (window as WindowWithDirectoryPicker).showDirectoryPicker ===
            'function'
    );
}

function emitExportTargetState(
    permission: ExportPermissionState = 'unknown',
): void {
    diagnosticExportTargetStore.set({
        fsAccessSupported: supportsDirectoryExport(),
        mode: diagnosticExportDirectoryHandle
            ? 'directory'
            : 'browser_downloads',
        directoryName: diagnosticExportDirectoryHandle?.name ?? null,
        permission,
    });
}

function openExportTargetDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(EXPORT_TARGET_DB_NAME, 1);
        request.onerror = () =>
            reject(request.error ?? new Error('Failed to open export target DB'));
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(EXPORT_TARGET_STORE_NAME)) {
                db.createObjectStore(EXPORT_TARGET_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

async function readPersistedExportDirectoryHandle(): Promise<FileSystemDirectoryHandleLike | null> {
    if (typeof window === 'undefined' || !supportsDirectoryExport()) return null;
    if (!('indexedDB' in window)) return null;
    const db = await openExportTargetDb();
    try {
        return await new Promise<FileSystemDirectoryHandleLike | null>(
            (resolve, reject) => {
                const tx = db.transaction(EXPORT_TARGET_STORE_NAME, 'readonly');
                const store = tx.objectStore(EXPORT_TARGET_STORE_NAME);
                const request = store.get(EXPORT_TARGET_KEY);
                request.onerror = () =>
                    reject(
                        request.error ??
                            new Error('Failed to read export directory handle'),
                    );
                request.onsuccess = () =>
                    resolve(
                        (request.result as FileSystemDirectoryHandleLike | null) ??
                            null,
                    );
            },
        );
    } finally {
        db.close();
    }
}

async function persistExportDirectoryHandle(
    handle: FileSystemDirectoryHandleLike | null,
): Promise<void> {
    if (typeof window === 'undefined' || !supportsDirectoryExport()) return;
    if (!('indexedDB' in window)) return;
    const db = await openExportTargetDb();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(EXPORT_TARGET_STORE_NAME, 'readwrite');
            const store = tx.objectStore(EXPORT_TARGET_STORE_NAME);
            const request = handle
                ? store.put(handle, EXPORT_TARGET_KEY)
                : store.delete(EXPORT_TARGET_KEY);
            request.onerror = () =>
                reject(
                    request.error ??
                        new Error('Failed to persist export directory handle'),
                );
            tx.oncomplete = () => resolve();
            tx.onerror = () =>
                reject(tx.error ?? new Error('Failed to commit export target DB transaction'));
        });
    } finally {
        db.close();
    }
}

async function ensureWritableDirectoryPermission(
    handle: FileSystemDirectoryHandleLike,
): Promise<ExportPermissionState> {
    const descriptor: FileSystemPermissionDescriptorLike = {
        mode: 'readwrite',
    };
    const queried = handle.queryPermission
        ? await handle.queryPermission(descriptor)
        : 'prompt';
    if (queried === 'granted') return 'granted';
    if (!handle.requestPermission) return queried as ExportPermissionState;
    const requested = await handle.requestPermission(descriptor);
    if (requested === 'granted') return 'granted';
    return requested as ExportPermissionState;
}

async function ensureExportTargetLoaded(): Promise<void> {
    if (!supportsDirectoryExport()) {
        emitExportTargetState();
        return;
    }
    if (!exportTargetLoadPromise) {
        exportTargetLoadPromise = (async () => {
            diagnosticExportDirectoryHandle =
                await readPersistedExportDirectoryHandle();
            let permission: ExportPermissionState = 'unknown';
            if (diagnosticExportDirectoryHandle) {
                permission = await ensureWritableDirectoryPermission(
                    diagnosticExportDirectoryHandle,
                );
                if (permission !== 'granted') {
                    diagnosticExportDirectoryHandle = null;
                    await persistExportDirectoryHandle(null);
                }
            }
            emitExportTargetState(permission);
        })();
    }
    await exportTargetLoadPromise;
}

async function writeBlobToDirectory(
    handle: FileSystemDirectoryHandleLike,
    filename: string,
    blob: Blob,
): Promise<void> {
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

async function saveExportBlob(blob: Blob, filename: string): Promise<void> {
    await ensureExportTargetLoaded();
    if (diagnosticExportDirectoryHandle) {
        const permission = await ensureWritableDirectoryPermission(
            diagnosticExportDirectoryHandle,
        );
        if (permission === 'granted') {
            await writeBlobToDirectory(
                diagnosticExportDirectoryHandle,
                filename,
                blob,
            );
            emitExportTargetState(permission);
            return;
        }
        diagnosticExportDirectoryHandle = null;
        await persistExportDirectoryHandle(null);
        emitExportTargetState(permission);
    }
    triggerDownload(blob, filename);
}

export async function chooseDiagnosticExportDirectory(): Promise<void> {
    const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
    if (!picker) {
        throw new Error('Directory export is not supported in this browser');
    }
    const handle = await picker({ mode: 'readwrite' });
    const permission = await ensureWritableDirectoryPermission(handle);
    if (permission !== 'granted') {
        emitExportTargetState(permission);
        throw new Error('Write permission was not granted for the export folder');
    }
    diagnosticExportDirectoryHandle = handle;
    await persistExportDirectoryHandle(handle);
    emitExportTargetState(permission);
}

export async function clearDiagnosticExportDirectory(): Promise<void> {
    diagnosticExportDirectoryHandle = null;
    await persistExportDirectoryHandle(null);
    emitExportTargetState();
}

void ensureExportTargetLoaded();

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

    for (let index = 0; index < panels.length; index += 1) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * panelWidth;
        const y = row * (panelHeight + labelHeight);

        ctx.fillStyle = '#222222';
        ctx.fillRect(x, y, panelWidth, labelHeight);
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#cccccc';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(panels[index].label, x + 8, y + labelHeight / 2);
        ctx.drawImage(panels[index].canvas, x, y + labelHeight);
    }

    return composite;
}

function serializeTopologyPairCompact(bundle: TransitionDebugBundle) {
    return {
        conquestEvents: bundle.context.conquestEvents,
        exportNote:
            'Compact: section points are downsampled; use pointsSampled and bounds.',
        prevTopology: compactFrontierTopologyForExport(
            bundle.context.previousGeometry?.frontierTopology ?? null,
        ),
        nextTopology: compactFrontierTopologyForExport(
            bundle.context.nextGeometry?.frontierTopology ?? null,
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

function buildDiagnosticDebugFileNames(
    bundle: TransitionDebugBundle,
): DiagnosticPackageManifest['debugFiles'] {
    const prefix = buildConquestFilePrefix(bundle.timestamp, bundle.conquestEvents);
    return {
        diagnostic: `${prefix}_diag.json`,
        topology: `${prefix}_topo.json`,
        geometrySnapshot: `${prefix}_geo.json`,
    };
}

function buildDiagnosticManifest(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
): DiagnosticPackageManifest {
    const adapter = resolveTransitionDiagnosticsExportAdapter(bundle.extraDiagnostics);
    const adapterData = adapter?.buildData(bundle, selectedFrames);
    const debugFiles = buildDiagnosticDebugFileNames(bundle);

    return {
        exportKind: 'transition_diagnostic_package',
        bundleId: bundle.id,
        conquestLabel: formatConquestEventGroupLabel(bundle.conquestEvents),
        timestamp: bundle.timestamp,
        transitionId: bundle.meta.transitionId,
        conquestEvents: bundle.conquestEvents,
        debugFiles,
        selectedFrames: [...selectedFrames],
        notes: [
            'Package contains PREV, NEXT, and up to 5 evenly spaced intermediate transition frames.',
            'Geometry and topology are compact exports intended for deterministic diagnosis and human inspection.',
            'If fewer than 5 interior transition frames were captured, selectedFrames contains the available subset.',
        ],
        modes: bundle.meta.modes,
        previousOwnershipVersion: bundle.meta.prevOwnershipVersion,
        nextOwnershipVersion: bundle.meta.nextOwnershipVersion,
        previousGeometry:
            adapterData?.previousGeometry ??
            compactGeometrySnapshotForExport(bundle.context.previousGeometry ?? null),
        nextGeometry:
            adapterData?.nextGeometry ??
            compactGeometrySnapshotForExport(bundle.context.nextGeometry),
        previousTopology:
            adapterData?.previousTopology ??
            compactFrontierTopologyForExport(
                bundle.context.previousGeometry?.frontierTopology ?? null,
            ),
        nextTopology:
            adapterData?.nextTopology ??
            compactFrontierTopologyForExport(
                bundle.context.nextGeometry?.frontierTopology ?? null,
            ),
        starPositions:
            adapterData?.starPositions ?? serializeStarPositions(bundle.starPositions),
        captureDiagnostics: adapterData?.captureDiagnostics ?? bundle.extraDiagnostics,
    };
}

export function buildDiagnosticBundleForInspection(
    bundle: TransitionDebugBundle,
): Record<string, unknown> {
    return buildDiagnosticManifest(
        bundle,
        selectDiagnosticIntermediateFrames(bundle.transitionFrames),
    ) as unknown as Record<string, unknown>;
}

function buildDiagnosticReadme(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
): string {
    const debugFiles = buildDiagnosticDebugFileNames(bundle);
    const conquestLine = bundle.conquestEvents.length
        ? `Conquest: ${formatConquestEventGroupLabel(bundle.conquestEvents)}`
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
        `Captured: ${formatLocalCaptureTimeFromIsoTimestamp(bundle.timestamp)}`,
        `Captured ISO: ${bundle.timestamp}`,
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
        `- debug/${debugFiles.diagnostic}`,
        `- debug/${debugFiles.topology}`,
        `- debug/${debugFiles.geometrySnapshot}`,
        '',
        `debug/${debugFiles.diagnostic} contains compact previous/next geometry, topology summaries, conquest metadata, modes, and capture diagnostics.`,
    ].join('\n');
}

async function addCanvasToZip(
    zip: JSZip,
    path: string,
    canvas: HTMLCanvasElement,
): Promise<void> {
    const blob = await canvasToBlob(canvas);
    zip.file(path, await blob.arrayBuffer());
}

function buildCompactGeometryExport(
    bundle: TransitionDebugBundle,
    selectedFrames: readonly DiagnosticPackageFrame[],
) {
    const adapter = resolveTransitionDiagnosticsExportAdapter(bundle.extraDiagnostics);
    const adapterData = adapter?.buildData(bundle, selectedFrames);
    return {
        exportKind: adapterData?.exportKind ?? 'compact',
        polylineDiffSemantics: bundle.meta.polylineDiffSemantics,
        conquestEvents: bundle.context.conquestEvents,
        previousGeometry:
            adapterData?.previousGeometry ??
            compactGeometrySnapshotForExport(bundle.context.previousGeometry ?? null),
        nextGeometry:
            adapterData?.nextGeometry ??
            compactGeometrySnapshotForExport(bundle.context.nextGeometry),
        captureDiagnostics: adapterData?.captureDiagnostics ?? bundle.extraDiagnostics,
    };
}

function renderExportCanvas(
    bundle: TransitionDebugBundle,
    baseCanvas: HTMLCanvasElement | null,
    phase: 'previous' | 'next' | 'transition',
    sourceIndex?: number,
): HTMLCanvasElement | null {
    const adapter = resolveTransitionDiagnosticsExportAdapter(bundle.extraDiagnostics);
    if (!adapter) return baseCanvas;
    return adapter.renderCanvas({
        baseCanvas,
        diagnostics: bundle.extraDiagnostics,
        phase,
        sourceIndex,
    });
}

export async function downloadBundle(
    bundle: TransitionDebugBundle,
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    const prefix = buildConquestFilePrefix(bundle.timestamp, bundle.conquestEvents);
    const panels: { label: string; canvas: HTMLCanvasElement }[] = [];

    if (bundle.prevCanvas) {
        const prevCanvas =
            renderExportCanvas(bundle, bundle.prevCanvas, 'previous') ??
            bundle.prevCanvas;
        panels.push({ label: 'Previous geometry', canvas: prevCanvas });
        await saveExportBlob(
            await canvasToBlob(prevCanvas),
            `${prefix}_prev-geometry.png`,
        );
    }

    if (bundle.nextCanvas) {
        const nextCanvas =
            renderExportCanvas(bundle, bundle.nextCanvas, 'next') ??
            bundle.nextCanvas;
        panels.push({ label: 'Next geometry', canvas: nextCanvas });
        await saveExportBlob(
            await canvasToBlob(nextCanvas),
            `${prefix}_next-geometry.png`,
        );
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
        await saveExportBlob(
            await canvasToBlob(overlayCanvas),
            `${prefix}_frontier-diff-overlay.png`,
        );
    }

    if (panels.length > 0) {
        const composite = buildCompositeSheet(panels);
        await saveExportBlob(
            await canvasToBlob(composite),
            `${prefix}_composite.png`,
        );
    }

    if (bundle.transitionFrames && bundle.transitionFrames.length > 0) {
        for (let index = 0; index < bundle.transitionFrames.length; index += 1) {
            const { progress, canvas } = bundle.transitionFrames[index];
            const transitionCanvas =
                renderExportCanvas(bundle, canvas, 'transition', index) ?? canvas;
            const pctString = Math.round(progress * 100).toString().padStart(3, '0');
            await saveExportBlob(
                await canvasToBlob(transitionCanvas),
                `${prefix}_frame_${String(index).padStart(2, '0')}_t${pctString}.png`,
            );
            await new Promise((resolve) => setTimeout(resolve, 80));
        }
    }

    await saveExportBlob(
        new Blob([JSON.stringify(bundle.meta, null, 2)], {
            type: 'application/json',
        }),
        `${prefix}_meta.json`,
    );
    await saveExportBlob(
        new Blob([JSON.stringify(serializeTopologyPairCompact(bundle), null, 2)], {
            type: 'application/json',
        }),
        `${prefix}_topo.json`,
    );

    const compactGeometry = buildCompactGeometryExport(
        bundle,
        selectDiagnosticIntermediateFrames(bundle.transitionFrames),
    );
    const geometryString = JSON.stringify(
        compactGeometry,
        (_key, value) => (value instanceof Map ? Object.fromEntries(value) : value),
        2,
    );
    await saveExportBlob(
        new Blob([geometryString], { type: 'application/json' }),
        `${prefix}_geo.json`,
    );
}

export async function downloadDiagnosticPackage(
    bundle: TransitionDebugBundle,
): Promise<void> {
    const prefix = buildConquestFilePrefix(bundle.timestamp, bundle.conquestEvents);
    const zip = new JSZip();
    const selectedFrames = selectDiagnosticIntermediateFrames(bundle.transitionFrames);
    const manifest = buildDiagnosticManifest(bundle, selectedFrames);
    const compactGeometry = buildCompactGeometryExport(bundle, selectedFrames);
    const debugFiles = buildDiagnosticDebugFileNames(bundle);

    zip.file('README.md', buildDiagnosticReadme(bundle, selectedFrames));
    zip.file(`debug/${debugFiles.diagnostic}`, JSON.stringify(manifest, null, 2));
    zip.file(
        `debug/${debugFiles.topology}`,
        JSON.stringify(serializeTopologyPairCompact(bundle), null, 2),
    );
    zip.file(
        `debug/${debugFiles.geometrySnapshot}`,
        JSON.stringify(
            compactGeometry,
            (_key, value) => (value instanceof Map ? Object.fromEntries(value) : value),
            2,
        ),
    );

    if (bundle.prevCanvas) {
        const prevCanvas =
            renderExportCanvas(bundle, bundle.prevCanvas, 'previous') ??
            bundle.prevCanvas;
        await addCanvasToZip(zip, 'render/prev.png', prevCanvas);
    }

    for (const frame of selectedFrames) {
        const source = bundle.transitionFrames?.[frame.sourceIndex];
        if (!source) continue;
        const frameCanvas =
            renderExportCanvas(
                bundle,
                source.canvas,
                'transition',
                frame.sourceIndex,
            ) ?? source.canvas;
        await addCanvasToZip(zip, `render/${frame.filename}`, frameCanvas);
    }

    if (bundle.nextCanvas) {
        const nextCanvas =
            renderExportCanvas(bundle, bundle.nextCanvas, 'next') ??
            bundle.nextCanvas;
        await addCanvasToZip(zip, 'render/next.png', nextCanvas);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    await saveExportBlob(blob, `${prefix}_tdp.zip`);
}

export async function downloadAllBundles(
    bundles: readonly TransitionDebugBundle[],
    starPositions: ReadonlyMap<string, { x: number; y: number }>,
): Promise<void> {
    for (const bundle of bundles) {
        await downloadBundle(bundle, starPositions);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
}

export async function downloadAllDiagnosticPackages(
    bundles: readonly TransitionDebugBundle[],
): Promise<void> {
    for (const bundle of bundles) {
        await downloadDiagnosticPackage(bundle);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
}
