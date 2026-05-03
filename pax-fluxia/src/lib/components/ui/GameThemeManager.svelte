<script lang="ts">
  import {
    auditThemeRouting,
    groupThemesByRenderFamily,
    type ThemeFamilyGroup,
    type ThemeRoutingStatus,
  } from "$lib/config/themeRouting";
  import type { GameTheme } from "$lib/config/themes";
  import { themeStore } from "$lib/stores/themeStore.svelte";
  import ThemeSelectDropdown from "./settings/ThemeSelectDropdown.svelte";

  interface Props {
    variant?: "menu" | "drawer";
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

  const THEME_STATUS_LABELS: Record<ThemeRoutingStatus, string> = {
    wired: "wired",
    "compat-inferred": "compat inferred",
    agnostic: "agnostic",
    "needs-editing": "needs edit",
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

  function getThemeChipTitle(theme: GameTheme): string {
    const audit = getThemeAudit(theme);
    return `${audit.familyLabel}: ${audit.notes.join(" ")}`;
  }

  function getThemeGroupSummary(group: ThemeFamilyGroup<GameTheme>): string {
    const counts: Partial<Record<ThemeRoutingStatus, number>> = {};
    for (const theme of group.themes) {
      const status = getThemeAudit(theme).status;
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return [
      counts.wired ? `${counts.wired} wired` : "",
      counts["compat-inferred"]
        ? `${counts["compat-inferred"]} compat inferred`
        : "",
      counts["needs-editing"]
        ? `${counts["needs-editing"]} needs edit`
        : "",
      counts.agnostic ? `${counts.agnostic} agnostic` : "",
    ]
      .filter(Boolean)
      .join(" · ");
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
  class:game-theme-manager--drawer={variant === "drawer"}>
  <div class="game-theme-manager__header">
    <span class="game-theme-manager__icon">🎨</span>
    <span class="game-theme-manager__title">Theme</span>
    <button
      type="button"
      class="game-theme-manager__toggle"
      onclick={() => {
        showThemeChips = !showThemeChips;
      }}>
      {showThemeChips ? "Hide Library" : "Browse Library"}
    </button>
  </div>

  <div class="game-theme-manager__top-row">
    <div class="game-theme-manager__actions" class:hidden={showSaveInput}>
      <ThemeSelectDropdown
        idBase={variant === "drawer" ? "mobile-theme-manager" : "menu-theme-manager"}
        variant="shell"
        {themeFamilyGroups}
        {selectedThemeName}
        placeholder="Select theme..."
        getThemeOptionLabel={getThemeOptionLabel}
        onSelectTheme={handleApplyTheme} />
      {#if selectedThemeName}
        <button
          type="button"
          class="theme-manager-btn theme-manager-btn--update"
          class:flash={saveFlash}
          disabled={!selectedThemeIsUserTheme}
          onclick={handleUpdateTheme}
          title={selectedThemeIsUserTheme
            ? `Update ${selectedThemeName} with current settings`
            : "Built-in themes cannot be overwritten. Use Add to save a new theme."}>
          Update
        </button>
      {/if}
      <button
        type="button"
        class="theme-manager-btn"
        onclick={() => {
          showSaveInput = true;
        }}
        title="Create a new theme from the current game settings">
        Add
      </button>
    </div>

    <div class="game-theme-manager__save-row" class:open={showSaveInput}>
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
        class="theme-manager-btn theme-manager-btn--confirm"
        class:flash={saveFlash}
        onclick={handleSaveTheme}>
        Save
      </button>
    </div>
  </div>

  <div class="game-theme-manager__utility-row">
    <button
      type="button"
      class="theme-manager-mini-btn"
      onclick={handleExportTheme}>
      Export
    </button>
    <button
      type="button"
      class="theme-manager-mini-btn"
      onclick={handleImportTheme}>
      Import
    </button>
  </div>

  {#if statusMessage}
    <div class={`game-theme-manager__status game-theme-manager__status--${statusTone}`}>
      {statusMessage}
    </div>
  {/if}

  {#if showThemeChips}
    <div class="theme-family-groups">
      {#each themeFamilyGroups as group}
        <section class="theme-family-section">
          <div class="theme-family-header">
            <div class="theme-family-title-row">
              <span class="theme-family-name">{group.label}</span>
              <span class="theme-family-count">{group.themes.length}</span>
            </div>
            <p class="theme-family-description">{group.description}</p>
            <p class="theme-family-summary">{getThemeGroupSummary(group)}</p>
          </div>
          <div class="theme-chip-row">
            {#each group.themes as theme}
              {@const routing = getThemeAudit(theme)}
              <button
                type="button"
                class="theme-chip"
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
                    }}>&times;</span>
                {/if}
              </button>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .game-theme-manager {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    background:
      linear-gradient(180deg, rgba(17, 24, 39, 0.9), rgba(8, 12, 20, 0.92)),
      rgba(255, 255, 255, 0.02);
    min-width: 0;
  }

  .game-theme-manager--drawer {
    width: 100%;
    max-width: 420px;
  }

  .game-theme-manager__header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .game-theme-manager__icon {
    font-size: 0.95rem;
  }

  .game-theme-manager__title {
    font-family: "Exo", sans-serif;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255, 214, 102, 0.95);
  }

  .game-theme-manager__toggle {
    margin-left: auto;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(226, 232, 240, 0.72);
    padding: 4px 10px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition:
      background 0.18s,
      border-color 0.18s,
      color 0.18s;
  }

  .game-theme-manager__toggle:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.22);
    color: #fff;
  }

  .game-theme-manager__top-row {
    position: relative;
    min-height: 36px;
  }

  .game-theme-manager__actions,
  .game-theme-manager__save-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
    width: 100%;
    min-width: 0;
  }

  .game-theme-manager__actions.hidden {
    display: none;
  }

  .game-theme-manager__save-row {
    display: none;
  }

  .game-theme-manager__save-row.open {
    display: flex;
  }

  .game-theme-manager__save-input {
    flex: 1;
    min-width: 0;
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.22);
    color: #fff;
    padding: 0 12px;
    font-size: 0.8rem;
  }

  .game-theme-manager__save-input:focus {
    outline: none;
    border-color: rgba(74, 222, 128, 0.7);
    box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.18);
  }

  .theme-manager-btn,
  .theme-manager-mini-btn {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(226, 232, 240, 0.74);
    cursor: pointer;
    transition:
      background 0.18s,
      border-color 0.18s,
      color 0.18s,
      transform 0.18s;
  }

  .theme-manager-btn {
    padding: 0 12px;
    font-size: 0.76rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .theme-manager-mini-btn {
    padding: 5px 10px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .theme-manager-btn:hover,
  .theme-manager-mini-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.24);
    color: #fff;
  }

  .theme-manager-btn--update {
    border-color: rgba(96, 165, 250, 0.28);
    color: #bfdbfe;
  }

  .theme-manager-btn:disabled,
  .theme-manager-mini-btn:disabled {
    opacity: 0.48;
    cursor: default;
  }

  .theme-manager-btn--confirm {
    border-color: rgba(74, 222, 128, 0.3);
    color: #86efac;
  }

  .theme-manager-btn--ghost {
    color: rgba(203, 213, 225, 0.74);
  }

  .theme-manager-btn.flash {
    transform: scale(0.97);
    background: rgba(74, 222, 128, 0.22);
    border-color: rgba(74, 222, 128, 0.55);
    color: #ecfdf5;
  }

  .game-theme-manager__utility-row {
    display: flex;
    gap: 6px;
  }

  .game-theme-manager__status {
    font-size: 0.68rem;
    line-height: 1.4;
  }

  .game-theme-manager__status--success {
    color: #86efac;
  }

  .game-theme-manager__status--error {
    color: #fca5a5;
  }

  .game-theme-manager__status--muted {
    color: rgba(191, 219, 254, 0.82);
  }

  .theme-family-groups {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .theme-family-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border-radius: 10px;
    border: 1px solid rgba(125, 211, 252, 0.12);
    background: rgba(15, 23, 42, 0.5);
  }

  .theme-family-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .theme-family-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .theme-family-name {
    font-size: 0.69rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #e2e8f0;
  }

  .theme-family-count {
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(125, 211, 252, 0.12);
    color: #7dd3fc;
    font-size: 0.62rem;
    font-weight: 700;
  }

  .theme-family-description,
  .theme-family-summary {
    margin: 0;
    font-size: 0.7rem;
    line-height: 1.35;
  }

  .theme-family-description {
    color: rgba(203, 213, 225, 0.72);
  }

  .theme-family-summary {
    color: rgba(148, 163, 184, 0.9);
  }

  .theme-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .theme-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
    font-size: 0.72rem;
    cursor: pointer;
    transition:
      background 0.18s,
      border-color 0.18s,
      color 0.18s;
  }

  .theme-chip:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.24);
    color: #fff;
  }

  .theme-chip.active {
    background: rgba(74, 222, 128, 0.12);
    border-color: rgba(74, 222, 128, 0.4);
    color: #86efac;
  }

  .theme-chip-status {
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 0.55rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid transparent;
  }

  .theme-chip-name {
    white-space: nowrap;
  }

  .status-wired {
    background: rgba(74, 222, 128, 0.12);
    border-color: rgba(74, 222, 128, 0.28);
    color: #86efac;
  }

  .status-compat {
    background: rgba(251, 191, 36, 0.12);
    border-color: rgba(251, 191, 36, 0.28);
    color: #fcd34d;
  }

  .status-needs-edit {
    background: rgba(248, 113, 113, 0.12);
    border-color: rgba(248, 113, 113, 0.28);
    color: #fca5a5;
  }

  .status-agnostic {
    background: rgba(148, 163, 184, 0.12);
    border-color: rgba(148, 163, 184, 0.24);
    color: #cbd5e1;
  }

  .theme-chip-delete {
    font-size: 0.9rem;
    line-height: 1;
    opacity: 0.38;
    padding-left: 2px;
  }

  .theme-chip-delete:hover {
    opacity: 1;
    color: #f87171;
  }
</style>
