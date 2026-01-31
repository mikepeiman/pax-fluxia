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
    console.log(`[Combat] ${entry.starId}: ${entry.result} | Formula: ${entry.formula}`);
}
