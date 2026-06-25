import { describe, expect, it } from 'vitest';
import type { ConquestEvent } from '@pax/common';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
    RegionLoop,
} from '../../contracts/FrontierTopologyContracts';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from '../RenderFamilyTypes';
import type { GridClassification } from '../cellGrid/cellGridTypes';
import { buildGridGradientPlanFromParts, type CachedGridGradientPlan } from './plan';
import { createGridGradientFamily } from './GridGradientFamily';
import {
    inflateGridGradientWorkerGeometry,
    type GridGradientPlanWorkerGeometry,
    type GridGradientPlanWorkerResponse,
} from './gridGradientPlanWorkerTypes';
import type { GridGradientSettings } from './settings';
import type { GridGradientTypedClassification } from './typedClassification';

const TRANSITION_START_MS = 1_000;
const TRANSITION_DURATION_MS = 1_000;

function makeStar(id: string, x: number, y: number, ownerId: string): StarState {
    return {
        id,
        x,
        y,
        ownerId,
        activeShips: 20,
        damagedShips: 0,
        radius: 20,
        starType: 'blue',
        productionOverflow: 0,
        repairOverflow: 0,
        lastCombatTick: 0,
        lastAttackTick: 0,
        targetId: null,
        queuedOrderTargetId: null,
        productionRate: 1,
        repairRate: 0,
        transferRate: 0.5,
        activationRate: 1,
        defensivePosture: 1,
        defenseStrength: 1,
    } as StarState;
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

function makeTopology(version: string): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>([
        [
            'v:top',
            {
                id: 'v:top',
                kind: 'world_intersection',
                point: [50, 0],
                incidentSectionIds: ['s:A|B'],
                ownerIds: ['A', 'B'],
            },
        ],
        [
            'v:bottom',
            {
                id: 'v:bottom',
                kind: 'world_intersection',
                point: [50, 40],
                incidentSectionIds: ['s:A|B'],
                ownerIds: ['A', 'B'],
            },
        ],
    ]);
    const section: FrontierSection = {
        id: 's:A|B',
        kind: 'owner_border',
        startVertexId: 'v:top',
        endVertexId: 'v:bottom',
        leftOwnerId: 'A',
        rightOwnerId: 'B',
        points: [
            [50, 0],
            [50, 40],
        ],
        length: 40,
        ownerPairKey: 'A|B',
        leftInfluence: {
            ownerId: 'A',
            primaryStarId: 'target',
            primaryScore: 1,
        },
        rightInfluence: {
            ownerId: 'B',
            primaryStarId: 'attacker',
            primaryScore: 1,
        },
    };
    const sections = new Map<string, FrontierSection>([[section.id, section]]);
    const loop: RegionLoop = {
        id: `loop:${version}:A`,
        ownerId: 'A',
        componentId: `component:${version}:A`,
        sectionRefs: [{ sectionId: section.id, direction: 'forward' }],
        signedArea: 2_000,
    };

    return {
        version: `topo:${version}`,
        ownershipVersion: version,
        worldBounds: { width: 100, height: 40 },
        vertices,
        sections,
        loops: [loop],
        sectionsByOwnerPair: new Map([[section.ownerPairKey, [section.id]]]),
        sectionsByVertex: new Map([
            ['v:top', [section.id]],
            ['v:bottom', [section.id]],
        ]),
        sectionsByOwner: new Map([
            ['A', [section.id]],
            ['B', [section.id]],
        ]),
    };
}

function makeSnapshot(
    version: string,
    regions: readonly TerritoryRegionShape[],
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
        frontierTopology: makeTopology(version),
        shells: [],
        shellLoops: [],
        provenance: { derivedFromField: false, notes: ['topology-rich-test'] },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
    };
}

function makeWorkerGeometry(
    snapshot: ResolvedGeometrySnapshot,
): GridGradientPlanWorkerGeometry {
    return {
        version: snapshot.version,
        territoryRegions: snapshot.territoryRegions,
    };
}

function makeEvent(): ConquestEvent {
    return {
        tick: 1,
        starId: 'target',
        attackerStarId: 'attacker',
        attackerStarIds: ['attacker'],
        attackerShipTransfers: [10],
        previousOwner: 'A',
        newOwner: 'B',
        shipsCaptured: 10,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        shipsTransferred: 10,
        conquestType: 'complete',
    };
}

