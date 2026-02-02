import { log } from './logger';

export interface CombatLogEntry {
    tick: number;
    starId: string;
    attackers: number;
    defenders: number;
    damage: number;
    result: string;
    formula: string;
}

export const combatLog: CombatLogEntry[] = [];

export function logCombat(entry: CombatLogEntry) {
    combatLog.unshift(entry);
    if (combatLog.length > 50) combatLog.pop();
    // Using semantic logger per visual-telemetry skill
    log.combat(`T${entry.tick}`, `${entry.starId}: ${entry.result}`, {
        attackers: entry.attackers,
        defenders: entry.defenders,
        damage: entry.damage
    });
}
