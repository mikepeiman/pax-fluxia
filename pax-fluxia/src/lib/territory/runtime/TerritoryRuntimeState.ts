import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { FrontierTopology } from '../contracts/FrontierTopologyContracts';
import type {
    FillTransitionPlan,
    TransitionSnapshot,
} from '../contracts/TransitionContracts';
import type { ActiveFrontTransitionPlan } from '../layers/transition/ActiveFrontTransition';
import type { CanonicalPowerVoronoiTransitionRuntime } from '../pvCanonical/contracts';

export interface TerritoryRuntimeState {
    previousOwnership: OwnershipSnapshot | null;
    previousGeometry: GeometrySnapshot | null;
    previousTransition: TransitionSnapshot | null;
    activeFillPlan: FillTransitionPlan | null;
    activeFrontPlan: ActiveFrontTransitionPlan | null;
    activeCanonicalPvTransition: CanonicalPowerVoronoiTransitionRuntime | null;
    /**
     * Snapshot of the prev frontier topology at the moment a transition starts.
     * Kept alive for the duration of the transition so the sampler can look up
     * prev section IDs that no longer exist in `previousGeometry` (which is
     * overwritten every frame).
     */
    transitionPrevTopology: FrontierTopology | null;
}

export function createInitialTerritoryRuntimeState(): TerritoryRuntimeState {
    return {
        previousOwnership: null,
        previousGeometry: null,
        previousTransition: null,
        activeFillPlan: null,
        activeFrontPlan: null,
        activeCanonicalPvTransition: null,
        transitionPrevTopology: null,
    };
}

