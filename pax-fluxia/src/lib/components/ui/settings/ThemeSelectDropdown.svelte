<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { ThemeFamilyGroup } from "$lib/config/themeRouting";
  import type { GameTheme } from "$lib/config/themes";

  interface Props {
    themeFamilyGroups: ThemeFamilyGroup<GameTheme>[];
    selectedThemeName: string;
    placeholder?: string;
    idBase?: string;
    labelledBy?: string;
    variant?: "default" | "shell";
    getThemeOptionLabel: (theme: GameTheme) => string;
    onSelectTheme: (name: string) => void;
  }

  type ThemeDropdownOption = {
    theme: GameTheme;
    label: string;
    optionIndex: number;
  };

  type ThemeDropdownGroup = ThemeFamilyGroup<GameTheme> & {
    options: ThemeDropdownOption[];
  };

  let {
    themeFamilyGroups,
    selectedThemeName,
    placeholder = "Select theme...",
    idBase = "theme-select-dropdown",
    labelledBy,
    variant = "default",
    getThemeOptionLabel,
    onSelectTheme,
  }: Props = $props();

  const menuId = $derived(`${idBase}-menu`);
  const buttonId = $derived(`${idBase}-button`);

  let rootEl = $state<HTMLDivElement | null>(null);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);
  let open = $state(false);
  let activeIndex = $state(-1);

  const groupedOptions = $derived.by<ThemeDropdownGroup[]>(() => {
    let optionIndex = 0;
    return themeFamilyGroups.map((group) => ({
      ...group,
      options: group.themes.map((theme) => ({
        theme,
        label: getThemeOptionLabel(theme),
        optionIndex: optionIndex++,
      })),
    }));
  });

  const flatOptions = $derived(
    groupedOptions.flatMap((group) => group.options),
  );

  const selectedIndex = $derived(
    flatOptions.findIndex((option) => option.theme.name === selectedThemeName),
  );

  const selectedLabel = $derived(
    flatOptions.find((option) => option.theme.name === selectedThemeName)?.label
      ?? placeholder,
  );

  const activeOptionId = $derived(
    activeIndex >= 0 ? `${menuId}-option-${activeIndex}` : undefined,
  );

  function scrollActiveOptionIntoView() {
    queueMicrotask(() => {
      const option = listEl?.querySelector<HTMLButtonElement>(
        `[data-option-index="${activeIndex}"]`,
      );
      option?.scrollIntoView({ block: "nearest" });
    });
  }

  async function openList(preferredIndex?: number) {
    if (flatOptions.length === 0) return;
    open = true;
    const fallbackIndex = selectedIndex >= 0 ? selectedIndex : 0;
    activeIndex = Math.max(
      0,
      Math.min(flatOptions.length - 1, preferredIndex ?? fallbackIndex),
    );
    await tick();
    listEl?.focus({ preventScroll: true });
    scrollActiveOptionIntoView();
  }

  function closeList({ restoreFocus = true } = {}) {
    open = false;
    activeIndex = -1;
    if (restoreFocus) {
      queueMicrotask(() => buttonEl?.focus({ preventScroll: true }));
    }
  }

  function handleTriggerClick() {
    if (open) {
      closeList({ restoreFocus: false });
      return;
    }
    void openList();
  }

  function moveActive(delta: number) {
    if (flatOptions.length === 0) return;
    activeIndex =
      activeIndex < 0
        ? 0
        : Math.max(0, Math.min(flatOptions.length - 1, activeIndex + delta));
    scrollActiveOptionIntoView();
  }

  function setActive(index: number) {
    if (flatOptions.length === 0) return;
    activeIndex = Math.max(0, Math.min(flatOptions.length - 1, index));
    scrollActiveOptionIntoView();
  }

  function selectIndex(index: number) {
    const option = flatOptions[index];
    if (!option) return;
    onSelectTheme(option.theme.name);
    closeList();
  }

  function handleTriggerKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          void openList();
        } else {
          moveActive(event.key === "ArrowDown" ? 1 : -1);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) {
          void openList();
        }
        break;
      case "Home":
        event.preventDefault();
        if (!open) {
          void openList(0);
        } else {
          setActive(0);
        }
        break;
      case "End":
        event.preventDefault();
        if (!open) {
          void openList(flatOptions.length - 1);
        } else {
          setActive(flatOptions.length - 1);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          closeList({ restoreFocus: false });
        }
        break;
    }
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(-1);
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(flatOptions.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex >= 0) selectIndex(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        closeList();
        break;
      case "Tab":
        closeList({ restoreFocus: false });
        break;
    }
  }

  function handleOptionMouseEnter(index: number) {
    activeIndex = index;
  }

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!open || !rootEl) return;
      if (!rootEl.contains(event.target as Node)) {
        closeList({ restoreFocus: false });
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  });
</script>

