<script lang="ts">
    import { gameStore } from "$lib/stores/gameStore.svelte";
    import {
        armTrace,
        forceDownloadTrace,
        isTraceArmed,
        isTraceCapturing,
    } from "$lib/debug/travelTrace";

    interface Props {
        onSettingsClick?: () => void;
        onHelpClick?: () => void;
        onFitViewport?: () => void;
    }

    let { onSettingsClick, onHelpClick, onFitViewport }: Props = $props();

    const isInGame = $derived(gameStore.currentView === "game");
    const isInMenu = $derived(gameStore.currentView === "menu");
    let traceArmed = $state(false);
    let traceCapturing = $state(false);

    function handleArmTrace() {
        armTrace();
        traceArmed = true;
        traceCapturing = false;
    }

    function handleDownloadTrace() {
        forceDownloadTrace();
        traceArmed = false;
        traceCapturing = false;
    }
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
        {#if isInGame}
            <!-- Hidden 2026-02-19: developer debug tool, not user-facing
            <button
                class="top-bar-btn trace-btn"
                class:armed={traceArmed}
                class:capturing={traceCapturing}
                onclick={handleArmTrace}
                title="Arm travel trace — captures next transfer event"
            >
                {traceArmed
                    ? "🔴 ARMED"
                    : traceCapturing
                      ? "⏺ CAPTURING"
                      : "🎯 Trace"}
            </button>
            <button
                class="top-bar-btn trace-btn"
                onclick={handleDownloadTrace}
                title="Download trace data"
            >
                📥 DL
            </button>
            -->
        {/if}
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

<!-- Fit-to-viewport button — fixed bottom-right, left of help -->
{#if onFitViewport}
    <button class="fit-fab" onclick={onFitViewport} title="Fit to Viewport (F)">
        ⛶
    </button>
{/if}

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

    .trace-btn {
        font-size: 0.6rem;
        padding: 3px 8px;
        margin-right: 4px;
    }

    .trace-btn.armed {
        border-color: rgba(255, 60, 60, 0.5);
        color: #ff6666;
    }

    .trace-btn.capturing {
        border-color: rgba(255, 165, 0, 0.5);
        color: #ffa500;
        animation: pulse 1s infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
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

    /* Fit-to-viewport FAB — left of help */
    .fit-fab {
        position: fixed;
        bottom: 20px;
        right: 64px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(20, 20, 30, 0.7);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.4);
        font-size: 1rem;
        cursor: pointer;
        z-index: 200;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .fit-fab:hover {
        color: #fff;
        border-color: rgba(0, 255, 255, 0.4);
        background: rgba(20, 20, 30, 0.9);
        box-shadow: 0 0 12px rgba(0, 255, 255, 0.15);
    }
</style>
