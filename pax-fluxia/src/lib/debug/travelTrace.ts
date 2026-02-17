// ============================================================================
// Travel Trace — Microscopic instrumentation for ship travel lifecycle
// ============================================================================
// Arms on demand, captures ONE tick of transfer + all subsequent frames for
// those ships through departing → traveling → orbiting → settled.
// Writes structured trace data downloadable as a markdown file.
// ============================================================================

export interface TraceEntry {
    timestamp: number;       // performance.now()
    phase: string;           // 'transfer-setup' | 'depart-frame' | 'depart→travel' | 'travel-frame' | 'travel→orbit' | 'settle-frame'
    shipId: number;
    elapsed: number;         // elapsed ms used by the behavior
    progress?: number;       // 0-1 progress within the phase
    x: number;
    y: number;
    scale?: number;
    alpha?: number;
    extra?: Record<string, any>;  // phase-specific data
}

interface TraceState {
    armed: boolean;          // waiting for next transfer event
    capturing: boolean;      // actively recording
    trackedShipIds: Set<number>;  // ships being tracked
    entries: TraceEntry[];
    transferMeta: Record<string, any> | null;  // lane geometry, timing etc.
    settledCount: number;    // how many tracked ships have finished settling
    frameCount: number;      // total frames captured
    lastPos: Map<number, { x: number; y: number; phase: string }>;  // dedup
    phaseFrameCount: Map<string, number>;  // per-phase frame counter for sampling
}

const state: TraceState = {
    armed: false,
    capturing: false,
    trackedShipIds: new Set(),
    entries: [],
    transferMeta: null,
    settledCount: 0,
    frameCount: 0,
    lastPos: new Map(),
    phaseFrameCount: new Map(),
};

// Sample every Nth frame per phase to keep output small
const FRAME_SAMPLE_RATE = 10;  // log 1 in every 10 frames
const MAX_ENTRIES_PER_SHIP = 200;

/** Arm the trace — next transfer event will start capture */
export function armTrace(): void {
    state.armed = true;
    state.capturing = false;
    state.trackedShipIds.clear();
    state.entries = [];
    state.transferMeta = null;
    state.settledCount = 0;
    state.frameCount = 0;
    state.lastPos.clear();
    state.phaseFrameCount.clear();
    console.log('[TRACE] Armed — waiting for next transfer event');
}

/** Check if trace is armed (waiting for transfer) */
export function isTraceArmed(): boolean {
    return state.armed;
}

/** Check if trace is actively capturing */
export function isTraceCapturing(): boolean {
    return state.capturing;
}

/** Is this ship being traced? */
export function isTrackedShip(shipId: number): boolean {
    return state.capturing && state.trackedShipIds.has(shipId);
}

// ── Recording functions ─────────────────────────────────────────────────────

/** Called by transferHandler when a transfer event fires */
export function traceTransferSetup(meta: {
    sourceId: string;
    targetId: string;
    sourceX: number; sourceY: number; sourceRadius: number;
    targetX: number; targetY: number; targetRadius: number;
    laneStartX: number; laneStartY: number;
    laneEndX: number; laneEndY: number;
    halfTick: number;
    departDuration: number;
    travelDuration: number;
    departFraction: number;
    convergencePoint: number;
    convergence: number;
    shipsToMove: number;
    streamMode: boolean;
    streamInterval: number;
    shipDetails: Array<{
        id: number;
        departFromX: number; departFromY: number;
        laneStartX: number; laneStartY: number;
        laneEndX: number; laneEndY: number;
        laneOffset: number;
        departTime: number;
    }>;
}): void {
    if (!state.armed) return;

    state.armed = false;
    state.capturing = true;
    state.transferMeta = meta;
    state.trackedShipIds.clear();

    for (const s of meta.shipDetails) {
        state.trackedShipIds.add(s.id);
        state.entries.push({
            timestamp: performance.now(),
            phase: 'transfer-setup',
            shipId: s.id,
            elapsed: 0,
            x: s.departFromX,
            y: s.departFromY,
            extra: {
                laneStartX: s.laneStartX, laneStartY: s.laneStartY,
                laneEndX: s.laneEndX, laneEndY: s.laneEndY,
                laneOffset: s.laneOffset,
                departTime: s.departTime,
            },
        });
    }

    console.log(`[TRACE] Capturing ${meta.shipDetails.length} ships: ${meta.sourceId} → ${meta.targetId}`);
}

