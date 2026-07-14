import type {
    PresentationLayerInput,
    TerritoryPresentationFrame,
    TerritoryStyleMode,
} from '../TerritoryStyleMode';
import { buildFillDrawCommands } from '../builders/FillDrawCommandBuilder';
import { buildBorderDrawCommands } from '../builders/BorderDrawCommandBuilder';
import type { TerritoryTunables } from '../../../contracts/TerritoryFrameInput';

interface VectorStyleInput extends PresentationLayerInput {
    tunables: TerritoryTunables;
}

export class VectorPolygonStyle implements TerritoryStyleMode {
    readonly id = 'vector' as const;
    readonly label = 'Vector Polygon Style';

    buildFrame(input: PresentationLayerInput): TerritoryPresentationFrame {
        const styleInput = input as VectorStyleInput;
        return {
            fills: buildFillDrawCommands(styleInput.transition, styleInput.tunables),
            borders: buildBorderDrawCommands(styleInput.transition, styleInput.tunables),
            debug: [],
        };
    }
}
