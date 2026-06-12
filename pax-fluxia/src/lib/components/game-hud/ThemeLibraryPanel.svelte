<script lang="ts">
  import type { GameTheme } from "$lib/config/themes";
  import { themeStore } from "$lib/stores/themeStore.svelte";
  import {
    PaxHudButton,
    PaxHudIconButton,
    PaxHudSelect,
    PaxHudTextInput,
  } from "$lib/design-system";

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

  const themeOptions = $derived(
    themes.map((theme) => ({
      value: theme.name,
      label: theme.name,
    })),
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
    <PaxHudSelect
      class="pf-theme-library__select-label"
      label="Active"
      value={themeStore.selectedThemeName}
      options={themeOptions}
      placeholder="Select theme..."
      onValueChange={applyTheme}
    />
    <PaxHudIconButton
      icon="add"
      size={14}
      class="pf-theme-library__icon-btn"
      title="Save new theme"
      onclick={() => (saveOpen = !saveOpen)}
    />
  </div>

  {#if saveOpen}
    <div class="pf-theme-library__save-row">
      <PaxHudTextInput
        placeholder="Theme name..."
        value={saveName}
        onInput={(value) => (saveName = value)}
        onKeydown={(event) => {
          if (event.key === "Enter") saveTheme();
          if (event.key === "Escape") {
            saveOpen = false;
            saveName = "";
          }
        }}
      />
      <PaxHudButton label="Save" size="sm" onclick={saveTheme} />
    </div>
  {/if}

  <div class="pf-theme-library__actions">
    <PaxHudButton
      icon="reset"
      iconSize={13}
      label="Update"
      size="sm"
      onclick={updateTheme}
      disabled={!selectedTheme || !themeStore.isUserTheme(selectedTheme.name)}
    />
    <PaxHudButton icon="export" iconSize={13} label="Export" size="sm" onclick={exportTheme} />
    <PaxHudButton icon="import" iconSize={13} label="Import" size="sm" onclick={importTheme} />
  </div>

  {#if status}
    <div class={`pf-theme-library__status pf-theme-library__status--${statusTone}`}>
      {status}
    </div>
  {/if}

  <div class="pf-theme-library__list" role="listbox" aria-label="Available themes">
    {#each themes as theme}
      {@const isUser = themeStore.isUserTheme(theme.name)}
      <div class="pf-theme-library__row-group">
        <PaxHudButton
          class="pf-theme-library__row"
          active={themeStore.selectedThemeName === theme.name}
          onclick={() => applyTheme(theme.name)}
          title={theme.name}
        >
          <span class="pf-theme-library__row-mark" class:user={isUser}></span>
          <span class="pf-theme-library__row-name">{theme.name}</span>
          {#if isUser}
            <span class="pf-theme-library__row-date">{formatDate(theme.created)}</span>
          {/if}
        </PaxHudButton>
        {#if isUser}
          <PaxHudIconButton
            icon="close"
            size={11}
            class="pf-theme-library__delete"
            title={`Delete ${theme.name}`}
            danger
            onclick={() => deleteTheme(theme.name)}
          />
        {/if}
      </div>
    {/each}
  </div>
</section>
