import type {
    PresentationLayerInput,
    TerritoryPresentationFrame,
    TerritoryStyleMode,
} from '../TerritoryStyleMode';
import { buildFillDrawCommands } from '../builders/FillDrawCommandBuilder';
import { buildBorderDrawCommands } from '../builders/BorderDrawCommandBuilder';
import type { TerritoryTunables } from '../../../contracts/TerritoryFrameInput';

interface DistanceFieldStyleInput extends PresentationLayerInput {
    tunables: TerritoryTunables;
}

export class DistanceFieldStyle implements TerritoryStyleMode {
    readonly id = 'distance_field' as const;
    readonly label = 'Signed-Distance Field Style';

    buildFrame(input: PresentationLayerInput): TerritoryPresentationFrame {
        const styleInput = input as DistanceFieldStyleInput;
        return {
            fills: buildFillDrawCommands(styleInput.transition, styleInput.tunables),
            borders: buildBorderDrawCommands(styleInput.transition, styleInput.tunables),
            debug: [
                {
                    label: 'distance_field_style_active',
                },
            ],
        };
    }
}
