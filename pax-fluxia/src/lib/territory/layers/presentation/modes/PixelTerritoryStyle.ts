import type {
    BorderDrawCommand,
    FillDrawCommand,
    PresentationLayerInput,
    TerritoryPresentationFrame,
    TerritoryStyleMode,
} from '../TerritoryStyleMode';
import { buildFillDrawCommands } from '../builders/FillDrawCommandBuilder';
import { buildBorderDrawCommands } from '../builders/BorderDrawCommandBuilder';
import type { TerritoryTunables } from '../../../contracts/TerritoryFrameInput';

interface PixelStyleInput extends PresentationLayerInput {
    tunables: TerritoryTunables;
}

function quantize(points: [number, number][]): [number, number][] {
    return points.map(([x, y]) => [Math.round(x), Math.round(y)]);
}

function quantizeFills(commands: FillDrawCommand[]): FillDrawCommand[] {
    return commands.map((command) => ({
        ...command,
        points: quantize(command.points),
    }));
}

function quantizeBorders(commands: BorderDrawCommand[]): BorderDrawCommand[] {
    return commands.map((command) => ({
        ...command,
        points: quantize(command.points),
    }));
}

export class PixelTerritoryStyle implements TerritoryStyleMode {
    readonly id = 'pixel' as const;
    readonly label = 'Pixel-Quantized Style';

    buildFrame(input: PresentationLayerInput): TerritoryPresentationFrame {
        const styleInput = input as PixelStyleInput;
        return {
            fills: quantizeFills(
                buildFillDrawCommands(styleInput.transition, styleInput.tunables),
            ),
            borders: quantizeBorders(
                buildBorderDrawCommands(styleInput.transition, styleInput.tunables),
            ),
            debug: [
                {
                    label: 'pixel_style_quantization',
                },
            ],
        };
    }
}