function makeActiveTransition(progress: number): RenderFamilyActiveTransition {
    const event = makeEvent();
    return {
        sessionKey: `tick:${event.tick}:grid-gradient-worker-guard`,
        conquestEvents: [event],
        events: [
            {
                event,
                startedAtMs: TRANSITION_START_MS,
                durationMs: TRANSITION_DURATION_MS,
                progress,
                rawProgress: progress,
            },
        ],
        startedAtMs: TRANSITION_START_MS,
        durationMs: TRANSITION_DURATION_MS,
        progress,
        rawProgress: progress,
    };
}

function makeSettings(): GridGradientSettings {
    return {
        enabled: true,
        debugTransitions: false,
        drawBackend: 'graphics',
        fillStyle: 'pointillist',
        spacingPx: 10,
        maxCells: 0,
        originMode: 'centered',
        distribution: 'square',
        positionJitter: 0,
        centerSizePx: 8,
        edgeSizePx: 2,
        curvePower: 1,
        borderOffsetPx: 0,
        cellShape: 'circle',
        vectorBordersEnabled: false,
        borderDotsEnabled: false,
        borderDotSizePx: 1,
        borderDotStyle: 'blended',
        shaderNeighborMode: 'center',
        shaderMarkSoftness: 0,
        shaderEdgeSoftnessPx: 0,
        shaderNoiseStrength: 0,
        shaderPulseStrength: 0,
        shaderPulseSpeed: 0,
        shaderFieldDriftPx: 0,
        shaderFieldDriftSpeed: 0,
        shaderGlowStrength: 0,
        shaderInteriorAlphaBoost: 1,
        shaderEdgeAlphaBoost: 1,
        fillHueShiftDeg: 0,
        fillAlpha: 1,
        fillSaturation: 1,
        fillLightness: 1,
        borderWidthPx: 0,
        borderAlpha: 0,
        borderSaturation: 1,
        borderLightness: 1,
        adjacency: '4',
        waveGeometry: 'conquered_star_radial',
        waveSeeding: 'conquered_star_center',
        flipTransition: 'dual_pass_blend',
        flipWindow: 0.18,
    };
}

function makeTunables(): ReadonlyMap<string, RenderFamilyTunableValue> {
    const settings = makeSettings();
    return new Map<string, RenderFamilyTunableValue>([
        ['GRID_GRADIENT_ENABLED', settings.enabled],
        ['GRID_GRADIENT_DRAW_BACKEND', settings.drawBackend],
        ['GRID_GRADIENT_FILL_STYLE', settings.fillStyle],
        ['GRID_GRADIENT_SPACING_PX', settings.spacingPx],
        ['GRID_GRADIENT_MAX_CELLS', settings.maxCells],
        ['GRID_GRADIENT_ORIGIN_MODE', settings.originMode],
        ['GRID_GRADIENT_DISTRIBUTION', settings.distribution],
        ['GRID_GRADIENT_POSITION_JITTER', settings.positionJitter],
        ['GRID_GRADIENT_CENTER_SIZE_PX', settings.centerSizePx],
        ['GRID_GRADIENT_EDGE_SIZE_PX', settings.edgeSizePx],
        ['GRID_GRADIENT_CURVE_POWER', settings.curvePower],
        ['GRID_GRADIENT_BORDER_OFFSET_PX', settings.borderOffsetPx],
        ['GRID_GRADIENT_CELL_SHAPE', settings.cellShape],
        ['GRID_GRADIENT_VECTOR_BORDERS_ENABLED', settings.vectorBordersEnabled],
        ['GRID_GRADIENT_BORDER_DOTS_ENABLED', settings.borderDotsEnabled],
        ['GRID_GRADIENT_BORDER_DOT_SIZE_PX', settings.borderDotSizePx],
        ['GRID_GRADIENT_BORDER_DOT_STYLE', settings.borderDotStyle],
        ['CELL_GRID_ADJACENCY', settings.adjacency],
        ['CELL_GRID_WAVE_GEOMETRY', settings.waveGeometry],
        ['CELL_GRID_WAVE_SEEDING', settings.waveSeeding],
        ['CELL_GRID_FLIP_TRANSITION', settings.flipTransition],
        ['CELL_GRID_FLIP_WINDOW', settings.flipWindow],
        ['TERRITORY_SURFACE_ALPHA', settings.fillAlpha],
        ['TERRITORY_SURFACE_SATURATION', settings.fillSaturation],
        ['TERRITORY_SURFACE_LIGHTNESS', settings.fillLightness],
        ['TERRITORY_SURFACE_BORDER_WIDTH', settings.borderWidthPx],
        ['TERRITORY_SURFACE_BORDER_ALPHA', settings.borderAlpha],
        ['TERRITORY_SURFACE_BORDER_SATURATION', settings.borderSaturation],
        ['TERRITORY_SURFACE_BORDER_LIGHTNESS', settings.borderLightness],
    ]);
}

