<script lang="ts">
    import { combatLog, STAR_TYPE_COLORS } from "$lib/stores/combatLogStore";
    import { fade, slide } from "svelte/transition";
    import type { CombatLogEntry } from "$lib/stores/combatLogStore";

    // Drawer state - exposed for parent to control layout (bindable)
    let { isOpen = $bindable(true) } = $props();

    // Track which battle cards are expanded
    let expandedBattles = $state<Set<string>>(new Set());

    function toggleDrawer() {
        isOpen = !isOpen;
    }

    function toggleBattle(battleId: string) {
        if (expandedBattles.has(battleId)) {
            expandedBattles.delete(battleId);
            expandedBattles = new Set(expandedBattles); // Trigger reactivity
        } else {
            expandedBattles.add(battleId);
            expandedBattles = new Set(expandedBattles);
        }
    }

    // Group logs into "battles" - continuous combat against the same target
    // A battle ends when there's a CONQUERED result or a gap of more than 10 ticks
    interface Battle {
        id: string;
        targetId: string;
        targetOwnerId: string;
        attackerId: string;
        startTick: number;
        endTick: number;
        result: 'ONGOING' | 'CONQUERED' | 'DEFENSE';
        entries: CombatLogEntry[];
        totalDamageDealt: number;
        totalDamageTaken: number;
    }

    const battles = $derived.by(() => {
        const logs = $combatLog;
        const battleMap = new Map<string, Battle>();
        
        // Process logs in reverse (oldest first) to build battles chronologically
        const sortedLogs = [...logs].reverse();
        
        for (const log of sortedLogs) {
            // Battle key: attacker -> defender
            const battleKey = `${log.attacker.ownerId}->${log.defender.id}`;
            
            const existing = battleMap.get(battleKey);
            
            // Check if this is a continuation of existing battle (within 10 ticks)
            if (existing && log.tick - existing.endTick <= 10 && existing.result === 'ONGOING') {
                existing.entries.push(log);
                existing.endTick = log.tick;
                existing.totalDamageDealt += log.defender.kills + log.defender.disabled;
                existing.totalDamageTaken += log.attacker.kills + log.attacker.disabled;
                if (log.result === 'CONQUERED') {
                    existing.result = 'CONQUERED';
                }
            } else {
                // Start new battle
                const battle: Battle = {
                    id: `battle-${log.tick}-${log.defender.id}`,
                    targetId: log.defender.id,
                    targetOwnerId: log.defender.ownerId,
                    attackerId: log.attacker.ownerId,
                    startTick: log.tick,
                    endTick: log.tick,
                    result: log.result === 'CONQUERED' ? 'CONQUERED' : 'ONGOING',
                    entries: [log],
                    totalDamageDealt: log.defender.kills + log.defender.disabled,
                    totalDamageTaken: log.attacker.kills + log.attacker.disabled
                };
                battleMap.set(battleKey, battle);
            }
        }
        
        // Convert to array and sort by most recent
        return Array.from(battleMap.values())
            .sort((a, b) => b.endTick - a.endTick);
    });

    // Helper functions
    function getResultColor(result: string) {
        switch (result) {
            case "CONQUERED": return "#ef4444";
            case "DEFENSE": return "#3b82f6";
            case "ONGOING": return "#fbbf24";
            case "FALLING": return "#ff8844";
            default: return "#888888";
        }
    }

    function getResultIcon(result: string) {
        switch (result) {
            case "CONQUERED": return "💀";
            case "DEFENSE": return "🛡️";
            case "ONGOING": return "⚔️";
            case "FALLING": return "📉";
            default: return "•";
        }
    }

    function formatPlayerId(id: string): string {
        if (id === "human-player") return "You";
        if (id.startsWith("ai-")) return `AI ${id.split("-")[1]}`;
        return id;
    }

    function formatStarId(id: string): string {
        return id.replace("star-", "★");
    }
</script>

