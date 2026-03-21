import type {
    PresentationLayerInput,
    TerritoryPresentationFrame,
    TerritoryStyleMode,
} from '../TerritoryStyleMode';
import { buildFillDrawCommands } from '../builders/FillDrawCommandBuilder';
import { buildBorderDrawCommands } from '../builders/BorderDrawCommandBuilder';
import type { TerritoryTunables } from '../../../contracts/TerritoryFrameInput';

interface CanonicalStyleInput extends PresentationLayerInput {
    tunables: TerritoryTunables;
}

export class CanonicalTerritoryStyle implements TerritoryStyleMode {
    readonly id = 'canonical' as const;
    readonly label = 'Canonical Vector Polygon Style';

    buildFrame(input: PresentationLayerInput): TerritoryPresentationFrame {
        const styleInput = input as CanonicalStyleInput;
        return {
            fills: buildFillDrawCommands(styleInput.transition, styleInput.tunables),
            borders: buildBorderDrawCommands(styleInput.transition, styleInput.tunables),
            debug: [],
        };
    }
}
