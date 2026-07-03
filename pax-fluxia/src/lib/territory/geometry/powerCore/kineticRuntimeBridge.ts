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

let runtime: KineticTransitionRuntime | null = null;
let lastCommitFp: string | null = null;
let lastFrame: KineticFrame | null = null;
let framesSampled = 0;
let lastCostMs = 0;
let costWindow: number[] = [];
let activeKey: string | null = null;

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
}): void {
    const fp = ownershipFingerprint(params.stars);
    if (fp === lastCommitFp) return;

    if (!runtime) runtime = new KineticTransitionRuntime();
    const active = params.activeTransition;
    const transitionKey = active?.sessionKey ?? null;
    const rippleOrigin = pickRippleOrigin(active, params.stars);

    runtime.commit({
        state: { sites: params.endpoint.sites, cells: params.endpoint.cells },
        clip: params.endpoint.clip,
        ownershipVersion: fp,
        transitionKey,
        nowMs: params.nowMs,
        durationMs: params.durationMs,
        rippleOrigin,
    });
    lastCommitFp = fp;
    log.transition('runtime', transitionKey ? 'commit' : 'snap', {
        key: transitionKey,
        sites: params.endpoint.sites.length,
        activeKey: runtime.activeKey,
        durationMs: params.durationMs,
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
        });
        activeKey = null;
    }
    return frame;
}

/** Latest sampled frame (for a consumer that reads outside the sample call). */
export function getActiveKineticFrame(): KineticFrame | null {
    return lastFrame;
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
