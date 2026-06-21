/**
 * Regression guard for the Grid Gradient 3-6s cold-load FREEZE.
 *
 * Root cause: the first time grid_gradient is selected in a session, `cachedPlan` is
 * null, so the worker-schedule block (gated `if (this.cachedPlan)`) was skipped and the
 * ~50k-160k-cell plan was built SYNCHRONOUSLY on the main thread inside the render frame
 * — a multi-second freeze.
 *
 * Fix: route the cold build through the existing plan worker too (drop the cachedPlan
 * gate), drawing nothing until `commitPendingWorkerPlan` installs the worker's plan a few
 * frames later. The synchronous build is retained ONLY as the no-Worker fallback.
 *
 * This test injects a fake worker into the private `planWorker` slot (so `ensurePlanWorker`
 * returns it without Vite rewriting `new Worker(new URL(...))`) and asserts the cold update
 * POSTS to the worker instead of building synchronously. Node's no-Worker path (the
 * synchronous fallback) is already covered by GridGradientFamily.test.ts + the suite.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StarState } from '$lib/types/game.types';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import type {
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import { createGridGradientFamily } from './GridGradientFamily';

function makeSnapshot(
    version: string,
    regions: TerritoryRegionShape[],
): ResolvedGeometrySnapshot {
    return {
        version,
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
        ownershipVersion: version,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: regions,
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: `topo:${version}`,
            ownershipVersion: version,
            worldBounds: { width: 100, height: 40 },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells: [],
        shellLoops: [],
        provenance: { derivedFromField: false, notes: [] },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    };
}

function rect(
    ownerId: string,
    regionId: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): TerritoryRegionShape {
    return {
        regionId,
        ownerId,
        points: [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1],
        ],
        confidence: 1,
    };
}

function makeStar(id: string, x: number, y: number, ownerId: string): StarState {
    return {
        id, x, y, ownerId,
        activeShips: 20, damagedShips: 0, radius: 20, starType: 'blue',
        productionOverflow: 0, repairOverflow: 0, lastCombatTick: 0, lastAttackTick: 0,
        targetId: null, queuedOrderTargetId: null, productionRate: 1, repairRate: 0,
        transferRate: 0.5, activationRate: 1, defensivePosture: 1, defenseStrength: 1,
    };
}

function makeTunables(): ReadonlyMap<string, RenderFamilyTunableValue> {
    return new Map<string, RenderFamilyTunableValue>([
        ['GRID_GRADIENT_ENABLED', true],
        ['GRID_GRADIENT_DRAW_BACKEND', 'graphics'],
        ['GRID_GRADIENT_FILL_STYLE', 'pointillist'],
        ['GRID_GRADIENT_SPACING_PX', 10],
        ['GRID_GRADIENT_MAX_CELLS', 0],
        ['GRID_GRADIENT_ORIGIN_MODE', 'centered'],
        ['GRID_GRADIENT_DISTRIBUTION', 'square'],
        ['GRID_GRADIENT_CENTER_SIZE_PX', 8],
        ['GRID_GRADIENT_EDGE_SIZE_PX', 2],
        ['GRID_GRADIENT_CURVE_POWER', 1],
        ['GRID_GRADIENT_BORDER_OFFSET_PX', 0],
        ['GRID_GRADIENT_CELL_SHAPE', 'circle'],
        ['GRID_GRADIENT_VECTOR_BORDERS_ENABLED', false],
        ['GRID_GRADIENT_BORDER_DOTS_ENABLED', false],
    ]);
}

/** A cold steady-state mode-switch input (no active transition). */
function makeColdInput(): RenderFamilyInput {
    const geometry = makeSnapshot('v1', [rect('A', 'all', 0, 0, 100, 40)]);
    return {
        ownership: null,
        geometry,
        prevGeometry: geometry,
        nowMs: 1000,
        gameTick: 1,
        stars: [makeStar('s1', 25, 20, 'A'), makeStar('s2', 75, 20, 'A')],
        lanes: [],
        world: { width: 100, height: 40 },
        tunables: makeTunables(),
        activeTransition: null,
    } as unknown as RenderFamilyInput;
}

interface FakePlanWorker {
    onmessage: ((e: unknown) => void) | null;
    onerror: ((e: unknown) => void) | null;
    posted: unknown[];
    postMessage(message: unknown): void;
    terminate(): void;
}

function makeFakeWorker(): FakePlanWorker {
    return {
        onmessage: null,
        onerror: null,
        posted: [],
        postMessage(message: unknown) {
            this.posted.push(message);
        },
        terminate() {},
    };
}

describe('GridGradientFamily cold-load worker deferral', () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const savedWindow = g.window;
    const savedWorker = g.Worker;

    afterEach(() => {
        g.window = savedWindow;
        g.Worker = savedWorker;
    });

    it('defers the first cold plan build to the worker instead of building synchronously', () => {
        // ensurePlanWorker() needs window + Worker to be DEFINED (typeof guards) and will
        // return the already-set planWorker without constructing a real one.
        g.window = g.window ?? {};
        g.Worker = g.Worker ?? class {};

        const family = createGridGradientFamily({
            getPlayerColor: (o: string) => (o === 'A' ? 0x3366ff : 0xff6633),
        } as never);

        const fakeWorker = makeFakeWorker();
        const internals = family as unknown as Record<string, unknown>;
        internals.planWorker = fakeWorker; // ensurePlanWorker returns this (line ~302)
        internals.planWorkerFailed = false;

        const output = family.update(makeColdInput());

        // The cold build was POSTED to the worker — the pre-fix code built it synchronously
        // on this frame and posted nothing.
        expect(fakeWorker.posted.length).toBe(1);
        // Nothing drawn yet; territory appears once the worker plan commits.
        expect(output.container).toBeDefined();

        // A second cold frame while the request is still pending must NOT build
        // synchronously either — it keeps deferring (no new post).
        family.update(makeColdInput());
        expect(fakeWorker.posted.length).toBe(1);

        family.dispose();
    });
});
