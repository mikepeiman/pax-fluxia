<script lang="ts">
  import {
    auditThemeRouting,
    groupThemesByRenderFamily,
    type ThemeRoutingStatus,
  } from "$lib/config/themeRouting";
  import type { GameTheme } from "$lib/config/themes";
  import { themeStore } from "$lib/stores/themeStore.svelte";
  import ThemeSelectDropdown from "./settings/ThemeSelectDropdown.svelte";
  import HudIcon from "./hud/HudIcon.svelte";

  interface Props {
    variant?: "menu" | "drawer" | "utility";
  }

  let { variant = "menu" }: Props = $props();

  let showSaveInput = $state(false);
  let saveName = $state("");
  let saveFlash = $state(false);
  let showThemeChips = $state(false);
  let statusMessage = $state("");
  let statusTone = $state<"success" | "error" | "muted">("muted");
  let selectedThemeName = $derived(themeStore.selectedThemeName);
  let selectedThemeIsUserTheme = $derived(
    selectedThemeName ? themeStore.isUserTheme(selectedThemeName) : false,
  );

  let themeFamilyGroups = $derived(
    groupThemesByRenderFamily(themeStore.allThemes as GameTheme[]),
  );

  let libraryThemes = $derived.by(() =>
    [...(themeStore.allThemes as GameTheme[])].sort((left, right) => {
      const leftTime = Date.parse(left.created ?? "");
      const rightTime = Date.parse(right.created ?? "");
      const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
      const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
      if (safeRight !== safeLeft) return safeRight - safeLeft;
      return left.name.localeCompare(right.name);
    }),
  );

  const THEME_STATUS_LABELS: Record<ThemeRoutingStatus, string> = {
    wired: "wired",
    "compat-inferred": "compat",
    agnostic: "agnostic",
    "needs-editing": "edit",
  };

  function getThemeAudit(theme: GameTheme) {
    return auditThemeRouting(theme.values as Record<string, unknown>);
  }

  function getThemeStatusClass(status: ThemeRoutingStatus): string {
    switch (status) {
      case "wired":
        return "status-wired";
      case "compat-inferred":
        return "status-compat";
      case "needs-editing":
        return "status-needs-edit";
      default:
        return "status-agnostic";
    }
  }

  function getThemeOptionLabel(theme: GameTheme): string {
    const audit = getThemeAudit(theme);
    switch (audit.status) {
      case "needs-editing":
        return `${theme.name} [needs edit]`;
      case "compat-inferred":
        return `${theme.name} [compat inferred]`;
      default:
        return theme.name;
    }
  }

  function getThemeChipTitle(theme: GameTheme) {
    const audit = getThemeAudit(theme);
    return `${audit.familyLabel}: ${audit.notes.join(" ")}`;
  }

  function setStatus(
    message: string,
    tone: "success" | "error" | "muted" = "muted",
  ) {
    statusMessage = message;
    statusTone = tone;
  }

  function pulseSaveButton() {
    saveFlash = true;
    setTimeout(() => (saveFlash = false), 600);
  }

  function handleApplyTheme(name: string) {
    if (!themeStore.applyTheme(name)) {
      setStatus(`Theme "${name}" could not be applied`, "error");
      return;
    }
    setStatus(`Applied "${name}"`, "success");
  }

  function handleSaveTheme() {
    const name = saveName.trim();
    if (!name) return;
    const savedTheme = themeStore.saveTheme(name);
    saveName = "";
    showSaveInput = false;
    pulseSaveButton();
    themeStore.exportTheme(savedTheme.name);
    setStatus(`Saved "${savedTheme.name}"`, "success");
  }

  function handleUpdateTheme() {
    const name = selectedThemeName;
    if (!name || !selectedThemeIsUserTheme) return;
    const confirmed = window.confirm(
      `Overwrite theme "${name}" with the current settings?`,
    );
    if (!confirmed) return;
    themeStore.saveTheme(name);
    pulseSaveButton();
    setStatus(`Updated "${name}"`, "success");
  }

  function handleDeleteTheme(name: string) {
    themeStore.deleteTheme(name);
    setStatus(`Deleted "${name}"`, "muted");
  }

  function handleExportTheme() {
    const selected = themeStore.selectedThemeName;
    themeStore.exportTheme(selected || undefined);
    setStatus(
      selected ? `Exported "${selected}"` : "Exported current theme",
      "success",
    );
  }

  function handleImportTheme() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const importedTheme = themeStore.importTheme(
          JSON.parse(text) as GameTheme,
          file.name,
        );
        if (!importedTheme) {
          setStatus("Invalid theme file", "error");
          return;
        }
        setStatus(`Imported "${importedTheme.name}"`, "success");
      } catch {
        setStatus("Failed to parse theme file", "error");
      }
    };
    input.click();
  }
</script>

