import { writable } from 'svelte/store';

export interface CombatLogEntry {
    id: string;
    timestamp: number;
    tick: number;

    attacker: {
        id: string;
        ships: number;
        starType: string;
        ownerId: string;
        kills: number;
        disabled: number;
    };
    defender: {
        id: string;
        ships: number;
        starType: string;
        ownerId: string;
        kills: number;
        disabled: number;
    };

    settings: {
        aggressor: number;
        damage: number;
        lethality: number;
        forceRatio: number;
        repairRate: number;
    };

    result: 'DEFENSE' | 'FALLING' | 'CONQUERED';

    conquestType?: 'retreat' | 'scatter' | 'complete';
    captured?: number;
    escaped?: number;
    destroyed?: number;
    defenderTotalAtConquest?: number;
}

export const STAR_TYPE_COLORS: Record<string, string> = {
    grey: '#8899aa',
    yellow: '#fbbf24',
    blue: '#3b82f6',
    purple: '#a855f7',
    red: '#ef4444',
    green: '#22c55e',
};

function createCombatLogStore() {
    const { subscribe, update, set } = writable<CombatLogEntry[]>([]);

    return {
        subscribe,
        add: (entry: Omit<CombatLogEntry, 'id' | 'timestamp'>) => {
            update((logs) => {
                const newLog = {
                    ...entry,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                };
                return [newLog, ...logs].slice(0, 50);
            });
        },
        clear: () => set([]),
    };
}

export const combatLog = createCombatLogStore();
