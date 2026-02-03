<script lang="ts">
    import { combatLog } from "$lib/stores/combatLogStore";
    import { fade } from "svelte/transition";
    import type { CombatLogEntry } from "$lib/stores/combatLogStore";

    let visible = $state(true);

    function toggle() {
        visible = !visible;
    }

    // Helper to map result to color
    function getResultColor(result: string) {
        switch (result) {
            case "CONQUERED":
                return "#ef4444"; // Red
            case "DEFENSE":
                return "#3b82f6"; // Blue
            case "FALLING":
                return "#eab308"; // Yellow
            default:
                return "#888888";
        }
    }

    // Helper to generate legacy-style message from structured data
    function getMessage(log: CombatLogEntry) {
        const attId = log.attacker.ownerId === "human-player" ? "You" : "Enemy";
        const defId = log.defender.ownerId === "human-player" ? "You" : "Enemy";
        const target = log.defender.id.replace("star-", "");

        if (log.result === "CONQUERED") {
            return `${attId} CONQUERED Star ${target} from ${defId} using ${log.attacker.ships.toFixed(0)} ships.`;
        }

        return `${attId} attacked Star ${target}. Defense held with ${log.defender.ships.toFixed(0)} ships remaining.`;
    }
</script>

<div class="combat-panel" class:collapsed={!visible}>
    <div class="header" onclick={toggle}>
        <h3>⚔️ Combat Log</h3>
        <span class="toggle">{visible ? "▼" : "▲"}</span>
    </div>

    {#if visible}
        <div class="logs" transition:fade>
            {#if $combatLog.length === 0}
                <div class="empty">No combat recorded yet.</div>
            {/if}
            {#each $combatLog as log (log.id)}
                <div
                    class="log-entry"
                    style="border-left: 4px solid {getResultColor(log.result)}"
                >
                    <div class="log-header">
                        <span class="tick">T{log.tick}</span>
                        <span class="star"
                            >★ {log.defender.id.replace("star-", "")}</span
                        >
                        <span class="result">{log.result}</span>
                    </div>
                    <div class="log-message">
                        {getMessage(log)}
                    </div>
                    <div class="log-stats">
                        <span class="stat"
                            >⚔️ Att: {log.attacker.ships.toFixed(1)}</span
                        >
                        <span class="stat"
                            >🛡️ Def: {log.defender.ships.toFixed(1)}</span
                        >
                        {#if log.attacker.kills > 0}
                            <span class="stat kill"
                                >☠️ {log.attacker.kills.toFixed(0)}</span
                            >
                        {/if}
                        {#if log.attacker.disabled > 0}
                            <span class="stat hit"
                                >🤕 {log.attacker.disabled.toFixed(0)}</span
                            >
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .combat-panel {
        display: flex;
        flex-direction: column;
        background: rgba(10, 10, 18, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        margin: 10px;
        max-height: 300px;
        font-family: "Exo", sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .collapsed {
        height: auto;
        min-height: 0;
    }

    .header {
        padding: 10px 15px;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 8px 8px 0 0;
    }

    .header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
        color: #eee;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .logs {
        overflow-y: auto;
        flex: 1;
        padding: 5px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .log-entry {
        background: rgba(255, 255, 255, 0.03);
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
    }

    .log-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        color: #88aaff;
        font-weight: bold;
    }

    .log-message {
        margin-bottom: 6px;
        color: #ccc;
        line-height: 1.4;
    }

    .log-stats {
        display: flex;
        gap: 10px;
        color: #888;
        font-size: 11px;
    }

    .dmg {
        color: #ff6666;
    }
    .kill {
        color: #ff4444;
        font-weight: bold;
    }
    .hit {
        color: #aaaaaa;
    }

    .empty {
        padding: 20px;
        text-align: center;
        color: #555;
    }
</style>
