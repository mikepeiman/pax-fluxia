<script lang="ts">
  import type { GameTheme } from "$lib/config/themes";
  import { themeStore } from "$lib/stores/themeStore.svelte";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  let saveName = $state("");
  let saveOpen = $state(false);
  let status = $state("");
  let statusTone = $state<"ok" | "warn" | "danger">("ok");

  const themes = $derived.by(() =>
    [...(themeStore.allThemes as GameTheme[])].sort((a, b) => {
      const left = Date.parse(a.created ?? "");
      const right = Date.parse(b.created ?? "");
      const safeLeft = Number.isFinite(left) ? left : 0;
      const safeRight = Number.isFinite(right) ? right : 0;
      return safeRight - safeLeft || a.name.localeCompare(b.name);
    }),
  );

  const selectedTheme = $derived(
    themes.find((theme) => theme.name === themeStore.selectedThemeName) ?? null,
  );

  function setStatus(message: string, tone: "ok" | "warn" | "danger" = "ok") {
    status = message;
    statusTone = tone;
  }

  function formatDate(value: string): string {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return "built-in";
    return new Date(parsed).toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "2-digit",
    });
  }

  function applyTheme(name: string) {
    if (!themeStore.applyTheme(name)) {
      setStatus("Theme could not be applied", "danger");
      return;
    }
    setStatus(`Applied ${name}`, "ok");
  }

  function saveTheme() {
    const name = saveName.trim();
    if (!name) {
      setStatus("Name required", "warn");
      return;
    }
    const saved = themeStore.saveTheme(name);
    saveName = "";
    saveOpen = false;
    setStatus(`Saved ${saved.name}`, "ok");
  }

  function updateTheme() {
    const name = themeStore.selectedThemeName;
    if (!name || !themeStore.isUserTheme(name)) {
      setStatus("Select a user theme to update", "warn");
      return;
    }
    themeStore.saveTheme(name);
    setStatus(`Updated ${name}`, "ok");
  }

  function deleteTheme(name: string) {
    themeStore.deleteTheme(name);
    setStatus(`Deleted ${name}`, "warn");
  }

  function exportTheme() {
    themeStore.exportTheme(themeStore.selectedThemeName || undefined);
    setStatus(themeStore.selectedThemeName ? "Exported selected theme" : "Exported current theme", "ok");
  }

  function importTheme() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as GameTheme;
        const imported = themeStore.importTheme(parsed, file.name);
        if (!imported) {
          setStatus("Invalid theme file", "danger");
          return;
        }
        setStatus(`Imported ${imported.name}`, "ok");
      } catch {
        setStatus("Import failed", "danger");
      }
    };
    input.click();
  }
</script>

<section class="pf-theme-library" aria-label="Theme Library">
  <header class="pf-theme-library__header">
    <div>
      <span class="pf-theme-library__eyebrow">Theme</span>
      <h3>Library</h3>
    </div>
    <span class="pf-theme-library__count">{themes.length}</span>
  </header>

  <div class="pf-theme-library__select-row">
    <label class="pf-theme-library__select-label">
      <span>Active</span>
      <select
        value={themeStore.selectedThemeName}
        onchange={(event) => applyTheme(event.currentTarget.value)}
      >
        <option value="">Select theme...</option>
        {#each themes as theme}
          <option value={theme.name}>{theme.name}</option>
        {/each}
      </select>
    </label>
    <button type="button" class="pf-theme-library__icon-btn" title="Save new theme" onclick={() => (saveOpen = !saveOpen)}>
      <HudIcon name="add" size={14} />
    </button>
  </div>

  {#if saveOpen}
    <div class="pf-theme-library__save-row">
      <input
        type="text"
        placeholder="Theme name..."
        bind:value={saveName}
        onkeydown={(event) => {
          if (event.key === "Enter") saveTheme();
          if (event.key === "Escape") {
            saveOpen = false;
            saveName = "";
          }
        }}
      />
      <button type="button" onclick={saveTheme}>Save</button>
    </div>
  {/if}

  <div class="pf-theme-library__actions">
    <button type="button" onclick={updateTheme} disabled={!selectedTheme || !themeStore.isUserTheme(selectedTheme.name)}>
      <HudIcon name="reset" size={13} />
      <span>Update</span>
    </button>
    <button type="button" onclick={exportTheme}>
      <HudIcon name="export" size={13} />
      <span>Export</span>
    </button>
    <button type="button" onclick={importTheme}>
      <HudIcon name="import" size={13} />
      <span>Import</span>
    </button>
  </div>

  {#if status}
    <div class={`pf-theme-library__status pf-theme-library__status--${statusTone}`}>
      {status}
    </div>
  {/if}

  <div class="pf-theme-library__list" role="listbox" aria-label="Available themes">
    {#each themes as theme}
      {@const isUser = themeStore.isUserTheme(theme.name)}
      <button
        type="button"
        class="pf-theme-library__row"
        class:active={themeStore.selectedThemeName === theme.name}
        onclick={() => applyTheme(theme.name)}
        title={theme.name}
      >
        <span class="pf-theme-library__row-mark" class:user={isUser}></span>
        <span class="pf-theme-library__row-name">{theme.name}</span>
        {#if isUser}
          <span class="pf-theme-library__row-date">{formatDate(theme.created)}</span>
        {/if}
        {#if isUser}
          <span
            role="button"
            tabindex="0"
            class="pf-theme-library__delete"
            title={`Delete ${theme.name}`}
            onclick={(event) => {
              event.stopPropagation();
              deleteTheme(theme.name);
            }}
            onkeydown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                deleteTheme(theme.name);
              }
            }}
          >
            <HudIcon name="close" size={11} />
          </span>
        {/if}
      </button>
    {/each}
  </div>
</section>
