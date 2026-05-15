// GRID_GRADIENT_GOD_OBJECT.ts
// Generated reference bundle for external-agent review. Do not compile this file.
// Each section preserves original source text and starts with original path + line range.
// Edit the real source files listed in SOURCE comments, not this bundled digest.


/* ==========================================================================
SECTION 00: Render-family input/output contract
LAYER: contract
SOURCE: pax-fluxia\src\lib\territory\families\RenderFamilyTypes.ts:1-97
GREP: RenderFamilyInput, RenderFamily, RenderFamilyOutput
========================================================================== */
import type * as PIXI from 'pixi.js';
import type { ConquestEvent } from '@pax/common';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { TerritoryRuntimeDiagnostics } from '../contracts/DiagnosticsContracts';
import type { ResolvedGeometrySnapshot } from '../contracts/GeometryContracts';
import type { StarState, StarConnection } from '$lib/types/game.types';

export interface RenderFamilyTransitionEvent {
    event: ConquestEvent;
    startedAtMs: number;
    durationMs: number;
    progress: number;
    rawProgress: number;
}

export interface RenderFamilyTransitionSession {
    sessionKey: string;
    conquestEvents: ReadonlyArray<ConquestEvent>;
    events: ReadonlyArray<RenderFamilyTransitionEvent>;
    startedAtMs: number;
    durationMs: number;
    progress: number;
    rawProgress: number;
}

export interface RenderFamilyActiveTransition
    extends RenderFamilyTransitionSession {}

export interface RenderFamilyOwnedStarSnapshot {
    id: string;
    ownerId: string;
    x: number;
    y: number;
}

export interface RenderFamilyCapturedTransitionSession
    extends RenderFamilyTransitionSession {
    prevGeometry: ResolvedGeometrySnapshot;
    nextGeometry: ResolvedGeometrySnapshot;
    prevOwnedStars: ReadonlyArray<RenderFamilyOwnedStarSnapshot>;
    nextOwnedStars: ReadonlyArray<RenderFamilyOwnedStarSnapshot>;
}

export type RenderFamilyTunableValue =
    | string
    | number
    | boolean
    | null
    | undefined;

export interface RenderFamilyInput {
    ownership: OwnershipSnapshot | null;
    geometry?: ResolvedGeometrySnapshot | null;
    /**
     * Optional PREV (pre-transition) geometry snapshot, captured upstream in
     * GameCanvas once per transition key and passed to all families. Previously
     * each family rebuilt its own PREV from reverted stars inside update() â€”
     * duplicate work that dominated the trace at small cell spacings
     * (MG-PERF Phase C, 2026-04-19). Families may fall back to a local rebuild
     * if this is null (e.g. first frame after a hot reload).
     */
    prevGeometry?: ResolvedGeometrySnapshot | null;
    nowMs: number;
    paused?: boolean;
    /** Game tick (for combat/recency effects in renderers that opt in, e.g. Metaball borders). */
    gameTick?: number;
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    world: { width: number; height: number; minX?: number; minY?: number };
    tunables: ReadonlyMap<string, RenderFamilyTunableValue>;
    configSource?: Readonly<Record<string, unknown>>;
    renderer?: PIXI.Renderer;
    activeTransition?: RenderFamilyActiveTransition | null;
    transitionSessions?: ReadonlyArray<RenderFamilyTransitionSession> | null;
    transitionTruth?: unknown | null;
}

export interface RenderFamilyOutput {
    container: PIXI.Container;
    diagnostics?: TerritoryRuntimeDiagnostics;
    debugGeometry?: { regions?: unknown; frontiers?: unknown };
    events?: ReadonlyArray<{ type: string; payload: unknown }>;
}

/** Optional diagnostics hook (D-menu); families may implement incrementally. */
export interface DiagnosticProvider {
    readonly diagnosticIds: readonly string[];
    snapshot(): Readonly<Record<string, unknown>>;
}

export interface RenderFamily {
    readonly id: string;
    readonly label: string;
    readonly tunableKeys: readonly string[];
    update(input: RenderFamilyInput): RenderFamilyOutput;
    dispose(): void;
}

/* ==========================================================================
SECTION 01: Render-family registry
LAYER: contract
SOURCE: pax-fluxia\src\lib\territory\families\renderFamilyRegistry.ts:1-18
GREP: registerRenderFamily, getRenderFamily
========================================================================== */
import type { RenderFamily } from './RenderFamilyTypes';

const families = new Map<string, RenderFamily>();

export function registerRenderFamily(family: RenderFamily): void {
    families.set(family.id, family);
}

export function getRenderFamily(id: string): RenderFamily | undefined {
    return families.get(id);
}

export function disposeAllRenderFamilies(): void {
    for (const f of families.values()) {
        f.dispose();
    }
    families.clear();
}

/* ==========================================================================
SECTION 02: Builds per-frame family input and tunables
LAYER: contract
SOURCE: pax-fluxia\src\lib\territory\families\buildRenderFamilyInput.ts:1-130
GREP: buildRenderFamilyInput, collectRenderFamilyTunables
========================================================================== */
import { GAME_CONFIG } from '$lib/config/game.config';
import {
    logPipelineStage,
    summarizeConnections,
    summarizeGeometry,
    summarizeOwnership,
    summarizeStars,
} from '$lib/perf/pipelineTelemetry';
import type { StarState, StarConnection } from '$lib/types/game.types';
import type { ResolvedGeometrySnapshot } from '../contracts/GeometryContracts';
import type {
    RenderFamilyInput,
    RenderFamilyTunableValue,
} from './RenderFamilyTypes';

function collectRenderFamilyTunables(params: {
    tunableKeys?: readonly string[];
    configSource?: Record<string, unknown>;
}): ReadonlyMap<string, RenderFamilyTunableValue> {
    if (!params.tunableKeys?.length) {
        return new Map();
    }

    const configSource =
        params.configSource ??
        (GAME_CONFIG as unknown as Record<string, unknown>);
    const tunables = new Map<string, RenderFamilyTunableValue>();

    for (const key of params.tunableKeys) {
        tunables.set(key, configSource[key] as RenderFamilyTunableValue);
    }

    return tunables;
}

function summarizeTunables(
    tunables: ReadonlyMap<string, RenderFamilyTunableValue>,
): string {
    const preview = [...tunables.entries()]
        .slice(0, 4)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(',');
    return `tunables=${tunables.size}${preview ? ` preview=${preview}` : ''}`;
}

export function buildRenderFamilyInput(params: {
    stars: StarState[];
    lanes: StarConnection[];
    worldWidth: number;
    worldHeight: number;
    worldMinX?: number;
    worldMinY?: number;
    nowMs: number;
    paused?: boolean;
    gameTick?: number;
    ownership?: RenderFamilyInput['ownership'];
    geometry?: ResolvedGeometrySnapshot | null;
    prevGeometry?: ResolvedGeometrySnapshot | null;
    renderer?: RenderFamilyInput['renderer'];
    activeTransition?: RenderFamilyInput['activeTransition'];
    transitionSessions?: RenderFamilyInput['transitionSessions'];
    tunableKeys?: readonly string[];
    configSource?: Record<string, unknown>;
}): RenderFamilyInput {
    const tunables = collectRenderFamilyTunables({
        tunableKeys: params.tunableKeys,
        configSource: params.configSource,
    });
    const input = {
        ownership: params.ownership ?? null,
        geometry: params.geometry ?? null,
        prevGeometry: params.prevGeometry ?? null,
        nowMs: params.nowMs,
        paused: params.paused ?? false,
        gameTick: params.gameTick,
        stars: params.stars,
        lanes: params.lanes,
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
            minX: params.worldMinX ?? 0,
            minY: params.worldMinY ?? 0,
        },
        tunables,
        configSource:
            params.configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>),
        renderer: params.renderer,
        activeTransition: params.activeTransition ?? null,
        transitionSessions: params.transitionSessions ?? null,
    };
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyInput',
        stage: 'family_input',
        from: 'GameCanvas frame state',
        to: 'Render-family contract',
        purpose: 'Freeze stars, lanes, ownership, geometry, and tunables into a single family update payload',
        summary:
            `${summarizeStars(input.stars)} ${summarizeConnections(input.lanes)} ` +
            `${input.ownership ? summarizeOwnership(input.ownership) : 'ownership=null'} ` +
            `${summarizeGeometry(input.geometry)} prev=${summarizeGeometry(input.prevGeometry ?? null)} ` +
            `${summarizeTunables(tunables)}`,
        perfEventName: 'territory.renderFamily.inputBuilt',
        detail: {
            nowMs: input.nowMs,
            paused: input.paused,
            gameTick: input.gameTick ?? null,
            activeTransitionEvents: input.activeTransition?.events.length ?? 0,
            transitionSessions: input.transitionSessions?.length ?? 0,
        },
        logDetail: {
            nowMs: input.nowMs,
            paused: input.paused,
            gameTick: input.gameTick ?? null,
            world: input.world,
            stars: input.stars,
            lanes: input.lanes,
            ownership: input.ownership,
            geometry: input.geometry,
            prevGeometry: input.prevGeometry,
            tunables: Object.fromEntries(tunables.entries()),
            configSource: input.configSource,
            renderer: input.renderer,
            activeTransition: input.activeTransition,
            transitionSessions: input.transitionSessions,
        },
    });
    return input;
}

/* ==========================================================================
SECTION 03: Builds active transition sessions for families
LAYER: transition
SOURCE: pax-fluxia\src\lib\territory\transitions\renderFamilyTransitionLifecycle.ts:1-173
GREP: buildRenderFamilyTransitionLifecycle
========================================================================== */
import type { ConquestEvent } from '@pax/common';
import {
    resolveTerritoryTransitionDurationMs,
    type TerritoryTransitionEntry,
} from '$lib/fx/handlers/territoryTransitionHandler';
import type {
    RenderFamilyActiveTransition,
    RenderFamilyTransitionEvent,
    RenderFamilyTransitionSession,
} from '$lib/territory/families/RenderFamilyTypes';

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function transitionIdentityKey(conquest: ConquestEvent): string {
    return [
        conquest.tick,
        conquest.starId,
        conquest.previousOwner,
        conquest.newOwner,
    ].join(':');
}

interface LifecycleEvent extends RenderFamilyTransitionEvent {
    starIdToMark?: string;
}

export interface RenderFamilyTransitionLifecycleResult {
    activeTransition: RenderFamilyActiveTransition | null;
    activeSessions: readonly RenderFamilyTransitionSession[];
    terminalFrameStarIds: readonly string[];
}

function buildSessionKey(events: ReadonlyArray<LifecycleEvent>): string {
    const tick = events[0]?.event.tick ?? -1;
    const conquestSig = events
        .map((event) => transitionIdentityKey(event.event))
        .sort()
        .join('|');
    return `tick:${tick}:${conquestSig}`;
}

function buildSession(
    events: ReadonlyArray<LifecycleEvent>,
): RenderFamilyTransitionSession {
    const sessionEvents = [...events].sort((a, b) => {
        if (a.startedAtMs !== b.startedAtMs) {
            return a.startedAtMs - b.startedAtMs;
        }
        return transitionIdentityKey(a.event).localeCompare(
            transitionIdentityKey(b.event),
        );
    });
    const normalizedEvents: RenderFamilyTransitionEvent[] = sessionEvents.map(
        ({ starIdToMark: _starIdToMark, ...event }) => event,
    );
    const startedAtMs = Math.min(
        ...normalizedEvents.map((event) => event.startedAtMs),
    );
    const durationMs = Math.max(
        ...normalizedEvents.map((event) => event.durationMs),
    );
    const rawProgress = Math.max(
        ...normalizedEvents.map((event) => event.rawProgress),
    );

    return {
        sessionKey: buildSessionKey(sessionEvents),
        conquestEvents: normalizedEvents.map((event) => event.event),
        events: normalizedEvents,
        startedAtMs,
        durationMs,
        rawProgress,
        progress: clamp01(rawProgress),
    };
}

export function buildRenderFamilyTransitionLifecycle(params: {
    nowMs: number;
    effectiveTickMs: number;
    activeEntries: ReadonlyArray<TerritoryTransitionEntry>;
    pendingConquests?: ReadonlyArray<ConquestEvent>;
}): RenderFamilyTransitionLifecycleResult {
    const eventsByKey = new Map<string, LifecycleEvent>();

    for (const entry of params.activeEntries) {
        const durationMs = Math.max(1, entry.durationMs);
        const rawProgress = (params.nowMs - entry.startTimeMs) / durationMs;
        if (rawProgress > 1 && entry.terminalFrameRendered) continue;

        eventsByKey.set(transitionIdentityKey(entry.event), {
            event: entry.event,
            startedAtMs: entry.startTimeMs,
            durationMs,
            rawProgress,
            progress: clamp01(rawProgress),
            starIdToMark:
                rawProgress >= 1 && !entry.terminalFrameRendered
                    ? entry.starId
                    : undefined,
        });
    }

    const previewDurationMs = resolveTerritoryTransitionDurationMs(
        params.effectiveTickMs,
    );
    if (previewDurationMs > 0) {
        for (const conquest of params.pendingConquests ?? []) {
            const key = transitionIdentityKey(conquest);
            if (eventsByKey.has(key)) continue;
            eventsByKey.set(key, {
                event: conquest,
                startedAtMs: params.nowMs,
                durationMs: previewDurationMs,
                rawProgress: 0,
                progress: 0,
            });
        }
    }

    const lifecycleEvents = [...eventsByKey.values()].sort(
        (a, b) => a.startedAtMs - b.startedAtMs,
    );
    if (lifecycleEvents.length === 0) {
        return {
            activeTransition: null,
            activeSessions: [],
            terminalFrameStarIds: [],
        };
    }

    const terminalFrameStarIds = [
        ...new Set(
            lifecycleEvents
                .map((event) => event.starIdToMark)
                .filter((starId): starId is string => Boolean(starId)),
        ),
    ];

    const eventsByTick = new Map<number, LifecycleEvent[]>();
    for (const event of lifecycleEvents) {
        const bucket = eventsByTick.get(event.event.tick);
        if (bucket) {
            bucket.push(event);
        } else {
            eventsByTick.set(event.event.tick, [event]);
        }
    }

    const activeSessions = [...eventsByTick.entries()]
        .sort((a, b) => {
            if (a[0] !== b[0]) return a[0] - b[0];
            const aStartedAtMs = Math.min(
                ...a[1].map((event) => event.startedAtMs),
            );
            const bStartedAtMs = Math.min(
                ...b[1].map((event) => event.startedAtMs),
            );
            return aStartedAtMs - bStartedAtMs;
        })
        .map(([, events]) => buildSession(events));
    const activeTransition =
        activeSessions.length > 0
            ? activeSessions[activeSessions.length - 1]
            : null;

    return {
        activeTransition,
        activeSessions,
        terminalFrameStarIds,
    };
}

/* ==========================================================================
SECTION 04: Ownership snapshot and shared family geometry builders
LAYER: ownership/geometry
SOURCE: pax-fluxia\src\lib\territory\families\buildFamilyGeometry.ts:1-281
GREP: buildOwnershipSnapshotFromStars, buildPerimeterFieldRenderFamilyGeometry
========================================================================== */
import { GAME_CONFIG } from '$lib/config/game.config';
import {
    logPipelineStage,
    summarizeConnections,
    summarizeGeometry,
    summarizeOwnership,
    summarizeStars,
} from '$lib/perf/pipelineTelemetry';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import type { ResolvedGeometrySnapshot } from '../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import { computeGeometry0319 } from '../compiler/Geometry_0319';
import type { TerritoryGeneratorSettings } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildPowerVoronoi0319AuthoritySnapshot } from '../geometry/buildPowerVoronoi0319AuthoritySnapshot';
import { buildTerritoryGeneratorSettingsFromTunables } from '../geometry/geometryTuning';
import { readTerritoryRuntimeSettings } from '../integration/TerritorySettingsBridge';
import { compileVectorGeometry } from '../layers/geometry/compiler_UnifiedVectorGeometry';

type PerimeterFieldGeometrySourceId = 'resolved_vector' | 'power_voronoi_0319';

export function buildOwnershipSnapshotFromStars(
    stars: ReadonlyArray<StarState>,
): OwnershipSnapshot {
    const starOwners = new Map<string, string>();
    for (const star of stars) {
        if (star.ownerId) {
            starOwners.set(star.id, star.ownerId);
        }
    }

    const snapshot = {
        version: 'render-family-live',
        starOwners,
        contestedLaneIds: [],
        conquestEvents: [],
        virtualStars: [],
    };
    logPipelineStage({
        channel: 'state',
        context: 'RenderFamilyGeometry',
        stage: 'ownership_snapshot',
        from: 'Live stars',
        to: 'OwnershipSnapshot',
        purpose: 'Normalize owner assignments for geometry and scene builders',
        summary: `${summarizeStars(stars)} ${summarizeOwnership(snapshot)}`,
        perfEventName: 'territory.ownership.snapshotBuilt',
        perfDetail: {
            starCount: stars.length,
            ownedStarCount: snapshot.starOwners.size,
        },
        logDetail: {
            stars,
            starOwners: Object.fromEntries(snapshot.starOwners.entries()),
            contestedLaneIds: snapshot.contestedLaneIds,
            conquestEvents: snapshot.conquestEvents,
            virtualStars: snapshot.virtualStars,
        },
    });
    return snapshot;
}