<div class="combat-drawer" class:open={isOpen}>
    <!-- Toggle Tab -->
    <button class="drawer-tab" onclick={toggleDrawer} title={isOpen ? "Close Combat Log" : "Open Combat Log"}>
        <span class="tab-icon">⚔️</span>
        <span class="tab-label">{isOpen ? "◀" : "▶"}</span>
    </button>

    <!-- Drawer Content -->
    {#if isOpen}
        <div class="drawer-content" transition:slide={{ axis: 'x', duration: 200 }}>
            <div class="drawer-header">
                <h3>⚔️ Combat Log</h3>
                <span class="battle-count">{$combatLog.length} logs / {battles.length} battles</span>
            </div>

            <div class="battles-list">
                {#if $combatLog.length === 0}
                    <div class="empty-state">
                        <span class="empty-icon">🌌</span>
                        <p>No battles recorded yet.</p>
                        <p class="hint">Attack an enemy star to begin combat.</p>
                    </div>
                {:else if battles.length === 0}
                    <!-- Fallback: show raw logs if battle grouping fails -->
                    {#each $combatLog as entry (entry.id)}
                        <div class="raw-log-entry">
                            <span class="tick">T{entry.tick}</span>
                            <span class="actors">{formatPlayerId(entry.attacker.ownerId)} → {formatStarId(entry.defender.id)}</span>
                            <span class="result" style="color: {getResultColor(entry.result)}">{entry.result}</span>
                        </div>
                    {/each}
                {:else}
                    {#each battles as battle (battle.id)}
                        <div 
                            class="battle-card"
                            class:expanded={expandedBattles.has(battle.id)}
                            style="--result-color: {getResultColor(battle.result)}"
                        >
                            <!-- Battle Summary (always visible) -->
                            <button 
                                class="battle-summary"
                                onclick={() => toggleBattle(battle.id)}
                            >
                                <div class="summary-left">
                                    <span class="result-icon">{getResultIcon(battle.result)}</span>
                                    <div class="battle-info">
                                        <span class="battle-target">
                                            {formatPlayerId(battle.attackerId)} → {formatStarId(battle.targetId)}
                                        </span>
                                        <span class="battle-meta">
                                            T{battle.startTick}{battle.startTick !== battle.endTick ? `-${battle.endTick}` : ''} 
                                            • {battle.entries.length} tick{battle.entries.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div class="summary-right">
                                    <span class="damage-dealt" title="Damage dealt">
                                        ⚔️ {battle.totalDamageDealt}
                                    </span>
                                    <span class="damage-taken" title="Damage taken">
                                        💔 {battle.totalDamageTaken}
                                    </span>
                                    <span class="expand-icon">{expandedBattles.has(battle.id) ? '▼' : '▶'}</span>
                                </div>
                            </button>

                            <!-- Expanded Battle Details -->
                            {#if expandedBattles.has(battle.id)}
                                <div class="battle-details" transition:slide={{ duration: 150 }}>
                                    <div class="tick-entries">
                                        {#each battle.entries as entry (entry.id)}
                                            <div 
                                                class="tick-entry"
                                                style="border-left-color: {getResultColor(entry.result)}"
                                            >
                                                <div class="entry-header">
                                                    <span class="tick">T{entry.tick}</span>
                                                    <span class="result-badge" style="background: {getResultColor(entry.result)}20; color: {getResultColor(entry.result)}">
                                                        {entry.result}
                                                    </span>
                                                </div>
                                                <div class="entry-stats">
                                                    <div class="stat-row attacker">
                                                        <span class="stat-label">ATK</span>
                                                        <span class="stat-ships">{entry.attacker.ships.toFixed(0)} ships</span>
                                                        <span class="stat-losses">
                                                            <span class="kills" class:zero={entry.attacker.kills === 0}>☠️{Math.floor(entry.attacker.kills)}</span>
                                                            <span class="disabled" class:zero={entry.attacker.disabled === 0}>🔧{Math.floor(entry.attacker.disabled)}</span>
                                                        </span>
                                                    </div>
                                                    <div class="stat-row defender">
                                                        <span class="stat-label">DEF</span>
                                                        <span class="stat-ships">{entry.defender.ships.toFixed(0)} ships</span>
                                                        <span class="stat-losses">
                                                            {#if entry.result === 'CONQUERED'}
                                                                <span class="captured">🏴{Math.floor(entry.defender.ships)}</span>
                                                                {#if entry.defender.disabled > 0}
                                                                    <span class="escaped">🏃{Math.floor(entry.defender.disabled)}</span>
                                                                {/if}
                                                            {:else}
                                                                <span class="kills" class:zero={entry.defender.kills === 0}>☠️{Math.floor(entry.defender.kills)}</span>
                                                                <span class="disabled" class:zero={entry.defender.disabled === 0}>🔧{Math.floor(entry.defender.disabled)}</span>
                                                            {/if}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .combat-drawer {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        display: flex;
        z-index: 100;
        pointer-events: none;
    }

    .combat-drawer > * {
        pointer-events: auto;
    }

    /* Toggle Tab */
    .drawer-tab {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 80px;
        background: rgba(10, 10, 18, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left: none;
        border-radius: 0 8px 8px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        transition: all 0.2s;
        color: #888;
    }

    .combat-drawer.open .drawer-tab {
        left: 320px;
    }

    .drawer-tab:hover {
        background: rgba(20, 20, 30, 0.95);
        color: #fff;
        border-color: #00ffff44;
    }

    .tab-icon {
        font-size: 16px;
    }

    .tab-label {
        font-size: 10px;
        font-family: monospace;
    }

    /* Drawer Content */
    .drawer-content {
        width: 320px;
        height: 100%;
        background: rgba(10, 10, 18, 0.98);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
        box-shadow: 4px 0 20px rgba(0, 0, 0, 0.5);
    }

    /* Responsive drawer width */
    @media (max-width: 1400px) {
        .drawer-content {
            width: 280px;
        }
        .combat-drawer.open .drawer-tab {
            left: 280px;
        }
    }

    @media (max-width: 1100px) {
        .drawer-content {
            width: 240px;
        }
        .combat-drawer.open .drawer-tab {
            left: 240px;
        }
    }

    .drawer-header {
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }

    .drawer-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
        color: #eee;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: "Exo", sans-serif;
    }

    .battle-count {
        font-size: 11px;
        color: #666;
        font-family: monospace;
    }

    /* Battles List */
    .battles-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #555;
        text-align: center;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    .empty-state p {
        margin: 4px 0;
    }

    .hint {
        font-size: 11px;
        color: #444;
    }

    /* Battle Card */
    .battle-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-left: 3px solid var(--result-color);
        border-radius: 6px;
        overflow: hidden;
        transition: all 0.15s;
    }

    .battle-card:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
    }

    .battle-card.expanded {
        background: rgba(255, 255, 255, 0.04);
    }

    /* Battle Summary */
    .battle-summary {
        width: 100%;
        padding: 10px 12px;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #ddd;
        font-family: inherit;
        text-align: left;
    }

    .summary-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .result-icon {
        font-size: 18px;
    }

    .battle-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .battle-target {
        font-size: 12px;
        font-weight: 600;
        color: #eee;
    }

    .battle-meta {
        font-size: 10px;
        color: #666;
        font-family: monospace;
    }

    .summary-right {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        font-family: monospace;
    }

    .damage-dealt {
        color: #ef4444;
    }

    .damage-taken {
        color: #888;
    }

    .expand-icon {
        color: #555;
        font-size: 10px;
        width: 12px;
    }

    /* Battle Details (expanded) */
    .battle-details {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(0, 0, 0, 0.2);
    }

    .tick-entries {
        max-height: 300px;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .tick-entry {
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 4px;
        border-left: 2px solid #888;
        font-size: 11px;
    }

    .entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
    }

    .tick {
        font-family: "Exo", monospace;
        font-weight: bold;
        color: #88aaff;
    }

    .result-badge {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
    }

    .entry-stats {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .stat-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .stat-label {
        width: 28px;
        font-size: 9px;
        font-weight: bold;
        color: #666;
    }

    .stat-ships {
        flex: 1;
        color: #aaa;
    }

    .stat-losses {
        display: flex;
        gap: 6px;
    }

    .kills {
        color: #ef4444;
    }

    .disabled {
        color: #888;
    }

    /* Scrollbar styling */
    .battles-list::-webkit-scrollbar,
    .tick-entries::-webkit-scrollbar {
        width: 6px;
    }

    .battles-list::-webkit-scrollbar-track,
    .tick-entries::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
    }

    .battles-list::-webkit-scrollbar-thumb,
    .tick-entries::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }

    .battles-list::-webkit-scrollbar-thumb:hover,
    .tick-entries::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    /* Raw log entries (fallback) */
    .raw-log-entry {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        font-size: 11px;
        border-left: 2px solid #666;
    }

    .raw-log-entry .tick {
        color: #88aaff;
        font-family: monospace;
        font-weight: bold;
        min-width: 40px;
    }

    .raw-log-entry .actors {
        flex: 1;
        color: #ccc;
    }

    .raw-log-entry .result {
        font-weight: bold;
        font-size: 10px;
        text-transform: uppercase;
    }

    /* Combat stat values */
    .stat-losses .kills {
        color: #ff6666;
        margin-right: 4px;
    }

    .stat-losses .disabled {
        color: #ffaa44;
        margin-right: 4px;
    }

    .stat-losses .captured {
        color: #ff4466;
        margin-right: 4px;
    }

    .stat-losses .escaped {
        color: #66ff88;
        margin-right: 4px;
    }

    .stat-losses .zero {
        opacity: 0.4;
    }
</style>
