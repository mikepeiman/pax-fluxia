/**
 * metaball-grid — per-frame scene builder (MG4)
 *
 * Given a classification, a wave plan, the current `progress ∈ [0, 1]`, and a
 * flip-style/window, emit the set of `GridRenderCell` contributions for the
 * metaball compositor. Pure function.
 *
 * Flip styles (from plan doc):
 * - `hard` — one cell per vstar. Prev color until `progress < flipTime`, Next
 *   color at/after. Alpha = 1.
 * - `lerp_per_cell` — `hard` outside `[flipTime − W, flipTime + W]`. Inside the
 *   window, emit two cells (PREV-side and NEXT-side) with smoothstep alphas
 *   summing to 1.
 * - `dual_pass_blend` — always emit two cells per vstar, with PREV-side alpha
 *   `1 − smoothstep(flipTime − W, flipTime + W, progress)` and NEXT-side the
 *   complement. The compositor sums both passes.
 *
 * Role handling:
 * - `native` → one cell at `nextOwnerId` color, alpha 1.
 * - `dispossessed` → per the flip style above.
 * - `emergent` (prev null, next X) → like dispossessed but PREV-side omitted.
 * - `vacating` (prev X, next null) → like dispossessed but NEXT-side omitted.
 * - `outside` → never emitted.
 */

import type {
    GridFlipTransition,
    GridMetaballScene,
    GridRenderCell,
    GridVStar,
    RenderMetaballGridSceneParams,
} from './metaballGridTypes';

function clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Classic 2-edge smoothstep. Returns 0 at/below `edge0`, 1 at/above `edge1`. */
function smoothstep(edge0: number, edge1: number, x: number): number {
    if (edge1 <= edge0) return x < edge0 ? 0 : 1; // degenerate → step
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

function resolveColorIdx(ownerId: string | null, ownerColorIdx: ReadonlyMap<string, number>): number | null {
    if (ownerId === null) return null;
    const idx = ownerColorIdx.get(ownerId);
    return idx ?? null;
}

/**
 * Emit a scene for `progress ∈ [0, 1]`. All cells carry world-space `(x, y)`,
 * owner color index, alpha, strength, and a `pass` tag so the compositor can
 * route PREV/NEXT passes if needed.
 */
export function renderMetaballGridScene(params: RenderMetaballGridSceneParams): GridMetaballScene {
    const {
        classification,
        wavePlan,
        progress,
        flipTransition,
        flipWindow,
        strength,
        ownerColorIdx,
    } = params;

    // Optional inward offset would modify cell position for edge cells; this is
    // a visual polish lever. For MG4 we pass through positions unchanged; MG9
    // debug overlay can verify offset behavior when we wire it.
    // (Inward offset computation requires edge classification which we defer to
    // the family adapter or a later pass if needed.)

    const progressClamped = clamp01(progress);
    const cells: GridRenderCell[] = [];

    // PERF: iterate only emittable vstars (native + dispossessed + emergent
    // + vacating). Outside cells would early-return anyway.
    for (const v of classification.emittableVstars) {
        emitForVStar({
            v,
            progress: progressClamped,
            flipTransition,
            flipWindow,
            strength,
            flipTimeByVId: wavePlan.flipTimeByVId,
            ownerColorIdx,
            out: cells,
        });
    }

    return { progress: progressClamped, cells, flipTransition };
}

function emitForVStar(args: {
    v: GridVStar;
    progress: number;
    flipTransition: GridFlipTransition;
    flipWindow: number;
    strength: number;
    flipTimeByVId: ReadonlyMap<string, number>;
    ownerColorIdx: ReadonlyMap<string, number>;
    out: GridRenderCell[];
}): void {
    const { v, progress, flipTransition, flipWindow, strength, flipTimeByVId, ownerColorIdx, out } = args;

    switch (v.role) {
        case 'outside':
            return;

        case 'native': {
            // Native cells ARE the primary fill for grid mode. Emit one
            // cell per native vstar at NEXT color with full alpha.
            const colorIdx = resolveColorIdx(v.nextOwnerId, ownerColorIdx);
            if (colorIdx === null) return;
            out.push({
                vId: v.id,
                ix: v.ix,
                iy: v.iy,
                x: v.x,
                y: v.y,
                colorIdx,
                alpha: clamp01(strength),
                strength,
                pass: 'single',
                role: v.role,
            });
            return;
        }

        case 'dispossessed':
        case 'emergent':
        case 'vacating': {
            const flipTime = flipTimeByVId.get(v.id) ?? 0;
            const prevColor = resolveColorIdx(v.prevOwnerId, ownerColorIdx);
            const nextColor = resolveColorIdx(v.nextOwnerId, ownerColorIdx);

            // Role-gated side suppression:
            const emitPrev = v.role !== 'emergent' && prevColor !== null;
            const emitNext = v.role !== 'vacating' && nextColor !== null;

            if (!emitPrev && !emitNext) return;

            if (flipTransition === 'hard') {
                emitHard({
                    v,
                    progress,
                    flipTime,
                    prevColor,
                    nextColor,
                    emitPrev,
                    emitNext,
                    strength,
                    out,
                });
                return;
            }

            if (flipTransition === 'lerp_per_cell') {
                emitLerpPerCell({
                    v,
                    progress,
                    flipTime,
                    flipWindow,
                    prevColor,
                    nextColor,
                    emitPrev,
                    emitNext,
                    strength,
                    out,
                });
                return;
            }

            if (flipTransition === 'dual_pass_blend') {
                emitDualPass({
                    v,
                    progress,
                    flipTime,
                    flipWindow,
                    prevColor,
                    nextColor,
                    emitPrev,
                    emitNext,
                    strength,
                    out,
                });
                return;
            }
            return;
        }
    }
}

function emitHard(args: {
    v: GridVStar;
    progress: number;
    flipTime: number;
    prevColor: number | null;
    nextColor: number | null;
    emitPrev: boolean;
    emitNext: boolean;
    strength: number;
    out: GridRenderCell[];
}): void {
    const { v, progress, flipTime, prevColor, nextColor, emitPrev, emitNext, strength, out } = args;
    const flipped = progress >= flipTime;
    const activeColor = flipped ? (emitNext ? nextColor : prevColor) : (emitPrev ? prevColor : nextColor);
    if (activeColor === null) return;
    out.push({
        vId: v.id,
        ix: v.ix,
        iy: v.iy,
        x: v.x,
        y: v.y,
        colorIdx: activeColor,
        alpha: clamp01(strength),
        strength,
        pass: 'single',
        role: v.role,
    });
}

function emitLerpPerCell(args: {
    v: GridVStar;
    progress: number;
    flipTime: number;
    flipWindow: number;
    prevColor: number | null;
    nextColor: number | null;
    emitPrev: boolean;
    emitNext: boolean;
    strength: number;
    out: GridRenderCell[];
}): void {
    const { v, progress, flipTime, flipWindow, prevColor, nextColor, emitPrev, emitNext, strength, out } = args;
    const lo = flipTime - flipWindow;
    const hi = flipTime + flipWindow;

    const gain = clamp01(strength);
    if (progress <= lo) {
        // Fully PREV.
        if (emitPrev && prevColor !== null) {
            out.push({ vId: v.id, ix: v.ix, iy: v.iy, x: v.x, y: v.y, colorIdx: prevColor, alpha: gain, strength, pass: 'single', role: v.role });
        } else if (emitNext && nextColor !== null) {
            // Only NEXT allowed (emergent) — hard-present under role rule.
            out.push({ vId: v.id, ix: v.ix, iy: v.iy, x: v.x, y: v.y, colorIdx: nextColor, alpha: 0, strength, pass: 'single', role: v.role });
        }
        return;
    }
    if (progress >= hi) {
        if (emitNext && nextColor !== null) {
            out.push({ vId: v.id, ix: v.ix, iy: v.iy, x: v.x, y: v.y, colorIdx: nextColor, alpha: gain, strength, pass: 'single', role: v.role });
        } else if (emitPrev && prevColor !== null) {
            // Only PREV allowed (vacating) — faded out after window.
            out.push({ vId: v.id, ix: v.ix, iy: v.iy, x: v.x, y: v.y, colorIdx: prevColor, alpha: 0, strength, pass: 'single', role: v.role });
        }
        return;
    }

    // Inside window: complementary alphas. smoothstep from lo→hi.
    const s = smoothstep(lo, hi, progress);
    const prevAlpha = (1 - s) * (emitPrev ? 1 : 0) * gain;
    const nextAlpha = s * (emitNext ? 1 : 0) * gain;

    if (emitPrev && prevColor !== null) {
        out.push({
            vId: v.id,
            ix: v.ix,
            iy: v.iy,
            x: v.x,
            y: v.y,
            colorIdx: prevColor,
            alpha: prevAlpha,
            strength,
            pass: 'prev',
            role: v.role,
        });
    }
    if (emitNext && nextColor !== null) {
        out.push({
            vId: v.id,
            ix: v.ix,
            iy: v.iy,
            x: v.x,
            y: v.y,
            colorIdx: nextColor,
            alpha: nextAlpha,
            strength,
            pass: 'next',
            role: v.role,
        });
    }
}

function emitDualPass(args: {
    v: GridVStar;
    progress: number;
    flipTime: number;
    flipWindow: number;
    prevColor: number | null;
    nextColor: number | null;
    emitPrev: boolean;
    emitNext: boolean;
    strength: number;
    out: GridRenderCell[];
}): void {
    const { v, progress, flipTime, flipWindow, prevColor, nextColor, emitPrev, emitNext, strength, out } = args;
    const lo = flipTime - flipWindow;
    const hi = flipTime + flipWindow;
    const s = smoothstep(lo, hi, progress);
    const gain = clamp01(strength);
    const prevAlpha = (1 - s) * (emitPrev ? 1 : 0) * gain;
    const nextAlpha = s * (emitNext ? 1 : 0) * gain;

    if (emitPrev && prevColor !== null) {
        out.push({
            vId: v.id,
            ix: v.ix,
            iy: v.iy,
            x: v.x,
            y: v.y,
            colorIdx: prevColor,
            alpha: prevAlpha,
            strength,
            pass: 'prev',
            role: v.role,
        });
    }
    if (emitNext && nextColor !== null) {
        out.push({
            vId: v.id,
            ix: v.ix,
            iy: v.iy,
            x: v.x,
            y: v.y,
            colorIdx: nextColor,
            alpha: nextAlpha,
            strength,
            pass: 'next',
            role: v.role,
        });
    }
}
