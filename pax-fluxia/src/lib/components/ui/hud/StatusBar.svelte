<script lang="ts">
    import HudIcon from "./HudIcon.svelte";
    import type { PlayerState } from "$lib/types/game.types";
    import { activeGameStore } from "$lib/stores/activeGameStore.svelte";

    interface Props {
        players: PlayerState[];
        localPlayerId?: string;
        isMuted?: boolean;
        onToggleMute?: () => void;
        onToggleSettings?: () => void;
    }

    let {
        players,
        localPlayerId,
        isMuted = false,
        onToggleMute,
        onToggleSettings,
    }: Props = $props();

    const sortedPlayers = $derived(
        [...players].sort((a, b) => (b.totalShips ?? 0) - (a.totalShips ?? 0)),
    );

    const gameTotals = $derived.by(() => {
        let active = 0;
        let damaged = 0;
        for (const p of players) {
            active += p.activeShips ?? 0;
            damaged += p.damagedShips ?? 0;
        }
        return { active, damaged };
    });

    const currentTick = $derived(activeGameStore.currentTick ?? 0);

    function isLocalPlayer(p: PlayerState): boolean {
        return p.sessionId === localPlayerId || p.id === localPlayerId;
    }
</script>

<div class="statusbar">
    <div class="sb-swatch-wrap">
        <button
            class="sb-swatch-btn"
            onclick={onToggleSettings}
            title="Settings"
        >
            {#if localPlayerId}
                {@const local = players.find((p) => isLocalPlayer(p))}
                {#if local}
                    <div
                        class="swatch-outer"
                        style={`background:${local.color}40; border-color:${local.color};`}
                    >
                        <div
                            class="swatch-inner"
                            style={`background:${local.color};`}
                        ></div>
                    </div>
                {/if}
            {/if}
            <span class="swatch-gear"><HudIcon name="settings" size={12} /></span>
        </button>
        {#if onToggleMute}
            <button
                class="sb-mute-btn"
                onclick={onToggleMute}
                title={isMuted ? "Unmute" : "Mute"}
            >
                <HudIcon name={isMuted ? "close" : "audio"} size={14} />
            </button>
        {/if}
    </div>

    <div class="sb-leaders">
        {#each sortedPlayers as player}
            <div
                class="sb-player"
                class:is-self={isLocalPlayer(player)}
                title={`${player.name}: ${player.totalShips ?? 0} ships`}
            >
                <span class="sb-dot" style={`background:${player.color};`}></span>
                <span class="sb-ships font-hud-data">{player.totalShips ?? 0}</span>
            </div>
        {/each}
    </div>

    <div class="sb-stats">
        <span class="sb-stat" title="Active / Damaged ships">
            <HudIcon name="ship-active" size={12} />
            <span class="font-hud-data">{gameTotals.active}</span>
            <span class="sb-dim font-hud-data">/{gameTotals.damaged}</span>
        </span>
        <span class="sb-stat sb-tick" title="Current tick">
            <span class="font-hud-data">T:{currentTick}</span>
        </span>
    </div>
</div>

<style>
    .statusbar,
    .sb-swatch-wrap,
    .sb-player,
    .sb-stats,
    .sb-stat {
        display: flex;
        align-items: center;
    }

    .statusbar {
        grid-area: statusbar;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 8px;
        padding: 6px 10px;
        background: rgba(5, 10, 25, 0.94);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--hud-divider);
        min-height: 36px;
        z-index: 100;
        font-family: var(--hud-font-ui);
        font-size: 0.62rem;
        color: var(--hud-text);
        overflow: hidden;
    }

    @media (min-width: 1025px) {
        .statusbar {
            display: none;
        }
    }

    .sb-swatch-wrap {
        gap: 6px;
        flex-shrink: 0;
    }

    .sb-swatch-btn,
    .sb-mute-btn {
        border: 1px solid var(--hud-border);
        background: rgba(9, 16, 31, 0.86);
        color: var(--hud-text-soft);
        cursor: pointer;
    }

    .sb-swatch-btn {
        position: relative;
        width: 30px;
        height: 30px;
        padding: 0;
        border-radius: 10px;
    }

    .swatch-outer {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        border: 1px solid;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .swatch-inner {
        width: 14px;
        height: 14px;
        border-radius: 4px;
    }

    .swatch-gear {
        position: absolute;
        bottom: -3px;
        right: -3px;
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(6, 10, 20, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sb-mute-btn {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        padding: 0;
    }

    .sb-leaders {
        display: flex;
        gap: 6px;
        overflow: hidden;
        justify-content: center;
        flex-wrap: nowrap;
    }

    .sb-player {
        gap: 4px;
        flex-shrink: 0;
        opacity: 0.74;
    }

    .sb-player.is-self {
        opacity: 1;
        color: var(--hud-accent-warm);
    }

    .sb-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        flex-shrink: 0;
    }

    .sb-ships {
        font-size: 0.62rem;
    }

    .sb-stats {
        gap: 8px;
        justify-content: flex-end;
        flex-shrink: 0;
        white-space: nowrap;
    }

    .sb-stat {
        gap: 4px;
        font-size: 0.62rem;
    }

    .sb-dim {
        opacity: 0.56;
    }

    .sb-tick {
        color: var(--hud-accent);
    }

    @media (max-width: 1024px) and (orientation: landscape) {
        .statusbar {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto;
            padding: 6px 4px;
            border-bottom: none;
            border-right: 1px solid var(--hud-divider);
            width: 56px;
            min-height: 0;
            height: 100%;
            max-height: 100dvh;
            gap: 4px;
        }

        .sb-swatch-wrap {
            flex-direction: column;
            gap: 4px;
        }

        .sb-leaders {
            flex-direction: column;
            align-items: center;
            gap: 4px;
            overflow: hidden;
        }

        .sb-player {
            flex-direction: column;
            gap: 2px;
        }

        .sb-stats {
            flex-direction: column;
            gap: 4px;
            align-items: center;
        }
    }
</style>