/** Should we sample this frame? Dedup frozen positions + sample every Nth */
function shouldSampleFrame(shipId: number, phase: string, x: number, y: number): boolean {
    const key = `${shipId}-${phase}`;
    const count = (state.phaseFrameCount.get(key) || 0) + 1;
    state.phaseFrameCount.set(key, count);

    // Dedup: skip if position hasn't changed
    const last = state.lastPos.get(shipId);
    if (last && last.phase === phase && Math.abs(last.x - x) < 0.01 && Math.abs(last.y - y) < 0.01) {
        return false;
    }
    state.lastPos.set(shipId, { x, y, phase });

    // Per-ship cap
    const shipEntryCount = state.entries.filter(e => e.shipId === shipId).length;
    if (shipEntryCount >= MAX_ENTRIES_PER_SHIP) return false;

    // Sample every Nth frame
    return count % FRAME_SAMPLE_RATE === 1 || count <= 2; // always log first 2 frames
}

/** Called each frame a tracked ship is in 'departing' state */
export function traceDepartFrame(shipId: number, elapsed: number, progress: number, x: number, y: number, scale: number, alpha: number): void {
    if (!state.capturing || !state.trackedShipIds.has(shipId)) return;
    state.frameCount++;
    if (!shouldSampleFrame(shipId, 'depart', x, y)) return;
    state.entries.push({
        timestamp: performance.now(), phase: 'depart-frame', shipId, elapsed, progress, x, y, scale, alpha,
    });
}

/** Called at the depart→travel transition */
export function traceDepartToTravel(shipId: number, x: number, y: number, mode: string, extra?: Record<string, any>): void {
    if (!state.capturing || !state.trackedShipIds.has(shipId)) return;
    state.entries.push({
        timestamp: performance.now(), phase: 'depart→travel', shipId, elapsed: 0, x, y,
        extra: { mode, ...extra },
    });
}

/** Called each frame a tracked ship is in 'traveling' state */
export function traceTravelFrame(shipId: number, elapsed: number, progress: number, x: number, y: number, scale: number, alpha: number, extra?: Record<string, any>): void {
    if (!state.capturing || !state.trackedShipIds.has(shipId)) return;
    state.frameCount++;
    if (!shouldSampleFrame(shipId, 'travel', x, y)) return;
    state.entries.push({
        timestamp: performance.now(), phase: 'travel-frame', shipId, elapsed, progress, x, y, scale, alpha, extra,
    });
}

/** Called at the travel→orbit transition */
export function traceTravelToOrbit(shipId: number, x: number, y: number, settleAngle: number, settleRadius: number, destStarX: number, destStarY: number): void {
    if (!state.capturing || !state.trackedShipIds.has(shipId)) return;
    state.entries.push({
        timestamp: performance.now(), phase: 'travel→orbit', shipId, elapsed: 0, x, y,
        extra: { settleAngle, settleRadius, destStarX, destStarY },
    });
}

/** Called each frame during orbit settle */
export function traceSettleFrame(shipId: number, elapsed: number, t: number, x: number, y: number, targetX: number, targetY: number): void {
    if (!state.capturing || !state.trackedShipIds.has(shipId)) return;
    state.frameCount++;
    if (!shouldSampleFrame(shipId, 'settle', x, y)) return;
    state.entries.push({
        timestamp: performance.now(), phase: 'settle-frame', shipId, elapsed, progress: t, x, y,
        extra: { targetX, targetY },
    });

    if (t >= 1) {
        state.settledCount++;
        if (state.settledCount >= state.trackedShipIds.size) {
            finishCapture();
        }
    }
}

// ── Output ──────────────────────────────────────────────────────────────────

function finishCapture(): void {
    state.capturing = false;
    console.log(`[TRACE] Capture complete: ${state.entries.length} entries, ${state.frameCount} frames`);
    downloadTrace();
}

/** Force-stop and download whatever we have */
export function forceDownloadTrace(): void {
    state.capturing = false;
    state.armed = false;
    downloadTrace();
}

function downloadTrace(): void {
    const md = formatTraceMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-trace-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[TRACE] Downloaded trace file');
}

