<script lang="ts">
  import {
    PaxSettingsPickerRow,
    type PaxSettingsPickerOption,
  } from "$lib/design-system";
  import type { ThemeFamilyGroup } from "$lib/config/themeRouting";
  import type { GameTheme } from "$lib/config/themes";

  interface Props {
    themeFamilyGroups: ThemeFamilyGroup<GameTheme>[];
    selectedThemeName: string;
    placeholder?: string;
    idBase?: string;
    labelledBy?: string;
    variant?: "default" | "shell";
    showGroupLabels?: boolean;
    getThemeOptionLabel: (theme: GameTheme) => string;
    onSelectTheme: (name: string) => void;
  }

  let {
    themeFamilyGroups,
    selectedThemeName,
    placeholder = "Select theme...",
    idBase = "theme-select-dropdown",
    labelledBy,
    variant = "default",
    showGroupLabels = false,
    getThemeOptionLabel,
    onSelectTheme,
  }: Props = $props();

  let open = $state(false);

  const flatThemeOptions = $derived.by(() =>
    themeFamilyGroups.flatMap((group) =>
      group.themes.map((theme) => ({
        theme,
        groupLabel: group.label,
        label: getThemeOptionLabel(theme),
      })),
    ),
  );

  const pickerOptions = $derived<PaxSettingsPickerOption[]>(
    flatThemeOptions.map(({ theme, groupLabel, label }) => ({
      value: theme.name,
      label,
      meta: showGroupLabels ? groupLabel : undefined,
    })),
  );

  const selectedLabel = $derived(
    flatThemeOptions.find((option) => option.theme.name === selectedThemeName)?.label
      ?? placeholder,
  );

  function handleSelectTheme(name: string): void {
    onSelectTheme(name);
    open = false;
  }
</script>

<PaxSettingsPickerRow
  class={variant === "shell"
    ? "theme-select-dropdown theme-select-dropdown--shell"
    : "theme-select-dropdown"}
  label="Theme"
  value={selectedThemeName}
  selectedLabel={selectedLabel}
  options={pickerOptions}
  {open}
  disabled={pickerOptions.length === 0}
  description="Select a saved or built-in theme."
  settingConfigKey={idBase}
  settingLabel={labelledBy ?? "Theme select"}
  onToggle={() => {
    open = !open;
  }}
  onSelect={handleSelectTheme}
/>
