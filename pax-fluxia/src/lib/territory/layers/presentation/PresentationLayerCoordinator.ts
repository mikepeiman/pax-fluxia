import type { TerritoryModeSelection } from '../../contracts/TerritoryModeSelection';
import type { TerritoryTunables } from '../../contracts/TerritoryFrameInput';
import type { PresentationLayerInput, TerritoryPresentationFrame } from './TerritoryStyleMode';
import { TERRITORY_STYLE_MODE_BY_ID } from './registry';

export interface PresentationCoordinatorInput extends PresentationLayerInput {
    selection: TerritoryModeSelection;
    tunables: TerritoryTunables;
}

export class PresentationLayerCoordinator {
    compute(input: PresentationCoordinatorInput): TerritoryPresentationFrame {
        const style = TERRITORY_STYLE_MODE_BY_ID.get(input.selection.styleMode);
        if (!style) {
            throw new Error(`Unknown territory style mode: ${input.selection.styleMode}`);
        }

        return style.buildFrame(input);
    }
}
