import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type {
    BorderTransitionPlan,
    FillTransitionPlan,
    TransitionSnapshot,
} from '../contracts/TransitionContracts';
import type { FrontierTransitionPlan } from '../layers/transition/planners/FrontierTopologyPlanner';

export interface TerritoryRuntimeState {
    previousOwnership: OwnershipSnapshot | null;
    previousGeometry: GeometrySnapshot | null;
    previousTransition: TransitionSnapshot | null;
    activeFillPlan: FillTransitionPlan | null;
    activeTopologyPlan: FrontierTransitionPlan | null;
}

export function createInitialTerritoryRuntimeState(): TerritoryRuntimeState {
    return {
        previousOwnership: null,
        previousGeometry: null,
        previousTransition: null,
        activeFillPlan: null,
        activeTopologyPlan: null,
    };
}

