<script lang="ts">
    import {
        type ThemeCategory,
        type CategoryPreset,
        listCategoryPresets,
        saveCategoryPreset,
        applyCategoryPreset,
        deleteCategoryPreset,
        resetCategoryToDefaults,
        importCategoryPreset,
        getStarredNames,
        setStarred,
        CATEGORY_META,
    } from "$lib/config/categoryThemes";
    import {
        PaxHudButton,
        PaxHudFileButton,
        PaxHudIconButton,
        PaxHudSelect,
        PaxHudTextInput,
    } from "$lib/design-system";
    import { log } from "$lib/utils/logger";

    interface Props {
        category: ThemeCategory;
        onApply?: () => void;
    }

    let { category, onApply }: Props = $props();

    const meta = $derived(CATEGORY_META[category]);
    let _version = $state(0);
    let presets = $derived.by(() => {
        _version;
        return listCategoryPresets(category);
    });
    let presetOptions = $derived(
        presets.map((preset) => ({
            value: preset.name,
            label: preset.name,
        })),
    );
    let starredNames = $derived.by(() => {
        _version;
        return getStarredNames(category);
    });
    let starredPresets = $derived(
        presets.filter((preset) => starredNames.has(preset.name)),
    );

    let selectedName = $state("");
    let showSaveInput = $state(false);
    let saveName = $state("");
    let saveFlash = $state(false);
    let showEditModal = $state(false);
    let isUserPreset = $state(false);

    $effect(() => {
        const preset = presets.find((candidate) => candidate.name === selectedName);
        isUserPreset = preset ? !preset.builtIn : false;
    });

    function flashSaved() {
        saveFlash = true;
        setTimeout(() => (saveFlash = false), 600);
    }

    function handleApply(name: string) {
        const preset = presets.find((candidate) => candidate.name === name);
        if (preset) {
            applyCategoryPreset(preset);
            selectedName = name;
            onApply?.();
        }
    }

    function downloadThemeJson(preset: CategoryPreset) {
        const json = JSON.stringify(preset, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const safeName = preset.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        anchor.href = url;
        anchor.download = `pax-theme-${category}-${safeName}-${timestamp}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function handleSelectPreset(name: string) {
        selectedName = name;
        if (name) handleApply(name);
    }

    function handleSave() {
        const name = saveName.trim();
        if (!name) return;
        const preset = saveCategoryPreset(category, name);
        saveName = "";
        showSaveInput = false;
        selectedName = name;
        _version++;
        flashSaved();
        downloadThemeJson(preset);
    }

    function handleDelete(name: string) {
        deleteCategoryPreset(category, name);
        if (selectedName === name) selectedName = "";
        _version++;
    }

    function handleUpdate() {
        if (!selectedName) return;
        const existing = presets.find((preset) => preset.name === selectedName);
        if (!existing || existing.builtIn) return;
        const preset = saveCategoryPreset(category, selectedName);
        _version++;
        flashSaved();
        downloadThemeJson(preset);
    }

    function handleReset() {
        resetCategoryToDefaults(category);
        selectedName = "";
        onApply?.();
    }

    function toggleStar(name: string) {
        setStarred(category, name, !starredNames.has(name));
        _version++;
    }

    function onFileSelected(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result as string);
                json.category = category;
                const preset = importCategoryPreset(json, true);
                if (preset) {
                    selectedName = preset.name;
                    _version++;
                    onApply?.();
                }
            } catch (error) {
                log.error("CategoryThemeBar", "Failed to import theme", error);
            }
        };
        reader.readAsText(file);
    }
</script>

<div class="category-theme-bar">
    <div class="category-theme-bar__actions" class:category-theme-bar__actions--hidden={showSaveInput}>
        <PaxHudSelect
            class="category-theme-bar__select"
            value={selectedName}
            options={presetOptions}
            placeholder="Select preset..."
            ariaLabel={`Select ${meta.label} preset`}
            size="sm"
            onValueChange={handleSelectPreset}
        />

        {#if isUserPreset}
            <PaxHudIconButton
                icon="save-game"
                title={`Update ${selectedName} with current settings`}
                active={saveFlash}
                onclick={handleUpdate}
            />
        {/if}
        <PaxHudIconButton
            icon="add"
            title="Create new theme from current settings"
            onclick={() => (showSaveInput = true)}
        />
        <PaxHudIconButton icon="reset" title="Reset to defaults" onclick={handleReset} />
        <PaxHudIconButton
            icon="tune"
            title={`Manage ${meta.label} themes`}
            onclick={() => (showEditModal = true)}
        />
        <PaxHudFileButton
            icon="import"
            title="Import theme from file"
            accept=".json"
            onFileSelected={onFileSelected}
        />
    </div>

    <div class="category-theme-bar__save" class:category-theme-bar__save--open={showSaveInput}>
        <PaxHudTextInput
            class="category-theme-bar__name-input"
            value={saveName}
            placeholder="Theme name..."
            size="sm"
            onInput={(value) => (saveName = value)}
            onKeydown={(event) => {
                if (event.key === "Enter") handleSave();
                if (event.key === "Escape") showSaveInput = false;
            }}
        />
        <PaxHudIconButton
            icon="close"
            title="Cancel theme save"
            danger
            onclick={() => (showSaveInput = false)}
        />
        <PaxHudIconButton
            icon="focus"
            title="Save theme"
            active={saveFlash}
            onclick={handleSave}
        />
    </div>

    {#if starredPresets.length > 0}
        <div class="category-theme-bar__chips" aria-label={`${meta.label} starred presets`}>
            {#each starredPresets as preset}
                <PaxHudButton
                    label={preset.name}
                    size="sm"
                    active={selectedName === preset.name}
                    title={preset.builtIn ? `Built-in: ${preset.name}` : `User: ${preset.name}`}
                    onclick={() => handleApply(preset.name)}
                />
            {/each}
        </div>
    {/if}
</div>

{#if showEditModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="category-theme-modal"
        onclick={(event) => {
            if (event.target === event.currentTarget) showEditModal = false;
        }}
    >
        <section class="category-theme-modal__panel" aria-label={`Manage ${meta.label} themes`}>
            <header class="category-theme-modal__header">
                <span class="category-theme-modal__title">Manage {meta.label} Themes</span>
                <PaxHudIconButton
                    icon="close"
                    title="Close theme manager"
                    onclick={() => (showEditModal = false)}
                />
            </header>

            {#if presets.length > 0}
                <div class="category-theme-modal__grid">
                    {#each presets as preset}
                        <div
                            class="category-theme-modal__item"
                            class:category-theme-modal__item--active={selectedName === preset.name}
                        >
                            <PaxHudIconButton
                                icon={starredNames.has(preset.name) ? "yellow" : "grey"}
                                title={starredNames.has(preset.name) ? "Unstar preset" : "Star preset"}
                                active={starredNames.has(preset.name)}
                                onclick={() => toggleStar(preset.name)}
                            />
                            <PaxHudButton
                                class="category-theme-modal__name"
                                label={preset.name}
                                size="sm"
                                active={selectedName === preset.name}
                                onclick={() => {
                                    handleApply(preset.name);
                                    showEditModal = false;
                                }}
                            />
                            {#if !preset.builtIn}
                                <PaxHudIconButton
                                    icon="close"
                                    title="Delete theme"
                                    danger
                                    onclick={() => handleDelete(preset.name)}
                                />
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="category-theme-modal__empty">
                    No themes yet. Create one with the add button.
                </div>
            {/if}
        </section>
    </div>
{/if}

<style>
    /*
     * Base layout only. The visual framing of this bar (background, border,
     * clip-path) is owned by GameSettingsPanel's `.section-body
     * .category-theme-bar` rule so it can be anchored as fixed category chrome
     * relative to the section panel — see GameSettingsPanel.svelte.
     */
    .category-theme-bar {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--pax-space-2);
        margin-bottom: var(--pax-gap-sm);
        padding: 0 0 var(--pax-gap-sm);
        border-bottom: 1px solid var(--pax-ui-divider);
    }

    .category-theme-bar__actions,
    .category-theme-bar__save {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: var(--pax-gap-xs);
        transition:
            opacity var(--pax-motion-base, 220ms ease),
            transform var(--pax-motion-base, 220ms ease);
    }

    .category-theme-bar__actions--hidden {
        height: 0;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
        transform: translateX(-10px);
    }

    .category-theme-bar__save {
        height: 0;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
        transform: translateX(10px);
    }

    .category-theme-bar__save--open {
        height: auto;
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0);
    }

    :global(.category-theme-bar__select),
    :global(.category-theme-bar__name-input) {
        flex: 1 1 auto;
        min-width: 0;
    }

    .category-theme-bar__chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pax-gap-xs);
        min-width: 0;
    }

    .category-theme-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--pax-space-6);
        background: color-mix(in srgb, var(--pax-color-void) 66%, transparent);
        backdrop-filter: blur(5px);
    }

    .category-theme-modal__panel {
        width: min(560px, 100%);
        max-height: min(80vh, 680px);
        overflow-y: auto;
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-md);
        clip-path: var(--pax-ui-rounded-corner-md);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 98%, transparent), color-mix(in srgb, var(--pax-color-void) 99%, transparent)) padding-box,
            var(--pax-ui-border-gradient) border-box;
        box-shadow: var(--pax-ui-shadow);
        padding: var(--pax-gap-md);
        color: var(--pax-ui-text);
        font-family: var(--pax-ui-font-ui);
    }

    .category-theme-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pax-space-3);
        margin-bottom: var(--pax-space-3);
        padding-bottom: var(--pax-gap-sm);
        border-bottom: 1px solid var(--pax-ui-divider);
    }

    .category-theme-modal__title {
        min-width: 0;
        overflow: hidden;
        color: var(--pax-ui-accent-warm-strong);
        font-size: calc(0.86rem * var(--pax-ui-title-scale, 1));
        font-weight: var(--pax-weight-extrabold);
        letter-spacing: 0.09em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .category-theme-modal__grid {
        display: grid;
        gap: var(--pax-space-2);
    }

    .category-theme-modal__item {
        min-width: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--pax-space-2);
        padding: var(--pax-space-2);
        border: 1px solid transparent;
        border-radius: var(--pax-ui-radius-sm);
        clip-path: var(--pax-ui-rounded-corner-sm);
        background:
            linear-gradient(180deg, color-mix(in srgb, var(--pax-color-void) 78%, transparent), color-mix(in srgb, var(--pax-color-void) 90%, transparent)) padding-box,
            var(--pax-ui-control-border-gradient) border-box;
    }

    .category-theme-modal__item--active {
        box-shadow: 0 0 18px color-mix(in srgb, var(--pax-ui-accent-warm) 20%, transparent);
    }

    :global(.category-theme-modal__name) {
        width: 100%;
        justify-content: flex-start;
    }

    .category-theme-modal__empty {
        color: var(--pax-ui-text-dim);
        font-family: var(--pax-ui-font-copy);
        font-size: calc(0.76rem * var(--pax-ui-type-scale, 1));
        line-height: 1.4;
        padding: var(--pax-gap-lg) var(--pax-space-1) var(--pax-space-1);
        text-align: center;
    }
</style>
