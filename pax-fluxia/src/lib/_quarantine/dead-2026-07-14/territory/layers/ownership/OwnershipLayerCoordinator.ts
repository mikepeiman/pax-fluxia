import type { TerritoryModeSelection } from '../../contracts/TerritoryModeSelection';
import type {
    OwnershipLayerInput,
    OwnershipSnapshot,
} from './OwnershipMode';
import { OWNERSHIP_MODE_BY_ID } from './registry';

export interface OwnershipCoordinatorInput extends OwnershipLayerInput {
    selection: TerritoryModeSelection;
}

export class OwnershipLayerCoordinator {
    compute(input: OwnershipCoordinatorInput): OwnershipSnapshot {
        const mode = OWNERSHIP_MODE_BY_ID.get(input.selection.ownershipMode);
        if (!mode) {
            throw new Error(
                `Unknown ownership mode: ${input.selection.ownershipMode}`,
            );
        }

        return mode.compute(input);
    }
}
