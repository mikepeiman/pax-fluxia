<script lang="ts">
    interface Props {
        summary: string;
        selectedRoomLabel: string | null;
        startDisabled: boolean;
        createDisabled: boolean;
        joinDisabled: boolean;
        onStart: () => void;
        onCreateLobby: () => void;
        onJoinSelected: () => void;
    }

    let {
        summary,
        selectedRoomLabel,
        startDisabled,
        createDisabled,
        joinDisabled,
        onStart,
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
    </div>
</div>

<style>
    .command-bar {
        position: sticky;
        bottom: 12px;
        z-index: 18;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: center;
        padding: 14px 16px;
        border-radius: 20px;
        border: 1px solid var(--pf-border-soft);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 42%),
            rgba(5, 12, 24, 0.92);
        backdrop-filter: blur(20px);
        box-shadow:
            0 22px 44px rgba(0, 0, 0, 0.34),
            0 0 0 1px rgba(255, 255, 255, 0.02);
    }

    .command-bar__meta {
        display: grid;
        gap: 4px;
        min-width: 0;
    }

    .command-bar__eyebrow {
        font-family: "Rajdhani", sans-serif;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--pf-heading);
    }

    .command-bar__summary {
        font-family: "Oxanium", sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: var(--pf-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .command-bar__room {
        font-family: "Rajdhani", sans-serif;
        font-size: 0.92rem;
        color: var(--pf-muted);
    }

    .command-bar__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .command-bar__button {
        min-width: 150px;
        min-height: 46px;
        padding: 0 18px;
        border-radius: 14px;
        border: 1px solid var(--pf-border-soft);
        background: rgba(255, 255, 255, 0.04);
        color: var(--pf-text);
        font-family: "Rajdhani", sans-serif;
        font-size: 1rem;
        font-weight: 700;
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
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
    }

    .command-bar__button--primary {
        border-color: var(--pf-accent-soft);
        background: linear-gradient(135deg, var(--pf-cta-start-a), var(--pf-cta-start-b));
        color: #f7fcff;
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
