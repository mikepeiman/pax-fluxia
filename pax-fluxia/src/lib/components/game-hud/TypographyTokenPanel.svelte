<script lang="ts">
  import { browser } from "$app/environment";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  type FontTokenId = "brand" | "ui" | "label" | "copy" | "data";
  type FontOptionId = "rajdhani" | "pasti" | "inter" | "jetbrains" | "system" | "serif";

  type FontOption = {
    id: FontOptionId;
    label: string;
    stack: string;
    note: string;
  };

  type TokenRole = {
    id: FontTokenId;
    label: string;
    cssVar: string;
    sample: string;
    note: string;
  };

  const STORAGE_KEY = "pax-hud-typography-tokens-v1";

  const FONT_OPTIONS: FontOption[] = [
    {
      id: "rajdhani",
      label: "Rajdhani",
      stack: '"Rajdhani", sans-serif',
      note: "Condensed HUD default",
    },
    {
      id: "pasti",
      label: "Pasti",
      stack: '"Pasti", "Rajdhani", sans-serif',
      note: "Imported display trial",
    },
    {
      id: "inter",
      label: "Inter",
      stack: '"Inter", sans-serif',
      note: "Neutral readable copy",
    },
    {
      id: "jetbrains",
      label: "JetBrains Mono",
      stack: '"JetBrains Mono", monospace',
      note: "Tabular data",
    },
    {
      id: "system",
      label: "System Sans",
      stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      note: "Platform fallback",
    },
    {
      id: "serif",
      label: "Serif Control",
      stack: 'Georgia, "Times New Roman", serif',
      note: "Contrast test only",
    },
  ];

  const TOKEN_ROLES: TokenRole[] = [
    {
      id: "brand",
      label: "Brand",
      cssVar: "--hud-font-brand",
      sample: "PAX FLUXIA",
      note: "logo wordmark and major identity text",
    },
    {
      id: "ui",
      label: "Interface",
      cssVar: "--hud-font-ui",
      sample: "RIBBON OPEN",
      note: "buttons, menus, panels",
    },
    {
      id: "label",
      label: "Labels",
      cssVar: "--hud-font-label",
      sample: "ACTIVE SHIPS",
      note: "eyebrows and table headings",
    },
    {
      id: "copy",
      label: "Copy",
      cssVar: "--hud-font-copy",
      sample: "Select a star to inspect tactical state.",
      note: "small helper and status text",
    },
    {
      id: "data",
      label: "Data",
      cssVar: "--hud-font-data",
      sample: "1,247 / 2,569",
      note: "numbers, timers, ship counts",
    },
  ];

  const DEFAULT_SELECTIONS: Record<FontTokenId, FontOptionId> = {
    brand: "rajdhani",
    ui: "rajdhani",
    label: "rajdhani",
    copy: "inter",
    data: "jetbrains",
  };

  const FONT_OPTION_IDS = new Set<FontOptionId>(FONT_OPTIONS.map((option) => option.id));

  let selections = $state<Record<FontTokenId, FontOptionId>>({ ...DEFAULT_SELECTIONS });
  let status = $state("Role tokens active");

  let hydrated = false;

  function isFontOptionId(value: unknown): value is FontOptionId {
    return typeof value === "string" && FONT_OPTION_IDS.has(value as FontOptionId);
  }

  function resolveOption(id: FontOptionId): FontOption {
    return FONT_OPTIONS.find((option) => option.id === id) ?? FONT_OPTIONS[0];
  }

  function hydrateFromStorage() {
    if (!browser) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<FontTokenId, unknown>>;
      const next = { ...DEFAULT_SELECTIONS };
      for (const role of TOKEN_ROLES) {
        const value = parsed[role.id];
        if (isFontOptionId(value)) {
          next[role.id] = value;
        }
      }
      selections = next;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      status = "Stored typography choice was reset";
    }
  }

  function applyTypographyTokens(persist = true) {
    if (!browser) return;
    const root = document.documentElement;
    for (const role of TOKEN_ROLES) {
      root.style.setProperty(role.cssVar, resolveOption(selections[role.id]).stack);
    }
    if (persist) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
    }
  }

  function setToken(roleId: FontTokenId, optionId: FontOptionId) {
    selections = {
      ...selections,
      [roleId]: optionId,
    };
    applyTypographyTokens();
    status = "Applied typography tokens";
  }

  function resetTokens() {
    selections = { ...DEFAULT_SELECTIONS };
    if (browser) {
      const root = document.documentElement;
      for (const role of TOKEN_ROLES) {
        root.style.removeProperty(role.cssVar);
      }
      localStorage.removeItem(STORAGE_KEY);
    }
    status = "Reset to design defaults";
  }

  $effect(() => {
    if (!browser || hydrated) return;
    hydrated = true;
    hydrateFromStorage();
    applyTypographyTokens(false);
  });
</script>

<section class="pf-typography-panel" aria-label="Typography Tokens">
  <header class="pf-typography-panel__header">
    <div>
      <span class="pf-typography-panel__eyebrow">Typography</span>
      <h3>Token Lab</h3>
    </div>
    <button type="button" class="pf-typography-panel__reset" onclick={resetTokens} title="Reset typography tokens">
      <HudIcon name="reset" size={13} />
    </button>
  </header>

  <div class="pf-typography-panel__roles">
    {#each TOKEN_ROLES as role}
      {@const selected = resolveOption(selections[role.id])}
      <label class="pf-typography-row">
        <span class="pf-typography-row__meta">
          <strong>{role.label}</strong>
          <small>{role.note}</small>
        </span>
        <select
          value={selections[role.id]}
          aria-label={`${role.label} font`}
          onchange={(event) => setToken(role.id, event.currentTarget.value as FontOptionId)}
        >
          {#each FONT_OPTIONS as option}
            <option value={option.id}>{option.label}</option>
          {/each}
        </select>
        <span class="pf-typography-row__sample" style={`font-family: var(${role.cssVar});`}>
          {role.sample}
        </span>
        <span class="pf-typography-row__note">{selected.note}</span>
      </label>
    {/each}
  </div>

  <div class="pf-typography-panel__status" title={status}>{status}</div>
</section>
