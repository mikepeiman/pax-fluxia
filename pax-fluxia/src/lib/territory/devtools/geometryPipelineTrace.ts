/**
 * geometryPipelineTrace — a single, compact, per-frame diagnostic that echoes
 * representative data from EVERY stage of the territory pipeline: geometry
 * generation (step 0 → snapshot) → per-mode family build → final render, for
 * BOTH steady state and conquest transition.
 *
 * Purpose: make it obvious (a) WHICH engine generated the geometry and (b) WHY
 * modes look different — i.e. whether all render modes consume the SAME geometry
 * snapshot (one engine) and only differ in presentation/config, or whether each
 * mode generates its own geometry.
 *
 * Design:
 *  - Gated behind `logFlags.pipeline` (Log panel → "Pipeline"). ZERO cost when off:
 *    `begin()` early-returns and every `step()` is a no-op, so callers pay nothing.
 *  - One frame = `begin()` → many `step()` → `end()`. `end()` emits at most one
 *    compact block, throttled (default 750ms) BUT always on a mode switch or a
 *    steady↔transition edge, so switches and the start of a conquest are captured.
 *  - Output is ONE preformatted block per emit, brief enough to copy-paste back.
 *
 * Usage (instrumentation):
 *   geometryTrace.begin({ mode, frame, phase, prog });   // render loop, before geometry
 *   geometryTrace.step('2', 'powerdiagram', { cells: 83 });
 *   if (geometryTrace.capturing) geometryTrace.step('x', 'expensive', heavySummary());
 *   geometryTrace.end(performance.now());                // render loop, after render
 */
import { log, logFlags } from '$lib/utils/logger';

type TraceVal = string | number | boolean | null | undefined;
export type TraceStepData = Record<string, TraceVal>;

interface TraceStep {
    readonly n: string;
    readonly label: string;
    readonly data: TraceStepData;
}

const DEFAULT_THROTTLE_MS = 750;

class GeometryPipelineTrace {
    private steps: TraceStep[] = [];
    private mode = '';
    private frame = 0;
    private phase: 'steady' | 'transition' = 'steady';
    private prog: number | null = null;
    /** Captured at begin(): true only while a frame is being traced AND the flag is on. */
    private active = false;

    private lastEmitMs = 0;
    private lastMode = '';
    private lastPhase = '';

    private throttleMs = DEFAULT_THROTTLE_MS;

    /** Cheap flag read — true when the Pipeline log category is enabled. */
    private get flagOn(): boolean {
        return logFlags.pipeline === true;
    }

    /**
     * True while this frame is being captured. Use to guard EXPENSIVE summary
     * construction; cheap already-computed counts can be passed to step() directly
     * (step() is itself a no-op when inactive).
     */
    get capturing(): boolean {
        return this.active;
    }

    /** Optional: override the emit throttle (ms). */
    setThrottleMs(ms: number): void {
        this.throttleMs = Math.max(0, ms);
    }

    /** Clear throttle memory + any in-flight frame (e.g. on game restart / for tests). */
    reset(): void {
        this.steps = [];
        this.active = false;
        this.lastEmitMs = 0;
        this.lastMode = '';
        this.lastPhase = '';
    }

    /** Start a frame. No-op (and clears `capturing`) when the flag is off. */
    begin(meta: {
        mode: string;
        frame: number;
        phase: 'steady' | 'transition';
        prog?: number | null;
    }): void {
        this.active = this.flagOn;
        if (!this.active) return;
        this.steps = [];
        this.mode = meta.mode;
        this.frame = meta.frame;
        this.phase = meta.phase;
        this.prog = meta.prog ?? null;
    }

    /**
     * Record one stage. `n` = step id (e.g. '0','cfg','s'); `label` = short name.
     * Step ids are unique per stage, so a repeated id (e.g. a geometry resolve called
     * more than once in a frame) UPSERTS in place (last value wins, original position
     * kept) — the block stays one line per stage, brief and stable.
     */
    step(n: string, label: string, data: TraceStepData): void {
        if (!this.active) return;
        const at = this.steps.findIndex((s) => s.n === n);
        if (at >= 0) {
            this.steps[at] = { n, label, data };
        } else {
            this.steps.push({ n, label, data });
        }
    }

    /**
     * Emit the accumulated block if the gates allow (mode switch OR phase edge OR
     * throttle elapsed), then close the frame. `nowMs` drives the throttle.
     */
    end(nowMs: number): void {
        if (!this.active) return;
        this.active = false;
        if (this.steps.length === 0) return;

        const modeChanged = this.mode !== this.lastMode;
        const phaseEdge = this.phase !== this.lastPhase;
        const throttleDue = nowMs - this.lastEmitMs >= this.throttleMs;
        if (!(modeChanged || phaseEdge || throttleDue)) return;

        this.lastEmitMs = nowMs;
        this.lastMode = this.mode;
        this.lastPhase = this.phase;
        log.pipeline(this.render());
    }

    /** Format the current frame's steps into one compact, copy-pasteable block. */
    private render(): string {
        const header =
            `[GEOMTRACE mode=${this.mode} frame=${this.frame} phase=${this.phase}` +
            (this.prog != null ? ` prog=${this.prog.toFixed(2)}` : '') +
            ']';
        const body = this.steps.map(
            (s) => `${pad(s.n, 3)}${pad(s.label, 14)}${fmtData(s.data)}`,
        );
        return [header, ...body].join('\n');
    }
}

function pad(s: string, width: number): string {
    return s.length >= width ? `${s} ` : s + ' '.repeat(width - s.length);
}

function fmtData(data: TraceStepData): string {
    const parts: string[] = [];
    for (const key of Object.keys(data)) {
        const v = data[key];
        if (v === undefined || v === null) continue;
        parts.push(`${key}=${typeof v === 'number' ? fmtNum(v) : v}`);
    }
    return parts.join(' ');
}

function fmtNum(n: number): string {
    if (!Number.isFinite(n)) return String(n);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2);
}

/**
 * Compact owner breakdown helper: `['p1','p2','p1'] → "p1:2,p2:1"` (sorted by id).
 * Use for stars/cells/regions to show per-owner counts in a single token.
 */
export function summarizeOwners(ownerIds: Iterable<string>): string {
    const counts = new Map<string, number>();
    for (const id of ownerIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([id, n]) => `${id}:${n}`)
        .join(',');
}

/** The process-wide singleton trace. */
export const geometryTrace = new GeometryPipelineTrace();
