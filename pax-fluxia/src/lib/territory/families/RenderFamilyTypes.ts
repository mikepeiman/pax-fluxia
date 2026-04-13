import type * as PIXI from 'pixi.js';
import type { ConquestEvent } from '@pax/common';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { TerritoryRuntimeDiagnostics } from '../contracts/DiagnosticsContracts';
import type { StarState, StarConnection } from '$lib/types/game.types';

export interface RenderFamilyTransitionEvent {
    event: ConquestEvent;
    startedAtMs: number;
    durationMs: number;
    progress: number;
    rawProgress: number;
}

export interface RenderFamilyActiveTransition {
    conquestEvents: ReadonlyArray<ConquestEvent>;
    events: ReadonlyArray<RenderFamilyTransitionEvent>;
    startedAtMs: number;
    durationMs: number;
    progress: number;
    rawProgress: number;
}

export type RenderFamilyTunableValue =
    | string
    | number
    | boolean
    | null
    | undefined;

export interface RenderFamilyInput {
    ownership: OwnershipSnapshot | null;
    nowMs: number;
    /** Game tick (for combat/recency effects in renderers that opt in, e.g. Metaball borders). */
    gameTick?: number;
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    world: { width: number; height: number };
    tunables: ReadonlyMap<string, RenderFamilyTunableValue>;
    renderer?: PIXI.Renderer;
    activeTransition?: RenderFamilyActiveTransition | null;
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
