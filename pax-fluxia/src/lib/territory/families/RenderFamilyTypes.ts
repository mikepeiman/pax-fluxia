import type * as PIXI from 'pixi.js';
import type { ConquestEvent } from '@pax/common';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { TerritoryRuntimeDiagnostics } from '../contracts/DiagnosticsContracts';
import type { CanonicalGeometrySnapshot } from '../contracts/GeometryContracts';
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
    prevGeometry: CanonicalGeometrySnapshot;
    nextGeometry: CanonicalGeometrySnapshot;
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
    geometry?: CanonicalGeometrySnapshot | null;
    /**
     * Optional PREV (pre-transition) geometry snapshot, captured upstream in
     * GameCanvas once per transition key and passed to all families. Previously
     * each family rebuilt its own PREV from reverted stars inside update() —
     * duplicate work that dominated the trace at small cell spacings
     * (MG-PERF Phase C, 2026-04-19). Families may fall back to a local rebuild
     * if this is null (e.g. first frame after a hot reload).
     */
    prevGeometry?: CanonicalGeometrySnapshot | null;
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
