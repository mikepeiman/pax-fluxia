import type { BorderDrawCommand } from '../TerritoryStyleMode';
import type { TransitionSnapshot } from '../../../contracts/TransitionContracts';
import type { TerritoryTunables } from '../../../contracts/TerritoryFrameInput';

export function buildBorderDrawCommands(
    transition: TransitionSnapshot,
    tunables: TerritoryTunables,
): BorderDrawCommand[] {
    return transition.borderFrame.frontiers.map((frontier) => ({
        ownerPairKey: frontier.ownerPairKey,
        points: frontier.points,
        width: tunables.borderWidth,
        alpha: tunables.borderAlpha,
    }));
}
