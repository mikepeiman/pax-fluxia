<script lang="ts">
  import { browser } from "$app/environment";
  import {
    exportPaxThemeDescriptor,
    PaxHudButton,
    PaxHudIconButton,
    PaxHudSelect,
    PAX_THEME_IDS,
    PAX_THEMES,
    paxThemeState,
    type PaxThemeId,
  } from "$lib/design-system";

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

  const themeOptions = PAX_THEME_IDS.map((themeId) => ({
    value: themeId,
    label: PAX_THEMES[themeId].name,
  }));

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
    <PaxHudIconButton
      icon="export"
      size={13}
      class="pf-hud-theme-panel__export"
      title="Export theme descriptor"
      onclick={exportTheme}
    />
  </header>

  <PaxHudSelect
    class="pf-hud-theme-panel__select"
    label="Active Theme"
    value={paxThemeState.current}
    options={themeOptions}
    ariaLabel="Active HUD theme"
    onValueChange={(value) => selectTheme(value as PaxThemeId)}
  />

  <div class="pf-hud-theme-panel__cards" aria-label="Available HUD themes">
    {#each PAX_THEME_IDS as themeId}
      {@const theme = PAX_THEMES[themeId]}
      <PaxHudButton
        class="pf-hud-theme-card"
        active={paxThemeState.current === themeId}
        onclick={() => selectTheme(themeId)}
      >
        <span class="pf-hud-theme-card__swatches" aria-hidden="true">
          <span style:background={theme.accent.system}></span>
          <span style:background={theme.accent.selection}></span>
          <span style:background={theme.accent.danger}></span>
        </span>
        <span class="pf-hud-theme-card__copy">
          <strong>{theme.name}</strong>
          <small>{theme.intent}</small>
        </span>
      </PaxHudButton>
    {/each}
  </div>

  <div class="pf-hud-theme-panel__status" title={status}>{status}</div>
</section>

<style>
  .pf-hud-theme-panel {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-md);
    background: var(--pax-ui-panel-bg-muted);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm) 4.5%, transparent);
  }

  .pf-hud-theme-panel__header,
  .pf-hud-theme-card__swatches {
    display: flex;
    align-items: center;
  }

  .pf-hud-theme-panel__header {
    justify-content: space-between;
    gap: 10px;
  }

  .pf-hud-theme-panel__eyebrow,
  .pf-hud-theme-panel__status {
    color: var(--pax-ui-accent);
    font-family: var(--pax-ui-font-label);
    font-size: calc(0.62rem * var(--pax-ui-label-scale, 1));
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .pf-hud-theme-panel h3 {
    margin: 2px 0 0;
    color: var(--pax-ui-accent-warm-strong);
    font-family: var(--pax-ui-font-ui);
    font-size: calc(0.94rem * var(--pax-ui-title-scale, 1));
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  :global(.pf-hud-theme-panel__export),
  :global(.pf-hud-theme-panel__select select),
  :global(.pf-hud-theme-card) {
    border: 1px solid transparent;
    background:
      linear-gradient(var(--pax-ui-button-bg), var(--pax-ui-button-bg)) padding-box,
      var(--pax-ui-control-border-gradient) border-box;
    color: var(--pax-ui-text);
    font-family: var(--pax-ui-font-ui);
  }

  :global(.pf-hud-theme-panel__export) {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--pax-ui-radius-xs);
    cursor: pointer;
  }

  :global(.pf-hud-theme-panel__select) {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  :global(.pf-hud-theme-panel__select span) {
    flex: 0 0 92px;
    color: var(--pax-ui-text-dim);
    font-family: var(--pax-ui-font-label);
    font-size: calc(0.62rem * var(--pax-ui-label-scale, 1));
    font-weight: var(--pax-weight-extrabold);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  :global(.pf-hud-theme-panel__select select) {
    min-width: 0;
    flex: 1 1 auto;
    height: 36px;
    border-radius: var(--pax-ui-radius-xs);
    padding: 0 10px;
    font-size: calc(0.78rem * var(--pax-ui-type-scale, 1));
    font-weight: var(--pax-weight-bold);
  }

  .pf-hud-theme-panel__cards {
    display: grid;
    gap: 8px;
  }

  :global(.pf-hud-theme-card) {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 10px;
    min-height: 58px;
    padding: 9px;
    border-radius: var(--pax-ui-radius-sm);
    cursor: pointer;
    text-align: left;
  }

  :global(.pf-hud-theme-card:hover),
  :global(.pf-hud-theme-card.active) {
    color: var(--pax-ui-text-strong);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--pax-ui-accent-warm) 14%, transparent),
      0 0 18px color-mix(in srgb, var(--pax-ui-accent-warm) 12%, transparent);
  }

  :global(.pf-hud-theme-card.active) {
    border-color: var(--pax-ui-border-strong);
    background:
      linear-gradient(var(--pax-ui-button-bg-active), var(--pax-ui-button-bg-active)) padding-box,
      var(--pax-ui-control-border-gradient) border-box;
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
    color: var(--pax-ui-accent-warm-strong);
    font-size: calc(0.82rem * var(--pax-ui-title-scale, 1));
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .pf-hud-theme-card__copy small {
    color: var(--pax-ui-text-soft);
    font-family: var(--pax-ui-font-copy);
    font-size: calc(0.68rem * var(--pax-ui-type-scale, 1));
    line-height: 1.25;
  }

  .pf-hud-theme-panel__status {
    min-width: 0;
    overflow: hidden;
    color: var(--pax-ui-text-dim);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
