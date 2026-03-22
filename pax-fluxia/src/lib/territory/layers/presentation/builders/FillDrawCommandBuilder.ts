import type { FillDrawCommand } from '../TerritoryStyleMode';
import type { TransitionSnapshot } from '../../../contracts/TransitionContracts';
import type { TerritoryTunables } from '../../../contracts/TerritoryFrameInput';

export function buildFillDrawCommands(
    transition: TransitionSnapshot,
    tunables: TerritoryTunables,
): FillDrawCommand[] {
    return transition.fillFrame.regions.map((region) => ({
        ownerId: region.ownerId,
        points: region.points,
        alpha: tunables.fillAlpha,
    }));
}
