import { writable } from 'svelte/store';

export type GameHudStats = {
    fps: number;
    visualShips: number;
};

const initialStats: GameHudStats = {
    fps: 0,
    visualShips: 0,
};

function createGameHudStatsStore() {
    const { subscribe, set } = writable<GameHudStats>(initialStats);

    return {
        subscribe,
        setStats(next: GameHudStats): void {
            set(next);
        },
        reset(): void {
            set(initialStats);
        },
    };
}

export const gameHudStatsStore = createGameHudStatsStore();
