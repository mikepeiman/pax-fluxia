import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type {
    BorderTransitionPlan,
    FillTransitionPlan,
    TransitionSnapshot,
} from '../contracts/TransitionContracts';

export interface TerritoryRuntimeState {
    previousOwnership: OwnershipSnapshot | null;
    previousGeometry: GeometrySnapshot | null;
    previousTransition: TransitionSnapshot | null;
    activeFillPlan: FillTransitionPlan | null;
    activeBorderPlan: BorderTransitionPlan | null;
}

export function createInitialTerritoryRuntimeState(): TerritoryRuntimeState {
    return {
        previousOwnership: null,
        previousGeometry: null,
        previousTransition: null,
        activeFillPlan: null,
        activeBorderPlan: null,
    };
}
