<script lang="ts">
    import { combatLog } from "$lib/stores/combatLogStore";
    import { fade } from "svelte/transition";

    let visible = $state(true);

    function toggle() {
        visible = !visible;
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
                    style="border-left: 4px solid {log.color}"
                >
                    <div class="log-header">
                        <span class="tick">T{log.tick}</span>
                        <span class="star">★ {log.starName || log.starId}</span>
                        <span class="result">{log.result}</span>
                    </div>
                    <div class="log-message">
                        {log.message}
                    </div>
                    <div class="log-stats">
                        <span class="stat"
                            >⚔️ Att: {log.attackers.toFixed(1)}</span
                        >
                        <span class="stat"
                            >🛡️ Def: {log.defenders.toFixed(1)}</span
                        >
                        <span class="stat dmg" title="Total Damage Value"
                            >💥 {log.damage.toFixed(0)}</span
                        >
                        {#if log.shipsDamaged > 0}<span class="stat hit"
                                >🤕 {log.shipsDamaged.toFixed(0)}</span
                            >{/if}
                        {#if log.shipsDestroyed > 0}<span class="stat kill"
                                >☠️ {log.shipsDestroyed.toFixed(0)}</span
                            >{/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .combat-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        max-height: 400px;
        background: rgba(10, 10, 15, 0.95);
        border: 1px solid #334;
        border-radius: 8px;
        color: #eee;
        font-family: "Consolas", "Monaco", monospace;
        font-size: 12px;
        z-index: 900;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .combat-panel.collapsed {
        width: 150px;
        max-height: 40px;
    }

    .header {
        padding: 10px;
        background: #1a1a25;
        border-bottom: 1px solid #334;
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
        background: rgba(255, 255, 255, 0.05);
        padding: 8px;
        border-radius: 4px;
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

    .hit {
        color: #ffaa44;
    }

    .kill {
        color: #ff4444;
    }

    .empty {
        padding: 20px;
        text-align: center;
        color: #555;
    }
</style>