function formatTraceMarkdown(): string {
    const meta = state.transferMeta;
    const lines: string[] = [];

    lines.push('# Travel Trace — Captured Data');
    lines.push(`Captured at: ${new Date().toISOString()}`);
    lines.push(`Total entries: ${state.entries.length} | Frames: ${state.frameCount}`);
    lines.push('');

    if (meta) {
        lines.push('## Transfer Setup');
        lines.push(`- **Route**: \`${meta.sourceId}\` → \`${meta.targetId}\``);
        lines.push(`- **Source**: (${meta.sourceX.toFixed(1)}, ${meta.sourceY.toFixed(1)}) r=${meta.sourceRadius}`);
        lines.push(`- **Target**: (${meta.targetX.toFixed(1)}, ${meta.targetY.toFixed(1)}) r=${meta.targetRadius}`);
        lines.push(`- **Lane start**: (${meta.laneStartX.toFixed(1)}, ${meta.laneStartY.toFixed(1)})`);
        lines.push(`- **Lane end**: (${meta.laneEndX.toFixed(1)}, ${meta.laneEndY.toFixed(1)})`);
        lines.push(`- **Timing**: halfTick=${meta.halfTick.toFixed(0)}ms, depart=${meta.departDuration.toFixed(0)}ms, travel=${meta.travelDuration.toFixed(0)}ms`);
        lines.push(`- **departFraction**: ${meta.departFraction}`);
        lines.push(`- **convergence**: ${meta.convergence}, convergencePoint: ${meta.convergencePoint}`);
        lines.push(`- **Stream mode**: ${meta.streamMode}, interval=${meta.streamInterval.toFixed(0)}ms`);
        lines.push(`- **Ships**: ${meta.shipsToMove}`);
        lines.push('');
    }

    // Group entries by ship
    const shipIds = [...state.trackedShipIds].sort((a, b) => a - b);

    for (const sid of shipIds) {
        const shipEntries = state.entries.filter(e => e.shipId === sid);
        lines.push(`## Ship ${sid}`);
        lines.push('');

        // Setup entry
        const setup = shipEntries.find(e => e.phase === 'transfer-setup');
        if (setup) {
            lines.push('### Initial Position (orbit)');
            lines.push(`- **(${setup.x.toFixed(2)}, ${setup.y.toFixed(2)})**`);
            if (setup.extra) {
                lines.push(`- laneStart: (${setup.extra.laneStartX.toFixed(2)}, ${setup.extra.laneStartY.toFixed(2)})`);
                lines.push(`- laneEnd: (${setup.extra.laneEndX.toFixed(2)}, ${setup.extra.laneEndY.toFixed(2)})`);
                lines.push(`- laneOffset: ${setup.extra.laneOffset.toFixed(2)}`);
                lines.push(`- departTime: ${setup.extra.departTime.toFixed(2)}`);
            }
            lines.push('');
        }

        // Phase-by-phase position table
        lines.push('### Position Timeline');
        lines.push('| Phase | Elapsed(ms) | Progress | X | Y | Scale | Alpha | Notes |');
        lines.push('|-------|-------------|----------|---|---|-------|-------|-------|');

        for (const e of shipEntries) {
            if (e.phase === 'transfer-setup') continue;
            const notes = e.extra ? Object.entries(e.extra).map(([k, v]) =>
                `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`
            ).join(', ') : '';
            lines.push(`| ${e.phase} | ${e.elapsed.toFixed(1)} | ${e.progress?.toFixed(4) ?? '-'} | ${e.x.toFixed(2)} | ${e.y.toFixed(2)} | ${e.scale?.toFixed(2) ?? '-'} | ${e.alpha?.toFixed(2) ?? '-'} | ${notes} |`);
        }
        lines.push('');

        // Detect disjoints
        lines.push('### Disjoint Analysis');
        const transitions = ['depart→travel', 'travel→orbit'];
        for (const trans of transitions) {
            const transEntry = shipEntries.find(e => e.phase === trans);
            if (!transEntry) continue;

            // Find last frame before this transition
            const idx = shipEntries.indexOf(transEntry);
            const prev = idx > 0 ? shipEntries[idx - 1] : null;
            const next = idx < shipEntries.length - 1 ? shipEntries[idx + 1] : null;

            if (prev) {
                const dx = transEntry.x - prev.x;
                const dy = transEntry.y - prev.y;
                const jump = Math.sqrt(dx * dx + dy * dy);
                lines.push(`- **${trans}**: jump from prev frame = **${jump.toFixed(2)}px** (dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)})`);
            }
            if (next) {
                const dx = next.x - transEntry.x;
                const dy = next.y - transEntry.y;
                const jump = Math.sqrt(dx * dx + dy * dy);
                lines.push(`- **${trans} → next frame**: jump = **${jump.toFixed(2)}px** (dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)})`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}

// Expose globally for console access
if (typeof window !== 'undefined') {
    (window as any).__travelTrace = {
        arm: armTrace,
        forceDownload: forceDownloadTrace,
        isArmed: () => state.armed,
        isCapturing: () => state.capturing,
        entryCount: () => state.entries.length,
    };
}
