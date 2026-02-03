<script lang="ts">
    import { combatLog, type CombatLogEntry } from "$lib/stores/combatLogStore";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { fade, slide } from "svelte/transition";

    let visible = $state(true);
    let showSettings = $state(false);

    // Battle Aggregation Logic
    interface BattleGroup {
        id: string;
        key: string; // attackerId-defenderId
        startTime: number;
        lastTick: number;
        attacker: {
            id: string;
            ownerId: string;
            startShips: number;
            currentShips: number;
        };
        defender: {
            id: string;
            ownerId: string;
            startShips: number;
            currentShips: number;
        };
        logs: CombatLogEntry[];
        status: "ACTIVE" | "CONQUERED" | "DEFENDED";
        expanded: boolean;
    }

    let battles = $derived(aggregateBattles($combatLog));

    function aggregateBattles(logs: CombatLogEntry[]): BattleGroup[] {
        const groups: BattleGroup[] = [];
        const battleMap = new Map<string, BattleGroup>();

        // Process logs roughly distinct battles
        // We iterate backwards (newest first) to find the "latest" battle for a pair
        // actually, let's just group them linearly.
        // But logs are appended NEWEST first (slice(0,50)).

        // We want to display LATEST battles at top.

        for (const log of logs) {
            const key = `${log.attacker.id}-${log.defender.id}`;

            // Check if we have an active battle group for this key
            // For simplicity in this view, we just group ALL recent logs for a pair into one card
            // unless there is a huge tick gap?

            let group = battleMap.get(key);

            if (!group) {
                group = {
                    id: key, // Simple key-based ID for now
                    key,
                    startTime: log.tick,
                    lastTick: log.tick,
                    attacker: {
                        id: log.attacker.id,
                        ownerId: log.attacker.ownerId,
                        startShips: log.attacker.ships, // Determines "Start" from the *first* log encountered? (which is newest). No.
                        currentShips: log.attacker.ships,
                    },
                    defender: {
                        id: log.defender.id,
                        ownerId: log.defender.ownerId,
                        startShips: log.defender.ships,
                        currentShips: log.defender.ships,
                    },
                    logs: [],
                    status: "ACTIVE",
                    expanded: false,
                };
                groups.push(group);
                battleMap.set(key, group);
            }

            // Update status if any log says conquered
            if (log.result === "CONQUERED") {
                group.status = "CONQUERED";
            } else if (
                log.result === "DEFENSE" &&
                group.status !== "CONQUERED"
            ) {
                // Keep active
            }

            // Add log
            group.logs.push(log);

            // Update timestamps (min/max)
            group.startTime = Math.min(group.startTime, log.tick);
            group.lastTick = Math.max(group.lastTick, log.tick);
        }

        // Sort battles by lastTick (Newest first)
        return groups.sort((a, b) => b.lastTick - a.lastTick);
    }

    function toggleBattle(battle: BattleGroup) {
        battle.expanded = !battle.expanded;
    }

    // Helper for Player Colors (matches GameCanvas vaguely)
    function getOwnerColor(id: string): string {
        if (id?.includes("p1") || id === "player") return "#3b82f6"; // Blue
        if (id?.includes("ai")) return "#ef4444"; // Red
        return "#6b7280"; // Grey/Neutral
    }

    function toggle() {
        visible = !visible;
    }
</script>

