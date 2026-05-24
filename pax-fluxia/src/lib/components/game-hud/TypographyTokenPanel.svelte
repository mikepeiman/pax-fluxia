<script lang="ts">
  import { browser } from "$app/environment";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

  type FontTokenId = "brand" | "ui" | "label" | "copy" | "data";
  type FontOptionId = "rajdhani" | "pasti" | "inter" | "jetbrains" | "system" | "serif";
  type ScaleTokenId = "ui" | "title" | "label" | "data" | "icon";

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

  type ScaleToken = {
    id: ScaleTokenId;
    label: string;
    cssVar: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    note: string;
  };

  type StoredTypographyTokens =
    | Partial<Record<FontTokenId, unknown>>
    | {
        selections?: Partial<Record<FontTokenId, unknown>>;
        scales?: Partial<Record<ScaleTokenId, unknown>>;
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

  const SCALE_TOKENS: ScaleToken[] = [
    {
      id: "ui",
      label: "UI Scale",
      cssVar: "--hud-type-scale",
      min: 0.9,
      max: 1.35,
      step: 0.01,
      defaultValue: 1.08,
      note: "baseline HUD prose and controls",
    },
    {
      id: "title",
      label: "Titles",
      cssVar: "--hud-title-scale",
      min: 0.9,
      max: 1.35,
      step: 0.01,
      defaultValue: 1.08,
      note: "panel titles and topbar identity",
    },
    {
      id: "label",
      label: "Labels",
      cssVar: "--hud-label-scale",
      min: 0.9,
      max: 1.4,
      step: 0.01,
      defaultValue: 1.12,
      note: "eyebrows, table headings, button labels",
    },
    {
      id: "data",
      label: "Data",
      cssVar: "--hud-data-scale",
      min: 0.9,
      max: 1.35,
      step: 0.01,
      defaultValue: 1.08,
      note: "numbers, timers, ship counts",
    },
    {
      id: "icon",
      label: "Icons",
      cssVar: "--hud-icon-scale",
      min: 0.9,
      max: 1.55,
      step: 0.01,
      defaultValue: 1.18,
      note: "HUD icon glyph size",
    },
  ];

  const DEFAULT_SCALES = Object.fromEntries(
    SCALE_TOKENS.map((token) => [token.id, token.defaultValue]),
  ) as Record<ScaleTokenId, number>;

  const FONT_OPTION_IDS = new Set<FontOptionId>(FONT_OPTIONS.map((option) => option.id));

  let selections = $state<Record<FontTokenId, FontOptionId>>({ ...DEFAULT_SELECTIONS });
  let scales = $state<Record<ScaleTokenId, number>>({ ...DEFAULT_SCALES });
  let status = $state("Role tokens active");

  let hydrated = false;

  function isFontOptionId(value: unknown): value is FontOptionId {
    return typeof value === "string" && FONT_OPTION_IDS.has(value as FontOptionId);
  }

  function resolveOption(id: FontOptionId): FontOption {
    return FONT_OPTIONS.find((option) => option.id === id) ?? FONT_OPTIONS[0];
  }

  function clampScale(token: ScaleToken, value: number): number {
    return Math.max(token.min, Math.min(token.max, value));
  }

  function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  function hydrateFromStorage() {
    if (!browser) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsedRaw = JSON.parse(raw);
      if (!parsedRaw || typeof parsedRaw !== "object") return;
      const parsed = parsedRaw as StoredTypographyTokens;
      const storedSelections = ("selections" in parsed
        ? parsed.selections
        : parsed) as Partial<Record<FontTokenId, unknown>> | undefined;
      const storedScales = "scales" in parsed ? parsed.scales : undefined;
      const next = { ...DEFAULT_SELECTIONS };
      for (const role of TOKEN_ROLES) {
        const value = storedSelections?.[role.id];
        if (isFontOptionId(value)) {
          next[role.id] = value;
        }
      }
      selections = next;
      if (storedScales) {
        const nextScales = { ...DEFAULT_SCALES };
        for (const token of SCALE_TOKENS) {
          const value = storedScales[token.id];
          if (typeof value === "number" && Number.isFinite(value)) {
            nextScales[token.id] = clampScale(token, value);
          }
        }
        scales = nextScales;
      }
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
    for (const token of SCALE_TOKENS) {
      root.style.setProperty(token.cssVar, String(scales[token.id]));
    }
    if (persist) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selections, scales }));
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

  function setScale(tokenId: ScaleTokenId, value: number) {
    const token = SCALE_TOKENS.find((candidate) => candidate.id === tokenId);
    if (!token) return;
    scales = {
      ...scales,
      [tokenId]: clampScale(token, value),
    };
    applyTypographyTokens();
    status = "Applied size tokens";
  }

  function resetTokens() {
    selections = { ...DEFAULT_SELECTIONS };
    scales = { ...DEFAULT_SCALES };
    if (browser) {
      const root = document.documentElement;
      for (const role of TOKEN_ROLES) {
        root.style.removeProperty(role.cssVar);
      }
      for (const token of SCALE_TOKENS) {
        root.style.removeProperty(token.cssVar);
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

  <div class="pf-typography-panel__scales" aria-label="Typography and icon size tokens">
    {#each SCALE_TOKENS as token}
      <label class="pf-typography-scale-row">
        <span class="pf-typography-scale-row__meta">
          <strong>{token.label}</strong>
          <small>{token.note}</small>
        </span>
        <span class="pf-typography-scale-row__control">
          <input
            type="range"
            min={token.min}
            max={token.max}
            step={token.step}
            value={scales[token.id]}
            aria-label={`${token.label} size`}
            oninput={(event) => setScale(token.id, event.currentTarget.valueAsNumber)}
          />
          <output>{formatPercent(scales[token.id])}</output>
        </span>
      </label>
    {/each}
  </div>

  <div class="pf-typography-panel__status" title={status}>{status}</div>
</section>
