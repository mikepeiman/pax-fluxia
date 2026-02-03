// ============================================================================
// Visual Telemetry Logger - Semantic logging for PRISM observability
// ============================================================================
// Rule: No raw console.log. Use this semantic logger instead.
// Colors map to PRISM dimensions for visual scanning.

const styles = {
    sys: 'background: #3b82f6; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    state: 'background: #a855f7; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    data: 'background: #10b981; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    net: 'background: #f59e0b; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    err: 'background: #ef4444; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    ok: 'background: #22c55e; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    combat: 'background: #ff6b35; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    reset: 'color: inherit;'
};

/**
 * Visual Telemetry Logger
 * 
 * Categories map to PRISM dimensions:
 * - sys: STRUCTURE - Lifecycle, initialization
 * - state: STATE - Logic, transitions
 * - data: FLOW - Data, pipes
 * - net: NETWORK - API, IO
 * - error: CORRECTION - Errors, fixes
 * - success: VERIFICATION - Success markers
 */
export const log = {
    /** 🔵 SYSTEM - Lifecycle and initialization */
    sys: (context: string, msg: string, data?: unknown) =>
        console.log(`%cSYSTEM%c [${context}] ${msg}`, styles.sys, styles.reset, data ?? ''),

    /** 🟣 STATE - Logic and state transitions */
    state: (context: string, msg: string, state?: unknown) =>
        console.log(`%cSTATE%c [${context}] ${msg}`, styles.state, styles.reset, state ?? ''),

    /** 🟢 DATA - Data flow and transformations */
    data: (context: string, msg: string, data?: unknown) =>
        console.log(`%cDATA%c [${context}] ${msg}`, styles.data, styles.reset, data ?? ''),

    /** 🟡 NET - Network and API calls */
    net: (context: string, msg: string, data?: unknown) =>
        console.log(`%cNET%c [${context}] ${msg}`, styles.net, styles.reset, data ?? ''),

    /** 🔴 ERROR - Errors and corrections */
    error: (context: string, msg: string, err?: unknown) =>
        console.error(`%cERROR%c [${context}] ${msg}`, styles.err, styles.reset, err ?? ''),

    /** ✅ SUCCESS - Verification and success */
    success: (context: string, msg: string, data?: unknown) =>
        console.log(`%cSUCCESS%c [${context}] ${msg}`, styles.ok, styles.reset, data ?? ''),

    /** ⚔️ COMBAT - Battle and conflict events (simple) */
    combat: (context: string, msg: string, data?: unknown) =>
        console.log(`%cCOMBAT%c [${context}] ${msg}`, styles.combat, styles.reset, data ?? ''),

    /**
     * ⚔️ COMBAT BATTLE - Detailed combat log with clear formatting
     * Format per user spec:
     * ⚔️ T# │ ATTACKER (ships) [type] → DEFENDER (ships) [type]
     *       STAR-X (target)   | kills, disabled, repaired
     *       STAR-Y (attacker) | kills, disabled, repaired
     *       Settings: Aggressor | Dmg | Lethality | Force | RR
     */
    combatBattle: (
        tick: number,
        attacker: { id: string, ships: number, starType?: string },
        defender: { id: string, ships: number, starType?: string },
        damageToDefender: { kills: number, disabled: number, repaired?: number },
        damageToAttacker: { kills: number, disabled: number, repaired?: number },
        settings?: { aggressor: number, damage: number, lethality: number, forceRatio: number, repairRate: number }
    ) => {
        // Star type color map - Canonical Spec
        // GREY=basic, YELLOW=production, BLUE=movement, PURPLE=repair, RED=defense, GREEN=attack
        const typeColors: Record<string, string> = {
            grey: '#8899aa',   // BASIC - no bonuses
            yellow: '#fbbf24', // PRODUCTION - 2x ship generation
            blue: '#3b82f6',   // MOVEMENT - 2x transfer speed
            purple: '#a855f7', // REPAIR - 2x repair rate
            red: '#ef4444',    // DEFENSE - 2x defense strength
            green: '#22c55e'   // ATTACK - 2x attack power
        };

        const getTypeStyle = (type?: string) => {
            const color = typeColors[type || 'grey'] || '#8899aa';
            return `background: ${color}; color: #000; padding: 1px 4px; border-radius: 2px; font-weight: bold;`;
        };

        // Force integers
        const atkShips = Math.floor(attacker.ships);
        const defShips = Math.floor(defender.ships);
        const defKills = Math.floor(damageToDefender.kills);
        const defDisabled = Math.floor(damageToDefender.disabled);
        const defRepaired = Math.floor(damageToDefender.repaired ?? 0);
        const atkKills = Math.floor(damageToAttacker.kills);
        const atkDisabled = Math.floor(damageToAttacker.disabled);
        const atkRepaired = Math.floor(damageToAttacker.repaired ?? 0);

        const atkType = attacker.starType || 'grey';
        const defType = defender.starType || 'grey';

        // Line 1: Header with tick, star IDs and types
        console.log(
            `%c⚔️ T${tick}%c │ %c${attacker.id}%c (${atkShips}) %c${atkType.toUpperCase()}%c → %c${defender.id}%c (${defShips}) %c${defType.toUpperCase()}%c`,
            styles.combat, styles.reset,
            'color: #4488ff; font-weight: bold;', styles.reset,
            getTypeStyle(atkType), styles.reset,
            'color: #ff4466; font-weight: bold;', styles.reset,
            getTypeStyle(defType), styles.reset
        );

        // Line 2: Defender perspective (target)
        console.log(
            `        %c${defender.id.padEnd(12)}%c │ %cDEF%c │ %c${defKills}%c killed, %c${defDisabled}%c disabled, %c${defRepaired}%c repaired`,
            'color: #ff4466;', styles.reset,
            'background: #ff4466; color: #fff; padding: 1px 4px; border-radius: 2px;', styles.reset,
            'color: #ff6b6b; font-weight: bold;', styles.reset,
            'color: #ffa94d; font-weight: bold;', styles.reset,
            'color: #22c55e; font-weight: bold;', styles.reset
        );

        // Line 3: Attacker perspective
        console.log(
            `        %c${attacker.id.padEnd(12)}%c │ %cATT%c │ %c${atkKills}%c killed, %c${atkDisabled}%c disabled, %c${atkRepaired}%c repaired`,
            'color: #4488ff;', styles.reset,
            'background: #4488ff; color: #fff; padding: 1px 4px; border-radius: 2px;', styles.reset,
            'color: #ff6b6b; font-weight: bold;', styles.reset,
            'color: #ffa94d; font-weight: bold;', styles.reset,
            'color: #22c55e; font-weight: bold;', styles.reset
        );

        // Line 4: Settings (if provided)
        if (settings) {
            console.log(
                `        %cSettings%c │ Aggressor: %c${settings.aggressor.toFixed(2)}%c │ Dmg: %c${settings.damage.toFixed(2)}%c │ Lethality: %c${settings.lethality.toFixed(2)}%c │ Force: %c${settings.forceRatio.toFixed(2)}%c │ RR: %c${settings.repairRate.toFixed(2)}%c`,
                'color: #888;', styles.reset,
                'color: #10b981;', styles.reset,
                'color: #10b981;', styles.reset,
                'color: #10b981;', styles.reset,
                'color: #10b981;', styles.reset,
                'color: #10b981;', styles.reset
            );
        }
    },

    /**
     * 🖱️ INPUT - User interaction events (clicks, selections, commands)
     */
    input: (action: string, data?: unknown) =>
        console.log(`%cINPUT%c ${action}`, 'background: #6366f1; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;', styles.reset, data ?? '')
};

// Default export for convenience
export default log;
