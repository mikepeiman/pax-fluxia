import type { TerritoryModeSelection } from '../../contracts/TerritoryModeSelection';
import type { GeometryLayerInput, GeometrySnapshot } from './GeometryMode';
import { GEOMETRY_MODE_BY_ID } from './registry';

export interface GeometryCoordinatorInput extends Omit<GeometryLayerInput, 'styleMode'> {
    selection: TerritoryModeSelection;
}

export class GeometryLayerCoordinator {
    compute(input: GeometryCoordinatorInput): GeometrySnapshot {
        const mode = GEOMETRY_MODE_BY_ID.get(input.selection.geometryMode);
        if (!mode) {
            throw new Error(`Unknown geometry mode: ${input.selection.geometryMode}`);
        }

        return mode.compute({
            ...input,
            styleMode: input.selection.styleMode,
        });
    }
}
