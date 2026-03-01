import { writable } from 'svelte/store';
import { audioManager } from '$lib/services/audioManager.svelte';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';

export interface CombatLogEntry {
    id: string;
    timestamp: number;
    tick: number;

    // V4: Clear attacker/defender structure with player ownership
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
    result: 'DEFENSE' | 'FALLING' | 'CONQUERED';

    // Conquest details (only present on CONQUERED results)
    captured?: number;   // Ships captured by attacker
    escaped?: number;    // Ships that escaped (retreat/scatter)
    destroyed?: number;  // Ships destroyed during scatter
    defenderTotalAtConquest?: number; // Actual defender ship count at conquest time (includes reinforcements)
}

// Star type color map - Canonical Spec
export const STAR_TYPE_COLORS: Record<string, string> = {
    grey: '#8899aa',   // BASIC - no bonuses
    yellow: '#fbbf24', // PRODUCTION - 2x ship generation
    blue: '#3b82f6',   // MOVEMENT - 2x transfer speed
    purple: '#a855f7', // REPAIR - 2x repair rate
    red: '#ef4444',    // DEFENSE - 2x defense strength
    green: '#22c55e'   // ATTACK - 2x attack power
};

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

                // Play conquest sound ONLY for local player's conquests
                if (entry.result === 'CONQUERED' && entry.attacker.ownerId === activeGameStore.localPlayerId) {
                    audioManager.play('conquest');
                }

                // Keep last 50 logs
                return [newLog, ...logs].slice(0, 50);
            });
        },
        clear: () => set([])
    };
}

export const combatLog = createCombatLogStore();
