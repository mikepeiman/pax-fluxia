import type { TerritoryStyleModeId } from './TerritoryModeSelection';
import type { GeometrySnapshot } from './GeometryContracts';
import type { OwnershipSnapshot } from './OwnershipContracts';
import type { TransitionSnapshot } from './TransitionContracts';

export interface FillDrawCommand {
    ownerId: string;
    points: [number, number][];
    alpha: number;
    color?: number;
}

export interface BorderDrawCommand {
    ownerPairKey: string;
    points: [number, number][];
    width: number;
    alpha: number;
    color?: number;
}

export interface TerritoryDebugCommand {
    label: string;
    points?: [number, number][];
}

export interface TerritoryPresentationFrame {
    fills: readonly FillDrawCommand[];
    borders: readonly BorderDrawCommand[];
    debug: readonly TerritoryDebugCommand[];
}

export interface PresentationLayerInput {
    nowMs: number;
    ownership: OwnershipSnapshot;
    geometry: GeometrySnapshot;
    transition: TransitionSnapshot;
}

export interface TerritoryStyleMode {
    readonly id: TerritoryStyleModeId;
    readonly label: string;
    buildFrame(input: PresentationLayerInput): TerritoryPresentationFrame;
}
