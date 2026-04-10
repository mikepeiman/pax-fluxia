import { GAME_CONFIG } from '$lib/config/game.config';

type Gc = typeof GAME_CONFIG & { __TERRITORY_VISUAL_EPOCH?: number };

/** Call when any territory visual tuning changes so paused GameCanvas still re-renders. */
export function bumpTerritoryVisualConfig(): void {
    const g = GAME_CONFIG as Gc;
    g.__TERRITORY_VISUAL_EPOCH = (g.__TERRITORY_VISUAL_EPOCH ?? 0) + 1;
}

export function getTerritoryVisualEpoch(): number {
    return (GAME_CONFIG as Gc).__TERRITORY_VISUAL_EPOCH ?? 0;
}