<div
  class="game-theme-manager"
  class:game-theme-manager--drawer={variant === "drawer"}
  class:game-theme-manager--utility={variant === "utility"}>
  <div class="game-theme-manager__header">
    <div class="game-theme-manager__title-block">
      <span class="game-theme-manager__eyebrow">Theme</span>
      <span class="game-theme-manager__title">Library</span>
    </div>

    <div class="game-theme-manager__header-actions">
      <button
        type="button"
        class="theme-manager-toggle"
        onclick={() => {
          showThemeChips = !showThemeChips;
        }}>
        <HudIcon name="library" size={15} />
        <span>{showThemeChips ? "Hide Library" : "Browse Library"}</span>
      </button>
    </div>
  </div>

  <div class="game-theme-manager__body">
    <div class="game-theme-manager__top-row">
      {#if !showSaveInput}
        <div class="game-theme-manager__actions">
          <ThemeSelectDropdown
            idBase={variant === "drawer" ? "mobile-theme-manager" : "menu-theme-manager"}
            variant="shell"
            {themeFamilyGroups}
            {selectedThemeName}
            placeholder="Select theme..."
            showGroupLabels={false}
            getThemeOptionLabel={getThemeOptionLabel}
            onSelectTheme={handleApplyTheme} />

          {#if selectedThemeName}
            <button
              type="button"
              class="theme-manager-btn theme-manager-btn--accent"
              class:flash={saveFlash}
              disabled={!selectedThemeIsUserTheme}
              onclick={handleUpdateTheme}
              title={selectedThemeIsUserTheme
                ? `Update ${selectedThemeName} with current settings`
                : "Built-in themes cannot be overwritten. Use Add to save a new theme."}>
              <HudIcon name="reset" size={15} />
              <span>Update</span>
            </button>
          {/if}

          <button
            type="button"
            class="theme-manager-btn"
            onclick={() => {
              showSaveInput = true;
            }}
            title="Create a new theme from the current game settings">
            <HudIcon name="add" size={15} />
            <span>Add</span>
          </button>
        </div>
      {:else}
        <div class="game-theme-manager__save-row">
          <input
            class="game-theme-manager__save-input"
            type="text"
            placeholder="Theme name..."
            bind:value={saveName}
            onkeydown={(event) => {
              if (event.key === "Enter") handleSaveTheme();
              if (event.key === "Escape") {
                showSaveInput = false;
                saveName = "";
              }
            }} />
          <button
            type="button"
            class="theme-manager-btn theme-manager-btn--ghost"
            onclick={() => {
              showSaveInput = false;
              saveName = "";
            }}>
            Cancel
          </button>
          <button
            type="button"
            class="theme-manager-btn theme-manager-btn--accent"
            class:flash={saveFlash}
            onclick={handleSaveTheme}>
            Save
          </button>
        </div>
      {/if}
    </div>

    <div class="game-theme-manager__utility-row">
      <button
        type="button"
        class="theme-manager-mini-btn"
        onclick={handleExportTheme}>
        <HudIcon name="export" size={14} />
        <span>Export</span>
      </button>
      <button
        type="button"
        class="theme-manager-mini-btn"
        onclick={handleImportTheme}>
        <HudIcon name="import" size={14} />
        <span>Import</span>
      </button>
    </div>

    {#if statusMessage}
      <div class={`game-theme-manager__status game-theme-manager__status--${statusTone}`}>
        {statusMessage}
      </div>
    {/if}

    {#if showThemeChips}
      <div class="theme-library-list">
        {#each libraryThemes as theme}
          {@const routing = getThemeAudit(theme)}
          <button
            type="button"
            class="theme-chip theme-chip--list"
            class:active={themeStore.selectedThemeName === theme.name}
            onclick={() => handleApplyTheme(theme.name)}
            title={getThemeChipTitle(theme)}>
            <span class={`theme-chip-status ${getThemeStatusClass(routing.status)}`}>
              {THEME_STATUS_LABELS[routing.status]}
            </span>
            <span class="theme-chip-name">{theme.name}</span>
            {#if themeStore.isUserTheme(theme.name)}
              <span
                role="button"
                tabindex="0"
                class="theme-chip-delete"
                onclick={(event) => {
                  event.stopPropagation();
                  handleDeleteTheme(theme.name);
                }}
                onkeydown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDeleteTheme(theme.name);
                  }
                }}>
                <HudIcon name="close" size={12} />
              </span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .game-theme-manager {
    display: grid;
    gap: 10px;
    width: 100%;
    min-width: 0;
    padding: var(--pax-ui-pad-sm);
    border: 1px solid var(--pax-ui-border);
    border-radius: var(--pax-ui-radius-md);
    background: var(--pax-ui-panel-bg);
    box-shadow: var(--pax-ui-shadow-soft);
  }

  .game-theme-manager--menu {
    background:
      linear-gradient(180deg, rgba(19, 24, 38, 0.95), rgba(10, 14, 24, 0.97)),
      rgba(255, 255, 255, 0.02);
  }

  .game-theme-manager--drawer {
    max-width: 420px;
  }

  .game-theme-manager__header,
  .game-theme-manager__title-block,
  .game-theme-manager__actions,
  .game-theme-manager__save-row,
  .game-theme-manager__utility-row,
  .theme-manager-btn,
  .theme-manager-mini-btn,
  .theme-chip {
    display: flex;
    align-items: center;
  }

  .game-theme-manager__header {
    justify-content: space-between;
    gap: 10px;
  }

  .game-theme-manager__title-block {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .game-theme-manager__eyebrow {
    color: var(--pax-ui-accent);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-4xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .game-theme-manager__title {
    color: var(--pax-ui-accent-warm);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-sm);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .game-theme-manager__body {
    display: grid;
    gap: 10px;
  }

  .game-theme-manager__top-row {
    min-width: 0;
  }

  .game-theme-manager__actions,
  .game-theme-manager__save-row {
    gap: 8px;
    min-width: 0;
  }

  .game-theme-manager__actions {
    align-items: stretch;
  }

  .theme-manager-toggle,
  .theme-manager-btn,
  .theme-manager-mini-btn {
    min-height: 34px;
    border-radius: 12px;
    border: 1px solid var(--pax-ui-border);
    background: var(--pax-ui-button-bg);
    color: var(--pax-ui-text);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-2xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      color 0.16s ease,
      transform 0.16s ease;
  }

  .theme-manager-toggle,
  .theme-manager-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 12px;
  }

  .theme-manager-toggle {
    min-height: 32px;
    padding-inline: 10px 12px;
  }

  .theme-manager-toggle:hover,
  .theme-manager-btn:hover,
  .theme-manager-mini-btn:hover {
    border-color: var(--pax-ui-border-strong);
    background: var(--pax-ui-button-bg-hover);
    color: var(--pax-ui-text-strong);
    transform: translateY(-1px);
  }

  .theme-manager-btn--accent,
  .theme-manager-btn.flash {
    border-color: var(--pax-ui-border-warm);
    color: var(--pax-ui-accent-warm);
  }

  .theme-manager-btn--ghost {
    color: var(--pax-ui-text-soft);
  }

  .theme-manager-btn:disabled {
    opacity: 0.48;
    cursor: default;
    transform: none;
  }

  .game-theme-manager__save-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
  }

  .game-theme-manager__save-input {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 38px;
    border-radius: 12px;
    border: 1px solid var(--pax-ui-border);
    background: rgba(7, 13, 26, 0.96);
    color: var(--pax-ui-text-strong);
    padding: 0 12px;
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-xs-plus);
  }

  .game-theme-manager__save-input:focus {
    outline: none;
    border-color: var(--pax-ui-border-strong);
    box-shadow: 0 0 0 1px rgba(94, 230, 255, 0.18);
  }

  .game-theme-manager__utility-row {
    gap: 8px;
  }

  .theme-manager-mini-btn {
    gap: 8px;
    padding: 0 12px;
  }

  .game-theme-manager__status {
    padding: 7px 10px;
    border-radius: 12px;
    background: rgba(8, 14, 29, 0.9);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-2xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .game-theme-manager__status--success {
    color: #90e0b8;
  }

  .game-theme-manager__status--error {
    color: #ffb4be;
  }

  .game-theme-manager__status--muted {
    color: var(--pax-ui-text-soft);
  }

  .theme-library-list {
    max-height: min(260px, 34vh);
    display: grid;
    gap: 7px;
    overflow: auto;
    padding-right: 2px;
  }

  .theme-chip {
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid var(--pax-ui-border);
    background: rgba(8, 14, 28, 0.86);
    color: var(--pax-ui-text);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      color 0.16s ease,
      transform 0.16s ease;
  }

  .theme-chip:hover {
    border-color: var(--pax-ui-border-strong);
    background: rgba(12, 23, 43, 0.94);
    color: var(--pax-ui-text-strong);
    transform: translateY(-1px);
  }

  .theme-chip.active {
    border-color: var(--pax-ui-border-warm);
    box-shadow: inset 0 0 0 1px rgba(255, 200, 107, 0.16);
  }

  .theme-chip--menu {
    gap: 8px;
    padding: 7px 12px;
    background: rgba(18, 24, 38, 0.78);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .game-theme-manager--menu .theme-chip-name {
    font-weight: var(--pax-weight-semibold);
  }

  .theme-chip-status {
    flex: 0 0 auto;
    min-width: 54px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-3xs);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-align: center;
  }

  .status-wired {
    color: #8ae0ff;
  }

  .status-compat {
    color: #ffd792;
  }

  .status-needs-edit {
    color: #ff97a7;
  }

  .status-agnostic {
    color: var(--pax-ui-text-soft);
  }

  .theme-chip-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--pax-ui-font-ui);
    font-size: var(--pax-type-xs-plus);
    font-weight: var(--pax-weight-bold);
    letter-spacing: 0.03em;
  }

  .theme-chip-delete {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    color: var(--pax-ui-text-soft);
  }

  .theme-chip-delete:hover {
    color: var(--pax-ui-danger);
  }

  @media (max-width: 980px) {
    .game-theme-manager__actions,
    .game-theme-manager__save-row {
      flex-wrap: wrap;
    }

    .theme-manager-toggle {
      width: 100%;
      justify-content: center;
    }
  }
</style>
