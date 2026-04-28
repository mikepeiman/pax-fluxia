<script lang="ts">
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
        let active = 0,
            damaged = 0;
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
    <!-- Player swatch with settings gear overlay -->
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
                        style="background: {local.color}40; border-color: {local.color}"
                    >
                        <div
                            class="swatch-inner"
                            style="background: {local.color}"
                        ></div>
                    </div>
                {/if}
            {/if}
            <span class="swatch-gear">⚙</span>
        </button>
        {#if onToggleMute}
            <button
                class="sb-mute-btn"
                onclick={onToggleMute}
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? "🔇" : "🔊"}
            </button>
        {/if}
    </div>

    <!-- Minified leaderboard -->
    <div class="sb-leaders">
        {#each sortedPlayers as player, i}
            <div
                class="sb-player"
                class:is-self={isLocalPlayer(player)}
                title="{player.name}: {player.totalShips ?? 0} ships"
            >
                <span class="sb-dot" style="background: {player.color}"></span>
                <span class="sb-ships">{player.totalShips ?? 0}</span>
            </div>
        {/each}
    </div>

    <!-- Game stats -->
    <div class="sb-stats">
        <span class="sb-stat" title="Active / Damaged ships">
            🚀{gameTotals.active}<span class="sb-dim"
                >/{gameTotals.damaged}</span
            >
        </span>
        <span class="sb-stat sb-tick" title="Current tick">
            T:{currentTick}
        </span>
    </div>
</div>

<style>
    .statusbar {
        grid-area: statusbar;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 4px 10px;
        background: rgba(5, 10, 25, 0.92);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        min-height: 32px;
        z-index: 100;
        font-family: "Montserrat", sans-serif;
        font-size: 0.65rem;
        color: rgba(255, 255, 255, 0.7);
        overflow: hidden;
    }
    /* StatusBar is mobile-only — desktop uses TopBar + right sidebar */
    @media (min-width: 1025px) {
        .statusbar {
            display: none;
        }
    }

    /* ── Swatch + controls ── */
    .sb-swatch-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }
    .sb-swatch-btn {
        position: relative;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        flex-shrink: 0;
    }
    .swatch-outer {
        width: 100%;
        height: 100%;
        border-radius: 4px;
        border: 2px solid;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .swatch-inner {
        width: 14px;
        height: 14px;
        border-radius: 2px;
    }
    .swatch-gear {
        position: absolute;
        bottom: -3px;
        right: -3px;
        font-size: 0.85rem;
        line-height: 1;
        color: rgba(255, 255, 255, 0.8);
        text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
    }
    .sb-mute-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.75rem;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
    }
    .sb-mute-btn:active {
        color: #0ff;
    }

    /* ── Mini leaderboard ── */
    .sb-leaders {
        display: flex;
        gap: 6px;
        overflow: hidden;
        justify-content: center;
        flex-wrap: nowrap;
    }
    .sb-player {
        display: flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
        opacity: 0.7;
        transition: opacity 0.15s;
    }
    .sb-player.is-self {
        opacity: 1;
        font-weight: 700;
    }
    .sb-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .sb-ships {
        font-variant-numeric: tabular-nums;
        font-size: 0.6rem;
        color: rgba(255, 255, 255, 0.8);
    }

    /* ── Stats ── */
    .sb-stats {
        display: flex;
        gap: 6px;
        align-items: center;
        justify-content: flex-end;
        flex-shrink: 0;
        white-space: nowrap;
    }
    .sb-stat {
        font-variant-numeric: tabular-nums;
        font-size: 0.6rem;
    }
    .sb-dim {
        opacity: 0.5;
    }
    .sb-tick {
        color: rgba(0, 255, 255, 0.6);
    }

    /* ── Landscape: vertical left column ── */
    @media (max-width: 1024px) and (orientation: landscape) {
        .statusbar {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto;
            padding: 4px 2px;
            border-bottom: none;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            width: 50px;
            min-height: 0;
            height: 100%;
            max-height: 100dvh;
            overflow: hidden;
            gap: 4px;
        }
        .sb-swatch-wrap {
            flex-direction: column;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }
        .sb-swatch-btn {
            width: 42px;
            height: 42px;
        }
        .swatch-inner {
            width: 20px;
            height: 20px;
        }
        .swatch-gear {
            font-size: 1rem;
            bottom: -2px;
            right: -1px;
        }
        .sb-mute-btn {
            width: 28px;
            height: 28px;
            font-size: 0.85rem;
        }
        .sb-leaders {
            flex-direction: column;
            gap: 2px;
            justify-content: flex-start;
            align-items: center;
            overflow-y: auto;
            overflow-x: hidden;
            min-height: 0;
        }
        .sb-player {
            flex-direction: column;
            gap: 0;
            align-items: center;
        }
        .sb-ships {
            font-size: 0.5rem;
        }
        .sb-stats {
            flex-direction: column;
            gap: 1px;
            align-items: center;
            justify-content: flex-end;
            flex-shrink: 0;
        }
        .sb-stat {
            font-size: 0.45rem;
            text-align: center;
            white-space: nowrap;
        }
    }
</style>
