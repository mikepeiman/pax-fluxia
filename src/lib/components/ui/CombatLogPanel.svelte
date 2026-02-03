<script lang="ts">
    import { combatLog, STAR_TYPE_COLORS } from "$lib/stores/combatLogStore";
    import { GAME_CONFIG } from "$lib/config/game.config";
    import { fade } from "svelte/transition";

    let visible = $state(true);
    let showSettings = $state(false);

    function toggle() {
        visible = !visible;
    }

    function getTypeColor(starType: string): string {
        return STAR_TYPE_COLORS[starType] || STAR_TYPE_COLORS.grey;
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
                        >Dmg: <b>{GAME_CONFIG.DAMAGE_PER_SHIP.toFixed(2)}</b
                        ></span
                    >
                    <span class="setting"
                        >Lethality: <b>{GAME_CONFIG.LETHALITY.toFixed(2)}</b
                        ></span
                    >
                    <span class="setting"
                        >Force: <b
                            >{GAME_CONFIG.FORCE_RATIO_EFFECT.toFixed(2)}</b
                        ></span
                    >
                    <span class="setting"
                        >RR: <b>{GAME_CONFIG.REPAIR_RATE.toFixed(2)}</b></span
                    >
                </div>
            {/if}

            <div class="logs">
                {#if $combatLog.length === 0}
                    <div class="empty">No combat recorded yet.</div>
                {/if}
                {#each $combatLog as log (log.id)}
                    <div class="log-entry">
                        <div class="log-header">
                            <span class="tick">T{log.tick}</span>
                            <span
                                class="result"
                                class:defense={log.result === "DEFENSE"}
                                class:falling={log.result === "FALLING"}
                                class:conquered={log.result === "CONQUERED"}
                            >
                                {log.result}
                            </span>
                        </div>

                        <!-- Attacker row -->
                        <div class="combatant attacker">
                            <span
                                class="star-type"
                                style="background: {getTypeColor(
                                    log.attacker.starType,
                                )}">{log.attacker.starType.toUpperCase()}</span
                            >
                            <span class="star-id">{log.attacker.id}</span>
                            <span class="ships">({log.attacker.ships})</span>
                            <span class="role att">ATT</span>
                            <span class="losses"
                                >-{log.attacker.kills}☠️ -{log.attacker
                                    .disabled}🤕</span
                            >
                        </div>

                        <!-- Defender row -->
                        <div class="combatant defender">
                            <span
                                class="star-type"
                                style="background: {getTypeColor(
                                    log.defender.starType,
                                )}">{log.defender.starType.toUpperCase()}</span
                            >
                            <span class="star-id">{log.defender.id}</span>
                            <span class="ships">({log.defender.ships})</span>
                            <span class="role def">DEF</span>
                            <span class="losses"
                                >-{log.defender.kills}☠️ -{log.defender
                                    .disabled}🤕</span
                            >
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    .combat-panel {
        height: 100%;
        background: rgba(10, 10, 15, 0.95);
        border-right: 1px solid #334;
        color: #eee;
        font-family: "Consolas", "Monaco", monospace;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        box-shadow: 4px 0 12px rgba(0, 0, 0, 0.5);
    }

    .combat-panel.collapsed {
        width: 40px;
    }

    .header {
        padding: 10px;
        background: #1a1a25;
        border: none;
        border-bottom: 1px solid #334;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #eee;
    }

    .header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
    }

    .panel-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .settings-toggle {
        padding: 6px 10px;
        background: #222;
        border: none;
        border-bottom: 1px solid #334;
        color: #888;
        cursor: pointer;
        font-size: 10px;
        text-align: left;
    }

    .settings-row {
        padding: 8px;
        background: #1a1a20;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        border-bottom: 1px solid #334;
    }

    .setting {
        color: #888;
        font-size: 10px;
    }
    .setting b {
        color: #22c55e;
    }

    .logs {
        overflow-y: auto;
        flex: 1;
        padding: 5px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .log-entry {
        background: rgba(255, 255, 255, 0.03);
        padding: 8px;
        border-radius: 4px;
        border-left: 3px solid #ff6b35;
    }

    .log-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
    }

    .tick {
        color: #ff6b35;
        font-weight: bold;
    }

    .result {
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: bold;
        font-size: 10px;
    }
    .result.defense {
        background: #22c55e;
        color: #000;
    }
    .result.falling {
        background: #fbbf24;
        color: #000;
    }
    .result.conquered {
        background: #ef4444;
        color: #fff;
    }

    .combatant {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 0;
    }

    .star-type {
        padding: 1px 4px;
        border-radius: 2px;
        color: #000;
        font-weight: bold;
        font-size: 9px;
    }

    .star-id {
        color: #88aaff;
        font-weight: bold;
    }

    .ships {
        color: #aaa;
    }

    .role {
        padding: 1px 4px;
        border-radius: 2px;
        font-weight: bold;
        font-size: 9px;
    }
    .role.att {
        background: #4488ff;
        color: #fff;
    }
    .role.def {
        background: #ff4466;
        color: #fff;
    }

    .losses {
        color: #ff6b6b;
        font-size: 10px;
        margin-left: auto;
    }

    .empty {
        padding: 20px;
        text-align: center;
        color: #555;
    }
</style>
