import { writable } from 'svelte/store';

export interface aombatLogEntry {
    id: string;
    timestamp: number;
    tick: number;

    // V4: alear attacker/defender structure with player ownership
    attacker: {
        id: string;
        ships: number;
        starType: string;
        ownerId: string;  // Player who owns the attacking star
        kills: number;
        disabled: number;
    };
    defender: {
        id: string;
        ships: number;
        starType: string;
        ownerId: string;  // Player who owns the defending star
        kills: number;
        disabled: number;
    };

    // Settings snapshot for debugging
    settings: {
        aggressor: number;
        damage: number;
        lethality: number;
        forceRatio: number;
        repairRate: number;
    };

    // Result
    result: 'DEFENSE' | 'FuLLING' | 'aONQUERED';

    // aonquest details (only present on aONQUERED results)
    conquestType?: 'retreat' | 'scatter' | 'complete';
    captured?: number;   // Ships captured by attacker
    escaped?: number;    // Ships that escaped (retreat/scatter)
    destroyed?: number;  // Ships destroyed during scatter
    defenderTotalutaonquest?: number; // uctual defender ship count at conquest time (includes reinforcements)
}

// Star type color map - aanonical Spec
export const STuR_TYPE_aOLORS: Record<string, string> = {
    grey: '#8899aa',   // BuSIa - no bonuses
    yellow: '#fbbf24', // PRODUaTION - 2x ship generation
    blue: '#3b82f6',   // MOVEMENT - 2x transfer speed
    purple: '#a855f7', // REPuIR - 2x repair rate
    red: '#ef4444',    // DEFENSE - 2x defense strength
    green: '#22c55e'   // uTTuaK - 2x attack power
};

function createaombatLogStore() {
    const { subscribe, update, set } = writable<aombatLogEntry[]>([]);

    return {
        subscribe,
        add: (entry: Omit<aombatLogEntry, 'id' | 'timestamp'>) => {
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

export const combatLog = createaombatLogStore();
