/**
 * kineticRuntimeBridge — K2c: the stateful glue between GameCanvas's render
 * loop and the pure KineticTransitionRuntime.
 *
 * GameCanvas stays thin: it (1) passes `commitKineticEndpoint` as the
 * power_core geometry build's endpoint collector (fires on ownership change,
 * reusing the SAME endpoint the snapshot was built from — no re-compute), and
 * (2) calls `sampleKineticForFrame(nowMs, enabled)` once per render frame.
 * Diagnostics flow through the `transition` logger category + `getKineticDiagnostics`.
 *
 * Module-level singleton: there is exactly one territory transition runtime.
 * All timing uses the GAME clock (fxOrchestrator.gameTime) — commit and sample
 * MUST share it, or p drifts.
 */

import type { StarState } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import type { RenderFamilyActiveTransition } from '../../families/RenderFamilyTypes';
import type { PowerCoreEndpointComputation } from './buildPowerCoreAuthoritySnapshot';
import { KineticTransitionRuntime } from './kineticTransitionRuntime';
import type { KineticFrame } from './kineticTypes';
import type { PowerCell } from './powerCoreTypes';

let runtime: KineticTransitionRuntime | null = null;
/** Combined ownership+topology fingerprint of the last committed endpoint. */
let lastCommitFp: string | null = null;
/** Ownership-only portion of the last commit — distinguishes a topology-only
 *  refresh (same owners, geometry retuned) from a real conquest. */
let lastCommitOwnFp: string | null = null;
let lastFrame: KineticFrame | null = null;
let framesSampled = 0;
let lastCostMs = 0;
let costWindow: number[] = [];
let activeKey: string | null = null;
let activeStartedAtMs = 0;
let activeDurationMs = 0;
/** Log the full-diagram failure once per session, not per frame. */
let fullDiagramFailureLogged = false;

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function ownershipFingerprint(stars: readonly StarState[]): string {
    let fp = '';
    for (const s of stars) {
        if (s.ownerId) fp += `${s.id}:${s.ownerId}|`;
    }
    return fp;
}

/**
 * TOPOLOGY fingerprint of a settled endpoint — the part of its identity that is
 * NOT ownership: site geometry (positions + weights) and the clip ring. The
 * live topology sliders (MSR / star bias / CX contest+corridor / DX / boundary
 * pad) all feed the diagram through these — MSR/bias/CX/DX reshape the sites,
 * boundaryPad reshapes the clip — so any topology retune changes this string.
 *
 * ownerId is DELIBERATELY excluded: ownership is fingerprinted separately from
 * `stars`, and keeping the two orthogonal is what lets the commit gate tell a
 * conquest (ownership changed) apart from an idle retune (topology changed).
 * Rounded to absorb sub-pixel numerical jitter between otherwise-equal builds.
 * Cheap: runs only on a geometry (re)build's commit, never per render frame.
 */
function endpointTopologyFingerprint(
    endpoint: PowerCoreEndpointComputation,
): string {
    let fp = `n${endpoint.sites.length}`;
    for (const s of endpoint.sites) {
        fp += `|${Math.round(s.x)},${Math.round(s.y)},${Math.round((s.weight ?? 0) * 100)}`;
    }
    fp += '#c';
    for (const pt of endpoint.clip) {
        fp += `|${Math.round(pt[0])},${Math.round(pt[1])}`;
    }
    return fp;
}

function pickRippleOrigin(
    active: RenderFamilyActiveTransition | null,
    stars: readonly StarState[],
): { x: number; y: number } | null {
    const event = active?.conquestEvents?.[0];
    if (!event) return null;
    const star = stars.find((s) => s.id === event.starId);
    return star ? { x: star.x, y: star.y } : null;
}

/**
 * Per captured star, the attacker's position for the directional conquest
 * sweep — the ACTUAL attack source: the star at the far end of the lane the
 * ships came through (`event.attackerStarIds[0]`, the primary attacker). The
 * radial front then radiates from that real attack vector, and the linear
 * front's direction (attacker → captured) is the true lane direction, so the
 * sweep visibly enters along the connection it was launched from — better feel
 * and far easier to debug/tune than a geometric proxy.
 *
 * Fallback (only when the attacker star can't be located — it was itself just
 * conquered, or the event lacks attacker ids): the NEW owner's star nearest
 * the captured star. `stars` reflects POST-capture ownership, so the captured
 * star is itself new-owner-owned — excluded by id.
 */
