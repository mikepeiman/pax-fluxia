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
let lastCommitFp: string | null = null;
let lastFrame: KineticFrame | null = null;
let framesSampled = 0;
let lastCostMs = 0;
let costWindow: number[] = [];
let activeKey: string | null = null;
let activeStartedAtMs = 0;
let activeDurationMs = 0;

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
 * sweep. Proxy for the attack source: the NEW owner's star nearest the
 * captured star (the conquest almost always comes from an adjacent same-owner
 * holding). `stars` reflects the POST-capture ownership, so the captured star
 * is itself new-owner-owned — excluded by id.
 */
function buildConquestOrigins(
    active: RenderFamilyActiveTransition | null,
    stars: readonly StarState[],
): Map<string, { x: number; y: number }> {
    const origins = new Map<string, { x: number; y: number }>();
    for (const event of active?.conquestEvents ?? []) {
        const captured = stars.find((s) => s.id === event.starId);
        if (!captured) continue;
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
    lastFrame = null;
    framesSampled = 0;
    lastCostMs = 0;
    costWindow = [];
    activeKey = null;
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
    const fp = ownershipFingerprint(params.stars);
    if (fp === lastCommitFp) return;

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

    // Render-order snap fix: sampleKineticForFrame() runs EARLY in the frame,
    // BEFORE this commit (which fires later, inside the geometry build). Without
    // re-sampling here, the conquest frame has no morph frame yet, so the Vector
    // skin's getActiveKineticFrame() is null and it falls back to drawing the
    // freshly-built FINAL snapshot — a one-frame SNAP to the finished map before
    // the sweep begins ("snap the new borders, then the transition moves to meet
    // them"). Sampling now at nowMs == startedAt ⇒ p=0 ⇒ the OLD endpoint, so the
    // conquest frame is continuous with the pre-conquest frame and the sweep
    // starts from the old state. null when this commit is a snap (no morph).
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
    const frame = runtime.sample(nowMs);
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