function makePreSnapshot(): ResolvedGeometrySnapshot {
    return makeSnapshot('pre', [
        rect('A', 'left', 0, 0, 50, 40),
        rect('B', 'right', 50, 0, 100, 40),
    ]);
}

function makePostSnapshot(): ResolvedGeometrySnapshot {
    return makeSnapshot('post', [rect('B', 'all', 0, 0, 100, 40)]);
}

function makeStars(): StarState[] {
    return [
        makeStar('attacker', 80, 20, 'B'),
        makeStar('target', 25, 20, 'B'),
    ];
}

function makeInput(progress: number): RenderFamilyInput {
    const stars = makeStars();
    const lanes: StarConnection[] = [
        { sourceId: 'attacker', targetId: 'target', distance: 55 },
    ];
    return {
        ownership: null,
        geometry: makePostSnapshot(),
        prevGeometry: makePreSnapshot(),
        nowMs: TRANSITION_START_MS + progress * TRANSITION_DURATION_MS,
        gameTick: 1,
        stars,
        lanes,
        world: { width: 100, height: 40 },
        tunables: makeTunables(),
        activeTransition: makeActiveTransition(progress),
    };
}

function summarizeClassification(plan: CachedGridGradientPlan) {
    return {
        cols: plan.classification.cols,
        rows: plan.classification.rows,
        vstars: plan.classification.vstars.map((v) => [
            v.id,
            v.ix,
            v.iy,
            v.prevOwnerId,
            v.nextOwnerId,
            v.role,
            v.eventId,
        ]),
        emittableIds: plan.classification.emittableVstars.map((v) => v.id),
        byRole: plan.classification.byRole,
        dispossessedByEventId: plan.classification.dispossessedByEventId,
    };
}

function makeEmptyClassification(
    source: GridClassification,
): GridClassification {
    return {
        ...source,
        cols: 0,
        rows: 0,
        vstars: [],
        emittableVstars: [],
        byRole: {
            native: [],
            dispossessed: [],
            emergent: [],
            vacating: [],
            outside: [],
        },
        dispossessedByEventId: {},
    };
}

function makeEmptyTypedClassification(): GridGradientTypedClassification {
    return {
        ownerIdByIndex: [],
        prevOwnerIndexByCell: new Int16Array(0),
        nextOwnerIndexByCell: new Int16Array(0),
        roleCodeByCell: new Uint8Array(0),
        emittableCellIndices: new Uint32Array(0),
        transitionCellIndices: new Uint32Array(0),
    };
}

function makeEmptyPlan(source: CachedGridGradientPlan): CachedGridGradientPlan {
    return {
        ...source,
        classification: makeEmptyClassification(source.classification),
        typed: makeEmptyTypedClassification(),
        flipTimeByteByCell: new Uint8Array(0),
        wavePlan: {
            perEvent: [],
            flipTimeByVId: new Map(),
            orderedTransitionVIds: [],
            orderedFlipTimes: [],
        },
    };
}

function makeMismatchedBytePlan(
    source: CachedGridGradientPlan,
): CachedGridGradientPlan {
    return {
        ...source,
        flipTimeByteByCell: source.flipTimeByteByCell.slice(1),
    };
}