function buildConquestOrigins(
    active: RenderFamilyActiveTransition | null,
    stars: readonly StarState[],
): Map<string, { x: number; y: number }> {
    const origins = new Map<string, { x: number; y: number }>();
    for (const event of active?.conquestEvents ?? []) {
        const captured = stars.find((s) => s.id === event.starId);
        if (!captured) continue;

        // Primary attacker = the lane source. attackerStarIds is the current
        // field; attackerStarId is the deprecated single-value alias.
        const attackerId = event.attackerStarIds?.[0] ?? event.attackerStarId;
        const attacker = attackerId
            ? stars.find((s) => s.id === attackerId)
            : undefined;
        if (attacker) {
            origins.set(event.starId, { x: attacker.x, y: attacker.y });
            continue;
        }

        // Fallback: nearest same-new-owner star.
        let best: StarState | null = null;
        let bestDist = Infinity;
        for (const s of stars) {
            if (s.id === event.starId || s.ownerId !== event.newOwner) continue;
            const d = (s.x - captured.x) ** 2 + (s.y - captured.y) ** 2;
            if (d < bestDist) {
                bestDist = d;
                best = s;
            }
        }
        if (best) origins.set(event.starId, { x: best.x, y: best.y });
    }
    return origins;
}

/** Full reset (source switched away from power_core, or teardown). */
export function resetKineticRuntimeBridge(): void {
    runtime = null;
    lastCommitFp = null;
    lastCommitOwnFp = null;
    lastFrame = null;
    framesSampled = 0;
    lastCostMs = 0;
    costWindow = [];
    activeKey = null;
    fullDiagramFailureLogged = false;
}

/**
 * True iff `stars` carry an ownership the runtime has NOT committed yet — the
 * caller can then run the CHEAP endpoint-only commit on the conquest frame and
 * defer the expensive snapshot assembly to a light mid-morph frame (the
 * conquest-frame spike fix). Ownership-ONLY by design: this is the conquest
 * fast-path gate; topology-only retunes are refreshed separately via the idle
 * rebuild's collectEndpoint (see commitKineticEndpoint's combined gate), so it
 * compares against the ownership portion of the last commit, not the combined
 * fingerprint.
 */
export function kineticEndpointNeedsCommit(stars: readonly StarState[]): boolean {
    return ownershipFingerprint(stars) !== lastCommitOwnFp;
}

/**
 * Commit a new settled state on ownership change. Called from the power_core
 * geometry build's `collectEndpoint`, so it runs exactly when a new endpoint
 * exists. Ownership-fingerprint guarded → idempotent within a frame and across
 * duplicate builds (diagnostic paths, cache thrash).
 */
export function commitKineticEndpoint(params: {
    endpoint: PowerCoreEndpointComputation;
    stars: readonly StarState[];
    activeTransition: RenderFamilyActiveTransition | null;
    nowMs: number;
    durationMs: number;
    conquestFrontMode?: import('./conquestFrontField').ConquestFrontMode;
}): void {
    const ownFp = ownershipFingerprint(params.stars);
    const fp = `${ownFp}##${endpointTopologyFingerprint(params.endpoint)}`;
    if (fp === lastCommitFp) return;

    // Topology-only refresh (owners unchanged, geometry retuned) MID-MORPH:
    // defer. Committing here with transitionKey===null would SNAP the settled
    // state and drop the in-flight conquest animation. Leave lastCommitFp stale
    // so the next idle rebuild after the morph settles picks up the retune.
    if (runtime?.activeKey && ownFp === lastCommitOwnFp) return;

    if (!runtime) runtime = new KineticTransitionRuntime();
    const active = params.activeTransition;
    const transitionKey = active?.sessionKey ?? null;
    const rippleOrigin = pickRippleOrigin(active, params.stars);
    const conquestOrigins = buildConquestOrigins(active, params.stars);

    runtime.commit({
        state: { sites: params.endpoint.sites, cells: params.endpoint.cells },
        clip: params.endpoint.clip,
        ownershipVersion: fp,
        transitionKey,
        nowMs: params.nowMs,
        durationMs: params.durationMs,
        rippleOrigin,
        conquestOrigins,
        conquestFrontMode: params.conquestFrontMode,
    });
    lastCommitFp = fp;
    lastCommitOwnFp = ownFp;

    // Render-order snap fix: sampleKineticForFrame() runs EARLY in the frame,
    // BEFORE this commit (which fires later, inside the geometry build). Without
    // re-sampling here, the conquest frame has no morph frame yet, so the Vector
    // skin's getActiveKineticFrame() is null and it falls back to drawing the
    // freshly-built FINAL snapshot — a one-frame SNAP to the finished map before
    // the sweep begins ("snap the new borders, then the transition moves to meet
    // them"). Sampling now at nowMs == startedAt ⇒ p=0 ⇒ the OLD endpoint, so the
    // conquest frame is continuous with the pre-conquest frame and the sweep
    // starts from the old state. null when this commit is a snap (no morph).
    // Use the STITCH here, not sampleFull: at p=0 the stitch returns the exact
    // S0 endpoint arrays with NO diagram build (0ms), while sampleFull would run
    // a full d3 diagram on the already-heaviest frame of the game (the conquest
    // commit frame: geometry rebuild + bubble diff land on it too).
    lastFrame = runtime.sample(params.nowMs);

    const retarget = Boolean(activeKey) && runtime.activeKey !== activeKey;
    activeStartedAtMs = params.nowMs;
    activeDurationMs = params.durationMs;
    if (runtime.activeKey) activeKey = runtime.activeKey;
    log.transition('runtime', transitionKey ? 'commit' : 'snap', {
        key: transitionKey,
        retarget,
        conquests: conquestOrigins.size,
        durationMs: round2(params.durationMs),
        nowMs: round2(params.nowMs),
        sites: params.endpoint.sites.length,
    });
}

