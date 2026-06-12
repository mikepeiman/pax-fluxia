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
export const logFlags = (() => {
    const LS_KEY = 'pax_logFlags';
    const defaults = {
        sys: false,
        state: false,
        data: false,
        net: false,
        error: true,     // Errors always ON
        success: false,
        combat: false,
        conquest: false,
        input: false,
        repair: false,
        canvas: true,    // Canvas debug (viewport, scaling, centering)
        renderer: false, // Territory renderer pipeline (borders, fills, transitions)
    };

    // Load persisted flags if available
    let saved: Record<string, boolean> = {};
    if (typeof window !== 'undefined') {
        try {
            saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
        } catch { /* ignore */ }
    }
    const flags = { ...defaults, ...saved } as typeof defaults;

    // Proxy: any set operation automatically persists to localStorage
    const persist = (target: typeof defaults) => {
        if (typeof window !== 'undefined') {
            try { localStorage.setItem(LS_KEY, JSON.stringify(target)); } catch { /* ignore */ }
        }
    };

    return new Proxy(flags, {
        set(target, key, value) {
            (target as any)[key] = value;
            persist(target);
            return true;
        },
    });
})();

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
    conquest: 'background: #e11d48; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    canvas: 'background: #0ea5e9; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    renderer: 'background: #f97316; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
    gridGradientTrace: 'background: #7c3aed; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
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
     * ⚔️ COMBAT BATTLE - Full formula breakdown with real-time values
     * Every intermediate step of the combat formula is shown flat in console.
     * No nested objects — every number is readable at a glance.
     */
    combatBattle: (
        tick: number,
        attacker: { id: string, ships: number, starType?: string, ownerId?: string, isAttacking?: boolean },
        defender: { id: string, ships: number, starType?: string, ownerId?: string, isAttacking?: boolean },
        damageToDefender: { kills: number, disabled: number },
        damageToAttacker: { kills: number, disabled: number },
        settings?: { aggressor: number, damage: number, lethality: number, forceRatio: number, repairRate: number },
        formula?: {
            baseOutputAtk: number;
            baseOutputDef: number;
            aggressorMultAtk: number;
            aggressorMultDef: number;
            outputAtk: number;
            outputDef: number;
            forceRatio: number;
            forceBonus: number;
            forceMod_dmgToDefender: number;
            forceMod_dmgToAttacker: number;
            rawDmgToDefender: number;
            rawDmgToAttacker: number;
            minDamage: number;
            finalDmgToDefender: number;
            finalDmgToAttacker: number;
        }
    ) => {
        if (!logFlags.combat) return;

        const ownerColors: Record<string, string> = {
            'human': '#3b82f6', 'ai-1': '#fbbf24', 'ai-2': '#ef4444',
            'ai-3': '#22c55e', 'ai-4': '#a855f7', 'ai-5': '#f97316', 'neutral': '#6b7280',
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
        const n = (v: number) => Math.floor(v);
        const f = (v: number, d = 2) => v.toFixed(d);

        const atkShips = n(attacker.ships);
        const defShips = n(defender.ships);
        const atkOwner = attacker.ownerId || 'unknown';
        const defOwner = defender.ownerId || 'unknown';

        // ── HEADER ──
        console.log(
            `%c⚔️ T${tick}%c │ %c${getOwnerLabel(atkOwner)}%c ${attacker.id} (${atkShips} ships) → %c${getOwnerLabel(defOwner)}%c ${defender.id} (${defShips} ships)`,
            styles.combat, styles.reset,
            getOwnerStyle(atkOwner), styles.reset,
            getOwnerStyle(defOwner), styles.reset
        );

        // ── FORMULA BREAKDOWN ──
        if (formula && settings) {
            const {
                baseOutputAtk, baseOutputDef, aggressorMultAtk, aggressorMultDef,
                outputAtk, outputDef, forceRatio: ratio, forceBonus,
                forceMod_dmgToDefender, forceMod_dmgToAttacker,
                rawDmgToDefender, rawDmgToAttacker, minDamage,
                finalDmgToDefender, finalDmgToAttacker
            } = formula;

            const dim = 'color: #888;';
            const hl = 'color: #5cf; font-weight: bold;';
            const red = 'color: #ff6b6b; font-weight: bold;';
            const org = 'color: #ffa94d; font-weight: bold;';
            const grn = 'color: #4ade80; font-weight: bold;';

            // Step 1: Base Output
            console.log(
                `  %cSTEP 1 Base Output%c │ ATK: %c${atkShips}%c × %c${f(settings.damage)}%c dmg/ship = %c${f(baseOutputAtk)}%c  │  DEF: %c${defShips}%c × %c${f(settings.damage)}%c = %c${f(baseOutputDef)}%c`,
                dim, styles.reset, hl, styles.reset, dim, styles.reset, hl, styles.reset,
                hl, styles.reset, dim, styles.reset, hl, styles.reset
            );

            // Step 2: Aggressor Advantage
            const atkRole = attacker.isAttacking ? 'ATTACKING' : 'defending';
            const defRole = defender.isAttacking ? 'ATTACKING' : 'defending';
            console.log(
                `  %cSTEP 2 Aggressor%c   │ ATK %c${atkRole}%c × %c${f(aggressorMultAtk)}%c = %c${f(outputAtk)}%c  │  DEF %c${defRole}%c × %c${f(aggressorMultDef)}%c = %c${f(outputDef)}%c  (advantage: %c${f(settings.aggressor)}%c)`,
                dim, styles.reset, grn, styles.reset, dim, styles.reset, hl, styles.reset,
                grn, styles.reset, dim, styles.reset, hl, styles.reset, org, styles.reset
            );

            // Step 3: Force Ratio
            console.log(
                `  %cSTEP 3 Force Ratio%c │ ratio %c${f(ratio)}%c:1  log₂ bonus %c${f(forceBonus)}%c  (effect: %c${f(settings.forceRatio)}%c)  │  mod→def %c${f(forceMod_dmgToDefender)}%c  mod→atk %c${f(forceMod_dmgToAttacker)}%c`,
                dim, styles.reset, hl, styles.reset, hl, styles.reset, dim, styles.reset,
                hl, styles.reset, hl, styles.reset
            );

            // Step 4: Final Damage
            console.log(
                `  %cSTEP 4 Damage%c      │ Raw→DEF: %c${f(rawDmgToDefender)}%c Raw→ATK: %c${f(rawDmgToAttacker)}%c  min=%c${minDamage}%c  │  %cFinal→DEF: ${f(finalDmgToDefender)}%c  %cFinal→ATK: ${f(finalDmgToAttacker)}%c`,
                dim, styles.reset, hl, styles.reset, hl, styles.reset, dim, styles.reset,
                red, styles.reset, red, styles.reset
            );

            // Step 5: Kill/Disable Split
            const defKills = n(damageToDefender.kills);
            const defDis = n(damageToDefender.disabled);
            const atkKills = n(damageToAttacker.kills);
            const atkDis = n(damageToAttacker.disabled);
            console.log(
                `  %cSTEP 5 Lethality%c   │ leth=%c${f(settings.lethality)}%c  │  DEF takes ☠️%c${defKills}%c killed + 🔧%c${defDis}%c disabled  │  ATK takes ☠️%c${atkKills}%c killed + 🔧%c${atkDis}%c disabled`,
                dim, styles.reset, org, styles.reset,
                red, styles.reset, org, styles.reset,
                red, styles.reset, org, styles.reset
            );

            // Outcome
            const defRemaining = Math.max(0, defShips - defKills - defDis);
            const atkRemaining = Math.max(0, atkShips - atkKills - atkDis);
            console.log(
                `  %cOUTCOME%c            │ DEF remaining: %c${defRemaining}%c  │  ATK remaining: %c${atkRemaining}%c`,
                'color: #fff; font-weight: bold;', styles.reset,
                defRemaining > 0 ? grn : red, styles.reset,
                atkRemaining > 0 ? grn : red, styles.reset
            );
        } else {
            // Fallback: compact format without formula data
            const defKills = n(damageToDefender.kills);
            const defDis = n(damageToDefender.disabled);
            const atkKills = n(damageToAttacker.kills);
            const atkDis = n(damageToAttacker.disabled);
            console.log(
                `  DEF takes ☠️${defKills} killed + 🔧${defDis} disabled  │  ATK takes ☠️${atkKills} killed + 🔧${atkDis} disabled`
            );
            if (settings) {
                console.log(
                    `  %cSettings%c │ Agg:${f(settings.aggressor)} Dmg:${f(settings.damage)} Leth:${f(settings.lethality)} Force:${f(settings.forceRatio)} RR:${f(settings.repairRate)}`,
                    'color: #666;', styles.reset
                );
            }
        }
    },

    /**
     * 🖱️ INPUT - User interaction events (clicks, selections, commands)
     */
    input: (action: string, data?: unknown) => {
        if (!logFlags.input) return;
        console.log(`%cINPUT%c ${action}`, 'background: #6366f1; color: #fff; padding: 2px 4px; border-radius: 2px; font-weight: bold;', styles.reset, data ?? '');
    },

    /** 🖥️ CANVAS - Viewport, scaling, centering, pan diagnostics */
    canvas: (context: string, msg: string, data?: unknown) => {
        if (!logFlags.canvas) return;
        console.log(`%cCANVAS%c [${context}] ${msg}`, styles.canvas, styles.reset, data ?? '');
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

    /**
     * 🏰 CONQUEST - Flat, readable conquest log. One line per section.
     * No nested objects, no groupCollapsed. Everything visible at a glance.
     */
    conquest: (
        tick: number,
        data: {
            starId: string;
            previousOwner: string;
            newOwner: string;
            shipsCaptured: number;
            shipsEscaped: number;
            shipsDestroyed: number;
            defenderTotal: number;
            attackerShips: number;
            attackerPostShips: number;
            defenderPostShips: number;
            retreatTargetId?: string;
            scatterTargetIds?: string[];
            scatterShipCounts?: number[];
            prePlayerTotals?: Array<{ id: string; name?: string; active: number; damaged: number; total: number; stars: number }>;
            postPlayerTotals?: Array<{ id: string; name?: string; active: number; damaged: number; total: number; stars: number }>;
        }
    ) => {
        if (!logFlags.conquest) return;

        const lbl = (id: string) => {
            if (!id) return 'NEUTRAL';
            if (id === 'human-player') return 'YOU';
            if (id.startsWith('ai-')) return id.toUpperCase().replace('-', '');
            return id.substring(0, 8).toUpperCase();
        };

        const red = 'color: #f87171; font-weight: bold;';
        const grn = 'color: #4ade80; font-weight: bold;';
        const yel = 'color: #fbbf24; font-weight: bold;';
        const blu = 'color: #60a5fa; font-weight: bold;';
        const dim = 'color: #888;';
        const rst = styles.reset;

        // ── HEADER ── 
        console.log(
            `%c🏰 CONQUEST T${tick}%c │ %c${lbl(data.previousOwner)}%c → %c${lbl(data.newOwner)}%c │ ⭐${data.starId} │ DEF had %c${data.defenderTotal}%c ships │ ATK had %c${data.attackerShips}%c ships`,
            styles.conquest, rst,
            red, rst, grn, rst,
            red, rst, blu, rst
        );

        // ── DISPOSITION: captured / destroyed / escaped — all one line ──
        let dispLine = `  📊 captured:%c${data.shipsCaptured}%c  destroyed:%c${data.shipsDestroyed}%c  escaped:%c${data.shipsEscaped}%c`;
        const dispStyles = [grn, rst, red, rst, yel, rst];

        if (data.retreatTargetId) {
            dispLine += `  🏃→${data.retreatTargetId}`;
        }
        if (data.scatterTargetIds && data.scatterTargetIds.length > 0) {
            const pairs = data.scatterTargetIds.map((id, i) => `${id}(${data.scatterShipCounts?.[i] ?? '?'})`).join(',');
            dispLine += `  💨→${pairs}`;
        }
        console.log(dispLine, ...dispStyles);

        // ── POST STATE: attacker + conquered star ──
        console.log(
            `  📍 ATK post:%c${data.attackerPostShips}%c ships │ %c${data.starId}%c post:%c${data.defenderPostShips}%c ships (now %c${lbl(data.newOwner)}%c)`,
            blu, rst, grn, rst, grn, rst, grn, rst
        );

        // ── PRE PLAYER TOTALS (before conquest) ──
        if (data.prePlayerTotals && data.prePlayerTotals.length > 0) {
            const preParts: string[] = [];
            const preStyles: string[] = [];
            data.prePlayerTotals.forEach(p => {
                preParts.push(`%c${(p.name || lbl(p.id)).padEnd(6)}%c ⭐${p.stars} A:%c${p.active}%c D:%c${p.damaged}%c T:%c${p.total}%c`);
                preStyles.push('font-weight:bold;color:#ddd', rst, grn, rst, yel, rst, blu, rst);
            });
            console.log(`  %cPRE%c  │ ${preParts.join(' │ ')}`, 'background:#444;color:#fff;padding:1px 4px;border-radius:2px;font-weight:bold;', rst, ...preStyles);
        }

        // ── POST PLAYER TOTALS (after conquest) ──
        if (data.postPlayerTotals && data.postPlayerTotals.length > 0) {
            const postParts: string[] = [];
            const postStyles: string[] = [];
            data.postPlayerTotals.forEach(p => {
                postParts.push(`%c${(p.name || lbl(p.id)).padEnd(6)}%c ⭐${p.stars} A:%c${p.active}%c D:%c${p.damaged}%c T:%c${p.total}%c`);
                postStyles.push('font-weight:bold;color:#ddd', rst, grn, rst, yel, rst, blu, rst);
            });
            console.log(`  %cPOST%c │ ${postParts.join(' │ ')}`, 'background:#2a6;color:#fff;padding:1px 4px;border-radius:2px;font-weight:bold;', rst, ...postStyles);
        }
    },

    /** 🎨 RENDERER - Territory renderer pipeline (borders, fills, transitions) */
    renderer: (context: string, msg: string, data?: unknown) => {
        if (!logFlags.renderer) return;
        console.log(`%cRENDERER%c [${context}] ${msg}`, styles.renderer, styles.reset, data ?? '');
    },

    /** Grid Gradient transition trace. Gated by the Grid Gradient trace setting before this is called. */
    gridGradientTrace: (context: string, msg: string, data?: unknown) => {
        console.log(`%cGRID-GRADIENT%c [${context}] ${msg}`, styles.gridGradientTrace, styles.reset, data ?? '');
    },
};

// Default export for convenience
export default log;