function injectWorkerResponse(
    family: Record<string, any>,
    plan: CachedGridGradientPlan,
): void {
    const response: GridGradientPlanWorkerResponse = {
        requestId: 99,
        planKey: plan.planKey,
        plan,
        workerBuildMs: 0,
    };
    family.latestPlanWorkerResponse = response;
    family.latestPlanWorkerMeta = {
        requestId: 99,
        planKey: plan.planKey,
        requestedAtMs: TRANSITION_START_MS,
        startedAtMs: null,
        durationMs: null,
        beginVisualTransition: false,
    };
}

describe('Grid Gradient worker plan parity and guards', () => {
    it('keeps worker-inflated minimal geometry plan bytes equivalent to rich sync geometry', () => {
        const settings = makeSettings();
        const prevGeometry = makePreSnapshot();
        const geometry = makePostSnapshot();
        const activeTransition = makeActiveTransition(0.4);
        const planKey = 'grid-gradient-worker-parity';

        const richPlan = buildGridGradientPlanFromParts({
            world: { width: 100, height: 40 },
            stars: makeStars(),
            prevGeometry,
            geometry,
            settings,
            planKey,
            activeTransition,
            ownerGridCache: new Map(),
        });
        const workerPlan = buildGridGradientPlanFromParts({
            world: { width: 100, height: 40 },
            stars: makeStars(),
            prevGeometry: inflateGridGradientWorkerGeometry(
                makeWorkerGeometry(prevGeometry),
            ),
            geometry: inflateGridGradientWorkerGeometry(makeWorkerGeometry(geometry)),
            settings,
            planKey,
            activeTransition,
            ownerGridCache: new Map(),
        });

        expect(prevGeometry.frontierTopology.sections.size).toBeGreaterThan(0);
        expect(workerPlan.planKey).toBe(richPlan.planKey);
        expect(summarizeClassification(workerPlan)).toEqual(
            summarizeClassification(richPlan),
        );
        expect(Array.from(workerPlan.typed.prevOwnerIndexByCell)).toEqual(
            Array.from(richPlan.typed.prevOwnerIndexByCell),
        );
        expect(Array.from(workerPlan.typed.nextOwnerIndexByCell)).toEqual(
            Array.from(richPlan.typed.nextOwnerIndexByCell),
        );
        expect(Array.from(workerPlan.typed.roleCodeByCell)).toEqual(
            Array.from(richPlan.typed.roleCodeByCell),
        );
        expect(Array.from(workerPlan.flipTimeByteByCell)).toEqual(
            Array.from(richPlan.flipTimeByteByCell),
        );
        expect(Array.from(workerPlan.typed.emittableCellIndices)).toEqual(
            Array.from(richPlan.typed.emittableCellIndices),
        );
        expect(Array.from(workerPlan.typed.transitionCellIndices)).toEqual(
            Array.from(richPlan.typed.transitionCellIndices),
        );
        expect(workerPlan.wavePlan.orderedTransitionVIds).toEqual(
            richPlan.wavePlan.orderedTransitionVIds,
        );
        expect(workerPlan.wavePlan.orderedFlipTimes).toEqual(
            richPlan.wavePlan.orderedFlipTimes,
        );
        expect(workerPlan.classification.emittableVstars.length).toBeGreaterThan(0);
    });

    it('does not replace a non-empty cached plan with empty or size-invalid worker plans', () => {
        const family = createGridGradientFamily({
            getPlayerColor(ownerId: string): number {
                return ownerId === 'A' ? 0x3366ff : 0xff6633;
            },
        } as never);
        const input = makeInput(0.35);

        family.update(input);

        const exposed = family as unknown as Record<string, any>;
        const cachedPlan = exposed.cachedPlan as CachedGridGradientPlan | null;
        expect(cachedPlan).not.toBeNull();
        expect(cachedPlan?.classification.emittableVstars.length ?? 0).toBeGreaterThan(0);

        injectWorkerResponse(exposed, makeEmptyPlan(cachedPlan!));
        expect(exposed.commitPendingWorkerPlan(input.nowMs + 1)).toBe(false);
        expect(exposed.cachedPlan).toBe(cachedPlan);

        injectWorkerResponse(exposed, makeMismatchedBytePlan(cachedPlan!));
        expect(exposed.commitPendingWorkerPlan(input.nowMs + 2)).toBe(false);
        expect(exposed.cachedPlan).toBe(cachedPlan);

        family.dispose();
    });
});