<div class="combat-panel" class:collapsed={!visible}>
    <button class="header" onclick={toggle}>
        <h3>⚔️ Combat Log</h3>
        <span class="toggle">{visible ? "▼" : "▲"}</span>
    </button>

    {#if visible}
        <div class="panel-content" transition:fade>
            <!-- Settings Toggle -->
            <button
                class="settings-toggle"
                onclick={() => (showSettings = !showSettings)}
            >
                ⚙️ Settings {showSettings ? "▲" : "▼"}
            </button>

            {#if showSettings}
                <div class="settings-row" transition:fade>
                    <span class="setting"
                        >Aggressor: <b
                            >{GAME_CONFIG.AGGRESSOR_ADVANTAGE.toFixed(2)}</b
                        ></span
                    >
                    <span class="setting"
                        >Lethality: <b>{GAME_CONFIG.LETHALITY.toFixed(2)}</b
                        ></span
                    >
                    <span class="setting"
                        >Conquest: <b>{GAME_CONFIG.CONQUEST_THRESHOLD}x</b
                        ></span
                    >
                </div>
            {/if}

            <div class="battles-list">
                {#if battles.length === 0}
                    <div class="empty">No active combat.</div>
                {/if}

                {#each battles as battle (battle.id)}
                    <div class="battle-card">
                        <!-- BATTLE SUMMARY CARD -->
                        <button
                            class="card-header"
                            onclick={() => toggleBattle(battle)}
                            class:conquered={battle.status === "CONQUERED"}
                        >
                            <div class="battle-info">
                                <!-- P1 Attacking P2 Visual -->
                                <div
                                    class="player-pill"
                                    style="border-color: {getOwnerColor(
                                        battle.attacker.ownerId,
                                    )}"
                                >
                                    <div
                                        class="p-dot"
                                        style="background: {getOwnerColor(
                                            battle.attacker.ownerId,
                                        )}"
                                    ></div>
                                    <span class="ship-val"
                                        >{Math.round(
                                            battle.attacker.currentShips,
                                        )}</span
                                    >
                                </div>

                                <span class="arrow">➔</span>

                                <div
                                    class="player-pill"
                                    style="border-color: {getOwnerColor(
                                        battle.defender.ownerId,
                                    )}"
                                >
                                    <div
                                        class="p-dot"
                                        style="background: {getOwnerColor(
                                            battle.defender.ownerId,
                                        )}"
                                    ></div>
                                    <span class="ship-val"
                                        >{Math.round(
                                            battle.defender.currentShips,
                                        )}</span
                                    >
                                </div>
                            </div>

                            <div class="status-badge">
                                {#if battle.status === "CONQUERED"}
                                    <span class="stat-conq">★</span>
                                {:else}
                                    <span class="stat-active">⚔️</span>
                                {/if}
                                <span class="ticks">{battle.logs.length}t</span>
                            </div>
                        </button>

                        <!-- DRAWER: DETAILED LOGS -->
                        {#if battle.expanded}
                            <div class="drawer" transition:slide>
                                {#each battle.logs as log}
                                    <div class="tick-row">
                                        <span class="t-num">T{log.tick}</span>
                                        <div class="exchange">
                                            <span class="att loss"
                                                >-{Math.round(
                                                    log.attacker.kills,
                                                )}</span
                                            >
                                            <span class="sep">|</span>
                                            <span class="def loss"
                                                >-{Math.round(
                                                    log.defender.kills,
                                                )}</span
                                            >
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .combat-panel {
        width: 100%;
        max-height: 100%;
        color: #fff;
        display: flex;
        flex-direction: column;
        transition: height 0.3s ease;
    }

    .combat-panel.collapsed {
        height: 38px;
        overflow: hidden;
    }

    .header {
        padding: 10px;
        background: #111;
        border: none;
        border-bottom: 2px solid #333;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #fff;
        flex-shrink: 0;
    }

    .header h3 {
        margin: 0;
        font-family: "Exo", sans-serif;
        font-size: 14px;
    }

    .panel-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex: 1;
        background: rgba(0, 0, 0, 0.5);
    }

    .settings-toggle {
        padding: 5px 10px;
        background: #222;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 10px;
        text-align: left;
    }

    .settings-row {
        padding: 8px;
        background: #151520;
        display: flex;
        gap: 8px;
        border-bottom: 1px solid #333;
    }
    .setting {
        font-size: 10px;
        color: #aaa;
    }
    .setting b {
        color: #fff;
    }

    .battles-list {
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
    }

    .battle-card {
        background: rgba(30, 30, 40, 0.9);
        border: 1px solid #445;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: transparent;
        border: none;
        cursor: pointer;
        width: 100%;
        transition: background 0.2s;
    }
    .card-header:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    .card-header.conquered {
        border-left: 3px solid #22c55e;
    }

    .battle-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .player-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid #555;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.3);
    }

    .p-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .ship-val {
        font-family: "Exo", sans-serif;
        font-weight: 700;
        font-size: 13px;
        color: #fff;
    }

    .arrow {
        color: #666;
        font-size: 10px;
    }

    .status-badge {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
    .stat-conq {
        color: #22c55e;
        font-size: 14px;
    }
    .stat-active {
        color: #fbbf24;
        font-size: 12px;
    }
    .ticks {
        font-size: 9px;
        color: #666;
    }

    .drawer {
        background: #111;
        border-top: 1px solid #333;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 200px;
        overflow-y: auto;
    }

    .tick-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #888;
        padding: 2px 0;
        border-bottom: 1px solid #222;
    }
    .exchange {
        display: flex;
        gap: 8px;
    }
    .att.loss {
        color: #ef4444;
    }
    .def.loss {
        color: #ef4444;
    }
    .t-num {
        font-family: monospace;
        opacity: 0.5;
    }

    .empty {
        padding: 20px;
        text-align: center;
        color: #555;
    }
</style>
