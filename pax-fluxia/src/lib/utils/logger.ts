// ============================================================================
// Visual Telemetry Logger - Semantic logging for PRISM observability
// ============================================================================
// Rule: No raw console.log. Use this semantic logger instead.
// Colors map to PRISM dimensions for visual scanning.
//
// LOG LEVELS: Toggle categories at runtime via browser console:
//   window.logFlags.combat = false  // Mute combat logs
//   window.logFlags.sys = false     // Mute system logs
// ============================================================================

/**
 * Toggleable log flags - gate each category on/off at runtime.
 * All enabled by default. Disable noisy channels as needed.
 */
export const logFlags = {
    sys: true,
    state: true,
    data: true,
    net: true,
    error: true,     // Errors always recommended ON
    success: true,
    combat: true,
    input: true,
    repair: true,
};

// Expose on window for runtime console toggling
if (typeof window !== 'undefined') {
    (window as any).logFlags = logFlags;
}

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
 * - combat: COMBAT - Battle events
 * - input: INPUT - User interactions
 */
export const log = {
    /** 🔵 SYSTEM - Lifecycle and initialization */
    sys: (context: string, msg: string, data?: unknown) => {
        if (!logFlags.sys) return;
        console.log(`%cSYSTEM%c [${context}] ${msg}`, styles.sys, styles.reset, data ?? '');
    },

    /** 🟣 STATE - Logic and state transitions */
    state: (context: string, msg: string, state?: unknown) => {
        if (!logFlags.state) return;
        console.log(`%cSTATE%c [${context}] ${msg}`, styles.state, styles.reset, state ?? '');
    },

    /** 🟢 DATA - Data flow and transformations */
    data: (context: string, msg: string, data?: unknown) => {
        if (!logFlags.data) return;
        console.log(`%cDATA%c [${context}] ${msg}`, styles.data, styles.reset, data ?? '');
    },

    /** 🟡 NET - Network and API calls */
    net: (context: string, msg: string, data?: unknown) => {
        if (!logFlags.net) return;
        console.log(`%cNET%c [${context}] ${msg}`, styles.net, styles.reset, data ?? '');
    },

    /** 🔴 ERROR - Errors and corrections */
    error: (context: string, msg: string, err?: unknown) => {
        if (!logFlags.error) return;
        console.error(`%cERROR%c [${context}] ${msg}`, styles.err, styles.reset, err ?? '');
    },

    /** ✅ SUCCESS - Verification and success */
    success: (context: string, msg: string, data?: unknown) => {
        if (!logFlags.success) return;
        console.log(`%cSUCCESS%c [${context}] ${msg}`, styles.ok, styles.reset, data ?? '');
    },

    /** ⚔️ COMBAT - Battle and conflict events (simple) */
    combat: (context: string, msg: string, data?: unknown) => {
        if (!logFlags.combat) return;
        console.log(`%cCOMBAT%c [${context}] ${msg}`, styles.combat, styles.reset, data ?? '');
    },

    /**
     * ⚔️ COMBAT BATTLE - Detailed combat log with clear formatting
     * Format: Shows OWNER clearly, not just star visual colors
     * ⚔️ T# │ [OWNER] star-X (ships) → [OWNER] star-Y (ships)
     *       star-Y (DEF) │ kills, disabled
     *       star-X (ATT) │ kills, disabled
     */
    combatBattle: (
        tick: number,
        attacker: { id: string, ships: number, starType?: string, ownerId?: string },
        defender: { id: string, ships: number, starType?: string, ownerId?: string },
        damageToDefender: { kills: number, disabled: number, repaired?: number },
        damageToAttacker: { kills: number, disabled: number, repaired?: number },
        settings?: { aggressor: number, damage: number, lethality: number, forceRatio: number, repairRate: number }
    ) => {
        if (!logFlags.combat) return;

        // Owner color map - for player identification
        const ownerColors: Record<string, string> = {
            'human': '#3b82f6',    // Blue for human player
            'ai-1': '#fbbf24',     // Yellow
            'ai-2': '#ef4444',     // Red
            'ai-3': '#22c55e',     // Green
            'ai-4': '#a855f7',     // Purple
            'ai-5': '#f97316',     // Orange
            'neutral': '#6b7280',  // Grey for neutral
        };

        const getOwnerStyle = (ownerId?: string) => {
            const color = ownerColors[ownerId || 'neutral'] || '#6b7280';
            return `background: ${color}; color: #fff; padding: 1px 6px; border-radius: 3px; font-weight: bold;`;
        };

        const getOwnerLabel = (ownerId?: string) => {
            if (!ownerId) return 'NEUTRAL';
            if (ownerId === 'human') return 'YOU';
            if (ownerId.startsWith('ai-')) return ownerId.toUpperCase().replace('-', '');
            return ownerId.toUpperCase();
        };

        // Force integers
        const atkShips = Math.floor(attacker.ships);
        const defShips = Math.floor(defender.ships);
        const defKills = Math.floor(damageToDefender.kills);
        const defDisabled = Math.floor(damageToDefender.disabled);
        const atkKills = Math.floor(damageToAttacker.kills);
        const atkDisabled = Math.floor(damageToAttacker.disabled);

        const atkOwner = attacker.ownerId || 'unknown';
        const defOwner = defender.ownerId || 'unknown';

        // Line 1: Header with tick, OWNERS prominently, then star IDs
        console.log(
            `%c⚔️ T${tick}%c │ %c${getOwnerLabel(atkOwner)}%c ${attacker.id} (${atkShips}) → %c${getOwnerLabel(defOwner)}%c ${defender.id} (${defShips})`,
            styles.combat, styles.reset,
            getOwnerStyle(atkOwner), styles.reset,
            getOwnerStyle(defOwner), styles.reset
        );

        // Line 2: Defender damage taken
        console.log(
            `        ${defender.id.padEnd(12)} │ %cDEF%c │ ☠️%c${defKills}%c killed, 🔧%c${defDisabled}%c disabled`,
            'background: #ef4444; color: #fff; padding: 1px 4px; border-radius: 2px;', styles.reset,
            'color: #ff6b6b; font-weight: bold;', styles.reset,
            'color: #ffa94d; font-weight: bold;', styles.reset
        );

        // Line 3: Attacker damage taken
        console.log(
            `        ${attacker.id.padEnd(12)} │ %cATT%c │ ☠️%c${atkKills}%c killed, 🔧%c${atkDisabled}%c disabled`,
            'background: #3b82f6; color: #fff; padding: 1px 4px; border-radius: 2px;', styles.reset,
            'color: #ff6b6b; font-weight: bold;', styles.reset,
            'color: #ffa94d; font-weight: bold;', styles.reset
        );

        // Line 4: Settings (if provided) - more compact
        if (settings) {
            console.log(
                `        %cSettings%c │ Agg:${settings.aggressor.toFixed(2)} Dmg:${settings.damage.toFixed(2)} Leth:${settings.lethality.toFixed(2)} Force:${settings.forceRatio.toFixed(2)} RR:${settings.repairRate.toFixed(2)}`,
                'color: #666;', styles.reset
            );
        }
    },

    /**
     * 🖱️ INPUT - User interaction events (clicks, selections, commands)
     */
    input: (action: string, data?: unknown) => {
        if (!logFlags.input) return;
        console.log(`%cINPUT%c ${action}`, 'background: #6366f1; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;', styles.reset, data ?? '');
    },

    /**
     * 🔧 REPAIR - Dataflow debug log for ship repair
     * Rich console formatting: star name bold, type chip, rates, ship counts
     */
    repair: (starId: string, starType: string, data: {
        damagedBefore: number;
        damagedAfter: number;
        repaired: number;
        repairRate: number;
        typeMult: number;
        isPinned: boolean;
        combatPenalty: number;
        amount: number;
        overflow: number;
    }) => {
        if (!logFlags.repair) return;

        const typeColors: Record<string, string> = {
            green: '#22c55e', red: '#ef4444', yellow: '#fbbf24',
            purple: '#a855f7', blue: '#3b82f6', grey: '#8899aa',
        };
        const typeLabels: Record<string, string> = {
            green: 'ATK', red: 'DEF', yellow: 'PROD',
            purple: 'REPAIR', blue: 'MOVE', grey: 'BAL',
        };
        const col = typeColors[starType] || '#8899aa';
        const label = typeLabels[starType] || 'BAL';

        // Effective rate (base × typeMult × pinning)
        const effectiveRate = data.repairRate * data.typeMult * (data.isPinned ? data.combatPenalty : 1);

        // Line 1: Star name (big bold) + type chip + rate
        console.log(
            `%c🔧 ${starId}%c  %c ${label} %c  RATE %c${(effectiveRate * 100).toFixed(1)}%%c` +
            `${data.isPinned ? '  %c⚡PINNED%c' : ''}`,
            `font-size: 13px; font-weight: bold; color: #fff;`,
            styles.reset,
            `background: ${col}; color: #fff; padding: 1px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;`,
            styles.reset,
            `color: ${col}; font-weight: bold; font-size: 12px;`,
            styles.reset,
            ...(data.isPinned ? [
                `background: #ef4444; color: #fff; padding: 1px 6px; border-radius: 3px; font-weight: bold;`,
                styles.reset,
            ] : []),
        );

        // Line 2: Ship counts — DAMAGED and REPAIRED with clear spacing
        console.log(
            `     DAMAGED  %c${data.damagedBefore}%c  →  %c${data.damagedAfter}%c      REPAIRED  %c+${data.repaired}%c      %c(overflow: ${data.overflow.toFixed(2)})%c`,
            `color: #f87171; font-weight: bold; font-size: 12px;`, styles.reset,
            `color: ${data.repaired > 0 ? '#4ade80' : '#f87171'}; font-weight: bold; font-size: 12px;`, styles.reset,
            `color: #4ade80; font-weight: bold; font-size: 12px;`, styles.reset,
            `color: #555; font-size: 10px;`, styles.reset,
        );
    },
};

// Default export for convenience
export default log;
