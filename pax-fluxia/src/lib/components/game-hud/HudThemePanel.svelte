<script lang="ts">
  import { browser } from "$app/environment";
  import {
    exportPaxThemeDescriptor,
    PAX_THEME_IDS,
    PAX_THEMES,
    paxThemeState,
    type PaxThemeId,
  } from "$lib/design-system";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  let status = $state("Theme tokens active");

  function selectTheme(themeId: PaxThemeId) {
    paxThemeState.setTheme(themeId);
    status = `${PAX_THEMES[themeId].name} applied`;
  }

  function exportTheme() {
    if (!browser) return;
    const descriptor = exportPaxThemeDescriptor(paxThemeState.current);
    const blob = new Blob([JSON.stringify(descriptor, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pax-ui-theme-${descriptor.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    status = `${descriptor.name} descriptor exported`;
  }

  $effect(() => {
    paxThemeState.hydrate();
  });
</script>

<section class="pf-hud-theme-panel" aria-label="HUD Theme System">
  <header class="pf-hud-theme-panel__header">
    <div>
      <span class="pf-hud-theme-panel__eyebrow">Theme System</span>
      <h3>HUD Skin</h3>
    </div>
    <button type="button" class="pf-hud-theme-panel__export" onclick={exportTheme} title="Export theme descriptor">
      <HudIcon name="export" size={13} />
    </button>
  </header>

  <label class="pf-hud-theme-panel__select">
    <span>Active Theme</span>
    <select
      value={paxThemeState.current}
      aria-label="Active HUD theme"
      onchange={(event) => selectTheme(event.currentTarget.value as PaxThemeId)}
    >
      {#each PAX_THEME_IDS as themeId}
        <option value={themeId}>{PAX_THEMES[themeId].name}</option>
      {/each}
    </select>
  </label>

  <div class="pf-hud-theme-panel__cards" aria-label="Available HUD themes">
    {#each PAX_THEME_IDS as themeId}
      {@const theme = PAX_THEMES[themeId]}
      <button
        type="button"
        class="pf-hud-theme-card"
        class:active={paxThemeState.current === themeId}
        onclick={() => selectTheme(themeId)}
      >
        <span class="pf-hud-theme-card__swatches" aria-hidden="true">
          <span style={`background: ${theme.accent.system}`}></span>
          <span style={`background: ${theme.accent.selection}`}></span>
          <span style={`background: ${theme.accent.danger}`}></span>
        </span>
        <span class="pf-hud-theme-card__copy">
          <strong>{theme.name}</strong>
          <small>{theme.intent}</small>
        </span>
      </button>
    {/each}
  </div>

  <div class="pf-hud-theme-panel__status" title={status}>{status}</div>
</section>

<style>
  .pf-hud-theme-panel {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--hud-border);
    border-radius: var(--hud-radius-md);
    background: var(--hud-panel-bg-muted);
    box-shadow: inset 0 0 0 1px rgba(246, 196, 105, 0.045);
  }

  .pf-hud-theme-panel__header,
  .pf-hud-theme-panel__select,
  .pf-hud-theme-card,
  .pf-hud-theme-card__swatches {
    display: flex;
    align-items: center;
  }

  .pf-hud-theme-panel__header {
    justify-content: space-between;
    gap: 10px;
  }

  .pf-hud-theme-panel__eyebrow,
  .pf-hud-theme-panel__select span,
  .pf-hud-theme-panel__status {
    color: var(--hud-accent);
    font-family: var(--hud-font-label);
    font-size: calc(0.62rem * var(--hud-label-scale, 1));
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .pf-hud-theme-panel h3 {
    margin: 2px 0 0;
    color: var(--hud-accent-warm-strong);
    font-family: var(--hud-font-ui);
    font-size: calc(0.94rem * var(--hud-title-scale, 1));
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pf-hud-theme-panel__export,
  .pf-hud-theme-panel__select select,
  .pf-hud-theme-card {
    border: 1px solid transparent;
    background:
      linear-gradient(var(--hud-button-bg), var(--hud-button-bg)) padding-box,
      var(--hud-control-border-gradient) border-box;
    color: var(--hud-text);
    font-family: var(--hud-font-ui);
  }

  .pf-hud-theme-panel__export {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--hud-radius-xs);
    cursor: pointer;
  }

  .pf-hud-theme-panel__select {
    gap: 10px;
  }

  .pf-hud-theme-panel__select span {
    flex: 0 0 92px;
    color: var(--hud-text-dim);
  }

  .pf-hud-theme-panel__select select {
    min-width: 0;
    flex: 1 1 auto;
    height: 36px;
    border-radius: var(--hud-radius-xs);
    padding: 0 10px;
    font-size: calc(0.78rem * var(--hud-type-scale, 1));
    font-weight: 700;
  }

  .pf-hud-theme-panel__cards {
    display: grid;
    gap: 8px;
  }

  .pf-hud-theme-card {
    width: 100%;
    gap: 10px;
    min-height: 58px;
    padding: 9px;
    border-radius: var(--hud-radius-sm);
    cursor: pointer;
    text-align: left;
  }

  .pf-hud-theme-card:hover,
  .pf-hud-theme-card.active {
    color: var(--hud-text-strong);
    box-shadow:
      inset 0 0 0 1px rgba(246, 196, 105, 0.14),
      0 0 18px rgba(246, 196, 105, 0.12);
  }

  .pf-hud-theme-card.active {
    border-color: var(--hud-border-strong);
    background:
      linear-gradient(var(--hud-button-bg-active), var(--hud-button-bg-active)) padding-box,
      var(--hud-control-border-gradient) border-box;
  }

  .pf-hud-theme-card__swatches {
    gap: 3px;
    flex: 0 0 auto;
  }

  .pf-hud-theme-card__swatches span {
    width: 10px;
    height: 32px;
    border-radius: 999px;
    box-shadow: 0 0 12px currentColor;
  }

  .pf-hud-theme-card__copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .pf-hud-theme-card__copy strong {
    color: var(--hud-accent-warm-strong);
    font-size: calc(0.82rem * var(--hud-title-scale, 1));
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .pf-hud-theme-card__copy small {
    color: var(--hud-text-soft);
    font-family: var(--hud-font-copy);
    font-size: calc(0.68rem * var(--hud-type-scale, 1));
    line-height: 1.25;
  }

  .pf-hud-theme-panel__status {
    min-width: 0;
    overflow: hidden;
    color: var(--hud-text-dim);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
