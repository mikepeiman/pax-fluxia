<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";

    interface Props {
        onSettingsClick?: () => void;
        onHelpClick?: () => void;
    }

    let { onSettingsClick, onHelpClick }: Props = $props();

    const isInGame = $derived(gameStore.currentView === "game");
    const isInMenu = $derived(gameStore.currentView === "menu");
</script>

<!-- Persistent top bar — always visible across all views -->
<div class="top-bar" class:in-game={isInGame}>
    <div class="top-bar-left">
        {#if isInGame}
            <button
                class="top-bar-btn back-btn"
                onclick={() => gameStore.setView("menu")}
                title="Return to Menu"
            >
                ← MENU
            </button>
        {/if}
    </div>

    <div class="top-bar-center">
        {#if isInGame}
            <span class="game-title-mini">PAX FLUXIA</span>
        {/if}
    </div>

    <div class="top-bar-right">
        {#if onSettingsClick}
            <button
                class="top-bar-btn icon-btn"
                onclick={onSettingsClick}
                title="Settings"
            >
                ⚙
            </button>
        {/if}
    </div>
</div>

<!-- Help button — fixed bottom-right, always visible -->
{#if onHelpClick}
    <button class="help-fab" onclick={onHelpClick} title="Help & Controls">
        ?
    </button>
{/if}

<style>
    .top-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 40px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        grid-template-areas: "left center right";
        align-items: center;
        padding: 0 16px;
        z-index: 200;
        pointer-events: none;
        transition: background 0.3s ease;
    }

    .top-bar.in-game {
        background: linear-gradient(
            180deg,
            rgba(5, 5, 16, 0.85) 0%,
            rgba(5, 5, 16, 0) 100%
        );
    }

    .top-bar-left {
        grid-area: left;
        display: flex;
        align-items: center;
        pointer-events: auto;
    }

    .top-bar-center {
        grid-area: center;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
    }

    .top-bar-right {
        grid-area: right;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        pointer-events: auto;
    }

    .game-title-mini {
        font-family: "Exo", sans-serif;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: rgba(255, 255, 255, 0.25);
        text-transform: uppercase;
    }

    .top-bar-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.5);
        font-family: "Montserrat", sans-serif;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .top-bar-btn:hover {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.05);
    }

    .icon-btn {
        font-size: 1.1rem;
        padding: 4px 8px;
        line-height: 1;
    }

    .back-btn {
        font-size: 0.65rem;
    }

    /* Help FAB — fixed bottom-right */
    .help-fab {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(20, 20, 30, 0.7);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.4);
        font-family: "Exo", sans-serif;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        z-index: 200;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .help-fab:hover {
        color: #fff;
        border-color: rgba(0, 255, 255, 0.4);
        background: rgba(20, 20, 30, 0.9);
        box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
    }
</style>
