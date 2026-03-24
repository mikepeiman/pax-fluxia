import type {
    BorderTransitionModeId,
    FillTransitionModeId,
} from './TerritoryModeSelection';
import type { GeometrySnapshot } from './GeometryContracts';
import type { OwnershipSnapshot, TerritoryConquestEvent } from './OwnershipContracts';

export interface TransitionEnvelope {
    transitionId: string;
    startedAtMs: number;
    durationMs: number;
    progress: number;
    conquestEvents: readonly TerritoryConquestEvent[];
}

/**
 * Lifecycle timing for a virtual star — managed by the transition layer.
 * The ownership layer creates virtual stars with spatial identity;
 * the transition layer controls how long they live and how their weight decays.
 */
export interface VirtualStarTransitionState {
    virtualStarId: string;
    startedAtMs: number;
    durationMs: number;
    progress: number;
    computedWeight: number;
}


export interface FillTransitionFrame {
    regions: readonly { ownerId: string; points: [number, number][] }[];
}

export interface BorderTransitionFrame {
    frontiers: readonly { ownerPairKey: string; points: [number, number][] }[];
}

export interface TransitionSnapshot {
    geometryVersion: string;
    envelope: TransitionEnvelope | null;
    fillFrame: FillTransitionFrame;
    borderFrame: BorderTransitionFrame;
}

export interface TransitionSampleContext {
    nowMs: number;
    progress: number;
}

export interface FillTransitionPlan {
    planId: string;
    sourceMode: FillTransitionModeId;
    startGeometryVersion: string;
    endGeometryVersion: string;
    conquestEvents: readonly TerritoryConquestEvent[];
}

export interface BorderTransitionPlan {
    planId: string;
    sourceMode: BorderTransitionModeId;
    startGeometryVersion: string;
    endGeometryVersion: string;
    conquestEvents: readonly TerritoryConquestEvent[];
}

export interface FillTransitionPlanInput {
    nowMs: number;
    ownership: OwnershipSnapshot;
    previousGeometry?: GeometrySnapshot | null;
    nextGeometry: GeometrySnapshot;
}

export interface BorderTransitionPlanInput {
    nowMs: number;
    ownership: OwnershipSnapshot;
    previousGeometry?: GeometrySnapshot | null;
    nextGeometry: GeometrySnapshot;
}

export interface FillTransitionMode {
    readonly id: FillTransitionModeId;
    readonly label: string;
    plan(input: FillTransitionPlanInput): FillTransitionPlan;
    sample(plan: FillTransitionPlan, ctx: TransitionSampleContext): FillTransitionFrame;
}

export interface BorderTransitionMode {
    readonly id: BorderTransitionModeId;
    readonly label: string;
    plan(input: BorderTransitionPlanInput): BorderTransitionPlan;
    sample(
        plan: BorderTransitionPlan,
        ctx: TransitionSampleContext,
    ): BorderTransitionFrame;
}