export function buildVectorRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    ownership?: OwnershipSnapshot | null;
}): ResolvedGeometrySnapshot {
    const runtimeSettings = readTerritoryRuntimeSettings(
        GAME_CONFIG as unknown as Record<string, unknown>,
    );

    const geometry = compileVectorGeometry({
        nowMs: params.nowMs,
        stars: [...params.stars],
        lanes: [...params.lanes],
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        tunables: runtimeSettings.tunables,
        ownership:
            params.ownership ?? buildOwnershipSnapshotFromStars(params.stars),
        styleMode: runtimeSettings.selection.styleMode,
    });
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyGeometry',
        stage: 'vector_geometry',
        from: 'Ownership snapshot + live topology',
        to: 'ResolvedGeometrySnapshot',
        purpose: 'Build render-family geometry for vector-driven territory families',
        summary:
            `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
            summarizeGeometry(geometry),
        perfEventName: 'territory.geometry.vectorBuilt',
        perfDetail: {
            starCount: params.stars.length,
            laneCount: params.lanes.length,
            regionCount: geometry.territoryRegions.length,
            frontierCount: geometry.frontierPolylines.length,
            shellLoopCount: geometry.shellLoops.length,
        },
        logDetail: {
            stars: params.stars,
            lanes: params.lanes,
            ownership:
                params.ownership == null
                    ? null
                    : {
                          version: params.ownership.version,
                          starOwners: Object.fromEntries(
                              params.ownership.starOwners.entries(),
                          ),
                          contestedLaneIds: params.ownership.contestedLaneIds,
                          conquestEvents: params.ownership.conquestEvents,
                          virtualStars: params.ownership.virtualStars,
                      },
            geometry,
        },
    });
    return geometry;
}

export function buildPowerVoronoi0319Settings(params: {
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    configSource?: Record<string, unknown>;
}): TerritoryGeneratorSettings {
    const runtimeSettings = readTerritoryRuntimeSettings(
        (params.configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>)) as Record<
            string,
            unknown
        >,
    );
    return buildTerritoryGeneratorSettingsFromTunables({
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        tunables: {
            ...runtimeSettings.tunables,
            corridorEnabled:
                runtimeSettings.tunables.corridorEnabled &&
                params.lanes.length > 0,
            disconnectEnabled:
                runtimeSettings.tunables.disconnectEnabled &&
                params.lanes.length > 0,
        },
    });
}

function buildPowerVoronoi0319RenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    ownershipVersion: string;
    sourceStyle: ResolvedGeometrySnapshot['sourceStyle'];
    configSource?: Record<string, unknown>;
}): ResolvedGeometrySnapshot | null {
    const settings = buildPowerVoronoi0319Settings({
        lanes: params.lanes,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
        configSource: params.configSource,
    });

    const result = computeGeometry0319(
        [...params.stars],
        [...params.lanes],
        settings,
    );
    if ('kind' in result) {
        log.error(
            'PerimeterFieldGeometry',
            `Geometry_0319 fallback to unified vector compiler: ${result.message}`,
        );
        return null;
    }

    return buildPowerVoronoi0319AuthoritySnapshot({
        geometry: result,
        stars: params.stars,
        ownershipVersion: params.ownershipVersion,
        sourceStyle: params.sourceStyle,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
        requestedMarginPx: settings.starMargin,
    });
}

export function buildPerimeterFieldRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    ownership?: OwnershipSnapshot | null;
    geometrySource?: string | null;
    configSource?: Record<string, unknown>;
}): ResolvedGeometrySnapshot {
    const configSource =
        params.configSource ??
        (GAME_CONFIG as unknown as Record<string, unknown>);
    const runtimeSettings = readTerritoryRuntimeSettings(configSource);
    const ownership =
        params.ownership ?? buildOwnershipSnapshotFromStars(params.stars);
    const geometrySource = (params.geometrySource ??
        configSource.PERIMETER_FIELD_GEOMETRY_SOURCE ??
        'power_voronoi_0319') as PerimeterFieldGeometrySourceId;

    if (geometrySource === 'power_voronoi_0319') {
        const adapted = buildPowerVoronoi0319RenderFamilyGeometry({
            stars: params.stars,
            lanes: params.lanes,
            worldWidth: params.worldWidth,
            worldHeight: params.worldHeight,
            ownershipVersion: ownership.version,
            sourceStyle: runtimeSettings.selection.styleMode,
            configSource,
        });
        if (adapted) {
            logPipelineStage({
                channel: 'renderer',
                context: 'RenderFamilyGeometry',
                stage: 'perimeter_geometry_authority',
                from: 'Geometry_0319 raw shared frontiers/world borders',
                to: 'ResolvedGeometrySnapshot',
                purpose: 'Resolve one shared-boundary geometry seam for all 0319 live consumers',
                summary:
                    `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
                    summarizeGeometry(adapted),
                perfEventName: 'territory.geometry.perimeterBuilt',
                detail: {
                    geometrySource,
                    authorityStage:
                        adapted.diagnostics.stageLadder?.authoritativeSeamFingerprint ??
                        null,
                    displayStage:
                        adapted.diagnostics.stageLadder?.displayBorderFingerprint ??
                        null,
                },
            });
            return adapted;
        }
    }

    const geometry = compileVectorGeometry({
        nowMs: params.nowMs,
        stars: [...params.stars],
        lanes: [...params.lanes],
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        tunables: runtimeSettings.tunables,
        ownership,
        styleMode: runtimeSettings.selection.styleMode,
    });
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyGeometry',
        stage: 'perimeter_geometry_fallback',
        from: 'Live topology',
        to: 'ResolvedGeometrySnapshot',
        purpose: 'Fallback perimeter-field geometry compilation path',
        summary:
            `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
            summarizeGeometry(geometry),
        perfEventName: 'territory.geometry.perimeterFallbackBuilt',
        detail: {
            geometrySource,
        },
    });
    return geometry;
}

/* ==========================================================================
SECTION 05: Point-in-polygon hot path used by current classifier
LAYER: geometry
SOURCE: pax-fluxia\src\lib\territory\geometry\geometryUtils.ts:60-82
GREP: pointInPolygon
========================================================================== */
        }
    }
    return true;
}

/**
 * Point-in-polygon test using ray casting.
 */
export function pointInPolygon(px: number, py: number, polygon: readonly [number, number][]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Compute the centroid of a closed polygon.

/* ==========================================================================
SECTION 06: Shared grid ownership classification, current perf bottleneck
LAYER: classification
SOURCE: pax-fluxia\src\lib\territory\families\metaballGrid\buildGridClassification.ts:1-596
GREP: buildGridClassification, resolveOwnerAt
========================================================================== */
/**
 * metaball-grid â€” classification builder (MG2)
 *
 * Builds a world-anchored grid of vstars and resolves PREV/NEXT ownership for
 * each cell via point-in-polygon against `territoryRegions`. Classifies each
 * cell as `native | dispossessed | emergent | vacating | outside` and
 * attributes dispossessed/emergent/vacating cells to a conquest event.
 *
 * Pure function. Deterministic for fixed inputs.
 *
 * Complexity: O(N_v * N_regions) per call. For 1920Ã—1080 @ 24 px spacing and
 * ~10 regions â‰ˆ 72k point-in-polygon tests â€” one-shot per conquest.
 */

import type { ConquestEvent } from '@pax/common';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import { pointInPolygon } from '../../geometry/geometryUtils';
import type {
    BuildGridClassificationParams,
    GridClassification,
    GridDistribution,
    GridOriginMode,
    GridOwnedStar,
    GridVRole,
    GridVStar,
} from './metaballGridTypes';

const DEFAULT_EVENT_ID = '__default__';
const WORLD_MIN_EPSILON = 0.000001;

/**
 * Compute the origin offset for a grid of given spacing and origin mode.
 * `centered` puts the first cell at `(spacing/2, spacing/2)`, so the grid is
 * symmetric under world reflection. `corner` puts it at `(0, 0)`.
 */
function resolveOffset(spacingPx: number, originMode: GridOriginMode): { offsetX: number; offsetY: number } {
    if (originMode === 'centered') {
        return { offsetX: spacingPx / 2, offsetY: spacingPx / 2 };
    }
    return { offsetX: 0, offsetY: 0 };
}

function resolveFirstGridIndex(
    worldMin: number,
    spacingPx: number,
    originOffset: number,
): number {
    return Math.ceil((worldMin - originOffset) / spacingPx);
}

function resolveGridCount(
    worldSize: number,
    spacingPx: number,
    firstLocalCoord: number,
    halfSpacing: number,
): number {
    return Math.max(1, Math.floor((worldSize - firstLocalCoord + halfSpacing) / spacingPx) + 1);
}

interface IndexedRegion {
    readonly ownerId: string;
    readonly points: TerritoryRegionShape['points'];
    readonly anchorStarIds: readonly string[];
    readonly absArea: number;
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

interface RegionLookup {
    readonly bucketSize: number;
    readonly buckets: ReadonlyMap<string, readonly IndexedRegion[]>;
}

interface OwnedStarLookup {
    readonly bucketSize: number;
    readonly buckets: ReadonlyMap<string, readonly GridOwnedStar[]>;
}

function makeBucketKey(ix: number, iy: number): string {
    return `${ix}:${iy}`;
}

function bucketIndex(value: number, bucketSize: number): number {
    return Math.floor(value / bucketSize);
}

function indexRegion(region: TerritoryRegionShape): IndexedRegion {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let area = 0;
    for (let i = 0; i < region.points.length; i++) {
        const [x, y] = region.points[i];
        const [nx, ny] = region.points[(i + 1) % region.points.length];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        area += x * ny - nx * y;
    }
    return {
        ownerId: region.ownerId,
        points: region.points,
        anchorStarIds:
            region.anchorStarIds
            ?? region.starIds?.filter((starId) => !starId.startsWith('corridor_') && !starId.startsWith('disconnect_'))
            ?? [],
        absArea: Math.abs(area * 0.5),
        minX,
        minY,
        maxX,
        maxY,
    };
}

function buildRegionLookup(
    regions: readonly TerritoryRegionShape[],
    spacingPx: number,
): RegionLookup {
    const bucketSize = Math.max(32, spacingPx * 2);
    const buckets = new Map<string, IndexedRegion[]>();
    for (let i = 0; i < regions.length; i++) {
        const indexed = indexRegion(regions[i]);
        const minBx = bucketIndex(indexed.minX, bucketSize);
        const maxBx = bucketIndex(indexed.maxX, bucketSize);
        const minBy = bucketIndex(indexed.minY, bucketSize);
        const maxBy = bucketIndex(indexed.maxY, bucketSize);
        for (let by = minBy; by <= maxBy; by++) {
            for (let bx = minBx; bx <= maxBx; bx++) {
                const key = makeBucketKey(bx, by);
                let list = buckets.get(key);
                if (!list) {
                    list = [];
                    buckets.set(key, list);
                }
                list.push(indexed);
            }
        }
    }
    return { bucketSize, buckets };
}

/**
 * Test a world point against candidate regions whose bbox overlaps the point's
 * spatial bucket, preserving deterministic array order within that bucket.
 */
function resolveOwnerAt(
    x: number,
    y: number,
    lookup: RegionLookup,
    starById?: ReadonlyMap<string, GridOwnedStar>,
): string | null {
    const bx = bucketIndex(x, lookup.bucketSize);
    const by = bucketIndex(y, lookup.bucketSize);
    const candidates = lookup.buckets.get(makeBucketKey(bx, by));
    if (!candidates || candidates.length === 0) return null;
    const hits: IndexedRegion[] = [];
    for (let i = 0; i < candidates.length; i++) {
        const r = candidates[i];
        if (x < r.minX || x > r.maxX || y < r.minY || y > r.maxY) continue;
        if (pointInPolygon(x, y, r.points)) {
            hits.push(r);
        }
    }
    if (hits.length === 0) return null;
    if (hits.length === 1) return hits[0].ownerId;

    const distinctOwners = new Set(hits.map((hit) => hit.ownerId));
    if (distinctOwners.size === 1) {
        return hits[0].ownerId;
    }

    let best = hits[0];
    let bestHasAnchors = best.anchorStarIds.length > 0;
    let bestNearestDistSq = Infinity;
    if (bestHasAnchors && starById) {
        for (let i = 0; i < best.anchorStarIds.length; i++) {
            const star = starById.get(best.anchorStarIds[i]);
            if (!star) continue;
            const dx = star.x - x;
            const dy = star.y - y;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestNearestDistSq) bestNearestDistSq = distSq;
        }
    }

    for (let i = 1; i < hits.length; i++) {
        const candidate = hits[i];
        const candidateHasAnchors = candidate.anchorStarIds.length > 0;
        if (candidateHasAnchors !== bestHasAnchors) {
            if (candidateHasAnchors) {
                best = candidate;
                bestHasAnchors = true;
                bestNearestDistSq = Infinity;
                if (starById) {
                    for (let j = 0; j < candidate.anchorStarIds.length; j++) {
                        const star = starById.get(candidate.anchorStarIds[j]);
                        if (!star) continue;
                        const dx = star.x - x;
                        const dy = star.y - y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < bestNearestDistSq) bestNearestDistSq = distSq;
                    }
                }
            }
            continue;
        }

        let candidateNearestDistSq = Infinity;
        if (candidateHasAnchors && starById) {
            for (let j = 0; j < candidate.anchorStarIds.length; j++) {
                const star = starById.get(candidate.anchorStarIds[j]);
                if (!star) continue;
                const dx = star.x - x;
                const dy = star.y - y;
                const distSq = dx * dx + dy * dy;
                if (distSq < candidateNearestDistSq) candidateNearestDistSq = distSq;
            }
        }

        if (candidateNearestDistSq !== bestNearestDistSq) {
            if (candidateNearestDistSq < bestNearestDistSq) {
                best = candidate;
                bestHasAnchors = candidateHasAnchors;
                bestNearestDistSq = candidateNearestDistSq;
            }
            continue;
        }

        if (candidate.absArea !== best.absArea) {
            if (candidate.absArea < best.absArea) {
                best = candidate;
                bestHasAnchors = candidateHasAnchors;
                bestNearestDistSq = candidateNearestDistSq;
            }
            continue;
        }

        const candidateIsNeutral = candidate.ownerId === 'neutral';
        const bestIsNeutral = best.ownerId === 'neutral';
        if (candidateIsNeutral !== bestIsNeutral && !candidateIsNeutral) {
            best = candidate;
            bestHasAnchors = candidateHasAnchors;
            bestNearestDistSq = candidateNearestDistSq;
        }
    }

    return best.ownerId;
}

function buildOwnedStarLookup(
    ownedStars: ReadonlyArray<GridOwnedStar> | undefined,
    coverageRadiusPx: number,
): OwnedStarLookup | null {
    if (!ownedStars || ownedStars.length === 0) return null;
    const bucketSize = Math.max(1, coverageRadiusPx);
    const buckets = new Map<string, GridOwnedStar[]>();
    for (let i = 0; i < ownedStars.length; i++) {
        const star = ownedStars[i];
        const bx = bucketIndex(star.x, bucketSize);
        const by = bucketIndex(star.y, bucketSize);
        const key = makeBucketKey(bx, by);
        let list = buckets.get(key);
        if (!list) {
            list = [];
            buckets.set(key, list);
        }
        list.push(star);
    }
    return { bucketSize, buckets };
}

/**
 * Nearest-owned-star fallback. Used when polygon coverage misses a cell that
 * is clearly inside a player's star-sector (e.g. weighted voronoi MSR holes
 * at star centers). Returns the `ownerId` of the nearest owned star, but only
 * if it is within `coverageRadiusPxSq` (distance squared). Otherwise `null`.
 */
function resolveOwnerByNearestStar(
    x: number,
    y: number,
    lookup: OwnedStarLookup | null,
    coverageRadiusPxSq: number,
): string | null {
    if (!lookup) return null;
    const bx = bucketIndex(x, lookup.bucketSize);
    const by = bucketIndex(y, lookup.bucketSize);
    let bestOwner: string | null = null;
    let bestDist = Infinity;
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            const bucket = lookup.buckets.get(makeBucketKey(bx + ox, by + oy));
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const s = bucket[i];
                const dx = s.x - x;
                const dy = s.y - y;
                const d = dx * dx + dy * dy;
                if (d < bestDist) {
                    bestDist = d;
                    bestOwner = s.ownerId;
                }
            }
        }
    }
    return bestDist <= coverageRadiusPxSq ? bestOwner : null;
}

/**
 * Classify a `(prev, next)` pair into a role. Rules match the plan doc.
 */
function classifyRole(prev: string | null, next: string | null): GridVRole {
    if (prev === null && next === null) return 'outside';
    if (prev === null) return 'emergent';
    if (next === null) return 'vacating';
    if (prev === next) return 'native';
    return 'dispossessed';
}

/**
 * Attribute a grid vstar to an event. Matches on `(previousOwner, newOwner)`
 * equality; on multiple matches, tiebreaks by proximity to `event.starId` if
 * a position resolver is provided. Unmatched pairs route to the synthetic
 * default event bucket so no cell is ever orphaned.
 */
function attributeEvent(
    prev: string | null,
    next: string | null,
    gx: number,
    gy: number,
    events: ReadonlyArray<ConquestEvent>,
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null,
): string {
    if ((prev === null && next === null) || prev === next) return DEFAULT_EVENT_ID;

    const matches: number[] = [];
    for (let i = 0; i < events.length; i++) {
        const e = events[i];
        const matchesExactTransition =
            prev !== null && next !== null
                ? e.previousOwner === prev && e.newOwner === next
                : prev === null
                    ? e.newOwner === next
                    : e.previousOwner === prev;
        if (matchesExactTransition) {
            matches.push(i);
        }
    }
    if (matches.length === 0) return DEFAULT_EVENT_ID;
    if (matches.length === 1) return makeEventId(events[matches[0]]);

    if (resolveStarPosition) {
        let bestIdx = matches[0];
        let bestDist = Infinity;
        for (const idx of matches) {
            const pos = resolveStarPosition(events[idx].starId);
            if (!pos) continue;
            const dx = pos.x - gx;
            const dy = pos.y - gy;
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
                bestDist = d;
                bestIdx = idx;
            }
        }
        return makeEventId(events[bestIdx]);
    }

    return makeEventId(events[matches[0]]);
}

/**
 * Deterministic event id. `ConquestEvent` does not carry a primary-key id, so
 * we synthesize one stable under deterministic event ordering.
 */
export function makeEventId(event: ConquestEvent): string {
    return `e:${event.tick}:${event.starId}:${event.previousOwner}->${event.newOwner}`;
}

/**
 * Deterministic 32-bit integer hash of two ints. Mirrors the simple mix used
 * elsewhere in metaball-grid for flip-time jitter; kept here to avoid an
 * import cycle. Result is in [0, 2^32).
 */
function hash2Int(a: number, b: number): number {
    let h = (a | 0) * 374761393 + (b | 0) * 668265263;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

/**
 * Build a deterministic classification of the visual-truth grid for one
 * PREVâ†’NEXT transition.
 */
export function buildGridClassification(params: BuildGridClassificationParams): GridClassification {
    const {
        world,
        spacingPx: requestedSpacingPx,
        originMode,
        prevGeometry,
        nextGeometry,
        conquestEvents,
        resolveStarPosition,
        prevOwnedStars,
        nextOwnedStars,
        coverageRadiusPx,
        maxCells,
        distribution: distributionArg,
        positionJitter: positionJitterArg,
    } = params;

    if (requestedSpacingPx <= 0) throw new Error('spacingPx must be > 0');
    if (world.width <= 0 || world.height <= 0) throw new Error('world dimensions must be > 0');
    const worldMinX = Number.isFinite(world.minX) ? world.minX! : 0;
    const worldMinY = Number.isFinite(world.minY) ? world.minY! : 0;

    // Coarsen spacing upward if a maxCells cap would otherwise be exceeded.
    // A grid at `s` px has `ceil(w/s) * ceil(h/s)` cells. We approximate the
    // minimum spacing that stays under the cap with
    // `s_eff = max(requested, ceil(sqrt(w*h / maxCells)))`, then iterate once
    // more in case the ceilings push us back over.
    let spacingPx = requestedSpacingPx;
    if (maxCells && maxCells > 0) {
        const floorSpacing = Math.sqrt((world.width * world.height) / maxCells);
        if (requestedSpacingPx < floorSpacing) {
            spacingPx = floorSpacing;
        }
        // Tighten after the ceiling-based cell count is computed; if still
        // over the cap, bump spacing by the sqrt of the overshoot ratio.
        const provCols = Math.ceil(world.width / spacingPx);
        const provRows = Math.ceil(world.height / spacingPx);
        const provCells = provCols * provRows;
        if (provCells > maxCells) {
            spacingPx *= Math.sqrt(provCells / maxCells);
        }
    }

    const { offsetX, offsetY } = resolveOffset(spacingPx, originMode);
    const halfSpacing = spacingPx * 0.5;
    const firstGridIx = resolveFirstGridIndex(worldMinX, spacingPx, offsetX);
    const firstGridIy = resolveFirstGridIndex(worldMinY, spacingPx, offsetY);
    const firstLocalX = firstGridIx * spacingPx + offsetX - worldMinX;
    const firstLocalY = firstGridIy * spacingPx + offsetY - worldMinY;
    const cols =
        Math.abs(worldMinX) <= WORLD_MIN_EPSILON
            ? Math.ceil(world.width / spacingPx)
            : resolveGridCount(world.width, spacingPx, firstLocalX, halfSpacing);
    const rows =
        Math.abs(worldMinY) <= WORLD_MIN_EPSILON
            ? Math.ceil(world.height / spacingPx)
            : resolveGridCount(world.height, spacingPx, firstLocalY, halfSpacing);
    const distribution = distributionArg ?? 'square';
    // Clamp jitter fraction to [0, 0.5]; > 0.5 lets neighbours swap slots.
    const positionJitter = distribution === 'jittered'
        ? Math.max(0, Math.min(0.5, positionJitterArg ?? 0))
        : 0;

    const coverageRadius = coverageRadiusPx ?? spacingPx * 3;
    const coverageRadiusSq = coverageRadius * coverageRadius;
    const prevRegionLookup = buildRegionLookup(prevGeometry.territoryRegions, spacingPx);
    const nextRegionLookup =
        prevGeometry === nextGeometry
            ? prevRegionLookup
            : buildRegionLookup(nextGeometry.territoryRegions, spacingPx);
    const prevStarById = new Map<string, GridOwnedStar>();
    for (let i = 0; i < (prevOwnedStars?.length ?? 0); i++) {
        const star = prevOwnedStars![i];
        prevStarById.set(star.id, star);
    }
    const nextStarById =
        prevGeometry === nextGeometry && prevOwnedStars === nextOwnedStars
            ? prevStarById
            : (() => {
                const map = new Map<string, GridOwnedStar>();
                for (let i = 0; i < (nextOwnedStars?.length ?? 0); i++) {
                    const star = nextOwnedStars![i];
                    map.set(star.id, star);
                }
                return map;
            })();
    const prevOwnedStarLookup = buildOwnedStarLookup(prevOwnedStars, coverageRadius);
    const nextOwnedStarLookup =
        prevGeometry === nextGeometry && prevOwnedStars === nextOwnedStars
            ? prevOwnedStarLookup
            : buildOwnedStarLookup(nextOwnedStars, coverageRadius);
    const sameSnapshot =
        prevGeometry === nextGeometry &&
        prevRegionLookup === nextRegionLookup &&
        prevOwnedStarLookup === nextOwnedStarLookup;

    // Role bins (string arrays so downstream can skip vstar[] realloc).
    const roleBins: Record<GridVRole, string[]> = {
        native: [],
        dispossessed: [],
        emergent: [],
        vacating: [],
        outside: [],
    };
    const dispossessedByEventId: Record<string, string[]> = {};

    const vstars: GridVStar[] = new Array(cols * rows);
    const emittableVstars: GridVStar[] = [];
    const jitterAmp = positionJitter * spacingPx;

    for (let iy = 0; iy < rows; iy++) {
        const globalIy = firstGridIy + iy;
        // `hex_offset`: shift odd rows by half-spacing for honeycomb packing.
        const rowXShift =
            distribution === 'hex_offset' && (globalIy & 1) === 1 ? halfSpacing : 0;
        for (let ix = 0; ix < cols; ix++) {
            const globalIx = firstGridIx + ix;
            let x = globalIx * spacingPx + offsetX + rowXShift - worldMinX;
            let y = globalIy * spacingPx + offsetY - worldMinY;
            if (jitterAmp > 0) {
                // Deterministic per-cell scatter. Use two independent hashes
                // so x/y offsets do not correlate diagonally.
                const hx = hash2Int(ix, iy) / 0x1_0000_0000; // [0, 1)
                const hy = hash2Int(ix + 104729, iy + 48611) / 0x1_0000_0000; // [0, 1)
                x += (hx * 2 - 1) * jitterAmp;
                y += (hy * 2 - 1) * jitterAmp;
            }
            const id = `g:${ix}:${iy}`;

            // Polygon-first; nearest-owned-star fallback fills gaps left by
            // explicit margin shaping, including MSR-style moats in the source geometry.
            let prevOwnerId = resolveOwnerAt(x, y, prevRegionLookup, prevStarById);
            if (prevOwnerId === null) {
                prevOwnerId = resolveOwnerByNearestStar(x, y, prevOwnedStarLookup, coverageRadiusSq);
            }
            let nextOwnerId = prevOwnerId;
            if (!sameSnapshot) {
                nextOwnerId = resolveOwnerAt(x, y, nextRegionLookup, nextStarById);
                if (nextOwnerId === null) {
                    nextOwnerId = resolveOwnerByNearestStar(x, y, nextOwnedStarLookup, coverageRadiusSq);
                }
            }
            const role = classifyRole(prevOwnerId, nextOwnerId);

            let eventId: string | null = null;
            if (role !== 'native' && role !== 'outside') {
                eventId = attributeEvent(prevOwnerId, nextOwnerId, x, y, conquestEvents, resolveStarPosition);
                (dispossessedByEventId[eventId] ??= []).push(id);
            }

            const vstar: GridVStar = {
                id,
                ix,
                iy,
                x,
                y,
                prevOwnerId,
                nextOwnerId,
                role,
                eventId,
            };
            vstars[iy * cols + ix] = vstar;
            roleBins[role].push(id);
            if (role !== 'outside') {
                emittableVstars.push(vstar);
            }
        }
    }

    return {
        cols,
        rows,
        spacingPx,
        requestedSpacingPx,
        originMode,
        distribution,
        vstars,
        emittableVstars,
        byRole: {
            native: roleBins.native,
            dispossessed: roleBins.dispossessed,
            emergent: roleBins.emergent,
            vacating: roleBins.vacating,
            outside: roleBins.outside,
        },
        dispossessedByEventId,
        defaultEventId: DEFAULT_EVENT_ID,
    };
}

/** Helper for consumers that need row-major index â†’ vstar lookup. */
export function gridIndex(ix: number, iy: number, cols: number): number {
    return iy * cols + ix;
}

/* ==========================================================================
SECTION 07: Grid wave/phase planning reused by Grid Gradient
LAYER: transition
SOURCE: pax-fluxia\src\lib\territory\families\metaballGrid\planGridWave.ts:1-593
GREP: planGridWave
========================================================================== */
/**
 * metaball-grid - wave planner (MG3)
 *
 * For each conquest event, compute a `flipTime in [0, 1]` for every changed
 * grid vstar attributed to that event. Legacy modes build the field from seed
 * cells plus a rank geometry; the newer phase-field modes assign continuous
 * flip times directly from conquest-local spatial relationships.
 *
 * Pure function. Deterministic for fixed inputs.
 */

import type { ConquestEvent } from '@pax/common';
import { makeEventId } from './buildGridClassification';
import type {
    GridAdjacency,
    GridClassification,
    GridVStar,
    GridWaveGeometry,
    GridWavePlan,
    GridWavePlanEvent,
    GridWaveSeeding,
    PlanGridWaveParams,
} from './metaballGridTypes';
import { buildOrderedTransitionFrontier } from './metaballGridActiveFrontier';

interface GridIndex {
    readonly cols: number;
    readonly rows: number;
    readonly byId: ReadonlyMap<string, GridVStar>;
}

interface DirectFlipPlan {
    readonly flipTimeByVId: ReadonlyMap<string, number>;
    readonly maxRank: number;
    readonly seedVIds: readonly string[];
}

function buildIndex(classification: GridClassification): GridIndex {
    const byId = new Map<string, GridVStar>();
    for (const v of classification.vstars) byId.set(v.id, v);
    return { cols: classification.cols, rows: classification.rows, byId };
}

function idAt(ix: number, iy: number): string {
    return `g:${ix}:${iy}`;
}

function clamp01(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function sortIdsByGrid(ids: readonly string[], index: GridIndex): string[] {
    return [...ids].sort((a, b) => {
        const va = index.byId.get(a);
        const vb = index.byId.get(b);
        if (!va || !vb) return a.localeCompare(b);
        if (va.iy !== vb.iy) return va.iy - vb.iy;
        if (va.ix !== vb.ix) return va.ix - vb.ix;
        return a.localeCompare(b);
    });
}

/** Neighbor offsets for 4/8 adjacency. */
function neighborOffsets(adj: GridAdjacency): ReadonlyArray<readonly [number, number]> {
    if (adj === '4') {
        return [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ];
    }
    return [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
    ];
}

/**
 * Resolve the seed cells for one event under the selected seeding mode.
 *
 * - `winner_natives` - native cells of `event.newOwner` adjacent to any
 *   changed cell of the event.
 * - `conquered_star_center` - the single changed cell closest to the conquered
 *   star's world position.
 * - `winner_nearest_edge` - winner-native cells that share a 4-edge with the
 *   changed zone.
 */
function resolveSeeds(params: {
    event: ConquestEvent;
    changedIds: readonly string[];
    index: GridIndex;
    seeding: GridWaveSeeding;
    adjacency: GridAdjacency;
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): string[] {
    const { event, changedIds, index, seeding, adjacency, resolveStarPosition } = params;

    if (changedIds.length === 0) return [];

    if (seeding === 'conquered_star_center') {
        const pos = resolveStarPosition?.(event.starId);
        if (!pos) return [pickCentroidSeed(changedIds, index)];
        return [pickNearestCell(pos.x, pos.y, changedIds, index)];
    }

    const changedSet = new Set(changedIds);
    const winnerOwner = event.newOwner;
    const adjFor = seeding === 'winner_nearest_edge' ? '4' : adjacency;
    const offsets = neighborOffsets(adjFor);
    const seeds = new Set<string>();

    for (const changedId of changedIds) {
        const v = index.byId.get(changedId);
        if (!v) continue;
        for (const [dx, dy] of offsets) {
            const nx = v.ix + dx;
            const ny = v.iy + dy;
            if (nx < 0 || ny < 0 || nx >= index.cols || ny >= index.rows) continue;
            const neighborId = idAt(nx, ny);
            if (changedSet.has(neighborId)) continue;
            const neighbor = index.byId.get(neighborId);
            if (!neighbor) continue;
            if (neighbor.role === 'native' && neighbor.nextOwnerId === winnerOwner) {
                seeds.add(neighborId);
            }
        }
    }

    if (seeds.size === 0) {
        const pos = resolveStarPosition?.(event.starId);
        if (pos) return [pickNearestCell(pos.x, pos.y, changedIds, index)];
        return [changedIds[0]];
    }

    return Array.from(seeds).sort();
}

function pickNearestCell(x: number, y: number, ids: readonly string[], index: GridIndex): string {
    let bestId = ids[0];
    let bestD = Infinity;
    for (const id of ids) {
        const v = index.byId.get(id);
        if (!v) continue;
        const dx = v.x - x;
        const dy = v.y - y;
        const d = dx * dx + dy * dy;
        if (d < bestD || (d === bestD && id < bestId)) {
            bestD = d;
            bestId = id;
        }
    }
    return bestId;
}

function resolveCentroid(ids: readonly string[], index: GridIndex): { x: number; y: number } {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const id of ids) {
        const v = index.byId.get(id);
        if (!v) continue;
        sx += v.x;
        sy += v.y;
        n += 1;
    }
    if (n === 0) {
        const fallback = index.byId.get(ids[0]);
        return fallback ? { x: fallback.x, y: fallback.y } : { x: 0, y: 0 };
    }
    return { x: sx / n, y: sy / n };
}

function pickCentroidSeed(ids: readonly string[], index: GridIndex): string {
    const centroid = resolveCentroid(ids, index);
    return pickNearestCell(centroid.x, centroid.y, ids, index);
}

/**
 * Multi-source BFS rank across changed cells, starting from seeds.
 * Rank for a seed = 0. Rank for its frontier = 1, etc. Cells unreachable
 * within the changed subgraph get rank = maxRank + 1 and therefore flip last.
 */
function rankByGridBfs(params: {
    seeds: readonly string[];
    changedIds: readonly string[];
    index: GridIndex;
    adjacency: GridAdjacency;
}): { rank: Map<string, number>; maxRank: number } {
    const { seeds, changedIds, index, adjacency } = params;
    const changedSet = new Set(changedIds);
    const offsets = neighborOffsets(adjacency);
    const rank = new Map<string, number>();
    const queue: string[] = [];

    for (const seed of seeds) {
        if (changedSet.has(seed)) {
            rank.set(seed, 0);
            queue.push(seed);
            continue;
        }

        const v = index.byId.get(seed);
        if (!v) continue;
        for (const [dx, dy] of offsets) {
            const nx = v.ix + dx;
            const ny = v.iy + dy;
            const neighborId = idAt(nx, ny);
            if (changedSet.has(neighborId) && !rank.has(neighborId)) {
                rank.set(neighborId, 0);
                queue.push(neighborId);
            }
        }
    }

    let head = 0;
    while (head < queue.length) {
        const currentId = queue[head++];
        const current = index.byId.get(currentId);
        if (!current) continue;
        const currentRank = rank.get(currentId) ?? 0;
        for (const [dx, dy] of offsets) {
            const nx = current.ix + dx;
            const ny = current.iy + dy;
            const neighborId = idAt(nx, ny);
            if (!changedSet.has(neighborId) || rank.has(neighborId)) continue;
            rank.set(neighborId, currentRank + 1);
            queue.push(neighborId);
        }
    }

    let maxRank = 0;
    for (const value of rank.values()) {
        if (value > maxRank) maxRank = value;
    }

    const unreachableRank = maxRank + 1;
    let hasUnreachable = false;
    for (const id of changedIds) {
        if (!rank.has(id)) {
            rank.set(id, unreachableRank);
            hasUnreachable = true;
        }
    }
    if (hasUnreachable) maxRank = unreachableRank;

    return { rank, maxRank };
}

/**
 * Rank by min Euclidean distance from any seed cell center.
 *
 * Buckets: `rank = round(distance / spacingPx)`. This keeps the legacy
 * distance-band mode comparable to BFS depths for diagnostics and tuning.
 */
function rankByEuclideanBand(params: {
    seeds: readonly string[];
    changedIds: readonly string[];
    index: GridIndex;
    spacingPx: number;
}): { rank: Map<string, number>; maxRank: number } {
    const { seeds, changedIds, index, spacingPx } = params;

    const seedPositions: Array<{ x: number; y: number }> = [];
    for (const seed of seeds) {
        const v = index.byId.get(seed);
        if (v) seedPositions.push({ x: v.x, y: v.y });
    }
    if (seedPositions.length === 0) {
        const first = index.byId.get(changedIds[0]);
        if (first) seedPositions.push({ x: first.x, y: first.y });
    }

    const rank = new Map<string, number>();
    let maxRank = 0;
    for (const id of changedIds) {
        const v = index.byId.get(id);
        if (!v) continue;
        let minD = Infinity;
        for (const seed of seedPositions) {
            const dx = v.x - seed.x;
            const dy = v.y - seed.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minD) minD = distance;
        }
        const value = Math.round(minD / spacingPx);
        rank.set(id, value);
        if (value > maxRank) maxRank = value;
    }
    return { rank, maxRank };
}

/**
 * Convert ranks to flip times in [0, 1]. Ties are broken deterministically by
 * `(gridIy, gridIx)`.
 */
function assignFlipTimes(params: {
    rank: ReadonlyMap<string, number>;
    maxRank: number;
    changedIds: readonly string[];
    index: GridIndex;
}): Map<string, number> {
    const { rank, maxRank, changedIds, index } = params;
    const flip = new Map<string, number>();
    const sorted = [...changedIds].sort((a, b) => {
        const ra = rank.get(a) ?? 0;
        const rb = rank.get(b) ?? 0;
        if (ra !== rb) return ra - rb;
        const va = index.byId.get(a);
        const vb = index.byId.get(b);
        if (!va || !vb) return a.localeCompare(b);
        if (va.iy !== vb.iy) return va.iy - vb.iy;
        if (va.ix !== vb.ix) return va.ix - vb.ix;
        return a.localeCompare(b);
    });

    if (maxRank <= 0) {
        for (const id of sorted) flip.set(id, 0);
        return flip;
    }

    for (const id of sorted) {
        const value = rank.get(id) ?? 0;
        flip.set(id, value / maxRank);
    }
    return flip;
}

function assignConqueredStarRadialFlipTimes(params: {
    event?: ConquestEvent;
    changedIds: readonly string[];
    index: GridIndex;
    spacingPx: number;
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): DirectFlipPlan {
    const { event, changedIds, index, spacingPx, resolveStarPosition } = params;
    const origin =
        (event ? resolveStarPosition?.(event.starId) ?? null : null)
        ?? resolveCentroid(changedIds, index);
    const seedId = pickNearestCell(origin.x, origin.y, changedIds, index);
    const sortedIds = sortIdsByGrid(changedIds, index);
    const flipTimeByVId = new Map<string, number>();

    let maxDistance = 0;
    const distanceById = new Map<string, number>();
    for (const id of sortedIds) {
        const v = index.byId.get(id);
        if (!v) continue;
        const dx = v.x - origin.x;
        const dy = v.y - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        distanceById.set(id, distance);
        if (distance > maxDistance) maxDistance = distance;
    }

    if (maxDistance <= 0) {
        for (const id of sortedIds) flipTimeByVId.set(id, 0);
        return { flipTimeByVId, maxRank: 0, seedVIds: [seedId] };
    }

    for (const id of sortedIds) {
        flipTimeByVId.set(id, clamp01((distanceById.get(id) ?? 0) / maxDistance));
    }

    return {
        flipTimeByVId,
        maxRank: maxDistance / Math.max(1, spacingPx),
        seedVIds: [seedId],
    };
}

function resolvePreAndPostFrontierSeeds(params: {
    changedIds: readonly string[];
    index: GridIndex;
    adjacency: GridAdjacency;
}): { preSeedVIds: string[]; postSeedVIds: string[] } {
    const { changedIds, index, adjacency } = params;
    const changedSet = new Set(changedIds);
    const offsets = neighborOffsets(adjacency);
    const preSeeds = new Set<string>();
    const postSeeds = new Set<string>();

    for (const id of changedIds) {
        const v = index.byId.get(id);
        if (!v) continue;
        for (const [dx, dy] of offsets) {
            const nx = v.ix + dx;
            const ny = v.iy + dy;
            if (nx < 0 || ny < 0 || nx >= index.cols || ny >= index.rows) continue;
            const neighborId = idAt(nx, ny);
            if (changedSet.has(neighborId)) continue;
            const neighbor = index.byId.get(neighborId);
            if (!neighbor) continue;

            if (neighbor.prevOwnerId === v.nextOwnerId) preSeeds.add(id);
            if (neighbor.nextOwnerId === v.prevOwnerId) postSeeds.add(id);
        }
    }

    return {
        preSeedVIds: sortIdsByGrid([...preSeeds], index),
        postSeedVIds: sortIdsByGrid([...postSeeds], index),
    };
}

function assignPreToPostFrontierFlipTimes(params: {
    event?: ConquestEvent;
    changedIds: readonly string[];
    index: GridIndex;
    spacingPx: number;
    adjacency: GridAdjacency;
    resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}): DirectFlipPlan {
    const { changedIds, index, spacingPx, adjacency, event, resolveStarPosition } = params;
    const { preSeedVIds, postSeedVIds } = resolvePreAndPostFrontierSeeds({
        changedIds,
        index,
        adjacency,
    });

    // Some ownership deltas collapse to a map edge or a fully engulfed island,
    // which leaves one frontier side unobservable from the grid. Fall back to
    // the star-centered radial field in those degenerate cases.
    if (preSeedVIds.length === 0 || postSeedVIds.length === 0) {
        return assignConqueredStarRadialFlipTimes({
            event,
            changedIds,
            index,
            spacingPx,
            resolveStarPosition,
        });
    }

    const preDistance = rankByGridBfs({
        seeds: preSeedVIds,
        changedIds,
        index,
        adjacency,
    });
    const postDistance = rankByGridBfs({
        seeds: postSeedVIds,
        changedIds,
        index,
        adjacency,
    });

    const preSeedSet = new Set(preSeedVIds);
    const postSeedSet = new Set(postSeedVIds);
    const flipTimeByVId = new Map<string, number>();
    let maxRank = 0;

    for (const id of sortIdsByGrid(changedIds, index)) {
        const dPre = preDistance.rank.get(id) ?? 0;
        const dPost = postDistance.rank.get(id) ?? 0;
        const denom = dPre + dPost;

        let flipTime = 0.5;
        if (denom > 0) {
            flipTime = dPre / denom;
        } else if (preSeedSet.has(id) && !postSeedSet.has(id)) {
            flipTime = 0;
        } else if (postSeedSet.has(id) && !preSeedSet.has(id)) {
            flipTime = 1;
        }

        flipTimeByVId.set(id, clamp01(flipTime));
        if (denom > maxRank) maxRank = denom;
    }

    return {
        flipTimeByVId,
        maxRank,
        seedVIds: preSeedVIds,
    };
}

/**
 * Build a full wave plan covering every changed cell. Iterates events in input
 * order. Cells attributed to the synthetic default event are grouped under a
 * single synthetic plan entry.
 */
export function planGridWave(params: PlanGridWaveParams): GridWavePlan {
    const { classification, seeding, geometry, adjacency, conquestEvents, resolveStarPosition } = params;
    const index = buildIndex(classification);

    const eventOrder: Array<{ eventId: string; event?: ConquestEvent }> = conquestEvents.map((event) => ({
        eventId: makeEventId(event),
        event,
    }));
    if (classification.dispossessedByEventId[classification.defaultEventId]) {
        eventOrder.push({ eventId: classification.defaultEventId, event: undefined });
    }

    const perEvent: GridWavePlanEvent[] = [];
    const flat = new Map<string, number>();

    for (const { eventId, event } of eventOrder) {
        const changedIds = classification.dispossessedByEventId[eventId];
        if (!changedIds || changedIds.length === 0) continue;

        let flipPlan: DirectFlipPlan;

        if (geometry === 'conquered_star_radial') {
            flipPlan = assignConqueredStarRadialFlipTimes({
                event,
                changedIds,
                index,
                spacingPx: classification.spacingPx,
                resolveStarPosition,
            });
        } else if (geometry === 'pre_to_post_frontier') {
            flipPlan = assignPreToPostFrontierFlipTimes({
                event,
                changedIds,
                index,
                spacingPx: classification.spacingPx,
                adjacency,
                resolveStarPosition,
            });
        } else {
            const seeds = event
                ? resolveSeeds({
                      event,
                      changedIds,
                      index,
                      seeding,
                      adjacency,
                      resolveStarPosition,
                  })
                : [pickCentroidSeed(changedIds, index)];

            const ranked =
                geometry === 'grid_bfs'
                    ? rankByGridBfs({
                          seeds,
                          changedIds,
                          index,
                          adjacency,
                      })
                    : rankByEuclideanBand({
                          seeds,
                          changedIds,
                          index,
                          spacingPx: classification.spacingPx,
                      });

            flipPlan = {
                flipTimeByVId: assignFlipTimes({
                    rank: ranked.rank,
                    maxRank: ranked.maxRank,
                    changedIds,
                    index,
                }),
                maxRank: ranked.maxRank,
                seedVIds: seeds,
            };
        }

        for (const [id, flipTime] of flipPlan.flipTimeByVId) {
            flat.set(id, flipTime);
        }

        perEvent.push({
            eventId,
            seeding,
            geometry,
            adjacency,
            maxRank: flipPlan.maxRank,
            flipTimeByVId: flipPlan.flipTimeByVId,
            seedVIds: flipPlan.seedVIds,
        });
    }

    const ordered = buildOrderedTransitionFrontier({
        classification,
        flipTimeByVId: flat,
    });

    return {
        perEvent,
        flipTimeByVId: flat,
        orderedTransitionVIds: ordered.orderedTransitionVIds,
        orderedFlipTimes: ordered.orderedFlipTimes,
    };
}

/* ==========================================================================
SECTION 08: Grid cell scene evaluation reused by Grid Gradient
LAYER: transition/presentation
SOURCE: pax-fluxia\src\lib\territory\families\metaballGrid\renderMetaballGridScene.ts:1-359
GREP: renderMetaballGridScene
========================================================================== */
/**
 * metaball-grid â€” per-frame scene builder (MG4)
 *
 * Given a classification, a wave plan, the current `progress âˆˆ [0, 1]`, and a
 * flip-style/window, emit the set of `GridRenderCell` contributions for the
 * metaball compositor. Pure function.
 *
 * Flip styles (from plan doc):
 * - `hard` â€” one cell per vstar. Prev color until `progress < flipTime`, Next
 *   color at/after. Alpha = 1.
 * - `lerp_per_cell` â€” `hard` outside `[flipTime âˆ’ W, flipTime + W]`. Inside the
 *   window, emit two cells (PREV-side and NEXT-side) with smoothstep alphas
 *   summing to 1.
 * - `dual_pass_blend` â€” always emit two cells per vstar, with PREV-side alpha
 *   `1 âˆ’ smoothstep(flipTime âˆ’ W, flipTime + W, progress)` and NEXT-side the
 *   complement. The compositor sums both passes.
 *
 * Role handling:
 * - `native` â†’ one cell at `nextOwnerId` color, alpha 1.
 * - `dispossessed` â†’ per the flip style above.
 * - `emergent` (prev null, next X) â†’ like dispossessed but PREV-side omitted.
 * - `vacating` (prev X, next null) â†’ like dispossessed but NEXT-side omitted.
 * - `outside` â†’ never emitted.
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
    if (edge1 <= edge0) return x < edge0 ? 0 : 1; // degenerate â†’ step
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

function resolveColorIdx(ownerId: string | null, ownerColorIdx: ReadonlyMap<string, number>): number | null {
    if (ownerId === null) return null;
    const idx = ownerColorIdx.get(ownerId);
    return idx ?? null;
}

/**
 * Emit a scene for `progress âˆˆ [0, 1]`. All cells carry world-space `(x, y)`,
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
        includeNativeCells = true,
        omitVIds,
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
        if (omitVIds?.has(v.id)) continue;
        emitForVStar({
            v,
            progress: progressClamped,
            flipTransition,
            flipWindow,
            strength,
            flipTimeByVId: wavePlan.flipTimeByVId,
            ownerColorIdx,
            includeNativeCells,
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
    includeNativeCells: boolean;
    out: GridRenderCell[];
}): void {
    const {
        v,
        progress,
        flipTransition,
        flipWindow,
        strength,
        flipTimeByVId,
        ownerColorIdx,
        includeNativeCells,
        out,
    } = args;

    switch (v.role) {
        case 'outside':
            return;

        case 'native': {
            if (!includeNativeCells) return;
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
            // Only NEXT allowed (emergent) â€” hard-present under role rule.
            out.push({ vId: v.id, ix: v.ix, iy: v.iy, x: v.x, y: v.y, colorIdx: nextColor, alpha: 0, strength, pass: 'single', role: v.role });
        }
        return;
    }
    if (progress >= hi) {
        if (emitNext && nextColor !== null) {
            out.push({ vId: v.id, ix: v.ix, iy: v.iy, x: v.x, y: v.y, colorIdx: nextColor, alpha: gain, strength, pass: 'single', role: v.role });
        } else if (emitPrev && prevColor !== null) {
            // Only PREV allowed (vacating) â€” faded out after window.
            out.push({ vId: v.id, ix: v.ix, iy: v.iy, x: v.x, y: v.y, colorIdx: prevColor, alpha: 0, strength, pass: 'single', role: v.role });
        }
        return;
    }

    // Inside window: complementary alphas. smoothstep from loâ†’hi.
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

/* ==========================================================================
SECTION 09: Shared grid types used by classification/wave/scene
LAYER: types
SOURCE: pax-fluxia\src\lib\territory\families\metaballGrid\metaballGridTypes.ts:1-364
GREP: GridClassification, GridVStar, GridRenderCell
========================================================================== */
/**
 * metaball-grid â€” type contracts (MG1)
 *
 * Additive render family. Not a replacement for perimeter_field.
 *
 * Two-layer architecture (per ./METABALL_GRID_MODE_PLAN_2026-04-17.md):
 *
 *  1. Ownership-geometry truth underlayer (`ResolvedGeometrySnapshot`,
 *     authoritative â€” e.g. tuned `power_voronoi_0319`).
 *  2. Visual-truth grid layer â€” a fixed, world-anchored grid of vstars with
 *     PREV and NEXT owner resolved by point-in-polygon against the
 *     `territoryRegions` of each snapshot. A wave planner assigns each
 *     dispossessed vstar a `flipTime âˆˆ [0, 1]`, and a scene builder emits
 *     per-frame `{colorIdx, alpha, strength}` for each grid vstar.
 *
 * The underlayer is never mutated by this layer.
 */

import type { ConquestEvent } from '@pax/common';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Config option unions â€” mirror `METABALL_GRID_*` keys in `game.config.ts`.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type GridOriginMode = 'centered' | 'corner';

/**
 * Cell-position distribution mode. `square` is the classical row-major grid.
 * `hex_offset` shifts odd rows by half-spacing to produce honeycomb packing
 * (pairs naturally with `METABALL_GRID_CELL_SHAPE === 'hex'`). `jittered`
 * applies a deterministic per-cell scatter whose amplitude is controlled by
 * `METABALL_GRID_POSITION_JITTER` (fraction of spacing).
 */
export type GridDistribution = 'square' | 'hex_offset' | 'jittered';

/** BFS connectivity used by `grid_bfs` wave geometry. */
export type GridAdjacency = '4' | '8';

/** Phase-field generator used to assign per-cell flip times. */
export type GridWaveGeometry =
    | 'grid_bfs'
    | 'euclidean_band'
    | 'conquered_star_radial'
    | 'pre_to_post_frontier';

/** Which cells seed the wave for an event. */
export type GridWaveSeeding =
    | 'winner_natives'
    | 'conquered_star_center'
    | 'winner_nearest_edge';

/** Per-cell flip style at `flipTime`. */
export type GridFlipTransition = 'hard' | 'lerp_per_cell' | 'dual_pass_blend';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Role classification.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Role of a grid vstar in a PREVâ†’NEXT ownership transition.
 *
 * - `native` â€” `prevOwnerId === nextOwnerId`, non-null. Never changes.
 * - `dispossessed` â€” both defined and different. Participates in a wave.
 * - `emergent` â€” `prevOwnerId === null`, `nextOwnerId !== null`. Treated as
 *   dispossessed with PREV alpha = 0.
 * - `vacating` â€” `prevOwnerId !== null`, `nextOwnerId === null`. Treated as
 *   dispossessed with NEXT alpha = 0.
 * - `outside` â€” both null. Not emitted into the metaball field.
 */
export type GridVRole = 'native' | 'dispossessed' | 'emergent' | 'vacating' | 'outside';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Grid vstar.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * One vertex of the world-anchored visual grid. Positions are fixed for the
 * session; classification is refreshed per conquest.
 */
export interface GridVStar {
    /** Deterministic id: `g:${ix}:${iy}`. */
    readonly id: string;
    /** Column index in the grid (0-based). */
    readonly ix: number;
    /** Row index in the grid (0-based). */
    readonly iy: number;
    /** World-space x (px). */
    readonly x: number;
    /** World-space y (px). */
    readonly y: number;
    /** Owner under PREV snapshot, or null if no region contains this point. */
    readonly prevOwnerId: string | null;
    /** Owner under NEXT snapshot, or null if no region contains this point. */
    readonly nextOwnerId: string | null;
    /** Role under this PREVâ†’NEXT transition. */
    readonly role: GridVRole;
    /** For dispossessed/emergent/vacating cells, the attributed event id. */
    readonly eventId: string | null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Classification result.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Output of `buildGridClassification`. Deterministic and pure: identical inputs
 * produce identical outputs.
 */
export interface GridClassification {
    /**
     * Column count of the phase-preserving localized grid. This may exceed
     * `ceil(width / spacing)` by one when the localized viewport frame begins
     * mid-cell in the underlying world-anchored grid.
     */
    readonly cols: number;
    /**
     * Row count of the phase-preserving localized grid. This may exceed
     * `ceil(height / spacing)` by one when the localized viewport frame begins
     * mid-cell in the underlying world-anchored grid.
     */
    readonly rows: number;
    /**
     * Spacing actually used to build this classification, in world px. Equal to
     * the requested spacing unless the `METABALL_GRID_MAX_CELLS` cap coarsened
     * it. See `requestedSpacingPx` for the uncoarsened input.
     */
    readonly spacingPx: number;
    /** Spacing as requested by the caller (before maxCells coarsening). */
    readonly requestedSpacingPx: number;
    /** Origin offset mode used. */
    readonly originMode: GridOriginMode;
    /** Distribution mode used when computing cell positions. */
    readonly distribution: GridDistribution;
    /** All grid vstars in row-major order (`iy * cols + ix`). */
    readonly vstars: readonly GridVStar[];
    /**
     * PERF-hot path: vstars that can contribute to the metaball field at
     * any progress value (native + dispossessed + emergent + vacating).
     * Excludes only `outside`. The per-frame scene builder iterates this
     * array instead of all `vstars`, skipping the null-null cells that
     * would early-return anyway.
     */
    readonly emittableVstars: readonly GridVStar[];
    /** By-role bins, each carrying vstar ids (not positions) for fast iteration. */
    readonly byRole: Readonly<Record<GridVRole, readonly string[]>>;
    /** `eventId â†’ dispossessed vstar ids`, including the synthetic default bucket. */
    readonly dispossessedByEventId: Readonly<Record<string, readonly string[]>>;
    /** Synthetic default event id used for unmatched `(prev, next)` pairs. */
    readonly defaultEventId: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Wave plan.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Per-event wave plan: flip-time rank for each dispossessed vstar of the event. */
export interface GridWavePlanEvent {
    /** Attributed conquest event id. */
    readonly eventId: string;
    /** Seeding option used when the plan was built. */
    readonly seeding: GridWaveSeeding;
    /** Wave geometry option used when the plan was built. */
    readonly geometry: GridWaveGeometry;
    /** Adjacency option used when the plan was built (only meaningful for `grid_bfs`). */
    readonly adjacency: GridAdjacency;
    /** Max rank across the event (used to normalize `flipTime`). */
    readonly maxRank: number;
    /**
     * `gridVStar.id â†’ flipTime âˆˆ [0, 1]`.
     * Ties broken deterministically by `(gridIy, gridIx)`.
     */
    readonly flipTimeByVId: ReadonlyMap<string, number>;
    /** Seed vstar ids (flipTime = 0), exposed for diagnostics. */
    readonly seedVIds: readonly string[];
}

/** Full wave plan for one transition (all events). */
export interface GridWavePlan {
    /** Per-event sub-plans, ordered by input event order. */
    readonly perEvent: readonly GridWavePlanEvent[];
    /** Flat lookup: `gridVStar.id â†’ flipTime âˆˆ [0, 1]` for conquest-attributed cells only. */
    readonly flipTimeByVId: ReadonlyMap<string, number>;
    /**
     * All conquest-attributed transition cells sorted by effective flip time,
     * then `(iy, ix)` for deterministic ties.
     */
    readonly orderedTransitionVIds: readonly string[];
    /** Flip times aligned 1:1 with `orderedTransitionVIds`. */
    readonly orderedFlipTimes: readonly number[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Transition truth payload (captured upstream at conquest start).
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Deterministic truth payload for one metaball-grid transition. Produced by
 * the canvas upstream layer (MG5) and consumed by `MetaballGridFamily`.
 *
 * Structurally analogous to `PerimeterFieldTransitionTruth` but with a grid
 * classification and wave plan in place of perimeter section plans.
 */
export interface GridMetaballTransitionTruth {
    /** Stable key: tick-scoped, stable across replays (e.g. `t=${tick}:c=${starIdsSorted}`). */
    readonly conquestKey: string;
    /** PREV ownership geometry snapshot. */
    readonly prevGeometry: ResolvedGeometrySnapshot;
    /** NEXT ownership geometry snapshot. */
    readonly nextGeometry: ResolvedGeometrySnapshot;
    /** Deterministic ordered conquest events this transition covers. */
    readonly conquestEvents: ReadonlyArray<ConquestEvent>;
    /** Classification under PREV and NEXT. */
    readonly classification: GridClassification;
    /** Wave plan derived from the classification + config. */
    readonly wavePlan: GridWavePlan;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Per-frame renderable cell.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * One renderable contribution to the metaball field at a given `progress`.
 * Produced by `renderMetaballGridScene`.
 *
 * For `dual_pass_blend`, two `GridRenderCell`s may be emitted per vstar
 * (one PREV-side, one NEXT-side) with `pass` marking which side.
 */
export interface GridRenderCell {
    /** Source vstar id. */
    readonly vId: string;
    /** Source grid column index. */
    readonly ix: number;
    /** Source grid row index. */
    readonly iy: number;
    /** World-space x. */
    readonly x: number;
    /** World-space y. */
    readonly y: number;
    /** Owner color palette index this cell contributes. */
    readonly colorIdx: number;
    /** Alpha 0..1, ready for direct downstream painting. */
    readonly alpha: number;
    /**
     * Reserved for any future additive-field compositor that wants a
     * separate strength channel. Current direct-paint family keeps this
     * fixed at runtime and uses only `alpha`.
     */
    readonly strength: number;
    /** For `dual_pass_blend`: which side this cell represents. */
    readonly pass: 'single' | 'prev' | 'next';
    /**
     * Role of the source vstar. Painters that want to apply a different
     * visual treatment to ownership-boundary cells (e.g.
     * `METABALL_GRID_INWARD_OFFSET_PX`) key on `role !== 'native'`.
     */
    readonly role: GridVRole;
}

/** Complete scene emitted per frame. */
export interface GridMetaballScene {
    /** Scrub position this scene was built at, `âˆˆ [0, 1]`. */
    readonly progress: number;
    /**
     * Emitted cells: native (every frame, static NEXT color) + active roles
     * (dispossessed / emergent / vacating) under their flip mechanics.
     * Outside cells are never emitted.
     */
    readonly cells: readonly GridRenderCell[];
    /** Flip style the scene was built under. */
    readonly flipTransition: GridFlipTransition;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Build-input bundles (keep external callers terse).
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Ownership snapshot of a star at one of the PREV/NEXT time points. Used for
 * nearest-owned-star fallback when polygon coverage has gaps created by
 * minimum-star-margin clearance, including MSR-style moats in the source geometry.
 */
export interface GridOwnedStar {
    readonly id: string;
    readonly ownerId: string;
    readonly x: number;
    readonly y: number;
}

export interface BuildGridClassificationParams {
    readonly world: { width: number; height: number; minX?: number; minY?: number };
    readonly spacingPx: number;
    readonly originMode: GridOriginMode;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly nextGeometry: ResolvedGeometrySnapshot;
    readonly conquestEvents: ReadonlyArray<ConquestEvent>;
    /**
     * Resolver for conquested-star world position given `starId`. Used for
     * tiebreak during event attribution. Returning `null` falls back to
     * first-match event.
     */
    readonly resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
    /**
     * Owned stars under PREV snapshot. When provided, cells that fall outside
     * every PREV polygon but are within `coverageRadiusPx` of an owned star
     * inherit that star's owner. This fills geometry gaps left around stars,
     * including weighted-voronoi MSR holes, so the grid layer remains continuous.
     */
    readonly prevOwnedStars?: ReadonlyArray<GridOwnedStar>;
    /** Owned stars under NEXT snapshot â€” same behavior as `prevOwnedStars`. */
    readonly nextOwnedStars?: ReadonlyArray<GridOwnedStar>;
    /**
     * Max distance (world px) a grid cell may be from an owned star to
     * inherit its owner via the nearest-star fallback. Cells farther than
     * this from any owned star remain `outside`. Default: 3 Ã— spacingPx.
     */
    readonly coverageRadiusPx?: number;
    /**
     * Hard cap on total cell count (cols Ã— rows). When the grid built from
     * `spacingPx` would exceed this, the builder coarsens spacing upward to
     * stay under the cap. The effective spacing is reported as
     * `GridClassification.spacingPx`; the requested spacing is preserved as
     * `requestedSpacingPx`. Default: no cap.
     */
    readonly maxCells?: number;
    /**
     * Distribution mode for cell positions. See {@link GridDistribution}.
     * Default: `'square'`.
     */
    readonly distribution?: GridDistribution;
    /**
     * Deterministic per-cell position scatter, expressed as a fraction of
     * spacing. 0 = none; 0.5 â‰ˆ neighbours can overlap. Seeded by `(ix, iy)`
     * so positions are stable across frames and sessions. Only applied when
     * `distribution === 'jittered'`. Default: 0.
     */
    readonly positionJitter?: number;
}

export interface PlanGridWaveParams {
    readonly classification: GridClassification;
    readonly seeding: GridWaveSeeding;
    readonly geometry: GridWaveGeometry;
    readonly adjacency: GridAdjacency;
    readonly conquestEvents: ReadonlyArray<ConquestEvent>;
    readonly resolveStarPosition?: (starId: string) => { x: number; y: number } | null;
}

export interface RenderMetaballGridSceneParams {
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly progress: number;
    readonly flipTransition: GridFlipTransition;
    readonly flipWindow: number;
    readonly strength: number;
    readonly inwardOffsetPx: number;
    /** Owner id â†’ palette color index. */
    readonly ownerColorIdx: ReadonlyMap<string, number>;
    /** When false, omit static native cells and emit only active transition cells. */
    readonly includeNativeCells?: boolean;
    /** VStar ids to suppress from this pass so another overlay can own the color. */
    readonly omitVIds?: ReadonlySet<string>;
}

/* ==========================================================================
SECTION 10: Grid Gradient defaults
LAYER: settings
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\config.ts:1-20
GREP: gridGradientFamilyConfigDefaults
========================================================================== */
export type GridGradientCellShape = 'circle' | 'square' | 'noise';
export type GridGradientBorderDotStyle = 'blended' | 'butted';

export const gridGradientFamilyConfigDefaults = {
    GRID_GRADIENT_ENABLED: true,
    GRID_GRADIENT_SPACING_PX: 6,
    GRID_GRADIENT_MAX_CELLS: 160000,
    GRID_GRADIENT_ORIGIN_MODE: 'centered' as const,
    GRID_GRADIENT_DISTRIBUTION: 'square' as const,
    GRID_GRADIENT_POSITION_JITTER: 0,
    GRID_GRADIENT_CENTER_SIZE_PX: 10,
    GRID_GRADIENT_EDGE_SIZE_PX: 1.5,
    GRID_GRADIENT_CURVE_POWER: 1.6,
    GRID_GRADIENT_BORDER_OFFSET_PX: 0,
    GRID_GRADIENT_CELL_SHAPE: 'circle' as const,
    GRID_GRADIENT_VECTOR_BORDERS_ENABLED: true,
    GRID_GRADIENT_BORDER_DOTS_ENABLED: false,
    GRID_GRADIENT_BORDER_DOT_SIZE_PX: 2.5,
    GRID_GRADIENT_BORDER_DOT_STYLE: 'blended' as const,
} as const;

/* ==========================================================================
SECTION 11: Reads Grid Gradient tunables from RenderFamilyInput
LAYER: settings
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\settings.ts:1-298
GREP: resolveGridGradientSettings, GRID_GRADIENT_TUNABLE_KEYS
========================================================================== */
import { GAME_CONFIG } from '$lib/config/game.config';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import type {
    GridAdjacency,
    GridDistribution,
    GridFlipTransition,
    GridOriginMode,
    GridWaveGeometry,
    GridWaveSeeding,
} from '../metaballGrid/metaballGridTypes';
import {
    gridGradientFamilyConfigDefaults,
    type GridGradientBorderDotStyle,
    type GridGradientCellShape,
} from './config';
import { isGridGradientCellShape } from './gridGradientScene';

export const GRID_GRADIENT_TUNABLE_KEYS = [
    'GRID_GRADIENT_ENABLED',
    'GRID_GRADIENT_SPACING_PX',
    'GRID_GRADIENT_MAX_CELLS',
    'GRID_GRADIENT_ORIGIN_MODE',
    'GRID_GRADIENT_DISTRIBUTION',
    'GRID_GRADIENT_POSITION_JITTER',
    'GRID_GRADIENT_CENTER_SIZE_PX',
    'GRID_GRADIENT_EDGE_SIZE_PX',
    'GRID_GRADIENT_CURVE_POWER',
    'GRID_GRADIENT_BORDER_OFFSET_PX',
    'GRID_GRADIENT_CELL_SHAPE',
    'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
    'GRID_GRADIENT_BORDER_DOTS_ENABLED',
    'GRID_GRADIENT_BORDER_DOT_SIZE_PX',
    'GRID_GRADIENT_BORDER_DOT_STYLE',
    'METABALL_ALPHA',
    'METABALL_SATURATION',
    'METABALL_LIGHTNESS',
    'METABALL_BORDER_WIDTH',
    'METABALL_BORDER_ALPHA',
    'METABALL_BORDER_SATURATION',
    'METABALL_BORDER_LIGHTNESS',
    'METABALL_GRID_ADJACENCY',
    'METABALL_GRID_WAVE_GEOMETRY',
    'METABALL_GRID_WAVE_SEEDING',
    'METABALL_GRID_FLIP_TRANSITION',
    'METABALL_GRID_FLIP_WINDOW',
] as const;

export interface GridGradientSettings {
    readonly enabled: boolean;
    readonly spacingPx: number;
    readonly maxCells: number;
    readonly originMode: GridOriginMode;
    readonly distribution: GridDistribution;
    readonly positionJitter: number;
    readonly centerSizePx: number;
    readonly edgeSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
    readonly cellShape: GridGradientCellShape;
    readonly vectorBordersEnabled: boolean;
    readonly borderDotsEnabled: boolean;
    readonly borderDotSizePx: number;
    readonly borderDotStyle: GridGradientBorderDotStyle;
    readonly fillAlpha: number;
    readonly fillSaturation: number;
    readonly fillLightness: number;
    readonly borderWidthPx: number;
    readonly borderAlpha: number;
    readonly borderSaturation: number;
    readonly borderLightness: number;
    readonly adjacency: GridAdjacency;
    readonly waveGeometry: GridWaveGeometry;
    readonly waveSeeding: GridWaveSeeding;
    readonly flipTransition: GridFlipTransition;
    readonly flipWindow: number;
}

function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function readTunableNumber(
    input: RenderFamilyInput,
    key: string,
    fallback: number,
): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

function readTunableBoolean(
    input: RenderFamilyInput,
    key: string,
    fallback: boolean,
): boolean {
    const value = input.tunables.get(key);
    return typeof value === 'boolean' ? value : fallback;
}

function readTunableString<T extends string>(
    input: RenderFamilyInput,
    key: string,
    fallback: T,
    allowed: readonly T[],
): T {
    const value = input.tunables.get(key);
    return typeof value === 'string' && (allowed as readonly string[]).includes(value)
        ? value as T
        : fallback;
}

export function resolveGridGradientSettings(input: RenderFamilyInput): GridGradientSettings {
    const defaults = gridGradientFamilyConfigDefaults;
    const requestedCenterSize = readTunableNumber(
        input,
        'GRID_GRADIENT_CENTER_SIZE_PX',
        defaults.GRID_GRADIENT_CENTER_SIZE_PX,
    );
    const edgeSizePx = clamp(
        readTunableNumber(
            input,
            'GRID_GRADIENT_EDGE_SIZE_PX',
            defaults.GRID_GRADIENT_EDGE_SIZE_PX,
        ),
        0.5,
        16,
    );
    const centerSizePx = clamp(
        Math.max(edgeSizePx, requestedCenterSize),
        edgeSizePx,
        48,
    );
    const rawShape = input.tunables.get('GRID_GRADIENT_CELL_SHAPE');
    const cellShape = isGridGradientCellShape(rawShape)
        ? rawShape
        : defaults.GRID_GRADIENT_CELL_SHAPE;

    return {
        enabled: readTunableBoolean(
            input,
            'GRID_GRADIENT_ENABLED',
            defaults.GRID_GRADIENT_ENABLED,
        ),
        spacingPx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_SPACING_PX',
                defaults.GRID_GRADIENT_SPACING_PX,
            ),
            2,
            64,
        ),
        maxCells: Math.max(
            0,
            Math.round(
                readTunableNumber(
                    input,
                    'GRID_GRADIENT_MAX_CELLS',
                    defaults.GRID_GRADIENT_MAX_CELLS,
                ),
            ),
        ),
        originMode: readTunableString(
            input,
            'GRID_GRADIENT_ORIGIN_MODE',
            defaults.GRID_GRADIENT_ORIGIN_MODE,
            ['centered', 'corner'],
        ),
        distribution: readTunableString(
            input,
            'GRID_GRADIENT_DISTRIBUTION',
            defaults.GRID_GRADIENT_DISTRIBUTION,
            ['square', 'hex_offset', 'jittered'],
        ),
        positionJitter: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_POSITION_JITTER',
                defaults.GRID_GRADIENT_POSITION_JITTER,
            ),
            0,
            0.5,
        ),
        centerSizePx,
        edgeSizePx,
        curvePower: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_CURVE_POWER',
                defaults.GRID_GRADIENT_CURVE_POWER,
            ),
            0.1,
            6,
        ),
        borderOffsetPx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_BORDER_OFFSET_PX',
                defaults.GRID_GRADIENT_BORDER_OFFSET_PX,
            ),
            0,
            80,
        ),
        cellShape,
        vectorBordersEnabled: readTunableBoolean(
            input,
            'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
            defaults.GRID_GRADIENT_VECTOR_BORDERS_ENABLED,
        ),
        borderDotsEnabled: readTunableBoolean(
            input,
            'GRID_GRADIENT_BORDER_DOTS_ENABLED',
            defaults.GRID_GRADIENT_BORDER_DOTS_ENABLED,
        ),
        borderDotSizePx: clamp(
            readTunableNumber(
                input,
                'GRID_GRADIENT_BORDER_DOT_SIZE_PX',
                defaults.GRID_GRADIENT_BORDER_DOT_SIZE_PX,
            ),
            0.5,
            20,
        ),
        borderDotStyle: readTunableString(
            input,
            'GRID_GRADIENT_BORDER_DOT_STYLE',
            defaults.GRID_GRADIENT_BORDER_DOT_STYLE,
            ['blended', 'butted'],
        ),
        fillAlpha: clamp(
            readTunableNumber(input, 'METABALL_ALPHA', GAME_CONFIG.METABALL_ALPHA ?? 0.52),
            0,
            1,
        ),
        fillSaturation: clamp(
            readTunableNumber(input, 'METABALL_SATURATION', GAME_CONFIG.METABALL_SATURATION ?? 1),
            0,
            3,
        ),
        fillLightness: clamp(
            readTunableNumber(input, 'METABALL_LIGHTNESS', GAME_CONFIG.METABALL_LIGHTNESS ?? 1),
            0,
            3,
        ),
        borderWidthPx: clamp(
            readTunableNumber(input, 'METABALL_BORDER_WIDTH', GAME_CONFIG.METABALL_BORDER_WIDTH ?? 2),
            0,
            20,
        ),
        borderAlpha: clamp(
            readTunableNumber(input, 'METABALL_BORDER_ALPHA', GAME_CONFIG.METABALL_BORDER_ALPHA ?? 0.5),
            0,
            1,
        ),
        borderSaturation: clamp(
            readTunableNumber(input, 'METABALL_BORDER_SATURATION', GAME_CONFIG.METABALL_BORDER_SATURATION ?? 1),
            0,
            3,
        ),
        borderLightness: clamp(
            readTunableNumber(input, 'METABALL_BORDER_LIGHTNESS', GAME_CONFIG.METABALL_BORDER_LIGHTNESS ?? 1),
            0,
            3,
        ),
        adjacency: readTunableString(
            input,
            'METABALL_GRID_ADJACENCY',
            '8',
            ['4', '8'],
        ),
        waveGeometry: readTunableString(
            input,
            'METABALL_GRID_WAVE_GEOMETRY',
            'euclidean_band',
            ['grid_bfs', 'euclidean_band', 'conquered_star_radial', 'pre_to_post_frontier'],
        ),
        waveSeeding: readTunableString(
            input,
            'METABALL_GRID_WAVE_SEEDING',
            'winner_natives',
            ['winner_natives', 'conquered_star_center', 'winner_nearest_edge'],
        ),
        flipTransition: readTunableString(
            input,
            'METABALL_GRID_FLIP_TRANSITION',
            'dual_pass_blend',
            ['hard', 'lerp_per_cell', 'dual_pass_blend'],
        ),
        flipWindow: clamp(
            readTunableNumber(input, 'METABALL_GRID_FLIP_WINDOW', 0.14),
            0,
            0.5,
        ),
    };
}

/* ==========================================================================
SECTION 12: Builds Grid Gradient plan key, classification, wave plan
LAYER: classification/transition
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\plan.ts:1-154
GREP: buildGridGradientPlan, buildGridGradientPlanKey
========================================================================== */
import type { StarState } from '$lib/types/game.types';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import { buildGridClassification } from '../metaballGrid/buildGridClassification';
import type {
    GridClassification,
    GridOwnedStar,
    GridWavePlan,
} from '../metaballGrid/metaballGridTypes';
import { planGridWave } from '../metaballGrid/planGridWave';
import type { GridGradientSettings } from './settings';

export interface CachedGridGradientPlan {
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly classificationBuildMs: number;
    readonly wavePlanBuildMs: number;
}

function toOwnedStars(stars: ReadonlyArray<StarState>): GridOwnedStar[] {
    const out: GridOwnedStar[] = [];
    for (const star of stars) {
        if (star.ownerId) {
            out.push({
                id: star.id,
                ownerId: star.ownerId,
                x: star.x,
                y: star.y,
            });
        }
    }
    return out;
}

function toPreviousOwnedStars(input: RenderFamilyInput): GridOwnedStar[] {
    const previousOwnerByStarId = new Map<string, string>();
    for (const entry of input.activeTransition?.events ?? []) {
        previousOwnerByStarId.set(entry.event.starId, entry.event.previousOwner);
    }
    const out: GridOwnedStar[] = [];
    for (const star of input.stars) {
        const ownerId = previousOwnerByStarId.get(star.id) ?? star.ownerId;
        if (ownerId) {
            out.push({
                id: star.id,
                ownerId,
                x: star.x,
                y: star.y,
            });
        }
    }
    return out;
}

function buildTransitionKey(input: RenderFamilyInput): string {
    const events = input.activeTransition?.events ?? [];
    if (events.length === 0) return 'steady';
    return events
        .map((entry) =>
            [
                entry.event.tick,
                entry.event.starId,
                entry.event.previousOwner,
                entry.event.newOwner,
                Math.round(entry.startedAtMs),
                Math.round(entry.durationMs),
            ].join(':'),
        )
        .sort()
        .join('|');
}

export function buildGridGradientPlanKey(params: {
    readonly input: RenderFamilyInput;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
}): string {
    const { input, geometry, prevGeometry, settings } = params;
    return [
        geometry.version,
        prevGeometry.version,
        buildTransitionKey(input),
        input.world.minX ?? 0,
        input.world.minY ?? 0,
        input.world.width,
        input.world.height,
        settings.spacingPx,
        settings.maxCells,
        settings.originMode,
        settings.distribution,
        settings.positionJitter,
        settings.adjacency,
        settings.waveGeometry,
        settings.waveSeeding,
    ].join('|');
}

export function buildGridGradientPlan(params: {
    readonly input: RenderFamilyInput;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
    readonly planKey: string;
}): CachedGridGradientPlan {
    const starById = new Map<string, StarState>();
    for (const star of params.input.stars) starById.set(star.id, star);
    const resolveStarPosition = (starId: string) => {
        const star = starById.get(starId);
        return star ? { x: star.x, y: star.y } : null;
    };
    const ownedStars = toOwnedStars(params.input.stars);
    const previousOwnedStars = params.input.activeTransition
        ? toPreviousOwnedStars(params.input)
        : ownedStars;
    const conquestEvents = params.input.activeTransition?.conquestEvents ?? [];

    const classificationStartMs = performance.now();
    const classification = buildGridClassification({
        world: params.input.world,
        spacingPx: params.settings.spacingPx,
        originMode: params.settings.originMode,
        prevGeometry: params.prevGeometry,
        nextGeometry: params.geometry,
        conquestEvents,
        resolveStarPosition,
        prevOwnedStars: previousOwnedStars,
        nextOwnedStars: ownedStars,
        maxCells: params.settings.maxCells,
        distribution: params.settings.distribution,
        positionJitter: params.settings.positionJitter,
    });
    const classificationBuildMs = performance.now() - classificationStartMs;

    const wavePlanStartMs = performance.now();
    const wavePlan = planGridWave({
        classification,
        seeding: params.settings.waveSeeding,
        geometry: params.settings.waveGeometry,
        adjacency: params.settings.adjacency,
        conquestEvents,
        resolveStarPosition,
    });
    const wavePlanBuildMs = performance.now() - wavePlanStartMs;

    return {
        planKey: params.planKey,
        classification,
        wavePlan,
        classificationBuildMs,
        wavePlanBuildMs,
    };
}

/* ==========================================================================
SECTION 13: Cell sizing, owner distance summary, border-dot generation, noise shape
LAYER: presentation
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\gridGradientScene.ts:1-244
GREP: resolveGridGradientCellSize, buildGridGradientBorderDots
========================================================================== */
import { blendColors } from '$lib/utils/colorUtils';
import type {
    GridClassification,
    GridRenderCell,
    GridVStar,
} from '../metaballGrid/metaballGridTypes';
import type {
    OwnershipGridFrontierDistanceField,
} from '$lib/territory/frontier';
import type {
    GridGradientBorderDotStyle,
    GridGradientCellShape,
} from './config';

const INF = 1_000_000_000;

export interface GridGradientSizingParams {
    readonly distancePx: number;
    readonly ownerMaxDistancePx: number;
    readonly edgeSizePx: number;
    readonly centerSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
}

export interface GridGradientBorderDot {
    readonly x: number;
    readonly y: number;
    readonly color: number;
    readonly alpha: number;
    readonly sizePx: number;
    readonly style: GridGradientBorderDotStyle;
    readonly ownerId: string | null;
}

export interface BuildGridGradientBorderDotsParams {
    readonly classification: GridClassification;
    readonly colorByOwnerId: ReadonlyMap<string, number>;
    readonly dotSizePx: number;
    readonly style: GridGradientBorderDotStyle;
    readonly alpha: number;
}

export interface GridGradientOwnerDistanceSummary {
    readonly ownerMaxDistancePxByIndex: readonly number[];
    readonly ownerIndexByCell: Int32Array;
}

function clamp01(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

export function resolveGridGradientCellSize(
    params: GridGradientSizingParams,
): number {
    const edgeSizePx = Math.max(0.5, params.edgeSizePx);
    const centerSizePx = Math.max(edgeSizePx, params.centerSizePx);
    const borderOffsetPx = Math.max(0, params.borderOffsetPx);
    const distancePx = Number.isFinite(params.distancePx)
        ? params.distancePx
        : params.ownerMaxDistancePx;

    if (distancePx < borderOffsetPx) return 0;

    const usableMax = Math.max(
        borderOffsetPx + 0.001,
        Number.isFinite(params.ownerMaxDistancePx)
            ? params.ownerMaxDistancePx
            : distancePx,
    );
    const rawT = (distancePx - borderOffsetPx) / (usableMax - borderOffsetPx);
    const curved = Math.pow(clamp01(rawT), Math.max(0.05, params.curvePower));
    return edgeSizePx + (centerSizePx - edgeSizePx) * curved;
}

export function buildGridGradientOwnerDistanceSummary(params: {
    readonly classification: GridClassification;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
    readonly distanceField: OwnershipGridFrontierDistanceField;
}): GridGradientOwnerDistanceSummary {
    const ownerIndexByCell = new Int32Array(
        params.classification.cols * params.classification.rows,
    );
    ownerIndexByCell.fill(-1);
    const ownerMaxDistancePxByIndex: number[] = [];

    for (const v of params.classification.vstars) {
        const cellIndex = v.iy * params.classification.cols + v.ix;
        const ownerIndex =
            v.nextOwnerId === null
                ? -1
                : params.ownerIndexByOwnerId.get(v.nextOwnerId) ?? -1;
        ownerIndexByCell[cellIndex] = ownerIndex;
        if (ownerIndex < 0) continue;
        const distancePx =
            params.distanceField.nearestBoundaryPxByCell[cellIndex] ?? INF;
        if (!Number.isFinite(distancePx) || distancePx >= INF) continue;
        ownerMaxDistancePxByIndex[ownerIndex] = Math.max(
            ownerMaxDistancePxByIndex[ownerIndex] ?? 0,
            distancePx,
        );
    }

    return { ownerMaxDistancePxByIndex, ownerIndexByCell };
}

export function buildOwnerIndexByCell(params: {
    readonly classification: GridClassification;
    readonly ownerIndexByOwnerId: ReadonlyMap<string, number>;
}): Int32Array {
    const ownerIndexByCell = new Int32Array(
        params.classification.cols * params.classification.rows,
    );
    ownerIndexByCell.fill(-1);

    for (const v of params.classification.vstars) {
        const ownerIndex =
            v.nextOwnerId === null
                ? -1
                : params.ownerIndexByOwnerId.get(v.nextOwnerId) ?? -1;
        ownerIndexByCell[v.iy * params.classification.cols + v.ix] =
            ownerIndex;
    }

    return ownerIndexByCell;
}

export function buildGridGradientBorderDots(
    params: BuildGridGradientBorderDotsParams,
): GridGradientBorderDot[] {
    const { classification, colorByOwnerId, dotSizePx, style, alpha } = params;
    const dots: GridGradientBorderDot[] = [];
    const spacing = classification.spacingPx;

    const getCell = (ix: number, iy: number): GridVStar | null => {
        if (ix < 0 || iy < 0 || ix >= classification.cols || iy >= classification.rows) {
            return null;
        }
        return classification.vstars[iy * classification.cols + ix] ?? null;
    };

    const emitPair = (a: GridVStar, b: GridVStar): void => {
        const ownerA = a.nextOwnerId;
        const ownerB = b.nextOwnerId;
        if (!ownerA || !ownerB || ownerA === ownerB) return;
        const colorA = colorByOwnerId.get(ownerA);
        const colorB = colorByOwnerId.get(ownerB);
        if (colorA === undefined || colorB === undefined) return;

        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        if (style === 'blended') {
            dots.push({
                x: midX,
                y: midY,
                color: blendColors(colorA, colorB, 0.5),
                alpha,
                sizePx: dotSizePx,
                style,
                ownerId: null,
            });
            return;
        }

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.max(0.001, Math.hypot(dx, dy));
        const inset = Math.min(spacing * 0.25, dotSizePx * 0.65);
        const ux = (dx / length) * inset;
        const uy = (dy / length) * inset;
        dots.push({
            x: midX - ux,
            y: midY - uy,
            color: colorA,
            alpha,
            sizePx: dotSizePx,
            style,
            ownerId: ownerA,
        });
        dots.push({
            x: midX + ux,
            y: midY + uy,
            color: colorB,
            alpha,
            sizePx: dotSizePx,
            style,
            ownerId: ownerB,
        });
    };

    for (let iy = 0; iy < classification.rows; iy += 1) {
        for (let ix = 0; ix < classification.cols; ix += 1) {
            const here = getCell(ix, iy);
            if (!here) continue;
            const right = getCell(ix + 1, iy);
            if (right) emitPair(here, right);
            const down = getCell(ix, iy + 1);
            if (down) emitPair(here, down);
        }
    }

    return dots;
}

function hash01(value: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) / 0x1_0000_0000;
}

export function buildGridGradientNoisePolygon(params: {
    readonly x: number;
    readonly y: number;
    readonly radiusPx: number;
    readonly cellId: string;
}): number[] {
    const points: number[] = [];
    const vertexCount = 8;
    for (let i = 0; i < vertexCount; i += 1) {
        const angle = (Math.PI * 2 * i) / vertexCount;
        const jitter = 0.78 + hash01(`${params.cellId}:${i}`) * 0.36;
        const radius = Math.max(0.1, params.radiusPx * jitter);
        points.push(
            params.x + Math.cos(angle) * radius,
            params.y + Math.sin(angle) * radius,
        );
    }
    return points;
}

export function isGridGradientCellShape(
    value: unknown,
): value is GridGradientCellShape {
    return value === 'circle' || value === 'square' || value === 'noise';
}

export function resolveRenderedOwnerId(cell: GridRenderCell): string {
    return `${cell.colorIdx}`;
}

/* ==========================================================================
SECTION 14: Pixi Graphics painting path, main render bottleneck
LAYER: presentation
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\paint.ts:1-148
GREP: drawGridGradientCell, drawGridGradientVectorBorders
========================================================================== */
import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { RenderFamilyInput } from '../RenderFamilyTypes';
import type { GridGradientCellShape } from './config';
import { buildGridGradientNoisePolygon } from './gridGradientScene';
import type { GridGradientSettings } from './settings';

export interface GridGradientPalette {
    readonly ownerColorIdx: Map<string, number>;
    readonly fillHexByColorIdx: number[];
    readonly colorByOwnerId: Map<string, number>;
}

export function buildGridGradientPalette(params: {
    readonly colorUtils: ColorUtils;
    readonly input: RenderFamilyInput;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
}): GridGradientPalette {
    const ownerColorIdx = new Map<string, number>();
    const fillHexByColorIdx: number[] = [];
    const colorByOwnerId = new Map<string, number>();
    const ensureOwner = (ownerId: string | null | undefined): void => {
        if (!ownerId || ownerColorIdx.has(ownerId)) return;
        const idx = fillHexByColorIdx.length;
        const base = params.colorUtils.getPlayerColor(ownerId);
        const fill = adjustColorHSL(
            base,
            params.settings.fillSaturation,
            params.settings.fillLightness,
        );
        const border = adjustColorHSL(
            base,
            params.settings.borderSaturation,
            params.settings.borderLightness,
        );
        ownerColorIdx.set(ownerId, idx);
        colorByOwnerId.set(ownerId, border);
        fillHexByColorIdx.push(fill);
    };
    for (const star of params.input.stars) ensureOwner(star.ownerId);
    for (const region of params.geometry.territoryRegions) ensureOwner(region.ownerId);
    for (const entry of params.input.activeTransition?.events ?? []) {
        ensureOwner(entry.event.previousOwner);
        ensureOwner(entry.event.newOwner);
    }
    return {
        ownerColorIdx,
        fillHexByColorIdx,
        colorByOwnerId,
    };
}

export function drawGridGradientCell(params: {
    readonly graphics: PIXI.Graphics;
    readonly shape: GridGradientCellShape;
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly sizePx: number;
    readonly color: number;
    readonly alpha: number;
}): void {
    const radius = params.sizePx * 0.5;
    if (params.shape === 'circle') {
        params.graphics.circle(params.x, params.y, radius).fill({
            color: params.color,
            alpha: params.alpha,
        });
        return;
    }
    if (params.shape === 'noise') {
        params.graphics
            .poly(
                buildGridGradientNoisePolygon({
                    x: params.x,
                    y: params.y,
                    radiusPx: radius,
                    cellId: params.id,
                }),
            )
            .fill({ color: params.color, alpha: params.alpha });
        return;
    }
    params.graphics
        .rect(params.x - radius, params.y - radius, params.sizePx, params.sizePx)
        .fill({ color: params.color, alpha: params.alpha });
}

export function drawGridGradientVectorBorders(params: {
    readonly graphics: PIXI.Graphics;
    readonly geometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
    readonly colorByOwnerId: ReadonlyMap<string, number>;
}): number {
    if (
        !params.settings.vectorBordersEnabled ||
        params.settings.borderWidthPx <= 0 ||
        params.settings.borderAlpha <= 0
    ) {
        return 0;
    }
    const ladder = params.geometry.diagnostics.stageLadder;
    const frontierPolylines =
        ladder?.displayFrontierPolylines ?? params.geometry.frontierPolylines;
    const worldPolylines =
        ladder?.displayWorldBorderPolylines ?? params.geometry.worldBorderPolylines;
    let count = 0;
    const strokePolyline = (polyline: {
        ownerA: string;
        ownerB: string;
        points: readonly [number, number][];
        closed?: boolean;
    }): void => {
        if (polyline.points.length < 2) return;
        const colorA = params.colorByOwnerId.get(polyline.ownerA);
        const colorB =
            polyline.ownerB === '__world__'
                ? colorA
                : params.colorByOwnerId.get(polyline.ownerB);
        if (colorA === undefined && colorB === undefined) return;
        const color =
            colorA !== undefined && colorB !== undefined && colorA !== colorB
                ? blendColors(colorA, colorB, 0.5)
                : colorA ?? colorB ?? 0xffffff;
        const [startX, startY] = polyline.points[0];
        params.graphics.moveTo(startX, startY);
        for (let i = 1; i < polyline.points.length; i += 1) {
            const [x, y] = polyline.points[i];
            params.graphics.lineTo(x, y);
        }
        if (polyline.closed) params.graphics.closePath();
        params.graphics.stroke({
            color,
            alpha: params.settings.borderAlpha,
            width: params.settings.borderWidthPx,
            cap: 'round',
            join: 'round',
        });
        count += 1;
    };

    for (const polyline of frontierPolylines) strokePolyline(polyline);
    for (const polyline of worldPolylines) strokePolyline(polyline);
    return count;
}

/* ==========================================================================
SECTION 15: Grid Gradient stats store
LAYER: diagnostics
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\gridGradientStats.ts:1-71
GREP: GridGradientStats, updateGridGradientStats
========================================================================== */
import { writable } from 'svelte/store';

export interface GridGradientStats {
    readonly familyId: string;
    readonly familyLabel: string;
    readonly geometrySource: string | null;
    readonly requestedSpacingPx: number;
    readonly effectiveSpacingPx: number;
    readonly totalCells: number;
    readonly emittableCells: number;
    readonly paintedCells: number;
    readonly borderDotCount: number;
    readonly vectorBorderCount: number;
    readonly cellShape: string;
    readonly borderDotStyle: string;
    readonly borderDotsEnabled: boolean;
    readonly vectorBordersEnabled: boolean;
    readonly centerSizePx: number;
    readonly edgeSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
    readonly lastClassificationBuildMs: number;
    readonly lastWavePlanBuildMs: number;
    readonly lastSceneBuildMs: number;
    readonly lastPaintMs: number;
    readonly lastUpdateMs: number;
    readonly emaUpdateMs: number;
    readonly transitionEventCount: number;
    readonly rawProgress: number | null;
    readonly visibleFrameState: 'steady' | 'transition';
}

const INITIAL: GridGradientStats = {
    familyId: 'grid_gradient',
    familyLabel: 'Grid Gradient',
    geometrySource: null,
    requestedSpacingPx: 0,
    effectiveSpacingPx: 0,
    totalCells: 0,
    emittableCells: 0,
    paintedCells: 0,
    borderDotCount: 0,
    vectorBorderCount: 0,
    cellShape: 'circle',
    borderDotStyle: 'blended',
    borderDotsEnabled: false,
    vectorBordersEnabled: true,
    centerSizePx: 0,
    edgeSizePx: 0,
    curvePower: 0,
    borderOffsetPx: 0,
    lastClassificationBuildMs: 0,
    lastWavePlanBuildMs: 0,
    lastSceneBuildMs: 0,
    lastPaintMs: 0,
    lastUpdateMs: 0,
    emaUpdateMs: 0,
    transitionEventCount: 0,
    rawProgress: null,
    visibleFrameState: 'steady',
};

export const gridGradientStats = writable<GridGradientStats>(INITIAL);

export function updateGridGradientStats(patch: Partial<GridGradientStats>): void {
    gridGradientStats.update((prev) => ({ ...prev, ...patch }));
}

export function resetGridGradientStats(): void {
    gridGradientStats.set(INITIAL);
}

/* ==========================================================================
SECTION 16: Grid Gradient family lifecycle, caching, update loop
LAYER: presentation/runtime
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\GridGradientFamily.ts:1-323
GREP: GridGradientFamily.update, resolvePlan
========================================================================== */
import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import {
    buildOwnershipGridFrontierDistanceField,
    createOwnershipGridFrontierDistanceFieldBuffers,
    type OwnershipGridFrontierDistanceFieldBuffers,
} from '$lib/territory/frontier';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import { renderMetaballGridScene } from '../metaballGrid/renderMetaballGridScene';
import {
    buildGridGradientBorderDots,
    buildGridGradientOwnerDistanceSummary,
    buildOwnerIndexByCell,
    resolveGridGradientCellSize,
} from './gridGradientScene';
import {
    buildGridGradientPalette,
    drawGridGradientCell,
    drawGridGradientVectorBorders,
} from './paint';
import {
    buildGridGradientPlan,
    buildGridGradientPlanKey,
    type CachedGridGradientPlan,
} from './plan';
import {
    GRID_GRADIENT_TUNABLE_KEYS,
    resolveGridGradientSettings,
    type GridGradientSettings,
} from './settings';
import {
    resetGridGradientStats,
    updateGridGradientStats,
} from './gridGradientStats';

export class GridGradientFamily implements RenderFamily {
    readonly id = 'grid_gradient';
    readonly label = 'Grid Gradient';
    readonly tunableKeys: readonly string[] = GRID_GRADIENT_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly graphics = new PIXI.Graphics();
    private readonly colorUtils: ColorUtils;
    private cachedPlan: CachedGridGradientPlan | null = null;
    private distanceFieldBuffers: OwnershipGridFrontierDistanceFieldBuffers | null =
        null;
    private lastDebugSnapshot: Record<string, unknown> | null = null;
    private emaUpdateMs = 0;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(this.graphics);
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    getDebugSnapshot(): Record<string, unknown> | null {
        return this.lastDebugSnapshot;
    }

    private resolvePlan(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly settings: GridGradientSettings;
    }): CachedGridGradientPlan {
        const prevGeometry =
            params.input.activeTransition && params.input.prevGeometry
                ? params.input.prevGeometry
                : params.geometry;
        const planKey = buildGridGradientPlanKey({
            input: params.input,
            geometry: params.geometry,
            prevGeometry,
            settings: params.settings,
        });
        if (!this.cachedPlan || this.cachedPlan.planKey !== planKey) {
            this.cachedPlan = buildGridGradientPlan({
                input: params.input,
                geometry: params.geometry,
                prevGeometry,
                settings: params.settings,
                planKey,
            });
        }
        return this.cachedPlan;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const updateStartMs = performance.now();
        const geometry = input.geometry;
        const settings = resolveGridGradientSettings(input);

        if (!geometry || !settings.enabled) {
            this.graphics.clear();
            this.root.visible = false;
            resetGridGradientStats();
            return { container: this.root };
        }

        this.root.visible = true;
        const plan = this.resolvePlan({ input, geometry, settings });
        const palette = buildGridGradientPalette({
            colorUtils: this.colorUtils,
            input,
            geometry,
            settings,
        });
        const progress = input.activeTransition ? input.activeTransition.progress : 1;
        const sceneStartMs = performance.now();
        const scene = renderMetaballGridScene({
            classification: plan.classification,
            wavePlan: plan.wavePlan,
            progress,
            flipTransition: settings.flipTransition,
            flipWindow: settings.flipWindow,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: palette.ownerColorIdx,
        });
        const sceneBuildMs = performance.now() - sceneStartMs;

        const ownerIndexByCell = buildOwnerIndexByCell({
            classification: plan.classification,
            ownerIndexByOwnerId: palette.ownerColorIdx,
        });
        const size = plan.classification.cols * plan.classification.rows;
        if (
            !this.distanceFieldBuffers ||
            this.distanceFieldBuffers.nearestBoundaryPxByCell.length !== size
        ) {
            this.distanceFieldBuffers =
                createOwnershipGridFrontierDistanceFieldBuffers(size);
        }
        const distanceField = buildOwnershipGridFrontierDistanceField({
            cols: plan.classification.cols,
            rows: plan.classification.rows,
            ownerIndexByCell,
            spacingPx: plan.classification.spacingPx,
            includeWorldEdge: true,
            reuseBuffers: this.distanceFieldBuffers,
        });
        const distanceSummary = buildGridGradientOwnerDistanceSummary({
            classification: plan.classification,
            ownerIndexByOwnerId: palette.ownerColorIdx,
            distanceField,
        });

        const paintStartMs = performance.now();
        this.graphics.clear();
        let paintedCells = 0;
        for (const cell of scene.cells) {
            if (cell.alpha <= 0) continue;
            const color = palette.fillHexByColorIdx[cell.colorIdx];
            if (color === undefined) continue;
            const cellIndex = cell.iy * plan.classification.cols + cell.ix;
            const ownerIndex = distanceSummary.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;
            const distancePx = distanceField.nearestBoundaryPxByCell[cellIndex];
            const sizePx = resolveGridGradientCellSize({
                distancePx,
                ownerMaxDistancePx:
                    distanceSummary.ownerMaxDistancePxByIndex[ownerIndex] ??
                    distancePx,
                edgeSizePx: settings.edgeSizePx,
                centerSizePx: settings.centerSizePx,
                curvePower: settings.curvePower,
                borderOffsetPx: settings.borderOffsetPx,
            });
            if (sizePx <= 0) continue;
            drawGridGradientCell({
                graphics: this.graphics,
                shape: settings.cellShape,
                id: cell.vId,
                x: cell.x,
                y: cell.y,
                sizePx,
                color,
                alpha: settings.fillAlpha * cell.alpha,
            });
            paintedCells += 1;
        }

        const borderDotCount = this.paintBorderDots({
            plan,
            palette,
            settings,
        });
        const vectorBorderCount = drawGridGradientVectorBorders({
            graphics: this.graphics,
            geometry,
            settings,
            colorByOwnerId: palette.colorByOwnerId,
        });
        const paintMs = performance.now() - paintStartMs;
        const updateMs = performance.now() - updateStartMs;
        this.emaUpdateMs =
            this.emaUpdateMs === 0 ? updateMs : this.emaUpdateMs * 0.85 + updateMs * 0.15;
        this.recordStats({
            input,
            geometry,
            plan,
            settings,
            paintedCells,
            borderDotCount,
            vectorBorderCount,
            progress,
            sceneBuildMs,
            paintMs,
            updateMs,
        });

        return { container: this.root };
    }

    private paintBorderDots(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: ReturnType<typeof buildGridGradientPalette>;
        readonly settings: GridGradientSettings;
    }): number {
        if (
            !params.settings.borderDotsEnabled ||
            params.settings.borderDotSizePx <= 0 ||
            params.settings.borderAlpha <= 0
        ) {
            return 0;
        }
        const dots = buildGridGradientBorderDots({
            classification: params.plan.classification,
            colorByOwnerId: params.palette.colorByOwnerId,
            dotSizePx: params.settings.borderDotSizePx,
            style: params.settings.borderDotStyle,
            alpha: params.settings.borderAlpha,
        });
        for (const dot of dots) {
            this.graphics.circle(dot.x, dot.y, dot.sizePx * 0.5).fill({
                color: dot.color,
                alpha: dot.alpha,
            });
        }
        return dots.length;
    }

    private recordStats(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly plan: CachedGridGradientPlan;
        readonly settings: GridGradientSettings;
        readonly paintedCells: number;
        readonly borderDotCount: number;
        readonly vectorBorderCount: number;
        readonly progress: number;
        readonly sceneBuildMs: number;
        readonly paintMs: number;
        readonly updateMs: number;
    }): void {
        const debugSnapshot = {
            familyId: this.id,
            familyLabel: this.label,
            planKey: params.plan.planKey,
            geometryVersion: params.geometry.version,
            requestedSpacingPx: params.plan.classification.requestedSpacingPx,
            effectiveSpacingPx: params.plan.classification.spacingPx,
            totalCells: params.plan.classification.vstars.length,
            emittableCells: params.plan.classification.emittableVstars.length,
            paintedCells: params.paintedCells,
            borderDotCount: params.borderDotCount,
            vectorBorderCount: params.vectorBorderCount,
            cellShape: params.settings.cellShape,
            borderDotStyle: params.settings.borderDotStyle,
            progress: params.progress,
        };
        this.lastDebugSnapshot = debugSnapshot;
        updateGridGradientStats({
            familyId: this.id,
            familyLabel: this.label,
            geometrySource:
                (params.input.configSource?.PERIMETER_FIELD_GEOMETRY_SOURCE as string | undefined) ??
                null,
            requestedSpacingPx: params.plan.classification.requestedSpacingPx,
            effectiveSpacingPx: params.plan.classification.spacingPx,
            totalCells: params.plan.classification.vstars.length,
            emittableCells: params.plan.classification.emittableVstars.length,
            paintedCells: params.paintedCells,
            borderDotCount: params.borderDotCount,
            vectorBorderCount: params.vectorBorderCount,
            cellShape: params.settings.cellShape,
            borderDotStyle: params.settings.borderDotStyle,
            borderDotsEnabled: params.settings.borderDotsEnabled,
            vectorBordersEnabled: params.settings.vectorBordersEnabled,
            centerSizePx: params.settings.centerSizePx,
            edgeSizePx: params.settings.edgeSizePx,
            curvePower: params.settings.curvePower,
            borderOffsetPx: params.settings.borderOffsetPx,
            lastClassificationBuildMs: params.plan.classificationBuildMs,
            lastWavePlanBuildMs: params.plan.wavePlanBuildMs,
            lastSceneBuildMs: params.sceneBuildMs,
            lastPaintMs: params.paintMs,
            lastUpdateMs: params.updateMs,
            emaUpdateMs: this.emaUpdateMs,
            transitionEventCount: params.input.activeTransition?.events.length ?? 0,
            rawProgress: params.input.activeTransition ? params.progress : null,
            visibleFrameState: params.input.activeTransition ? 'transition' : 'steady',
        });
    }

    dispose(): void {
        this.graphics.destroy();
        this.root.destroy({ children: true });
        this.cachedPlan = null;
        this.distanceFieldBuffers = null;
    }
}

export function createGridGradientFamily(colorUtils: ColorUtils): GridGradientFamily {
    return new GridGradientFamily(colorUtils);
}

/* ==========================================================================
SECTION 17: Grid Gradient family exports
LAYER: exports
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\index.ts:1-4
GREP: exports
========================================================================== */
export * from './config';
export * from './GridGradientFamily';
export * from './gridGradientScene';
export * from './gridGradientStats';

/* ==========================================================================
SECTION 18: Current focused helper tests
LAYER: tests
SOURCE: pax-fluxia\src\lib\territory\families\gridGradient\gridGradientScene.test.ts:1-196
GREP: tests
========================================================================== */
import { describe, expect, it } from 'vitest';
import type { GridClassification } from '../metaballGrid/metaballGridTypes';
import {
    buildGridGradientBorderDots,
    buildGridGradientNoisePolygon,
    resolveGridGradientCellSize,
} from './gridGradientScene';

function makeClassification(): GridClassification {
    const vstars = [
        {
            id: 'g:0:0',
            ix: 0,
            iy: 0,
            x: 5,
            y: 5,
            prevOwnerId: 'red',
            nextOwnerId: 'red',
            role: 'native',
            eventId: null,
        },
        {
            id: 'g:1:0',
            ix: 1,
            iy: 0,
            x: 15,
            y: 5,
            prevOwnerId: 'blue',
            nextOwnerId: 'blue',
            role: 'native',
            eventId: null,
        },
        {
            id: 'g:0:1',
            ix: 0,
            iy: 1,
            x: 5,
            y: 15,
            prevOwnerId: 'red',
            nextOwnerId: 'red',
            role: 'native',
            eventId: null,
        },
        {
            id: 'g:1:1',
            ix: 1,
            iy: 1,
            x: 15,
            y: 15,
            prevOwnerId: 'blue',
            nextOwnerId: 'blue',
            role: 'native',
            eventId: null,
        },
    ] as const;

    return {
        cols: 2,
        rows: 2,
        spacingPx: 10,
        requestedSpacingPx: 10,
        originMode: 'centered',
        distribution: 'square',
        vstars,
        emittableVstars: vstars,
        byRole: {
            native: vstars.map((v) => v.id),
            dispossessed: [],
            emergent: [],
            vacating: [],
            outside: [],
        },
        dispossessedByEventId: {},
        defaultEventId: '__default__',
    };
}

describe('grid gradient scene helpers', () => {
    it('makes center cells larger than edge cells', () => {
        const edge = resolveGridGradientCellSize({
            distancePx: 0,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1.5,
            centerSizePx: 10,
            curvePower: 1.6,
            borderOffsetPx: 0,
        });
        const center = resolveGridGradientCellSize({
            distancePx: 100,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1.5,
            centerSizePx: 10,
            curvePower: 1.6,
            borderOffsetPx: 0,
        });

        expect(edge).toBeCloseTo(1.5);
        expect(center).toBeCloseTo(10);
        expect(center).toBeGreaterThan(edge);
    });

    it('uses border offset to suppress fill near borders', () => {
        const hidden = resolveGridGradientCellSize({
            distancePx: 4,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 8,
            curvePower: 1,
            borderOffsetPx: 8,
        });
        const visible = resolveGridGradientCellSize({
            distancePx: 12,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 8,
            curvePower: 1,
            borderOffsetPx: 8,
        });

        expect(hidden).toBe(0);
        expect(visible).toBeGreaterThan(0);
    });

    it('lets curve power change size progression', () => {
        const gentle = resolveGridGradientCellSize({
            distancePx: 50,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 9,
            curvePower: 0.5,
            borderOffsetPx: 0,
        });
        const steep = resolveGridGradientCellSize({
            distancePx: 50,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 9,
            curvePower: 3,
            borderOffsetPx: 0,
        });

        expect(gentle).toBeGreaterThan(steep);
    });

    it('builds one blended dot per differing grid edge', () => {
        const dots = buildGridGradientBorderDots({
            classification: makeClassification(),
            colorByOwnerId: new Map([
                ['red', 0xff0000],
                ['blue', 0x0000ff],
            ]),
            dotSizePx: 2,
            style: 'blended',
            alpha: 0.5,
        });

        expect(dots).toHaveLength(2);
        expect(dots.every((dot) => dot.ownerId === null)).toBe(true);
        expect(dots.every((dot) => dot.color === 0x800080)).toBe(true);
    });

    it('builds two owner-colored dots for butted borders', () => {
        const dots = buildGridGradientBorderDots({
            classification: makeClassification(),
            colorByOwnerId: new Map([
                ['red', 0xff0000],
                ['blue', 0x0000ff],
            ]),
            dotSizePx: 2,
            style: 'butted',
            alpha: 0.5,
        });

        expect(dots).toHaveLength(4);
        expect(dots.filter((dot) => dot.ownerId === 'red')).toHaveLength(2);
        expect(dots.filter((dot) => dot.ownerId === 'blue')).toHaveLength(2);
    });

    it('generates stable noise polygons', () => {
        const first = buildGridGradientNoisePolygon({
            x: 10,
            y: 20,
            radiusPx: 5,
            cellId: 'g:1:2',
        });
        const second = buildGridGradientNoisePolygon({
            x: 10,
            y: 20,
            radiusPx: 5,
            cellId: 'g:1:2',
        });

        expect(first).toEqual(second);
        expect(first).toHaveLength(16);
    });
});

/* ==========================================================================
SECTION 19: Classifies mode id as render-family path
LAYER: routing
SOURCE: pax-fluxia\src\lib\territory\integration\TerritoryArchitectureRouter.ts:1-83
GREP: resolveTerritoryArchitectureRoute, grid_gradient
========================================================================== */
export type TerritoryArchitecturePath = 'clean' | 'legacy';

export type TerritoryRuntimeRoute =
    | 'runtime_clean_bridge'
    | 'runtime_legacy_bridge'
    | 'render_family_renderer'
    | 'legacy_style_renderer';

export interface TerritoryArchitectureRouteInput {
    renderMode?: string;
    architecturePath?: string;
}

export interface TerritoryArchitectureRouteDecision {
    renderMode: string;
    architecturePath: TerritoryArchitecturePath;
    route: TerritoryRuntimeRoute;
    isRuntimeSurfaceStyle: boolean;
    isRenderFamilySurfaceStyle: boolean;
}

function resolveArchitecturePath(raw: string | undefined): TerritoryArchitecturePath {
    return 'clean';
}

export function resolveTerritoryArchitectureRoute(
    input: TerritoryArchitectureRouteInput,
): TerritoryArchitectureRouteDecision {
    const renderMode = input.renderMode ?? 'territory_runtime';
    const architecturePath = resolveArchitecturePath(input.architecturePath);
    const isRuntimeSurfaceStyle =
        renderMode === 'territory_runtime' ||
        renderMode === 'power_voronoi_runtime';
    const isRenderFamilySurfaceStyle =
        renderMode === 'metaball' ||
        renderMode === 'metaball_grid' ||
        renderMode === 'metaball_grid_phase_edges' ||
        renderMode === 'metaball_grid_ember_lattice' ||
        renderMode === 'metaball_grid_phase_field' ||
        renderMode === 'perimeter_field' ||
        renderMode === 'grid_gradient';

    if (isRenderFamilySurfaceStyle) {
        return {
            renderMode,
            architecturePath,
            route: 'render_family_renderer',
            isRuntimeSurfaceStyle,
            isRenderFamilySurfaceStyle,
        };
    }

    if (!isRuntimeSurfaceStyle) {
        return {
            renderMode,
            architecturePath,
            route: 'legacy_style_renderer',
            isRuntimeSurfaceStyle,
            isRenderFamilySurfaceStyle,
        };
    }

    if (renderMode === 'power_voronoi_runtime') {
        return {
            renderMode,
            architecturePath,
            route: 'runtime_clean_bridge',
            isRuntimeSurfaceStyle,
            isRenderFamilySurfaceStyle,
        };
    }

    return {
        renderMode,
        architecturePath,
        route:
            architecturePath === 'clean'
                ? 'runtime_clean_bridge'
                : 'runtime_legacy_bridge',
        isRuntimeSurfaceStyle,
        isRenderFamilySurfaceStyle,
    };
}

/* ==========================================================================
SECTION 20: User-visible mode catalog entry
LAYER: routing/ui
SOURCE: pax-fluxia\src\lib\territory\ui\territoryRenderModeCatalog.ts:1-145
GREP: TERRITORY_RENDER_MODE_CATALOG, grid_gradient
========================================================================== */
/**
 * Single catalog of territory render modes shown in settings UI, aligned with
 * `GameCanvas.svelte` territory style dispatch (`TERRITORY_RENDER_MODE`).
 */

export interface TerritoryRenderModeDefinition {
    readonly id: string;
    readonly label: string;
    readonly shortDescription?: string;
    /** Has a matching `case` in GameCanvas territory dispatch (or explicit off). */
    readonly legacyDispatch: boolean;
    /**
     * When true, hidden from settings "Render mode" buttons; `GameCanvas` may still
     * dispatch if `TERRITORY_RENDER_MODE` / saved panel state references this id.
     */
    readonly uiHidden?: boolean;
}

export const TERRITORY_RENDER_MODE_CATALOG: readonly TerritoryRenderModeDefinition[] = [
    { id: 'none', label: 'Off', shortDescription: 'No territory overlay', legacyDispatch: true },
    {
        id: 'territory_runtime',
        label: 'Layered Runtime',
        shortDescription: 'Direct-runtime territory route with comparison support',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'power_voronoi_runtime',
        label: 'Power Voronoi 0427 (PVV4)',
        shortDescription: 'Exact Power Voronoi direct-runtime path with full diagnostics',
        legacyDispatch: true,
    },
    {
        id: 'territory_engine',
        label: 'Engine (DY4 pipeline)',
        shortDescription: 'Modular territory engine router',
        legacyDispatch: true,
        uiHidden: true,
    },
    { id: 'vs_pvv3', label: 'PVV3', shortDescription: 'Frontier-first PVV3', legacyDispatch: true },
    {
        id: 'power_voronoi',
        label: 'PVV2 weighted',
        shortDescription: 'Weighted power Voronoi (current)',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'modified_voronoi',
        label: 'Modified Voronoi (deprecated)',
        shortDescription:
            'Deprecated - seam model superseded by PVV / power Voronoi. Not shown in UI; migrate saved configs.',
        legacyDispatch: true,
        uiHidden: true,
    },
    {
        id: 'pvv2_dy4',
        label: 'PVV2 DY4 ref',
        shortDescription: 'Restored reference (8dce88c)',
        legacyDispatch: true,
        uiHidden: true,
    },
    { id: 'voronoi', label: 'Voronoi', shortDescription: 'Basic Voronoi', legacyDispatch: true },
    {
        id: 'distance_field',
        label: 'Distance field',
        shortDescription: 'GPU distance field + morph',
        legacyDispatch: true,
    },
    {
        id: 'perimeter_field',
        label: 'Perimeter field',
        shortDescription: 'Ownership geometry -> perimeter samples -> field render',
        legacyDispatch: true,
    },
    { id: 'metaball', label: 'Metaball', shortDescription: 'CPU influence field', legacyDispatch: true },
    {
        id: 'metaball_grid',
        label: 'Metaball grid',
        shortDescription:
            'Ownership geometry underlayer + world-anchored grid of metaball cells; conquest waves flip cells cell-by-cell',
        legacyDispatch: true,
    },
    {
        id: 'metaball_grid_phase_edges',
        label: 'Phase Edges',
        shortDescription:
            'Edge-forward square-lattice conquest mode with blended owner boundaries and shared grid-driven wave controls',
        legacyDispatch: true,
    },
    {
        id: 'metaball_grid_ember_lattice',
        label: 'Ember Lattice',
        shortDescription:
            'Dense square-lattice territory renderer with contour-derived blended frontiers and inward heat grading',
        legacyDispatch: true,
    },
    {
        id: 'metaball_grid_phase_field',
        label: 'Metaball grid phase field',
        shortDescription:
            'Fill-first conquest mode with conquest-local PRE/POST compositing, frontier emphasis, and finish-tail controls',
        legacyDispatch: true,
    },
    {
        id: 'grid_gradient',
        label: 'Grid Gradient',
        shortDescription:
            'Experimental render-family mode using PV geometry with invisible grid samples that grow toward region centers',
        legacyDispatch: true,
    },
    { id: 'pixel', label: 'Pixel', shortDescription: 'Pixel ownership grid', legacyDispatch: true },
    { id: 'graph', label: 'Lane graph', shortDescription: 'Graph/lane influence', legacyDispatch: true },
    { id: 'contour', label: 'Contour', shortDescription: 'Marching squares worker', legacyDispatch: true },
];

export interface ResolvedTerritoryRenderModeOption extends TerritoryRenderModeDefinition {
    selectable: boolean;
    disabledReason?: string;
}

/** True if this mode id is omitted from the settings Render mode row (may still run from config). */
export function isTerritoryRenderModeUiHidden(modeId: string): boolean {
    const def = TERRITORY_RENDER_MODE_CATALOG.find((d) => d.id === modeId);
    return Boolean(def?.uiHidden);
}

export function resolveTerritoryRenderModeOptions(): ResolvedTerritoryRenderModeOption[] {
    return TERRITORY_RENDER_MODE_CATALOG.filter((def) => !def.uiHidden).map((def) => {
        if (!def.legacyDispatch) {
            return {
                ...def,
                selectable: false,
                disabledReason: 'No GameCanvas dispatch',
            };
        }
        return { ...def, selectable: true };
    });
}

export function getTerritoryRenderModeLabel(modeId: string | null | undefined): string {
    if (!modeId) return 'Off';
    return TERRITORY_RENDER_MODE_CATALOG.find((def) => def.id === modeId)?.label ?? modeId;
}

/* ==========================================================================
SECTION 21: Grid Gradient tuning UI
LAYER: settings/ui
SOURCE: pax-fluxia\src\lib\components\ui\settings\GridGradientTuning.svelte:1-284
GREP: GRID_GRADIENT_* UI writes
========================================================================== */
<script lang="ts">
    import { GAME_CONFIG } from '$lib/config/game.config';
    import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
    import { gridGradientStats } from '$lib/territory/families/gridGradient/gridGradientStats';

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    let { panel, updatePanel }: Props = $props();

    function writeConfig(configKey: string, panelKey: string, value: unknown): void {
        (GAME_CONFIG as unknown as Record<string, unknown>)[configKey] = value;
        updatePanel(panelKey, value);
        bumpTerritoryVisualConfig();
    }

    function valueOf<T>(panelKey: string, fallback: T): T {
        return (panel[panelKey] ?? fallback) as T;
    }

    const spacingPx = $derived(valueOf<number>('gridGradientSpacingPx', 6));
    const maxCells = $derived(valueOf<number>('gridGradientMaxCells', 160000));
    const centerSizePx = $derived(valueOf<number>('gridGradientCenterSizePx', 10));
    const edgeSizePx = $derived(valueOf<number>('gridGradientEdgeSizePx', 1.5));
    const curvePower = $derived(valueOf<number>('gridGradientCurvePower', 1.6));
    const borderOffsetPx = $derived(valueOf<number>('gridGradientBorderOffsetPx', 0));
    const positionJitter = $derived(valueOf<number>('gridGradientPositionJitter', 0));
    const cellShape = $derived(valueOf<string>('gridGradientCellShape', 'circle'));
    const vectorBordersEnabled = $derived(valueOf<boolean>('gridGradientVectorBordersEnabled', true));
    const borderDotsEnabled = $derived(valueOf<boolean>('gridGradientBorderDotsEnabled', false));
    const borderDotSizePx = $derived(valueOf<number>('gridGradientBorderDotSizePx', 2.5));
    const borderDotStyle = $derived(valueOf<string>('gridGradientBorderDotStyle', 'blended'));
</script>

<div class="sub-heading">Grid Fill</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Grid Spacing</span>
        <span class="val">{spacingPx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="2"
        max="32"
        step="0.5"
        value={spacingPx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_SPACING_PX', 'gridGradientSpacingPx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Max Cells</span>
        <span class="val">{Math.round(maxCells).toLocaleString()}</span>
    </div>
    <input
        type="range"
        min="0"
        max="320000"
        step="5000"
        value={maxCells}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_MAX_CELLS', 'gridGradientMaxCells', parseInt((event.target as HTMLInputElement).value, 10));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Shape</span>
        <span class="val">{cellShape}</span>
    </div>
    <select
        class="mode-select"
        value={cellShape}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_CELL_SHAPE', 'gridGradientCellShape', (event.target as HTMLSelectElement).value);
        }}>
        <option value="circle">Circle</option>
        <option value="square">Square</option>
        <option value="noise">Noise</option>
    </select>
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Center Size</span>
        <span class="val">{centerSizePx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="1"
        max="48"
        step="0.5"
        value={centerSizePx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_CENTER_SIZE_PX', 'gridGradientCenterSizePx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Edge Size</span>
        <span class="val">{edgeSizePx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="0.5"
        max="16"
        step="0.5"
        value={edgeSizePx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_EDGE_SIZE_PX', 'gridGradientEdgeSizePx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Gradient Curve</span>
        <span class="val">{curvePower.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0.1"
        max="6"
        step="0.05"
        value={curvePower}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_CURVE_POWER', 'gridGradientCurvePower', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Border Offset</span>
        <span class="val">{borderOffsetPx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="0"
        max="80"
        step="1"
        value={borderOffsetPx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_OFFSET_PX', 'gridGradientBorderOffsetPx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Position Jitter</span>
        <span class="val">{positionJitter.toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="0.5"
        step="0.01"
        value={positionJitter}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_DISTRIBUTION', 'gridGradientDistribution', parseFloat((event.target as HTMLInputElement).value) > 0 ? 'jittered' : 'square');
            writeConfig('GRID_GRADIENT_POSITION_JITTER', 'gridGradientPositionJitter', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="sub-heading">Borders</div>

<label class="toggle-line">
    <input
        type="checkbox"
        checked={vectorBordersEnabled}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_VECTOR_BORDERS_ENABLED', 'gridGradientVectorBordersEnabled', (event.target as HTMLInputElement).checked);
        }} />
    <span>Vector borders</span>
</label>

<label class="toggle-line">
    <input
        type="checkbox"
        checked={borderDotsEnabled}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_DOTS_ENABLED', 'gridGradientBorderDotsEnabled', (event.target as HTMLInputElement).checked);
        }} />
    <span>Border dots</span>
</label>

<div class="var-row" class:disabled={!borderDotsEnabled}>
    <div class="row-top">
        <span class="var-name">Dot Size</span>
        <span class="val">{borderDotSizePx.toFixed(1)}px</span>
    </div>
    <input
        type="range"
        min="0.5"
        max="20"
        step="0.5"
        disabled={!borderDotsEnabled}
        value={borderDotSizePx}
        oninput={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_DOT_SIZE_PX', 'gridGradientBorderDotSizePx', parseFloat((event.target as HTMLInputElement).value));
        }} />
</div>

<div class="var-row" class:disabled={!borderDotsEnabled}>
    <div class="row-top">
        <span class="var-name">Dot Style</span>
        <span class="val">{borderDotStyle}</span>
    </div>
    <select
        class="mode-select"
        disabled={!borderDotsEnabled}
        value={borderDotStyle}
        onchange={(event) => {
            writeConfig('GRID_GRADIENT_BORDER_DOT_STYLE', 'gridGradientBorderDotStyle', (event.target as HTMLSelectElement).value);
        }}>
        <option value="blended">Blended</option>
        <option value="butted">Butted</option>
    </select>
</div>

<div class="sub-heading">Live Stats</div>
<div class="perf-grid">
    <div class="perf-label">Cells</div>
    <div class="perf-value">{$gridGradientStats.paintedCells.toLocaleString()} / {$gridGradientStats.emittableCells.toLocaleString()} / {$gridGradientStats.totalCells.toLocaleString()}</div>
    <div class="perf-label">Spacing</div>
    <div class="perf-value">{$gridGradientStats.requestedSpacingPx.toFixed(1)} / {$gridGradientStats.effectiveSpacingPx.toFixed(1)} px</div>
    <div class="perf-label">Borders</div>
    <div class="perf-value">{$gridGradientStats.vectorBorderCount} vector / {$gridGradientStats.borderDotCount} dots</div>
    <div class="perf-label">Frame</div>
    <div class="perf-value">{$gridGradientStats.lastUpdateMs.toFixed(2)} ms / EMA {$gridGradientStats.emaUpdateMs.toFixed(2)} ms</div>
</div>

<style>
    @import "./panel-shared.css";

    .sub-heading {
        margin: 12px 0 6px;
        color: rgba(128, 222, 255, 0.92);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
    }

    .toggle-line {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        color: rgba(240, 244, 248, 0.9);
        font-size: 12px;
    }

    .var-row.disabled {
        opacity: 0.55;
    }

    .perf-grid {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 6px 14px;
        align-items: baseline;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(7, 12, 24, 0.4);
        font-size: 11px;
    }

    .perf-label {
        color: rgba(220, 232, 245, 0.7);
        letter-spacing: 0;
    }

    .perf-value {
        color: rgba(248, 250, 252, 0.95);
        font-variant-numeric: tabular-nums;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
</style>

/* ==========================================================================
SECTION 22: Territory settings mode support and Grid Gradient card
LAYER: settings/ui
SOURCE: pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte:1-190
GREP: GridGradientTuning import, support helpers
========================================================================== */
<script lang="ts">
  import { GAME_CONFIG } from "$lib/config/game.config";
  import {
    isTerritoryRenderModeUiHidden,
    getTerritoryRenderModeLabel,
    resolveTerritoryRenderModeOptions,
  } from "$lib/territory/ui/territoryRenderModeCatalog";
  import {
    coerceVsTransitionModeForRenderMode,
    getTransitionModeOptionsForRenderMode,
  } from "$lib/territory/transitions/territoryTransitionModes";
  import CategoryThemeBar from "./CategoryThemeBar.svelte";
  import TerritoryTransitionTuning from "./TerritoryTransitionTuning.svelte";
  import PerimeterFieldTuning from "./PerimeterFieldTuning.svelte";
  import MetaballGridTuning from "./MetaballGridTuning.svelte";
  import GridGradientTuning from "./GridGradientTuning.svelte";
  import {
    metaballGridFamilyConfigDefaults,
    metaballGridPhaseEdgesModeDefaults,
  } from "$lib/territory/families/metaballGrid/config";
  import TerritoryGeometrySourceTuning from "./TerritoryGeometrySourceTuning.svelte";
  import TerritorySurfaceStyleTuning from "./TerritorySurfaceStyleTuning.svelte";
  import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
  import { territoryRenderStatus } from "$lib/stores/territoryRenderStatusStore";
  import {
    beginTerritoryTuningCompile,
    territoryTuningStatus,
  } from "$lib/stores/territoryTuningStatusStore";
  import { TERRITORY_GEOMETRY_LIMITS } from "$lib/territory/geometry/geometryTuning";

  // ControlsSection-Territory -- Territory Rendering (Voronoi + Metaball)

  interface Props {
    panel: Record<string, any>;
    updatePanel: (key: string, value: any) => void;
    syncFromConfig?: () => void;
    animLockModes: Record<string, any>;
    animLockRatios: Record<string, any>;
    getAnimValue: (key: string) => number;
    setAnimValue: (key: string, val: number) => void;
    formatAnimValue: (val: number, unit: string) => string;
    pinValueToTickDuration: (key: string) => void;
    lockRatioToTick: (key: string) => void;
    lockRatioToAnimSpeed: (key: string) => void;
    view?: "modes" | "tuning" | "styles" | "all";
    activeSubsection?: string;
    showCategoryThemeBar?: boolean;
    hideRenderModeSelector?: boolean;
    systemTitle?: string;
  }

  let {
    panel,
    updatePanel,
    syncFromConfig,
    animLockModes,
    animLockRatios,
    getAnimValue,
    setAnimValue,
    formatAnimValue,
    pinValueToTickDuration,
    lockRatioToTick,
    lockRatioToAnimSpeed,
    view = "all",
    activeSubsection = "all",
    showCategoryThemeBar = false,
    hideRenderModeSelector = false,
    systemTitle = "Territory System",
  }: Props = $props();

  const showModesView = $derived(view === "all" || view === "modes");
  const showTuningView = $derived(view === "all" || view === "tuning");
  const showStylesView = $derived(view === "all" || view === "styles");
  type TerritoryStyleSubsectionId = "all" | "fill" | "border" | "finish";

  function resolveActiveStyleSubsection(): TerritoryStyleSubsectionId {
    if (
      activeSubsection === "fill" ||
      activeSubsection === "border" ||
      activeSubsection === "finish"
    ) {
      return activeSubsection;
    }
    return "all";
  }

  /** CX/DX sub-sliders stay visible when off; these drive disabled + dim styling. */
  let cxOn = $derived(
    panel.corridorEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED ??
      true,
  );
  let dxOn = $derived(
    panel.disconnectEnabled ??
      GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
      false,
  );
  const topologyLimits = TERRITORY_GEOMETRY_LIMITS;

  type TerritorySystemModuleId =
    | "all"
    | "none"
    | "render-mode";
  type TerritoryRendererModuleId =
    | "all"
    | "none"
    | "metaball"
    | "perimeter-field"
    | "metaball-grid"
    | "grid-gradient"
    | "topology"
    | "surface";

  interface TerritoryModuleDef<T extends string> {
    id: T;
    label: string;
    icon: string;
  }

  type TerritorySystemViewId = Exclude<TerritorySystemModuleId, "all" | "none">;
  type TerritoryRendererViewId = Exclude<
    TerritoryRendererModuleId,
    "all" | "none"
  >;

  const TERRITORY_SYSTEM_MODULES: Array<
    TerritoryModuleDef<TerritorySystemViewId>
  > = [
    { id: "render-mode", label: "Mode", icon: "â—Ž" },
  ];

  const TERRITORY_SYSTEM_MODULE_PANEL_KEY = "territorySystemModuleVisibility";
  const TERRITORY_RENDERER_MODULE_PANEL_KEY =
    "territoryRendererModuleVisibility";

  let activeSystemModule = $derived(
    (panel[TERRITORY_SYSTEM_MODULE_PANEL_KEY] ??
      "all") as TerritorySystemModuleId,
  );
  let activeRendererModule = $derived(
    (panel[TERRITORY_RENDERER_MODULE_PANEL_KEY] ??
      "all") as TerritoryRendererModuleId,
  );

  function visibleSystemModules(): Array<
    TerritoryModuleDef<TerritorySystemViewId>
  > {
    return TERRITORY_SYSTEM_MODULES.map((module) =>
      hideRenderModeSelector && module.id === "render-mode"
        ? { ...module, label: "Transition" }
        : module,
    );
  }

  function supportsRuntimeSurfaceStyleCard(): boolean {
    const activeStyle = resolveActiveStyleId();
    return (
      activeStyle === "territory_engine" ||
      activeStyle === "territory_runtime" ||
      activeStyle === "power_voronoi_runtime"
    );
  }

  function supportsSharedSurfaceStyleCard(): boolean {
    const activeStyle = resolveActiveStyleId();
    return activeStyle === "perimeter_field" || isMetaballGridStyle();
  }

  function supportsGridGradientStyleCard(): boolean {
    return resolveActiveStyleId() === "grid_gradient";
  }

  function hasTerritoryStyleControls(): boolean {
    return (
      supportsRuntimeSurfaceStyleCard() ||
      supportsSharedSurfaceStyleCard() ||
      supportsGridGradientStyleCard()
    );
  }

  function resolvedStyleSubsection():
    | "all"
    | "fill"
    | "border"
    | "finish" {
    if (isEdgeForwardMetaballGridStyle() && activeSubsection === "finish") {
      return "all";
    }
    return activeSubsection === "fill" ||
      activeSubsection === "border" ||

/* ==========================================================================
SECTION 23: Territory settings renderer mode and style helpers
LAYER: settings/ui
SOURCE: pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte:450-650
GREP: TERRITORY_RENDER_MODE, isGridGradientStyle
========================================================================== */
      const shouldPrime =
        !panelHasExplicitValue &&
        (configValue === undefined || configValue === entry.familyDefault);
      if (shouldPrime) {
        debouncedConfigUpdate(
          entry.configKey,
          entry.panelKey,
          entry.phaseEdgesDefault,
        );
      }
    }
  }

  function selectTerritoryStyle(styleId: string) {
    debouncedConfigUpdate(
      "TERRITORY_RENDER_MODE",
      "territoryRenderMode",
      styleId,
    );
    if (styleId === "power_voronoi_runtime") {
      selectFrontierTransition("pv_frontline");
    } else if (resolveActiveFillTransitionId() === "pv_frontline") {
      selectFrontierTransition("active_front");
    }
    if (styleId === "metaball_grid_ember_lattice") {
      primeMetaballGridPhaseEdgesTunables();
    }
    setActiveRendererModule("all");
    // Reset diagnostic so it logs on next render frame
    (globalThis as any).__RENDER_MODE_LOGGED = false;
    // Sync compatibility booleans to panel; setSetting applies GAME_CONFIG via RESOLVED map.
    for (const [mode, panelKey] of Object.entries(STYLE_TO_BOOLEAN)) {
      updatePanel(panelKey, styleId !== "none" && mode === styleId);
    }
  }

  function resolveActiveStyleId(): string {
    return (
      panel.territoryRenderMode ??
      GAME_CONFIG.TERRITORY_RENDER_MODE ??
      "territory_runtime"
    );
  }

  function resolveSelectedGeometryModeId(): string {
    if (resolveActiveStyleId() === "power_voronoi_runtime") {
      return "resolved_power_voronoi";
    }
    return (
      panel.territoryGeometryMode ??
      GAME_CONFIG.TERRITORY_GEOMETRY_MODE ??
      "unified_vector"
    ) as string;
  }

  function usesResolvedPvGeometry(): boolean {
    return resolveSelectedGeometryModeId() === "resolved_power_voronoi";
  }

  function resolveActiveFillTransitionId(): string {
    if (usesResolvedPvGeometry()) {
      return "pv_frontline";
    }
    const raw =
      panel.territoryFillTransitionMode ??
      panel.territoryFillTransition ??
      GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
      GAME_CONFIG.TERRITORY_FILL_MODE ??
      "active_front";
    if (raw === "frontier" || raw === "frontier_morph") return "active_front";
    if (raw === "none") return "off";
    return raw;
  }

  function selectFrontierTransition(transitionId: string) {
    debouncedConfigUpdate(
      "TERRITORY_FILL_TRANSITION_MODE",
      "territoryFillTransitionMode",
      transitionId,
    );
    if (transitionId === "pv_frontline") {
      debouncedConfigUpdate(
        "TERRITORY_BORDER_TRANSITION_MODE",
        "territoryBorderTransitionMode",
        "off",
      );
      debouncedConfigUpdate(
        "TERRITORY_BORDER_TRANSITION",
        "territoryBorderTransition",
        "none",
      );
    }
  }

  function isPowerVoronoi0427Mode(): boolean {
    return resolveActiveStyleId() === "power_voronoi_runtime";
  }

  function isMetaballGridStyle(): boolean {
    const activeStyle = resolveActiveStyleId();
    return (
      activeStyle === "metaball_grid" ||
      activeStyle === "metaball_grid_phase_edges" ||
      activeStyle === "metaball_grid_ember_lattice" ||
      activeStyle === "metaball_grid_phase_field"
    );
  }

  function isGridGradientStyle(): boolean {
    return resolveActiveStyleId() === "grid_gradient";
  }

  function isMetaballGridPhaseEdgesStyle(): boolean {
    return resolveActiveStyleId() === "metaball_grid_phase_edges";
  }

  function isEmberLatticeStyle(): boolean {
    return resolveActiveStyleId() === "metaball_grid_ember_lattice";
  }

  function isEdgeForwardMetaballGridStyle(): boolean {
    return isMetaballGridPhaseEdgesStyle() || isEmberLatticeStyle();
  }

  $effect(() => {
    if (isEmberLatticeStyle()) {
      primeMetaballGridPhaseEdgesTunables();
    }
  });

  function showsDerivedGeometryInput(): boolean {
    return isMetaballGridStyle() || isGridGradientStyle();
  }
  function resolveActiveTransitionModeId(): string {
    return coerceVsTransitionModeForRenderMode(
      resolveActiveStyleId(),
      (panel.vsTransitionMode ?? GAME_CONFIG.VS_TRANSITION_MODE ?? null) as
        | string
        | null,
    );
  }

  function showReferenceVsTransitionModeSelector(): boolean {
    const activeStyle = resolveActiveStyleId();
    return (
      activeStyle === "power_voronoi" ||
      activeStyle === "pvv2_dy4" ||
      activeStyle === "metaball"
    );
  }

  function rendererModules(): Array<
    TerritoryModuleDef<TerritoryRendererViewId>
  > {
    const modules: Array<
      TerritoryModuleDef<TerritoryRendererViewId>
    > = [{ id: "topology", label: "Topology", icon: "â¬¡" }];

    if (resolveActiveStyleId() === "metaball") {
      modules.unshift({ id: "metaball", label: "Metaball", icon: "â—‰" });
    }

    if (resolveActiveStyleId() === "perimeter_field") {
      modules.unshift({
        id: "perimeter-field",
      label: "Perimeter Field",
        icon: "â—Ž",
      });
    }

    if (isMetaballGridStyle()) {
      modules.unshift({
        id: "metaball-grid",
        label: "Grid",
        icon: "â–¦",
      });
    }

    if (isGridGradientStyle()) {
      modules.unshift({
        id: "grid-gradient",
        label: "Gradient",
        icon: "GG",
      });
    }

    if (
      resolveActiveStyleId() === "territory_engine" ||
      resolveActiveStyleId() === "territory_runtime" ||
      resolveActiveStyleId() === "power_voronoi_runtime"
    ) {
      modules.push({ id: "surface", label: "Surface", icon: "âœ¦" });
    }

    if (view === "tuning") {
      return modules.filter((module) => module.id === "topology");
    }

    if (view === "styles") {
      return modules.filter((module) => module.id !== "topology");
    }

/* ==========================================================================
SECTION 24: Territory settings Grid Gradient card render
LAYER: settings/ui
SOURCE: pax-fluxia\src\lib\components\ui\settings\ControlsSection-Territory.svelte:2068-2295
GREP: Grid Gradient cards
========================================================================== */
      styleFamily={isEmberLatticeStyle()
        ? "metaball_grid_ember_lattice"
        : isMetaballGridPhaseEdgesStyle()
          ? "metaball_grid_phase_edges"
          : "metaball_grid"} />
  </div>
{/if}

{#if showStylesView && showRendererModule("grid-gradient") && isGridGradientStyle()}
  <div class="engine-control-group territory-module-card">
    <div class="territory-card__header">
      <h4 class="axis-card-title">Grid Gradient (Experimental)</h4>
    </div>
    <GridGradientTuning {panel} {updatePanel} />
  </div>
{/if}

</div>
</div>
{/if}

{#if showStylesView}
  {#if !hasTerritoryStyleControls()}
    <div class="axis-note">
      This render mode does not expose a separate style surface.
    </div>
  {:else}
    {#if supportsRuntimeSurfaceStyleCard() && resolvedStyleSubsection() === "finish"}
      <div class="axis-note">
        Finish controls are not exposed for this runtime surface mode. Use
        `Fill` or `Border`, or switch to a shared-surface family such as
        Metaball Grid or Perimeter Field for finish controls.
      </div>
    {/if}

    {#if supportsRuntimeSurfaceStyleCard() && showStyleSection("fill")}
      <div class="engine-control-group territory-module-card" data-subsection-id="fill">
        <div class="territory-card__header">
          <h4 class="axis-card-title">
            {resolveActiveStyleId() === "territory_engine"
              ? "Engine Surface"
              : resolveActiveStyleId() === "power_voronoi_runtime"
                ? "Power Voronoi 0427 Surface"
                : "Layered Runtime Surface"}
          </h4>
          <p class="territory-card__intro">
            Visible fill and border styling for the active territory surface.
            Runtime shape, diagnostics, and topology live elsewhere.
          </p>
        </div>

        <h5 class="territory-inline-heading">Territory Fill</h5>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Fill Alpha</span><span class="val"
              >{(panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_ALPHA", "voronoiAlpha", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Neutral Transparent</span>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={panel.neutralTerritoryTransparent ??
                  GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT}
                onchange={(e) => {
                  const v = (e.target as HTMLInputElement).checked;
                  debouncedConfigUpdate(
                    "NEUTRAL_TERRITORY_TRANSPARENT",
                    "neutralTerritoryTransparent",
                    v,
                  );
                }} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
              >{(panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION).toFixed(
                2,
              )}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_SATURATION", "voronoiSaturation", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
              >{(panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS).toFixed(
                2,
              )}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_LIGHTNESS", "voronoiLightness", v);
            }} />
        </div>
      </div>
    {/if}

    {#if supportsRuntimeSurfaceStyleCard() && showStyleSection("border")}
      <div class="engine-control-group territory-module-card" data-subsection-id="border">
        <div class="territory-card__header">
          <h4 class="axis-card-title">
            {resolveActiveStyleId() === "territory_engine"
              ? "Engine Surface"
              : resolveActiveStyleId() === "power_voronoi_runtime"
                ? "Power Voronoi 0427 Surface"
                : "Layered Runtime Surface"}
          </h4>
          <p class="territory-card__intro">
            Visible fill and border styling for the active territory surface.
            Runtime shape, diagnostics, and topology live elsewhere.
          </p>
        </div>

        <h5 class="territory-inline-heading">Territory Border</h5>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
              >{(
                panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH
              ).toFixed(1)}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_BORDER_WIDTH", "voronoiBorderWidth", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
              >{(
                panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA
              ).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate("VORONOI_BORDER_ALPHA", "voronoiBorderAlpha", v);
            }} />
        </div>

        <div class="var-row">
          <div class="row-top">
            <span class="var-name">Geometry Smooth Passes</span><span
              class="val"
              >{Math.round(
                panel.voronoiBorderSmooth ?? GAME_CONFIG.VORONOI_BORDER_SMOOTH,
              )}</span>
          </div>
          <div class="row-hint">
            Chaikin passes - modifies actual border and fill geometry coordinates.
            0 = angular, 2 = smooth, 5 = very round.
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={panel.voronoiBorderSmooth ?? GAME_CONFIG.VORONOI_BORDER_SMOOTH}
            oninput={(e) => {
              const v = +(e.target as HTMLInputElement).value;
              debouncedConfigUpdate(
                "VORONOI_BORDER_SMOOTH",
                "voronoiBorderSmooth",
                v,
              );
            }} />
        </div>
      </div>
    {/if}

    {#if supportsGridGradientStyleCard() && !showTuningView}
      <div class="engine-control-group territory-module-card">
        <div class="territory-card__header">
          <h4 class="axis-card-title">Grid Gradient (Experimental)</h4>
        </div>
        <GridGradientTuning {panel} {updatePanel} />
      </div>
    {/if}

    {#if supportsSharedSurfaceStyleCard()}
      <div class="engine-control-group territory-module-card">

/* ==========================================================================
SECTION 25: Diagnostics imports/live mode gating
LAYER: diagnostics/ui
SOURCE: pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte:1-90
GREP: gridGradientStats, showGridGradientDiagnostics
========================================================================== */
<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";
    import { mapTranspose } from "$lib/stores/mapTranspose.svelte";
    import { territoryRenderStatus } from "$lib/stores/territoryRenderStatusStore";
    import { territoryTuningStatus } from "$lib/stores/territoryTuningStatusStore";
    import { metaballGridStats } from "$lib/territory/families/metaballGrid/metaballGridStats";
    import { gridGradientStats } from "$lib/territory/families/gridGradient/gridGradientStats";
    import PerimeterFieldDiagnosticsPanel from "$lib/components/ui/PerimeterFieldDiagnosticsPanel.svelte";
    import { overlayConfig } from "$lib/territory/devtools/overlayConfig";
    import {
        authoredMeasurementsUi,
    } from "$lib/territory/devtools/authoredMeasurementsUi";
    import {
        getRulerMeasurement,
        rulerTool,
    } from "$lib/territory/devtools/rulerTool";
    import TerritoryEngineTraceDiagnostics from "./TerritoryEngineTraceDiagnostics.svelte";
    import SettingsDumpDiagnosticsControls from "./SettingsDumpDiagnosticsControls.svelte";
    import {
        transitionSnapshotRecorder,
        transitionSnapshotRecorderStore,
        type TransitionDebugBundle,
    } from "$lib/territory/devtools/TransitionSnapshotRecorder";
    import {
        downloadAllBundles,
        downloadAllDiagnosticPackages,
        downloadBundle,
        downloadDiagnosticPackage,
    } from "$lib/territory/devtools/TransitionBundleSerializer";
    import { getTerritoryRenderModeLabel } from "$lib/territory/ui/territoryRenderModeCatalog";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    const hasAuthoredMeasurements = $derived(
        activeGameStore.mapDiagnostics.measurements.length > 0,
    );
    const activeRenderMode = $derived(
        (panel.territoryRenderMode ??
            GAME_CONFIG.TERRITORY_RENDER_MODE ??
            "territory_runtime") as string,
    );
    const liveRenderMode = $derived(
        ($territoryRenderStatus.territoryMode &&
        $territoryRenderStatus.territoryMode !== "none"
            ? $territoryRenderStatus.territoryMode
            : activeRenderMode) as string,
    );
    const showPerimeterFieldDiagnostics = $derived(
        liveRenderMode === "perimeter_field",
    );
    const showMetaballGridDiagnostics = $derived(
        liveRenderMode === "metaball_grid" ||
            liveRenderMode === "metaball_grid_phase_edges" ||
            liveRenderMode === "metaball_grid_ember_lattice" ||
            liveRenderMode === "metaball_grid_phase_field",
    );
    const showGridGradientDiagnostics = $derived(
        liveRenderMode === "grid_gradient",
    );
    const showTerritoryEngineTraceDiagnostics = $derived(
        liveRenderMode === "territory_engine"
        || activeRenderMode === "territory_engine",
    );
    const showUnderlyingGeometrySupported = $derived(
        liveRenderMode === "perimeter_field" ||
            liveRenderMode === "metaball" ||
            liveRenderMode === "metaball_grid" ||
            liveRenderMode === "metaball_grid_phase_edges" ||
            liveRenderMode === "metaball_grid_ember_lattice" ||
            liveRenderMode === "metaball_grid_phase_field" ||
            liveRenderMode === "grid_gradient",
    );
    const bundleList = $derived(
        [...$transitionSnapshotRecorderStore.bundles].reverse(),
    );

    let overlayEnabled = $state(overlayConfig.enabled);
    let overlayShowVertices = $state(overlayConfig.showAllVertices);
    let overlayShowActiveFront = $state(overlayConfig.showActiveFront);
    let overlayPolylineSamples = $state(overlayConfig.showPolylineSamples);
    let downloading = $state<string | null>(null);


/* ==========================================================================
SECTION 26: Diagnostics panel readout
LAYER: diagnostics/ui
SOURCE: pax-fluxia\src\lib\components\ui\settings\ControlsSection-Diagnostics.svelte:706-724
GREP: Grid Gradient diagnostics rows
========================================================================== */
                {formatPhaseFieldSemanticsNote()}
                Recommended starter: <code>pre_to_post_frontier</code> propagation, <code>territory_edge</code> borders, <code>Frontier Highlight</code> on, and the new finish-tail controls in <code>Flip</code> for fade timing, cell collapse, and frontier cleanup. DX defaults stay on at 295px with weight 0.30.
            </div>
        {/if}
    {/if}
    {#if showGridGradientDiagnostics}
        <div class="status-grid">
            <div><span>Family</span><code>{$gridGradientStats.familyLabel}</code></div>
            <div><span>Source</span><code>{$gridGradientStats.geometrySource ?? "n/a"}</code></div>
            <div><span>Cells</span><span>{$gridGradientStats.paintedCells.toLocaleString()} painted / {$gridGradientStats.emittableCells.toLocaleString()} emittable / {$gridGradientStats.totalCells.toLocaleString()} total</span></div>
            <div><span>Spacing</span><span>{$gridGradientStats.requestedSpacingPx.toFixed(1)}px requested / {$gridGradientStats.effectiveSpacingPx.toFixed(1)}px effective</span></div>
            <div><span>Fill</span><span>{$gridGradientStats.cellShape} / {$gridGradientStats.edgeSizePx.toFixed(1)}px edge / {$gridGradientStats.centerSizePx.toFixed(1)}px center / curve {$gridGradientStats.curvePower.toFixed(2)}</span></div>
            <div><span>Offset</span><span>{$gridGradientStats.borderOffsetPx.toFixed(1)}px</span></div>
            <div><span>Borders</span><span>{$gridGradientStats.vectorBordersEnabled ? "vector on" : "vector off"} / {$gridGradientStats.borderDotsEnabled ? `${$gridGradientStats.borderDotStyle} dots` : "dots off"}</span></div>
            <div><span>Border Count</span><span>{$gridGradientStats.vectorBorderCount} vector / {$gridGradientStats.borderDotCount} dots</span></div>
            <div><span>Frame</span><span>{$gridGradientStats.visibleFrameState} / {$gridGradientStats.lastUpdateMs.toFixed(2)} ms / EMA {$gridGradientStats.emaUpdateMs.toFixed(2)} ms</span></div>
        </div>
    {/if}
    {#if showPerimeterFieldDiagnostics}

/* ==========================================================================
SECTION 27: Settings definitions for Grid Gradient keys
LAYER: settings/metadata
SOURCE: pax-fluxia\src\lib\components\ui\settingsDefs.ts:615-636
GREP: GRID_GRADIENT settingsDefs
========================================================================== */
        configKey: 'METABALL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
    },
    { configKey: 'METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_START' },
    { configKey: 'METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_END' },
    { configKey: 'GRID_GRADIENT_ENABLED' },
    { configKey: 'GRID_GRADIENT_SPACING_PX' },
    { configKey: 'GRID_GRADIENT_MAX_CELLS' },
    { configKey: 'GRID_GRADIENT_ORIGIN_MODE' },
    { configKey: 'GRID_GRADIENT_DISTRIBUTION' },
    { configKey: 'GRID_GRADIENT_POSITION_JITTER' },
    { configKey: 'GRID_GRADIENT_CENTER_SIZE_PX' },
    { configKey: 'GRID_GRADIENT_EDGE_SIZE_PX' },
    { configKey: 'GRID_GRADIENT_CURVE_POWER' },
    { configKey: 'GRID_GRADIENT_BORDER_OFFSET_PX' },
    { configKey: 'GRID_GRADIENT_CELL_SHAPE' },
    { configKey: 'GRID_GRADIENT_VECTOR_BORDERS_ENABLED' },
    { configKey: 'GRID_GRADIENT_BORDER_DOTS_ENABLED' },
    { configKey: 'GRID_GRADIENT_BORDER_DOT_SIZE_PX' },
    { configKey: 'GRID_GRADIENT_BORDER_DOT_STYLE' },
    { configKey: 'TERRITORY_FRONTIER_TECHNIQUE' },
    { configKey: 'TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE' },
    { configKey: 'TERRITORY_FRONTIER_PHASE_SAMPLING' },

/* ==========================================================================
SECTION 28: Settings metadata labels for Grid Gradient
LAYER: settings/metadata
SOURCE: pax-fluxia\src\lib\components\ui\settings\settingMetadata.ts:474-493
GREP: Grid Gradient metadata
========================================================================== */
        },
        'Frontier Fade End': {
            key: 'METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_END',
        },
        'Grid Gradient Enabled': { key: 'GRID_GRADIENT_ENABLED' },
        'Grid Gradient Spacing': { key: 'GRID_GRADIENT_SPACING_PX' },
        'Grid Gradient Max Cells': { key: 'GRID_GRADIENT_MAX_CELLS' },
        'Grid Gradient Shape': { key: 'GRID_GRADIENT_CELL_SHAPE' },
        'Grid Gradient Center Size': { key: 'GRID_GRADIENT_CENTER_SIZE_PX' },
        'Grid Gradient Edge Size': { key: 'GRID_GRADIENT_EDGE_SIZE_PX' },
        'Grid Gradient Curve': { key: 'GRID_GRADIENT_CURVE_POWER' },
        'Grid Gradient Border Offset': { key: 'GRID_GRADIENT_BORDER_OFFSET_PX' },
        'Grid Gradient Vector Borders': {
            key: 'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
        },
        'Grid Gradient Border Dots': { key: 'GRID_GRADIENT_BORDER_DOTS_ENABLED' },
        'Grid Gradient Dot Size': { key: 'GRID_GRADIENT_BORDER_DOT_SIZE_PX' },
        'Grid Gradient Dot Style': { key: 'GRID_GRADIENT_BORDER_DOT_STYLE' },
        'Frontier Technique': { key: 'TERRITORY_FRONTIER_TECHNIQUE' },
        'Frontier Border Geometry': {

/* ==========================================================================
SECTION 29: Config interface fields for Grid Gradient
LAYER: settings/config
SOURCE: pax-fluxia\src\lib\config\game.config.ts:442-520
GREP: GRID_GRADIENT config keys
========================================================================== */
    METABALL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT: boolean; // Draw a winner-side highlight rim at the active frontier
    METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_START: number; // Normalized conquest time when the frontier accent begins fading
    METABALL_GRID_PHASE_FIELD_FRONTIER_FADE_END: number; // Normalized conquest time when the frontier accent fully fades
    GRID_GRADIENT_ENABLED: boolean; // Master gate for the Grid Gradient render family
    GRID_GRADIENT_SPACING_PX: number; // Requested invisible grid spacing in world px
    GRID_GRADIENT_MAX_CELLS: number; // Optional cell cap; coarsens spacing upward when exceeded
    GRID_GRADIENT_ORIGIN_MODE: 'centered' | 'corner'; // Grid anchor mode in world space
    GRID_GRADIENT_DISTRIBUTION: 'square' | 'hex_offset' | 'jittered'; // Grid point distribution
    GRID_GRADIENT_POSITION_JITTER: number; // Deterministic point scatter as a fraction of spacing
    GRID_GRADIENT_CENTER_SIZE_PX: number; // Largest fill primitive size at region centers
    GRID_GRADIENT_EDGE_SIZE_PX: number; // Smallest fill primitive size at borders
    GRID_GRADIENT_CURVE_POWER: number; // Distance-to-border size curve power
    GRID_GRADIENT_BORDER_OFFSET_PX: number; // Fill pullback from territory borders
    GRID_GRADIENT_CELL_SHAPE: 'circle' | 'square' | 'noise'; // Primitive shape used for fill samples
    GRID_GRADIENT_VECTOR_BORDERS_ENABLED: boolean; // Draw smoothed vector borders from resolved geometry
    GRID_GRADIENT_BORDER_DOTS_ENABLED: boolean; // Overlay grid-derived dotted borders
    GRID_GRADIENT_BORDER_DOT_SIZE_PX: number; // Dotted-border primitive size
    GRID_GRADIENT_BORDER_DOT_STYLE: 'blended' | 'butted'; // One blended line or two owner-colored lines
    TERRITORY_FRONTIER_TECHNIQUE: TerritoryFrontierTechniqueId; // Frontier technique selector for shared frontier processing
    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: TerritoryFrontierBorderGeometryMode; // Control-path border geometry selector: straight shared-edge vs rounded contour-matched
    TERRITORY_FRONTIER_PHASE_SAMPLING: TerritoryFrontierPhaseSamplingMode; // Texture filtering strategy for shader frontier bands
    TERRITORY_FRONTIER_BLUR_PASSES: number; // Number of 3-tap separable blur passes on scalar phase fields
    TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY: TerritoryFrontierTriangleDiagonalPolicy; // Marching-triangles diagonal selection policy
    TERRITORY_FRONTIER_CHAIKIN_PASSES: number; // Post-contour Chaikin smoothing passes
    TERRITORY_FRONTIER_SHADER_SOFTNESS_PX: number; // Softness of shader frontier band in phase-distance units
    TERRITORY_FRONTIER_BAND_WIDTH_PX: number; // Half-width of the shader frontier band in phase-distance units
    TERRITORY_FRONTIER_JUNCTION_RENDER_MODE: TerritoryFrontierJunctionRenderMode; // Shared-junction presentation on straight shared-edge frontiers
    TERRITORY_FRONTIER_JUNCTION_RADIUS_PX: number; // Bubble radius for multi-owner shared-edge junction markers
    TERRITORY_FRONTIER_OUTER_BORDER_ENABLED: boolean; // Draw owner-vs-world outer perimeter borders instead of limiting strokes to inter-owner frontiers
    TERRITORY_FRONTIER_FX_MODE: TerritoryFrontierFxMode; // Border-inward frontier surface FX mode
    TERRITORY_FRONTIER_FX_WIDTH_PX: number; // Width of the inward frontier FX region in px
    TERRITORY_FRONTIER_FX_STRENGTH: number; // Intensity of the selected frontier FX mode
    TERRITORY_FRONTIER_FX_STEPS: number; // Quantized bands for stepped moat mode
    TERRITORY_FRONTIER_FX_SOFTNESS: number; // Falloff power for smooth inward frontier effects
    TERRITORY_FRONTIER_FX_EMISSIVE: number; // Extra glow / hot-blend weighting for animated frontier FX
    TERRITORY_FRONTIER_FX_PARTICLE_DENSITY: number; // Spark / drift density for frontier FX modes that use procedural particles
    TERRITORY_FRONTIER_FX_PULSE_SPEED: number; // Pulse speed for animated plasma rim mode
    TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE: boolean; // Apply frontier FX when no conquest transition is active
    TERRITORY_FRONTIER_FX_APPLY_TRANSITION: boolean; // Apply frontier FX during conquest transitions
    TERRITORY_MORPH_CONTROL_POINTS: number; // Number of control points for frontier loop morphing (5-300, default 32)
    TERRITORY_BOUNDARY_MODE: 'segment' | 'smooth';  // 'segment' = edge-level lerp, 'smooth' = flubber polygon morph
    TERRITORY_FILL_MODE: 'crossfade' | 'frontier';  // 'crossfade' = alpha-fade fills, 'frontier' = infill from frontier loops
    TERRITORY_FILL_TRANSITION_MODE:
        | 'frontier_morph'
        | 'active_front'
        | 'unified_topology'
        | 'pv_frontline'
        | 'crossfade'
        | 'legacy_fill_active_front'
        | 'topology_fill_rebuild'
        | 'legacy_fill_crossfade'
        | 'off'; // Fill transition selector spanning legacy and clean-arch ids
    TERRITORY_BORDER_TRANSITION_MODE: 'optimal_transport' | 'rope_morph' | 'off'; // Clean-arch border transition selector
    TERRITORY_STYLE_MODE: 'vector' | 'distance_field' | 'pixel'; // Clean-arch presentation style selector
    // â”€â”€ Morph Diagnostics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    DEBUG_MORPH_VERTICES: boolean;        // Show numbered vertex dots on territory polygons during morph
    DEBUG_MORPH_VERTEX_SIZE: number;      // Radius of vertex dots (px, default 3)
    DEBUG_MORPH_PIN_THRESHOLD: number;    // Displacement below which a vertex is "pinned" (green) vs "morph" (red)
    MORPH_CONQUEST_RADIUS: number;        // Max distance from conquered star for morph (0=disabled, px)
    DEBUG_MORPH_TRACE_LOG: boolean;       // Log per-vertex start/end/distance trace on transition start
    DEBUG_MORPH_SLOWMO: boolean;          // 10X slow-motion: multiply TERRITORY_TRANSITION_MS by 10
    DEBUG_MORPH_VERTEX_NTH: number;       // Show label on every Nth vertex (1=all, 10=every 10th, default 10)
    DEBUG_MORPH_VERTEX_COLOR_MODE: string; // Vertex dot color mode: 'pinmorph' | 'owner' | 'neutral'
    DEBUG_MORPH_VERTEX_LABELS: boolean;    // Draw numeric index labels on vertex dots (default true)

    // â”€â”€ DY4 Transition Isolation (F-138) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    DEBUG_DY4_DISABLE_FILL_CROSSFADE: boolean;
    DEBUG_DY4_DISABLE_BORDER_TRANSITION: boolean;
    DEBUG_DY4_FORCE_TRANSITION_START: boolean;
    TERRITORY_METABALL: boolean;   // Enable Metaball territory renderer (default false)
    TERRITORY_PIXEL: boolean;      // Enable Pixel (nearest-neighbor) territory renderer (default false)
    TERRITORY_CLUSTER_SPLIT: boolean; // Split disconnected same-owner stars into separate territory blobs (default false)
    TERRITORY_MODE: 'voronoi' | 'metaball' | 'off';  // LEGACY â€” kept for compat
    TERRITORY_DISTANCE_FIELD: boolean; // Enable distance-field territory renderer (default false)
    TERRITORY_RENDER_MODE: string;    // Active render mode: 'none' | 'vs_pvv3' | 'power_voronoi' | 'distance_field' | 'voronoi' | 'metaball' | 'metaball_grid' | 'metaball_grid_phase_edges' | 'metaball_grid_ember_lattice' | 'metaball_grid_phase_field' | 'grid_gradient' | 'perimeter_field' | 'pixel' | 'graph' | 'contour'
    /** When true, legacy modes without a registered RenderFamily adapter are gated in UI; metaball may use family path. Default false. */
    USE_RENDER_FAMILIES: boolean;
    TERRITORY_ARCHITECTURE_PATH: 'clean' | 'legacy'; // Master architecture selector for runtime territory mode


/* ==========================================================================
SECTION 30: Category grouping for Grid Gradient settings
LAYER: settings/config
SOURCE: pax-fluxia\src\lib\config\categoryThemes.ts:280-300
GREP: GRID_GRADIENT category keys
========================================================================== */
        'METABALL_GRID_WAVE_EASE',
        'METABALL_GRID_FLIP_WINDOW_JITTER',
        'METABALL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT',
        // Grid Gradient
        'GRID_GRADIENT_ENABLED',
        'GRID_GRADIENT_SPACING_PX',
        'GRID_GRADIENT_MAX_CELLS',
        'GRID_GRADIENT_ORIGIN_MODE',
        'GRID_GRADIENT_DISTRIBUTION',
        'GRID_GRADIENT_POSITION_JITTER',
        'GRID_GRADIENT_CENTER_SIZE_PX',
        'GRID_GRADIENT_EDGE_SIZE_PX',
        'GRID_GRADIENT_CURVE_POWER',
        'GRID_GRADIENT_BORDER_OFFSET_PX',
        'GRID_GRADIENT_CELL_SHAPE',
        'GRID_GRADIENT_VECTOR_BORDERS_ENABLED',
        'GRID_GRADIENT_BORDER_DOTS_ENABLED',
        'GRID_GRADIENT_BORDER_DOT_SIZE_PX',
        'GRID_GRADIENT_BORDER_DOT_STYLE',
    ],


/* ==========================================================================
SECTION 31: Territory config fingerprint includes Grid Gradient keys
LAYER: settings/config
SOURCE: pax-fluxia\src\lib\territory\buildTerritoryConfigFingerprint.ts:1-35
GREP: GRID_GRADIENT_
========================================================================== */
const TERRITORY_CONFIG_PREFIXES = [
    'TERRITORY_',
    'PERIMETER_FIELD_',
    'METABALL_',
    'GRID_GRADIENT_',
    'VORONOI_',
    'MODIFIED_VORONOI_',
    'DF_',
] as const;

const TERRITORY_CONFIG_EXACT_KEYS = new Set([
    'FRONTIER_RESOLUTION',
    'CHAIKIN_BOUNDARY_PAD',
    'CHAIKIN_BOUNDARY_EPS',
    'MIN_COLOR_LIGHTNESS',
]);

function isTerritoryFingerprintKey(key: string): boolean {
    if (TERRITORY_CONFIG_EXACT_KEYS.has(key)) return true;
    return TERRITORY_CONFIG_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function buildTerritoryConfigFingerprint(
    config: Record<string, unknown>,
    runtime?: {
        geometryRefreshToken?: unknown;
        visualEpoch?: unknown;
    },
): string {
    const parts = Object.keys(config)
        .filter((key) => isTerritoryFingerprintKey(key))
        .sort()
        .map((key) => `${key}=${JSON.stringify(config[key])}`);

    if (runtime && 'geometryRefreshToken' in runtime) {

/* ==========================================================================
SECTION 32: Topbar shortcut option and config write
LAYER: ui/shortcut
SOURCE: pax-fluxia\src\lib\territory\ui\territoryModeShortcuts.ts:1-145
GREP: grid_gradient shortcut
========================================================================== */
import { GAME_CONFIG } from '$lib/config/game.config';
import {
    loadPanelSettings,
    panelDefaultsFromConfig,
    savePanelSettings,
} from '$lib/components/ui/panelSync';
import { setSettingsFromConfigPatch } from '$lib/components/ui/settingsState';
import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';

import {
    resolveTerritoryRenderModeOptions,
    type ResolvedTerritoryRenderModeOption,
} from './territoryRenderModeCatalog';

export type TerritoryModeShortcutAppearance =
    | 'pvv4'
    | 'perimeter'
    | 'metaball'
    | 'grid'
    | 'phase_edges'
    | 'ember'
    | 'phase_field'
    | 'grid_gradient';

export type TerritoryModeShortcutOption = ResolvedTerritoryRenderModeOption & {
    shortLabel: string;
    appearance: TerritoryModeShortcutAppearance;
    displayLabel: string;
};

const TOPBAR_MODE_DEFS: ReadonlyArray<{
    id: string;
    shortLabel: string;
    displayLabel: string;
    appearance: TerritoryModeShortcutAppearance;
}> = [
    {
        id: 'power_voronoi_runtime',
        shortLabel: 'PVV4',
        displayLabel: 'Power Voronoi',
        appearance: 'pvv4',
    },
    {
        id: 'perimeter_field',
        shortLabel: 'Perimeter',
        displayLabel: 'Perimeter',
        appearance: 'perimeter',
    },
    {
        id: 'metaball',
        shortLabel: 'Metaball',
        displayLabel: 'Metaball',
        appearance: 'metaball',
    },
    {
        id: 'metaball_grid',
        shortLabel: 'Grid',
        displayLabel: 'Metaball Grid',
        appearance: 'grid',
    },
    {
        id: 'metaball_grid_phase_edges',
        shortLabel: 'Edges',
        displayLabel: 'Phase Edges',
        appearance: 'phase_edges',
    },
    {
        id: 'metaball_grid_ember_lattice',
        shortLabel: 'Ember',
        displayLabel: 'Ember Lattice',
        appearance: 'ember',
    },
    {
        id: 'metaball_grid_phase_field',
        shortLabel: 'Field',
        displayLabel: 'Phase Field',
        appearance: 'phase_field',
    },
    {
        id: 'grid_gradient',
        shortLabel: 'Grad',
        displayLabel: 'Grid Gradient',
        appearance: 'grid_gradient',
    },
];

const STYLE_TO_BOOLEAN: Record<string, string> = {
    vs_pvv3: 'territoryPVV3',
    power_voronoi: 'territoryPowerVoronoi',
    modified_voronoi: 'territoryModifiedVoronoi',
    distance_field: 'territoryDistanceField',
    voronoi: 'territoryVoronoi',
    metaball: 'territoryMetaball',
    pixel: 'territoryPixel',
    graph: 'territoryGraph',
    contour: 'territoryContour',
    territory_engine: 'territoryEngine',
};

export function getTopbarTerritoryModeOptions(): TerritoryModeShortcutOption[] {
    const catalogById = new Map(
        resolveTerritoryRenderModeOptions().map((option) => [option.id, option] as const),
    );

    return TOPBAR_MODE_DEFS.flatMap((def) => {
        const option = catalogById.get(def.id);
        if (!option || !option.selectable) return [];
        return [
            {
                ...option,
                label: def.displayLabel,
                shortLabel: def.shortLabel,
                displayLabel: def.displayLabel,
                appearance: def.appearance,
            },
        ];
    });
}

function resolveActiveFillTransitionMode(panel: Record<string, any>): string {
    return (
        panel.territoryFillTransitionMode ??
        panel.territoryFillTransition ??
        GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
        GAME_CONFIG.TERRITORY_FILL_MODE ??
        'active_front'
    );
}

export function applyTopbarTerritoryModeShortcut(modeId: string): void {
    let panel = loadPanelSettings(panelDefaultsFromConfig());
    const configPatch: Record<string, unknown> = {
        TERRITORY_RENDER_MODE: modeId,
    };

    if (modeId === 'power_voronoi_runtime') {
        configPatch.TERRITORY_FILL_TRANSITION_MODE = 'pv_frontline';
        configPatch.TERRITORY_BORDER_TRANSITION_MODE = 'off';
        configPatch.TERRITORY_BORDER_TRANSITION = 'none';
    } else if (resolveActiveFillTransitionMode(panel) === 'pv_frontline') {
        configPatch.TERRITORY_FILL_TRANSITION_MODE = 'active_front';
    }

    panel = setSettingsFromConfigPatch(panel, configPatch, savePanelSettings);


/* ==========================================================================
SECTION 33: GameCanvas imports for Grid Gradient and family helpers
LAYER: runtime/dispatch
SOURCE: pax-fluxia\src\lib\components\game\GameCanvas.svelte:108-155
GREP: imports
========================================================================== */
        registerRenderFamily,
        disposeAllRenderFamilies,
    } from "$lib/territory/families/renderFamilyRegistry";
    import { MetaballFamily, createMetaballFamily } from "$lib/territory/families/metaball/MetaballFamily";
    import {
        MetaballGridFamily,
        createMetaballGridFamily,
    } from "$lib/territory/families/metaballGrid/MetaballGridFamily";
    import {
        MetaballGridPhaseEdgesFamily,
        createMetaballGridPhaseEdgesFamily,
        createMetaballGridEmberLatticeFamily,
    } from "$lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily";
    import {
        MetaballGridPhaseFieldFamily,
        createMetaballGridPhaseFieldFamily,
    } from "$lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily";
    import {
        metaballGridPhaseEdgesGeometryDefaults,
        metaballGridPhaseEdgesModeDefaults,
        metaballGridPhaseFieldGeometryDefaults,
        metaballGridPhaseFieldModeDefaults,
    } from "$lib/territory/families/metaballGrid/config";
    import { updateMetaballGridStats } from "$lib/territory/families/metaballGrid/metaballGridStats";
    import {
        GridGradientFamily,
        createGridGradientFamily,
    } from "$lib/territory/families/gridGradient/GridGradientFamily";
    import { PerimeterFieldFamily, createPerimeterFieldFamily } from "$lib/territory/families/perimeterField/PerimeterFieldFamily";
    import type { PerimeterFieldDebugSnapshot } from "$lib/territory/families/perimeterField/buildPerimeterFieldScene";
    import { compactPerimeterFieldDebugSnapshot } from "$lib/territory/families/perimeterField/perimeterFieldDiagnostics";
    import {
        resetPerimeterFieldDebugPlaybackState,
        setPerimeterFieldDebugPlaybackState,
    } from "$lib/territory/families/perimeterField/perimeterFieldDebugPlaybackStore";
    import { buildRenderFamilyInput } from "$lib/territory/families/buildRenderFamilyInput";
    import {
        buildPerimeterFieldRenderFamilyGeometry,
        buildOwnershipSnapshotFromStars,
    } from "$lib/territory/families/buildFamilyGeometry";
    import type {
        RenderFamilyActiveTransition,
        RenderFamilyTransitionSession,
    } from "$lib/territory/families/RenderFamilyTypes";
    import { buildRenderFamilyTransitionLifecycle } from "$lib/territory/transitions/renderFamilyTransitionLifecycle";
    import { getTerritoryVisualEpoch } from "$lib/territory/bumpTerritoryVisualConfig";
    import { resolveTerritoryArchitectureRoute } from "$lib/territory/integration/TerritoryArchitectureRouter";
    import {

/* ==========================================================================
SECTION 34: GameCanvas mode support and debug routing helpers
LAYER: runtime/dispatch
SOURCE: pax-fluxia\src\lib\components\game\GameCanvas.svelte:1838-2035
GREP: transition/input helpers
========================================================================== */
    function transitionIdentityKey(
        conquest: import("@pax/common").ConquestEvent,
    ): string {
        return [
            conquest.tick,
            conquest.starId,
            conquest.previousOwner,
            conquest.newOwner,
        ].join(":");
    }

    function buildTerritoryPresentationRequestSignature(params: {
        activeMode: string;
        isPaused: boolean;
        currentTick: number | null | undefined;
        territoryConfigFp: string;
        territoryPresentationFrameKey: string;
        pendingConquests: ReadonlyArray<import("@pax/common").ConquestEvent>;
        transitionPresentationSignature: string;
    }): string {
        const pendingConquestSig =
            params.pendingConquests.length > 0
                ? params.pendingConquests
                      .map((conquest) => transitionIdentityKey(conquest))
                      .sort()
                      .join("|")
                : "";
        return [
            params.activeMode,
            params.isPaused ? 1 : 0,
            params.currentTick ?? -1,
            pendingConquestSig,
            params.transitionPresentationSignature,
            params.territoryPresentationFrameKey,
            params.territoryConfigFp,
        ].join("::");
    }

    function buildRenderFamilyTransitionState(
        transitionNowMs: number,
        effectiveTickMs: number,
        pendingConquests: ReadonlyArray<import("@pax/common").ConquestEvent> = [],
    ): {
        activeTransition: RenderFamilyActiveTransition | null;
        activeSessions: readonly RenderFamilyTransitionSession[];
        transitionPresentationSignature: string;
    } {
        const lifecycle = buildRenderFamilyTransitionLifecycle({
            nowMs: transitionNowMs,
            effectiveTickMs,
            activeEntries: territoryTransitions.getActiveEntries(),
            pendingConquests,
        });
        if (lifecycle.terminalFrameStarIds.length > 0) {
            territoryTransitions.markTerminalFrameRendered(
                lifecycle.terminalFrameStarIds,
            );
        }
        const activeTransition = lifecycle.activeTransition;
        if (!activeTransition) {
            return {
                activeTransition: null,
                activeSessions: lifecycle.activeSessions,
                transitionPresentationSignature: "",
            };
        }
        const frameSlot = Math.max(
            0,
            Math.floor(
                Math.max(0, transitionNowMs - activeTransition.startedAtMs) /
                    CONQUEST_PRESENT_TARGET_FRAME_MS,
            ),
        );
        const transitionPresentationSignature = [
            activeTransition.events
                .map((entry) =>
                    [
                        transitionIdentityKey(entry.event),
                        Math.max(1, Math.round(entry.durationMs)),
                    ].join("@"),
                )
                .sort()
                .join("|"),
            frameSlot,
        ].join("::");
        return {
            activeTransition,
            activeSessions: lifecycle.activeSessions,
            transitionPresentationSignature,
        };
    }

    function buildEdgeForwardRenderFamilyConfigSource(): Record<string, unknown> {
        return {
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
            ...metaballGridPhaseEdgesGeometryDefaults,
            ...metaballGridPhaseEdgesModeDefaults,
        };
    }

    function buildPhaseFieldRenderFamilyConfigSource(): Record<string, unknown> {
        return {
            ...metaballGridPhaseFieldGeometryDefaults,
            ...metaballGridPhaseFieldModeDefaults,
            ...(GAME_CONFIG as unknown as Record<string, unknown>),
        };
    }

    function getRenderFamilyModeConfigSource(
        mode: string,
    ): Record<string, unknown> | undefined {
        if (mode === "metaball_grid_phase_edges") {
            return buildEdgeForwardRenderFamilyConfigSource();
        }
        if (mode === "metaball_grid_ember_lattice") {
            return buildEdgeForwardRenderFamilyConfigSource();
        }
        if (mode === "metaball_grid_phase_field") {
            return buildPhaseFieldRenderFamilyConfigSource();
        }
        return undefined;
    }

    function modeUsesSharedRenderFamilyGeometry(mode: string): boolean {
        return (
            mode === "perimeter_field" ||
            mode === "metaball" ||
            mode === "metaball_grid" ||
            mode === "metaball_grid_phase_edges" ||
            mode === "metaball_grid_ember_lattice" ||
            mode === "metaball_grid_phase_field" ||
            mode === "grid_gradient"
        );
    }

    function updateLiveMetaballGridTransitionDiagnostics(params: {
        activeTransition: RenderFamilyActiveTransition | null;
        effectiveTickMs: number;
    }): void {
        const activeEntries = territoryTransitions.getActiveEntries();
        const latestEntry =
            activeEntries.length > 0
                ? [...activeEntries].sort((a, b) => {
                      if (a.startTimeMs !== b.startTimeMs) {
                          return b.startTimeMs - a.startTimeMs;
                      }
                      return b.starId.localeCompare(a.starId);
                  })[0]!
                : null;
        updateMetaballGridStats({
            configuredTransitionMs:
                GAME_CONFIG.TERRITORY_TRANSITION_MS ?? null,
            bindTransitionToTick:
                GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ?? false,
            effectiveTickMs: params.effectiveTickMs,
            latestEntryDurationMs: latestEntry?.durationMs ?? null,
            latestEntryStartedAtMs: latestEntry?.startTimeMs ?? null,
            activeTransitionDurationMs:
                params.activeTransition?.durationMs ?? null,
            activeTransitionStartedAtMs:
                params.activeTransition?.startedAtMs ?? null,
        });
    }

    function buildRenderFamilyOwnershipSnapshot(
        stars: ReadonlyArray<StarState>,
        activeTransition: RenderFamilyActiveTransition | null,
    ): OwnershipSnapshot {
        const starOwners = new Map<string, string>();
        for (const star of stars) {
            if (star.ownerId) {
                starOwners.set(star.id, star.ownerId);
            }
        }

        const snapshot = {
            version: "render-family-live",
            starOwners,
            contestedLaneIds: [],
            conquestEvents:
                activeTransition?.events.map((entry) => ({
                    starId: entry.event.starId,
                    previousOwner: entry.event.previousOwner,
                    newOwner: entry.event.newOwner,
                    atMs: entry.startedAtMs,
                })) ?? [],
            virtualStars: [],
        };
        logPipelineStage({
            channel: "state",
            context: "GameCanvas",
            stage: "ownership_snapshot",
            from: "Active stars + transition overlay",
            to: "Render-family ownership snapshot",
            purpose: "Provide ownership state for family geometry and scene builders",
            summary:
                `${summarizeStars(stars)} ${summarizeOwnership(snapshot)}`,
            perfEventName: "game.renderFrame.ownershipSnapshot",

/* ==========================================================================
SECTION 35: GameCanvas shared family geometry cache and prev-frame capture
LAYER: runtime/geometry
SOURCE: pax-fluxia\src\lib\components\game\GameCanvas.svelte:2614-2845
GREP: getCurrentRenderFamilyGeometry, prevGeometry
========================================================================== */
    function resolveActiveTerritoryMode(): string {
        let activeMode = GAME_CONFIG.TERRITORY_RENDER_MODE;
        if (!activeMode) {
            if (GAME_CONFIG.TERRITORY_PVV3) activeMode = "vs_pvv3";
            else if (GAME_CONFIG.TERRITORY_POWER_VORONOI)
                activeMode = "power_voronoi";
            else if (GAME_CONFIG.TERRITORY_DISTANCE_FIELD)
                activeMode = "distance_field";
            else if (GAME_CONFIG.TERRITORY_VORONOI) activeMode = "voronoi";
            else if (GAME_CONFIG.TERRITORY_METABALL) activeMode = "metaball";
            else if (GAME_CONFIG.TERRITORY_PIXEL) activeMode = "pixel";
            else if (GAME_CONFIG.TERRITORY_GRAPH) activeMode = "graph";
            else if (GAME_CONFIG.TERRITORY_CONTOUR) activeMode = "contour";
            else if (GAME_CONFIG.TERRITORY_ENGINE_ENABLED)
                activeMode = "territory_engine";
        }
        return activeMode ?? "none";
    }

    // â”€â”€ Runtime territory instances (class-encapsulated, no module-level state) â”€
    let runtimeBridge: GameCanvasBridge | null = null;
    let runtimeBridgeFallbackLogged = false;
    let runtimeController: TerritoryEngineController | null = null;
    let runtimeControllerTransitionDurationMs: number | null = null;
    let runtimeRenderer: TerritoryRenderer | null = null;
    let renderFamilyGeometryCacheKey: string | null = null;
    let renderFamilyGeometryCache: ResolvedGeometrySnapshot | null = null;
    let renderFamilyStableGeometryKey: string | null = null;
    let renderFamilyStableGeometry: ResolvedGeometrySnapshot | null = null;
    let renderFamilyStableOwnership: OwnershipSnapshot | null = null;
    let transitionDiagnosticPrevKey: string | null = null;
    let transitionDiagnosticPrevGeometry: ResolvedGeometrySnapshot | null =
        null;
    let transitionDiagnosticPrevOwnership: OwnershipSnapshot | null = null;

    function buildRuntimeBridgeInput(
        stars: StarState[],
        runtimeSettings: ReturnType<typeof readTerritoryRuntimeSettings>,
        activeMode: string,
        worldWidth: number = GAME_WIDTH,
        worldHeight: number = GAME_HEIGHT,
    ): TerritoryFrameInput {
        const selection: TerritoryModeSelection =
            activeMode === "power_voronoi_runtime"
                ? {
                      ownershipMode: "star_ownership_snapshot",
                      geometryMode: "resolved_power_voronoi",
                      fillTransitionMode: "pv_frontline",
                      borderTransitionMode: "off",
                      styleMode: "vector",
                  }
                : runtimeSettings.selection;
        return {
            tickId: activeGameStore.currentTick ?? 0,
            nowMs: fxOrchestrator.gameTime,
            stars,
            lanes: activeGameStore.connections as StarConnection[],
            players:
                activeGameStore.players?.map((player: { id: string }) => ({
                    id: player.id,
                })) ?? [],
            world: {
                width: worldWidth,
                height: worldHeight,
            },
            selection,
            tunables: runtimeSettings.tunables,
        };
    }

    function buildRenderFamilyGeometryCacheKey(
        stars: ReadonlyArray<StarState>,
        lanes: ReadonlyArray<StarConnection>,
        configSource?: Record<string, unknown>,
    ): string {
        const source =
            configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>);
        const geometryTunables =
            readNormalizedTerritoryGeometryTunables(source);
        let key = `${getTerritoryVisualEpoch()}:${GAME_WIDTH}:${GAME_HEIGHT}:`;
        key += `${source.PERIMETER_FIELD_GEOMETRY_SOURCE}:${source.TERRITORY_GEOMETRY_MODE ?? ""}:`;
        key += `${source.TERRITORY_ENGINE_METHOD ?? ""}:${(source as any).__GEOMETRY_REFRESH_TOKEN ?? 0}:`;
        key += `${buildTerritoryGeometryCacheKeyParts(geometryTunables).join(":")}:`;
        for (const star of stars) {
            key += `${star.id}:${star.ownerId ?? ""}:${star.x}:${star.y}|`;
        }
        key += "::";
        for (const lane of lanes) {
            key += `${lane.sourceId}->${lane.targetId}|`;
        }
        return key;
    }

    function getCurrentRenderFamilyGeometry(
        stars: ReadonlyArray<StarState>,
        lanes: ReadonlyArray<StarConnection>,
        configSource?: Record<string, unknown>,
    ): ResolvedGeometrySnapshot {
        const source =
            configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>);
        const key = buildRenderFamilyGeometryCacheKey(stars, lanes, source);
        if (renderFamilyGeometryCacheKey !== key || !renderFamilyGeometryCache) {
            renderFamilyGeometryCache = buildPerimeterFieldRenderFamilyGeometry({
                stars,
                lanes,
                worldWidth: GAME_WIDTH,
                worldHeight: GAME_HEIGHT,
                nowMs: fxOrchestrator.gameTime,
                ownership: buildOwnershipSnapshotFromStars(stars),
                geometrySource:
                    (source.PERIMETER_FIELD_GEOMETRY_SOURCE as string | null | undefined) ??
                    "power_voronoi_0319",
                configSource: source,
            });
            renderFamilyGeometryCacheKey = key;
            logPipelineStage({
                channel: "renderer",
                context: "GameCanvas",
                stage: "geometry_cache_refresh",
                from: "Stars + lane topology",
                to: "Cached render-family geometry",
                purpose: "Refresh geometry only when world topology or ownership changes",
                summary:
                    `${summarizeStars(stars)} ${summarizeConnections(lanes)} ` +
                    summarizeGeometry(renderFamilyGeometryCache),
                perfEventName: "game.renderFrame.geometryCacheRefresh",
            });
        }
        return renderFamilyGeometryCache;
    }

    // Cache the last presented authoritative render-family frame so a new
    // conquest can diff against what was just on screen instead of falling back
    // to the last fully idle frame.
    function syncLiveRenderFamilyStableFrame(params: {
        activeTransition: RenderFamilyActiveTransition | null;
        stars: ReadonlyArray<StarState>;
        lanes: ReadonlyArray<StarConnection>;
        geometry: ResolvedGeometrySnapshot;
        configSource?: Record<string, unknown> | null;
        freezeDuringActiveTransition?: boolean;
    }): void {
        if (params.freezeDuringActiveTransition && params.activeTransition) {
            return;
        }
        const key = buildRenderFamilyGeometryCacheKey(
            params.stars,
            params.lanes,
            params.configSource ?? undefined,
        );
        if (
            renderFamilyStableGeometryKey === key &&
            renderFamilyStableGeometry === params.geometry &&
            renderFamilyStableOwnership
        ) {
            return;
        }
        renderFamilyStableGeometryKey = key;
        renderFamilyStableGeometry = params.geometry;
        renderFamilyStableOwnership = buildOwnershipSnapshotFromStars(
            params.stars,
        );
    }

    function revertStarsForTransitionDiagnostic(
        activeTransition: RenderFamilyActiveTransition,
        stars: ReadonlyArray<StarState>,
    ): StarState[] {
        const overrides = new Map<string, string>();
        for (const entry of activeTransition.events) {
            overrides.set(entry.event.starId, entry.event.previousOwner);
        }
        return stars.map((star) => {
            const ownerId = overrides.get(star.id);
            return ownerId === undefined ? { ...star } : { ...star, ownerId };
        });
    }

    function getTransitionDiagnosticPrevFrame(params: {
        activeMode: string;
        activeTransition: RenderFamilyActiveTransition | null;
        stars: ReadonlyArray<StarState>;
        lanes: ReadonlyArray<StarConnection>;
    }):
        | {
              key: string;
              geometry: ResolvedGeometrySnapshot;
              ownership: OwnershipSnapshot;
          }
        | null {
        const key = buildTransitionDiagnosticCaptureKey(
            params.activeTransition,
        );
        if (!key || !params.activeTransition) {
            transitionDiagnosticPrevKey = null;
            transitionDiagnosticPrevGeometry = null;
            transitionDiagnosticPrevOwnership = null;
            return null;
        }
        if (
            transitionDiagnosticPrevKey !== key ||
            !transitionDiagnosticPrevGeometry ||
            !transitionDiagnosticPrevOwnership
        ) {
            if (renderFamilyStableGeometry && renderFamilyStableOwnership) {
                transitionDiagnosticPrevKey = key;
                transitionDiagnosticPrevGeometry = renderFamilyStableGeometry;
                transitionDiagnosticPrevOwnership = renderFamilyStableOwnership;
                recordPerfEvent("territory.renderFamily.prevFrame", {
                    source: "presented_frame_cache",
                    transitionKey: key,
                    geometryVersion: renderFamilyStableGeometry.version,
                    ownershipVersion: renderFamilyStableOwnership.version,
                });
            } else {
                const revertedStars = revertStarsForTransitionDiagnostic(
                    params.activeTransition,
                    params.stars,
                );
                const ownership = buildOwnershipSnapshotFromStars(revertedStars);
                const configSource = getRenderFamilyModeConfigSource(
                    params.activeMode,
                );
                const geometry = measurePerf(
                    "game.renderFrame.tickEvents.capture.prevGeometry",
                    () =>
                        buildPerimeterFieldRenderFamilyGeometry({
                            stars: revertedStars,
                            lanes: params.lanes,
                            worldWidth: GAME_WIDTH,

/* ==========================================================================
SECTION 36: GameCanvas territory dispatch and Grid Gradient update call
LAYER: runtime/dispatch
SOURCE: pax-fluxia\src\lib\components\game\GameCanvas.svelte:5380-6120
GREP: case grid_gradient, gg.update
========================================================================== */
            const containerPosPreSwitchX = activeVoronoiContainer.x;
            const containerPosPreSwitchY = activeVoronoiContainer.y;
            activeVoronoiContainer.x = territoryPresentationFrame.minX;
            activeVoronoiContainer.y = territoryPresentationFrame.minY;
            for (const child of activeVoronoiContainer.children) {
                child.visible = false;
            }

            // Rendering is controlled by the Style dropdown (TERRITORY_RENDER_MODE).
            // FG2 geometry runs inside each style case via runFG2DataPipeline(),
            // which also populates trace data for the Trace Inspector.
            {
                // Resolve active render mode â€” check new enum first, fall back to old booleans
                const activeMode = activeTerritoryMode;
                const activeModeNeedsGeometry =
                    activeMode === "metaball" ||
                    activeMode === "metaball_grid" ||
                    activeMode === "metaball_grid_phase_edges" ||
                    activeMode === "metaball_grid_ember_lattice" ||
                    activeMode === "metaball_grid_phase_field" ||
                    activeMode === "grid_gradient" ||
                    activeMode === "perimeter_field";
                let geometryReady: boolean | null = activeModeNeedsGeometry
                    ? false
                    : null;
                let lastRenderFailure: string | null = null;
                const lanes = activeGameStore.connections as StarConnection[];
                const renderFamilyConfigSource =
                    getRenderFamilyModeConfigSource(activeMode);
                const activeRenderFamilyTransition =
                    renderFamilyTransitionState.activeTransition;
                const readFamilyGeometry = (): ResolvedGeometrySnapshot => {
                    const geometry = measurePerf(
                        `game.renderFrame.geometry.${activeMode}`,
                        () =>
                            getCurrentRenderFamilyGeometry(
                                stars,
                                lanes,
                                renderFamilyConfigSource,
                            ),
                    );
                    geometryReady = true;
                    return geometry;
                };
                let transitionDiagnosticFrameInput:
                    | TransitionDiagnosticFrameInput
                    | null = null;
                const transitionDiagnosticCaptureEnabled =
                    transitionSnapshotRecorder.isEnabled();

                // One-shot diagnostic: which render mode is active?
                if (!(globalThis as any).__RENDER_MODE_LOGGED) {
                    log.state(
                        "GameCanvas",
                        `territory style dispatch renderMode="${GAME_CONFIG.TERRITORY_RENDER_MODE}" activeMode="${activeMode}"`,
                    );
                    (globalThis as any).__RENDER_MODE_LOGGED = true;
                }

                const metaballFamily = getRenderFamily("metaball");
                if (
                    activeMode !== "metaball" &&
                    metaballFamily instanceof MetaballFamily &&
                    metaballFamily.displayRoot.parent === activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        metaballFamily.displayRoot,
                    );
                }
                const perimeterFieldFamily =
                    getRenderFamily("perimeter_field");
                if (
                    activeMode !== "perimeter_field" &&
                    perimeterFieldFamily instanceof PerimeterFieldFamily &&
                    perimeterFieldFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        perimeterFieldFamily.displayRoot,
                    );
                }
                const metaballGridFamily =
                    getRenderFamily("metaball_grid");
                if (
                    activeMode !== "metaball_grid" &&
                    metaballGridFamily instanceof MetaballGridFamily &&
                    metaballGridFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        metaballGridFamily.displayRoot,
                    );
                }
                const metaballGridPhaseEdgesFamily =
                    getRenderFamily("metaball_grid_phase_edges");
                if (
                    activeMode !== "metaball_grid_phase_edges" &&
                    metaballGridPhaseEdgesFamily instanceof
                        MetaballGridPhaseEdgesFamily &&
                    metaballGridPhaseEdgesFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        metaballGridPhaseEdgesFamily.displayRoot,
                    );
                }
                const emberLatticeFamily = getRenderFamily(
                    "metaball_grid_ember_lattice",
                );
                if (
                    activeMode !== "metaball_grid_ember_lattice" &&
                    emberLatticeFamily instanceof MetaballGridPhaseEdgesFamily &&
                    emberLatticeFamily.displayRoot.parent === activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        emberLatticeFamily.displayRoot,
                    );
                }
                const metaballGridPhaseFieldFamily =
                    getRenderFamily("metaball_grid_phase_field");
                if (
                    activeMode !== "metaball_grid_phase_field" &&
                    metaballGridPhaseFieldFamily instanceof
                        MetaballGridPhaseFieldFamily &&
                    metaballGridPhaseFieldFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        metaballGridPhaseFieldFamily.displayRoot,
                    );
                }
                const gridGradientFamily = getRenderFamily("grid_gradient");
                if (
                    activeMode !== "grid_gradient" &&
                    gridGradientFamily instanceof GridGradientFamily &&
                    gridGradientFamily.displayRoot.parent ===
                        activeVoronoiContainer
                ) {
                    activeVoronoiContainer.removeChild(
                        gridGradientFamily.displayRoot,
                    );
                }

                switch (activeMode) {
                    case "territory_engine":
                        renderTerritoryEngine({
                            stars: territoryPresentationStars,
                            container: activeVoronoiContainer,
                            colorUtils,
                            worldWidth: territoryPresentationWorldWidth,
                            worldHeight: territoryPresentationWorldHeight,
                            connections:
                                activeGameStore.connections as StarConnection[],
                            renderer: app?.renderer ?? undefined,
                            gameNowMs: fxOrchestrator.gameTime,
                        });
                        break;
                    case "vs_pvv3": {
                        const activeTransition = activeRenderFamilyTransition;
                        const pvv3Invalidation = inspectPVV3Invalidation(stars);
                        const fg2Artifacts = pvv3Invalidation.shapeChanged
                            ? measurePerf(
                                  "game.renderFrame.fg2DataPipeline.vs_pvv3",
                                  () =>
                                      runFG2DataPipeline({
                                          stars: territoryPresentationStars,
                                           container: activeVoronoiContainer,
                                          colorUtils,
                                          worldWidth: territoryPresentationWorldWidth,
                                          worldHeight: territoryPresentationWorldHeight,
                                          connections:
                                              activeGameStore.connections as StarConnection[],
                                          gameNowMs: fxOrchestrator.gameTime,
                                      }),
                              )
                            : null;
                        renderPVV3Module(
                            territoryPresentationStars,
                            activeVoronoiContainer,
                            colorUtils,
                            territoryPresentationWorldWidth,
                            territoryPresentationWorldHeight,
                            activeGameStore.connections as StarConnection[],
                            fg2Artifacts
                                ? extractTerritoryRenderData(fg2Artifacts)
                                : undefined,
                            pvv3Invalidation,
                        );
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                            };
                        }
                        break;
                    }
                    case "power_voronoi": {
                        const fg2ArtifactsPV = measurePerf(
                            "game.renderFrame.fg2DataPipeline.power_voronoi",
                            () =>
                                runFG2DataPipeline({
                                    stars: territoryPresentationStars,
                                    container: activeVoronoiContainer,
                                    colorUtils,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    connections:
                                        activeGameStore.connections as StarConnection[],
                                    gameNowMs: fxOrchestrator.gameTime,
                                }),
                        );
                        renderPowerVoronoiModule(
                            territoryPresentationStars,
                            activeVoronoiContainer,
                            colorUtils,
                            territoryPresentationWorldWidth,
                            territoryPresentationWorldHeight,
                            activeGameStore.connections as StarConnection[],
                            extractTerritoryRenderData(fg2ArtifactsPV),
                        );
                        break;
                    }
                    case "distance_field":
                        renderDistanceFieldTerritoryModule(
                            territoryPresentationStars,
                            activeVoronoiContainer,
                            colorUtils,
                            territoryPresentationWorldWidth,
                            territoryPresentationWorldHeight,
                            activeGameStore.connections as StarConnection[],
                            app?.renderer ?? undefined,
                        );
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition: activeRenderFamilyTransition,
                                stars,
                                lanes,
                            };
                        }
                        break;
                    case "modified_voronoi":
                        renderModifiedVoronoiModule(
                            territoryPresentationStars,
                            activeVoronoiContainer,
                            colorUtils,
                            territoryPresentationWorldWidth,
                            territoryPresentationWorldHeight,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "pvv2_dy4":
                        renderPVV2DY4Module(
                            territoryPresentationStars,
                            activeVoronoiContainer,
                            colorUtils,
                            territoryPresentationWorldWidth,
                            territoryPresentationWorldHeight,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "voronoi":
                        renderVoronoiModule(
                            territoryPresentationStars,
                            activeVoronoiContainer,
                            colorUtils,
                            territoryPresentationWorldWidth,
                            territoryPresentationWorldHeight,
                            activeGameStore.connections as StarConnection[],
                        );
                        break;
                    case "metaball": {
                        let fam = getRenderFamily("metaball");
                        if (!fam) {
                            registerRenderFamily(
                                createMetaballFamily(colorUtils),
                            );
                            fam = getRenderFamily("metaball")!;
                        }
                        const mf = fam as MetaballFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.metaball",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    territoryPresentationStars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            transitionDiagnosticCaptureEnabled
                                ? getTransitionDiagnosticPrevFrame({
                                      activeMode,
                                      activeTransition,
                                      stars,
                                      lanes,
                                  })
                                : null;
                        const mfInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.metaball",
                            () =>
                                buildRenderFamilyInput({
                                    stars: territoryPresentationStars,
                                    lanes,
                                    worldMinX: territoryPresentationFrame.minX,
                                    worldMinY: territoryPresentationFrame.minY,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry:
                                        localizePresentationGeometry(geometry),
                                    prevGeometry: localizePresentationGeometry(
                                        diagnosticPrevFrame?.geometry ?? null,
                                    ),
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mf.tunableKeys,
                                }),
                        );
                        mf.update(mfInput);
                        if (mf.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mf.displayRoot);
                        }
                        mf.displayRoot.visible = true;
                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                        });
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                                geometry,
                                ownership,
                            };
                        }
                        break;
                    }
                    case "metaball_grid": {
                        let fam = getRenderFamily("metaball_grid");
                        if (!fam) {
                            registerRenderFamily(
                                createMetaballGridFamily(colorUtils),
                            );
                            fam = getRenderFamily("metaball_grid")!;
                        }
                        const mg = fam as MetaballGridFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.metaball_grid",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    territoryPresentationStars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            transitionDiagnosticCaptureEnabled
                                ? getTransitionDiagnosticPrevFrame({
                                      activeMode,
                                      activeTransition,
                                      stars,
                                      lanes,
                                  })
                                : null;
                        const mgInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.metaball_grid",
                            () =>
                                buildRenderFamilyInput({
                                    stars: territoryPresentationStars,
                                    lanes,
                                    worldMinX: territoryPresentationFrame.minX,
                                    worldMinY: territoryPresentationFrame.minY,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry:
                                        localizePresentationGeometry(geometry),
                                    prevGeometry: localizePresentationGeometry(
                                        diagnosticPrevFrame?.geometry ?? null,
                                    ),
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mg.tunableKeys,
                                }),
                        );
                        mg.update(mgInput);
                        updateLiveMetaballGridTransitionDiagnostics({
                            activeTransition,
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                        });
                        if (mg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;
                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                        });
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                                geometry,
                                ownership,
                            };
                        }
                        break;
                    }
                    case "metaball_grid_phase_edges": {
                        let fam = getRenderFamily("metaball_grid_phase_edges");
                        if (!fam) {
                            registerRenderFamily(
                                createMetaballGridPhaseEdgesFamily(colorUtils),
                            );
                            fam = getRenderFamily("metaball_grid_phase_edges")!;
                        }
                        const mg = fam as MetaballGridPhaseEdgesFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.metaball_grid_phase_edges",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    territoryPresentationStars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            transitionDiagnosticCaptureEnabled
                                ? getTransitionDiagnosticPrevFrame({
                                      activeMode,
                                      activeTransition,
                                      stars,
                                      lanes,
                                  })
                                : null;
                        const mgInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.metaball_grid_phase_edges",
                            () =>
                                buildRenderFamilyInput({
                                    stars: territoryPresentationStars,
                                    lanes,
                                    worldMinX: territoryPresentationFrame.minX,
                                    worldMinY: territoryPresentationFrame.minY,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry:
                                        localizePresentationGeometry(geometry),
                                    prevGeometry: localizePresentationGeometry(
                                        diagnosticPrevFrame?.geometry ?? null,
                                    ),
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mg.tunableKeys,
                                    configSource: renderFamilyConfigSource,
                                }),
                        );
                        mg.update(mgInput);
                        updateLiveMetaballGridTransitionDiagnostics({
                            activeTransition,
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                        });
                        if (mg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;
                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                            freezeDuringActiveTransition: true,
                        });
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                                geometry,
                                ownership,
                            };
                        }
                        break;
                    }
                    case "metaball_grid_ember_lattice": {
                        let fam = getRenderFamily("metaball_grid_ember_lattice");
                        if (!fam) {
                            registerRenderFamily(
                                createMetaballGridEmberLatticeFamily(
                                    colorUtils,
                                ),
                            );
                            fam = getRenderFamily("metaball_grid_ember_lattice")!;
                        }
                        const mg = fam as MetaballGridPhaseEdgesFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.metaball_grid_ember_lattice",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    territoryPresentationStars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            transitionDiagnosticCaptureEnabled
                                ? getTransitionDiagnosticPrevFrame({
                                      activeMode,
                                      activeTransition,
                                      stars,
                                      lanes,
                                  })
                                : null;
                        const mgInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.metaball_grid_ember_lattice",
                            () =>
                                buildRenderFamilyInput({
                                    stars: territoryPresentationStars,
                                    lanes,
                                    worldMinX: territoryPresentationFrame.minX,
                                    worldMinY: territoryPresentationFrame.minY,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry:
                                        localizePresentationGeometry(geometry),
                                    prevGeometry: localizePresentationGeometry(
                                        diagnosticPrevFrame?.geometry ?? null,
                                    ),
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mg.tunableKeys,
                                    configSource: renderFamilyConfigSource,
                                }),
                        );
                        mg.update(mgInput);
                        updateLiveMetaballGridTransitionDiagnostics({
                            activeTransition,
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                        });
                        if (mg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;
                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                            freezeDuringActiveTransition: true,
                        });
                        if (transitionDiagnosticCaptureEnabled) {
                            transitionDiagnosticFrameInput = {
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                                geometry,
                                ownership,
                            };
                        }
                        break;
                    }
                    case "metaball_grid_phase_field": {
                        activeVoronoiContainer.x = 0;
                        activeVoronoiContainer.y = 0;
                        let fam = getRenderFamily("metaball_grid_phase_field");
                        if (!fam) {
                            registerRenderFamily(
                                createMetaballGridPhaseFieldFamily(colorUtils),
                            );
                            fam = getRenderFamily("metaball_grid_phase_field")!;
                        }
                        const mg = fam as MetaballGridPhaseFieldFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.metaball_grid_phase_field",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    stars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame =
                            getTransitionDiagnosticPrevFrame({
                                activeMode,
                                activeTransition,
                                stars,
                                lanes,
                            });
                        const mgInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.metaball_grid_phase_field",
                            () =>
                                buildRenderFamilyInput({
                                    stars,
                                    lanes,
                                    worldWidth: GAME_WIDTH,
                                    worldHeight: GAME_HEIGHT,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry,
                                    prevGeometry:
                                        diagnosticPrevFrame?.geometry ?? null,
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: mg.tunableKeys,
                                    configSource: renderFamilyConfigSource,
                                }),
                        );
                        mg.update(mgInput);
                        updateLiveMetaballGridTransitionDiagnostics({
                            activeTransition,
                            effectiveTickMs: activeGameStore.effectiveTickMs,
                        });
                        if (mg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(mg.displayRoot);
                        }
                        mg.displayRoot.visible = true;
                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            configSource: renderFamilyConfigSource,
                        });
                        transitionDiagnosticFrameInput = {
                            activeMode,
                            activeTransition,
                            stars,
                            lanes,
                            geometry,
                            ownership,
                        };
                        break;
                    }
                    case "grid_gradient": {
                        let fam = getRenderFamily("grid_gradient");
                        if (!fam) {
                            registerRenderFamily(
                                createGridGradientFamily(colorUtils),
                            );
                            fam = getRenderFamily("grid_gradient")!;
                        }
                        const gg = fam as GridGradientFamily;
                        const activeTransition = activeRenderFamilyTransition;
                        const ownership = measurePerf(
                            "game.renderFrame.ownership.grid_gradient",
                            () =>
                                buildRenderFamilyOwnershipSnapshot(
                                    territoryPresentationStars,
                                    activeTransition,
                                ),
                        );
                        const geometry = readFamilyGeometry();
                        const diagnosticPrevFrame = activeTransition
                            ? getTransitionDiagnosticPrevFrame({
                                  activeMode,
                                  activeTransition,
                                  stars,
                                  lanes,
                              })
                            : null;
                        const ggInput = measurePerf(
                            "game.renderFrame.renderFamilyInput.grid_gradient",
                            () =>
                                buildRenderFamilyInput({
                                    stars: territoryPresentationStars,
                                    lanes,
                                    worldMinX: territoryPresentationFrame.minX,
                                    worldMinY: territoryPresentationFrame.minY,
                                    worldWidth: territoryPresentationWorldWidth,
                                    worldHeight: territoryPresentationWorldHeight,
                                    nowMs: fxOrchestrator.gameTime,
                                    paused: isPausedNow,
                                    gameTick: activeGameStore.currentTick,
                                    ownership,
                                    geometry:
                                        localizePresentationGeometry(geometry),
                                    prevGeometry: localizePresentationGeometry(
                                        diagnosticPrevFrame?.geometry ?? null,
                                    ),
                                    renderer: app?.renderer ?? undefined,
                                    activeTransition,
                                    transitionSessions:
                                        renderFamilyTransitionState.activeSessions,
                                    tunableKeys: gg.tunableKeys,
                                }),
                        );
                        gg.update(ggInput);
                        if (gg.displayRoot.parent !== activeVoronoiContainer) {
                            activeVoronoiContainer.addChild(gg.displayRoot);
                        }
                        gg.displayRoot.visible = true;
                        syncLiveRenderFamilyStableFrame({
                            activeTransition,
                            stars,

/* ==========================================================================
SECTION 37: Benchmark scheduler snapshot includes Grid Gradient
LAYER: diagnostics/runtime
SOURCE: pax-fluxia\src\lib\components\game\GameCanvas.svelte:6993-7052
GREP: getBenchmarkTerritorySchedulerSnapshot, gridGradientDebug
========================================================================== */
    export function getBenchmarkTerritorySchedulerSnapshot():
        | Record<string, unknown>
        | null {
        const ownerStarCounts: Record<string, number> = {};
        for (const star of activeGameStore.stars as StarState[]) {
            const ownerId = star.ownerId ?? "__unowned__";
            ownerStarCounts[ownerId] = (ownerStarCounts[ownerId] ?? 0) + 1;
        }
        const benchmarkMetaballGridMode =
            GAME_CONFIG.TERRITORY_RENDER_MODE === "metaball_grid_phase_edges" ||
            GAME_CONFIG.TERRITORY_RENDER_MODE === "metaball_grid_ember_lattice" ||
            GAME_CONFIG.TERRITORY_RENDER_MODE === "metaball_grid_phase_field"
                ? GAME_CONFIG.TERRITORY_RENDER_MODE
                : "metaball_grid";
        const metaballGridFamily = getRenderFamily(benchmarkMetaballGridMode);
        const metaballGridDebug =
            metaballGridFamily instanceof MetaballGridFamily ||
            metaballGridFamily instanceof MetaballGridPhaseEdgesFamily ||
            metaballGridFamily instanceof MetaballGridPhaseFieldFamily
                ? metaballGridFamily.getDebugSnapshot()
                : null;
        const gridGradientFamily = getRenderFamily("grid_gradient");
        const gridGradientDebug =
            gridGradientFamily instanceof GridGradientFamily
                ? gridGradientFamily.getDebugSnapshot()
                : null;
        const travelingShipsSnapshot = [...fxOrchestrator.vsm.travelingShips]
            .slice()
            .sort((a, b) => a.id - b.id)
            .slice(0, 12)
            .map((ship) => ({
                id: ship.id,
                state: ship.state,
                fromStarId: ship.fromStarId ?? null,
                toStarId: ship.toStarId ?? null,
                x: Number(ship.x.toFixed(2)),
                y: Number(ship.y.toFixed(2)),
                alpha: Number(ship.alpha.toFixed(3)),
                scale: Number(ship.scale.toFixed(3)),
                departTime: Number(ship.departTime.toFixed(2)),
                travelDuration: Number(ship.travelDuration.toFixed(2)),
                departDuration: Number(ship.departDuration.toFixed(2)),
            }));
        const travelingShipsSampleHash = travelingShipsSnapshot
            .map(
                (ship) =>
                    `${ship.id}:${ship.state}:${ship.x.toFixed(1)},${ship.y.toFixed(1)}:${ship.alpha.toFixed(2)}:${ship.scale.toFixed(2)}`,
            )
            .join("|");
        return {
            currentTick: activeGameStore.currentTick ?? null,
            localPlayerId: activeGameStore.localPlayerId ?? null,
            renderMode: GAME_CONFIG.TERRITORY_RENDER_MODE,
            ownerStarCounts,
            metaballGridDebug,
            gridGradientDebug,
            fxGameNowMs: Number(fxOrchestrator.gameTime.toFixed(2)),
            effectiveTickMs: activeGameStore.effectiveTickMs,
            tickProgress: Number(lastRenderedTickProgress.toFixed(4)),
            totalVisualShips,
