<script lang="ts">
  import { gameStore } from "$lib/stores/gameStore.svelte";
  import { PaxHudButton, PaxHudIconButton } from "$lib/design-system";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  let saveName = $state("");

  function defaultName(): string {
    return `Save ${gameStore.savedGames.length + 1}`;
  }

  function save() {
    const name = saveName.trim() || defaultName();
    gameStore.saveCurrentGame(name);
    saveName = "";
  }

  function fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }
</script>

<div class="save-load">
  <div class="save-load__form">
    <input
      class="save-load__input"
      type="text"
      placeholder="Name this save…"
      bind:value={saveName}
      onkeydown={(event) => {
        if (event.key === "Enter") save();
      }}
    />
    <PaxHudButton onclick={save}>
      <span class="save-load__save-label">
        <HudIcon name="save-game" size={14} /> Save game
      </span>
    </PaxHudButton>
  </div>

  {#if gameStore.savedGames.length === 0}
    <p class="save-load__empty">No saved games yet. Save the current match above.</p>
  {:else}
    <ul class="save-load__list">
      {#each gameStore.savedGames as game (game.id)}
        <li class="save-load__row">
          <div class="save-load__meta">
            <strong>{game.name}</strong>
            <small>{game.mapName} · tick {game.tick} · {fmtDate(game.createdAt)}</small>
          </div>
          <PaxHudButton size="sm" onclick={() => gameStore.loadSavedGame(game)}>
            <span class="save-load__row-action">Load</span>
          </PaxHudButton>
          <PaxHudIconButton
            icon="ban"
            size={14}
            title="Delete save"
            onclick={() => gameStore.deleteSavedGame(game.id)}
          />
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .save-load {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .save-load__form {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .save-load__input {
    flex: 1;
    min-width: 0;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-sm);
    background: var(--pax-ui-button-bg);
    color: var(--pax-ui-text);
    font-family: var(--pax-ui-font-ui);
    font-size: 0.78rem;
  }
  .save-load__input:focus {
    outline: 1px solid var(--pax-ui-accent);
    outline-offset: 1px;
  }
  .save-load__save-label,
  .save-load__row-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .save-load__empty {
    margin: 0;
    color: var(--pax-ui-text-dim);
    font-size: 0.74rem;
    line-height: 1.4;
  }
  .save-load__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .save-load__row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--pax-ui-radius-sm);
    background: rgba(255, 255, 255, 0.03);
  }
  .save-load__meta {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 1px;
  }
  .save-load__meta strong {
    overflow: hidden;
    color: var(--pax-ui-text);
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .save-load__meta small {
    color: var(--pax-ui-text-dim);
    font-size: 0.66rem;
  }
</style>