<div
  class="theme-select-dropdown"
  class:theme-select-dropdown--shell={variant === "shell"}
  bind:this={rootEl}>
  <button
    bind:this={buttonEl}
    id={buttonId}
    type="button"
    class="theme-select-dropdown__trigger"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={menuId}
    aria-labelledby={labelledBy}
    disabled={flatOptions.length === 0}
    title={selectedLabel}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeydown}>
    <span class="theme-select-dropdown__label">{selectedLabel}</span>
    <span class="theme-select-dropdown__chevron" aria-hidden="true"></span>
  </button>

  {#if open}
    <div
      bind:this={listEl}
      id={menuId}
      class="theme-select-dropdown__menu"
      role="listbox"
      tabindex="0"
      aria-labelledby={buttonId}
      aria-activedescendant={activeOptionId}
      onkeydown={handleMenuKeydown}>
      {#each groupedOptions as group}
        <div
          class="theme-select-dropdown__group"
          role="group"
          aria-label={`${group.label} (${group.options.length})`}>
          <div class="theme-select-dropdown__group-label">
            {group.label} ({group.options.length})
          </div>

          {#each group.options as option}
            <button
              id={`${menuId}-option-${option.optionIndex}`}
              type="button"
              class="theme-select-dropdown__option"
              class:is-active={option.optionIndex === activeIndex}
              class:is-selected={option.theme.name === selectedThemeName}
              role="option"
              aria-selected={option.theme.name === selectedThemeName}
              tabindex="-1"
              data-option-index={option.optionIndex}
              title={option.label}
              onmouseenter={() => handleOptionMouseEnter(option.optionIndex)}
              onclick={() => selectIndex(option.optionIndex)}>
              <span class="theme-select-dropdown__option-text">
                {option.label}
              </span>
              <span
                class="theme-select-dropdown__option-indicator"
                class:visible={option.theme.name === selectedThemeName}
                aria-hidden="true"></span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .theme-select-dropdown {
    position: relative;
    display: flex;
    align-items: stretch;
    flex: 1 1 0;
    width: 100%;
    min-width: 0;
  }

  .theme-select-dropdown__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 32px;
    min-width: 0;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.06);
    color: #ccc;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 0 12px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    text-align: left;
    transition:
      border-color 0.2s,
      background 0.2s,
      color 0.2s;
  }

  .theme-select-dropdown__trigger:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .theme-select-dropdown__trigger:focus-visible {
    border-color: #4ade80;
    box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.2);
  }

  .theme-select-dropdown__trigger:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .theme-select-dropdown__label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .theme-select-dropdown__chevron {
    flex: 0 0 auto;
    width: 12px;
    height: 12px;
    color: #8892a8;
  }

  .theme-select-dropdown__chevron::before {
    content: "";
    display: block;
    width: 7px;
    height: 7px;
    margin: 1px auto 0;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(45deg);
    transition: transform 0.2s ease;
  }

  .theme-select-dropdown__trigger[aria-expanded="true"]
    .theme-select-dropdown__chevron::before {
    transform: rotate(-135deg) translate(-1px, -1px);
  }

  .theme-select-dropdown__menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    z-index: 20;
    max-height: min(420px, 50vh);
    overflow: auto;
    overscroll-behavior: contain;
    background: #151a25;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    padding: 6px;
    outline: none;
  }

  .theme-select-dropdown__group + .theme-select-dropdown__group {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .theme-select-dropdown__group-label {
    padding: 6px 8px;
    color: #7dd3fc;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .theme-select-dropdown__option {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    background: transparent;
    color: #eee;
    border: 0;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;
  }

  .theme-select-dropdown__option:hover,
  .theme-select-dropdown__option.is-active {
    background: rgba(255, 255, 255, 0.08);
  }

  .theme-select-dropdown__option.is-selected {
    background: rgba(74, 222, 128, 0.12);
    color: #d9ffe7;
  }

  .theme-select-dropdown__option-text {
    flex: 1 1 auto;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    line-height: 1.25;
  }

  .theme-select-dropdown__option-indicator {
    flex: 0 0 auto;
    width: 10px;
    height: 10px;
    margin-top: 4px;
    border-radius: 999px;
    border: 1px solid rgba(74, 222, 128, 0.55);
    background: transparent;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .theme-select-dropdown__option-indicator.visible {
    opacity: 1;
    background: #4ade80;
    box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__trigger {
    background: rgba(20, 20, 35, 0.9);
    color: #fff;
    border-color: rgba(255, 200, 60, 0.3);
    font-family: "Montserrat", sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .theme-select-dropdown--shell .theme-select-dropdown__trigger:hover {
    background: rgba(28, 28, 46, 0.94);
    border-color: rgba(255, 200, 60, 0.55);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__trigger:focus-visible {
    border-color: rgba(255, 200, 60, 0.75);
    box-shadow: 0 0 0 1px rgba(255, 200, 60, 0.22);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__chevron {
    color: rgba(255, 220, 120, 0.8);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__menu {
    background: rgba(12, 14, 28, 0.98);
    border-color: rgba(255, 200, 60, 0.25);
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.45);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__group + .theme-select-dropdown__group {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__group-label {
    color: rgba(255, 210, 110, 0.9);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__option:hover,
  .theme-select-dropdown--shell .theme-select-dropdown__option.is-active {
    background: rgba(255, 200, 60, 0.08);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__option.is-selected {
    background: rgba(255, 200, 60, 0.14);
    color: #fff3cb;
  }

  .theme-select-dropdown--shell .theme-select-dropdown__option-indicator {
    border-color: rgba(255, 200, 60, 0.55);
  }

  .theme-select-dropdown--shell .theme-select-dropdown__option-indicator.visible {
    background: rgba(255, 200, 60, 0.95);
    box-shadow: 0 0 10px rgba(255, 200, 60, 0.38);
  }
</style>
