import { writable } from 'svelte/store';

export interface CombatLogEntry {
    id: string;
    timestamp: number;
    tick: number;
    starId: string;
    starName?: string; // Enhanced identity
    result: string;
    color: string; // Visual cue

    // Details
    attackers: number;
    defenders: number;
    damage: number;
    // Detailed Attrition
    shipsDamaged: number;   // Active -> Damaged
    shipsDestroyed: number; // Damaged -> Dead

    // Natural Language Explanation
    message: string;
}

function createCombatLogStore() {
    const { subscribe, update, set } = writable<CombatLogEntry[]>([]);

    return {
        subscribe,
        add: (entry: Omit<CombatLogEntry, 'id' | 'timestamp'>) => {
            update(logs => {
                const newLog = {
                    ...entry,
                    id: crypto.randomUUID(),
                    timestamp: Date.now()
                };
                // Keep last 50 logs
                return [newLog, ...logs].slice(0, 50);
            });
        },
        clear: () => set([])
    };
}

export const combatLog = createCombatLogStore();