/**
 * Sample the active morph for this frame. `enabled` = source is power_core;
 * when false the runtime is reset and null returned (no stale morph survives a
 * source switch). Returns the frame to attach to RenderFamilyInput.kineticFrame
 * (K3a is the first consumer; K2c leaves it unconsumed — zero visual change).
 */
export function sampleKineticForFrame(
    nowMs: number,
    enabled: boolean,
): KineticFrame | null {
    if (!enabled) {
        if (runtime) resetKineticRuntimeBridge();
        return null;
    }
    if (!runtime) {
        lastFrame = null;
        return null;
    }

    const t0 = performance.now();
    // Prefer the FULL-diagram frame; NEVER let a diagram failure break the
    // render frame — fall back to the stitch and SAY SO in the console
    // (log.canvas is on by default): a silent throw here is exactly the failure
    // mode where the morph never renders, fills stay stale-PRE all morph, and
    // the settled POST border "pops in" at conquest start.
    let frame: KineticFrame | null = null;
    try {
        frame = runtime.sampleFull(nowMs);
    } catch (error) {
        if (!fullDiagramFailureLogged) {
            fullDiagramFailureLogged = true;
            log.canvas(
                'kinetic',
                `FULL-diagram morph frame FAILED — falling back to stitch (morph may not render smoothly): ${String(error)}`,
            );
        }
    }
    if (!frame) frame = runtime.sample(nowMs);
    // One line per morph so the live pipeline is verifiable by eye.
    if (frame && runtime.activeKey !== activeKey) {
        log.canvas(
            'kinetic',
            `morph ACTIVE key=${runtime.activeKey} cells=${frame.bubbleCells.length} frozen=${frame.frozenCells.length}`,
        );
    }
    const cost = performance.now() - t0;
    lastFrame = frame;

    if (frame) {
        framesSampled += 1;
        lastCostMs = cost;
        costWindow.push(cost);
        if (runtime.activeKey !== activeKey) activeKey = runtime.activeKey;
        if (costWindow.length >= 60) {
            const sorted = [...costWindow].sort((a, b) => a - b);
            log.transition('runtime', 'cost', {
                p50: round2(sorted[Math.floor(sorted.length * 0.5)] ?? 0),
                p95: round2(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
                frames: framesSampled,
                key: activeKey,
            });
            costWindow = [];
        }
    } else if (activeKey) {
        log.transition('runtime', 'settle', {
            key: activeKey,
            frames: framesSampled,
            elapsedMs: round2(nowMs - activeStartedAtMs),
            expectedMs: round2(activeDurationMs),
        });
        activeKey = null;
    }
    return frame;
}

/** Latest sampled frame (for a consumer that reads outside the sample call). */
export function getActiveKineticFrame(): KineticFrame | null {
    return lastFrame;
}

/**
 * The complete current cell set for presentation (K3a Vector skin): the morph
 * frame (frozen + moving) while a transition is active, else the settled
 * endpoint's cells. null when no runtime (source ≠ power_core) → the consumer
 * should fall back to the resolved snapshot. Cells are in MAP/world coords.
 */
export function getKineticRenderCells(): readonly PowerCell[] | null {
    if (lastFrame) return [...lastFrame.frozenCells, ...lastFrame.bubbleCells];
    return runtime?.settledState?.cells ?? null;
}

/**
 * A value that CHANGES every frame while a morph is active and is STABLE while
 * idle — appended to the territory presentation signature so morph frames are
 * not deduped/cached (the fix for "conquest snaps"). Idle → 0 (no spurious
 * repaints); active → the sampled-frame counter.
 */
export function getKineticPresentationNonce(): number {
    return activeKey ? framesSampled : 0;
}

/** Counters for getBenchmarkTerritorySchedulerSnapshot. */
export function getKineticDiagnostics(): Record<string, unknown> {
    return {
        kineticActive: Boolean(runtime?.activeKey),
        kineticActiveKey: runtime?.activeKey ?? null,
        kineticFramesSampled: framesSampled,
        kineticLastCostMs: round2(lastCostMs),
        kineticBubbleCells: lastFrame?.bubbleCells.length ?? 0,
        kineticFrozenCells: lastFrame?.frozenCells.length ?? 0,
    };
}
