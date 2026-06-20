<script lang="ts">
    interface Props {
        summary: string;
        selectedRoomLabel: string | null;
        startDisabled: boolean;
        loadMapDisabled: boolean;
        createDisabled: boolean;
        joinDisabled: boolean;
        onOpenEditor?: () => void;
        onStart: () => void;
        onLoadMap: () => void;
        onCreateLobby: () => void;
        onJoinSelected: () => void;
    }

    let {
        summary,
        selectedRoomLabel,
        startDisabled,
        loadMapDisabled,
        createDisabled,
        joinDisabled,
        onOpenEditor,
        onStart,
        onLoadMap,
        onCreateLobby,
        onJoinSelected,
    }: Props = $props();
</script>

<div class="command-bar">
    <div class="command-bar__meta">
        <span class="command-bar__eyebrow">Command Band</span>
        <strong class="command-bar__summary">{summary}</strong>
        <span class="command-bar__room">
            {selectedRoomLabel ? `Selected Room: ${selectedRoomLabel}` : "Select a public room to join."}
        </span>
    </div>

    <div class="command-bar__actions">
        <button
            type="button"
            class="command-bar__button command-bar__button--primary"
            disabled={startDisabled}
            onclick={onStart}
        >
            Start Game
        </button>
        <button
            type="button"
            class="command-bar__button"
            disabled={loadMapDisabled}
            onclick={onLoadMap}
        >
            Load Map
        </button>
        <button
            type="button"
            class="command-bar__button"
            disabled={createDisabled}
            onclick={onCreateLobby}
        >
            Create Lobby
        </button>
        <button
            type="button"
            class="command-bar__button"
            disabled={joinDisabled}
            onclick={onJoinSelected}
        >
            Join Selected
        </button>
        {#if onOpenEditor}
            <button
                type="button"
                class="command-bar__button"
                onclick={onOpenEditor}
            >
                Map Editor
            </button>
        {/if}
    </div>
</div>

<style>
    .command-bar {
        position: sticky;
        bottom: 12px;
        z-index: 18;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--pax-space-4);
        align-items: center;
        padding: var(--pax-gap-md) var(--pax-space-4);
        border-radius: var(--pf-topbar-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-command), var(--pf-surface-command);
        backdrop-filter: blur(20px);
        box-shadow: var(--pf-shadow-elevated);
        overflow: hidden;
        isolation: isolate;
    }

    .command-bar::before {
        content: "";
        position: absolute;
        inset: 0;
        background: center / cover no-repeat var(--pf-theme-banner-art);
        opacity: 0.14;
        pointer-events: none;
        mix-blend-mode: screen;
    }

    .command-bar > * {
        position: relative;
        z-index: 1;
    }

    .command-bar__meta {
        display: grid;
        gap: var(--pax-space-1);
        min-width: 0;
    }

    .command-bar__eyebrow {
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-xs);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--pf-heading);
    }

    .command-bar__summary {
        font-family: var(--pf-font-display);
        font-size: var(--pax-type-base);
        font-weight: var(--pax-weight-bold);
        color: var(--pf-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .command-bar__room {
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-sm-plus);
        color: var(--pf-muted);
    }

    .command-bar__actions {
        display: flex;
        gap: var(--pax-gap-sm);
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .command-bar__button {
        min-width: 150px;
        min-height: 46px;
        padding: 0 var(--pax-gap-lg);
        border-radius: var(--pf-button-radius);
        border: 1px solid var(--pf-border-soft);
        background: var(--pf-frame-control), var(--pf-surface-control);
        color: var(--pf-text);
        font-family: var(--pf-font-body);
        font-size: var(--pax-type-base);
        font-weight: var(--pax-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background 0.15s ease,
            transform 0.15s ease,
            color 0.15s ease;
    }

    .command-bar__button:hover:enabled {
        border-color: var(--pf-accent-soft);
        background: var(--pf-frame-control), var(--pf-surface-control-hover);
        transform: translateY(-1px);
    }

    .command-bar__button--primary {
        border-color: var(--pf-accent-soft);
        background: linear-gradient(135deg, var(--pf-cta-start-a), var(--pf-cta-start-b));
        color: var(--pf-text-on-accent);
    }

    .command-bar__button:disabled {
        opacity: 0.44;
        cursor: not-allowed;
    }

    @media (max-width: 900px) {
        .command-bar {
            grid-template-columns: 1fr;
        }

        .command-bar__actions {
            justify-content: stretch;
        }

        .command-bar__button {
            flex: 1 1 0;
            min-width: 0;
        }
    }

    @media (max-width: 640px) {
        .command-bar__actions {
            display: grid;
            grid-template-columns: 1fr;
        }
    }
</style>
