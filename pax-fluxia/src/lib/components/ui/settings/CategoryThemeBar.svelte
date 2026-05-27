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
    import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";

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
    let starredNames = $derived.by(() => {
        _version;
        return getStarredNames(category);
    });
    let starredPresets = $derived(
        presets.filter((p) => starredNames.has(p.name)),
    );

    let selectedName = $state("");
    let showSaveInput = $state(false);
    let saveName = $state("");
    let saveFlash = $state(false);
    let showEditModal = $state(false);

    function handleApply(name: string) {
        const preset = presets.find((p) => p.name === name);
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
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.href = url;
        const safeName = preset.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        a.download = `pax-theme-${category}-${safeName}-${ts}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleSave() {
        const name = saveName.trim();
        if (!name) return;
        const preset = saveCategoryPreset(category, name);
        saveName = "";
        showSaveInput = false;
        selectedName = name;
        _version++;
        saveFlash = true;
        setTimeout(() => (saveFlash = false), 600);
        downloadThemeJson(preset);
    }

    function handleDelete(name: string) {
        deleteCategoryPreset(category, name);
        if (selectedName === name) selectedName = "";
        _version++;
    }

    function handleUpdate() {
        if (!selectedName) return;
        const existing = presets.find((p) => p.name === selectedName);
        if (!existing || existing.builtIn) return;
        const preset = saveCategoryPreset(category, selectedName);
        _version++;
        saveFlash = true;
        setTimeout(() => (saveFlash = false), 600);
        downloadThemeJson(preset);
    }

    function handleReset() {
        resetCategoryToDefaults(category);
        selectedName = "";
        onApply?.();
    }

    function toggleStar(name: string) {
        const isCurrentlyStarred = starredNames.has(name);
        setStarred(category, name, !isCurrentlyStarred);
        _version++;
    }

    let fileInput = $state<HTMLInputElement | null>(null);

    function handleImport() {
        fileInput?.click();
    }

    function onFileSelected(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
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
            } catch (err) {
                console.error(
                    "[CategoryThemeBar] Failed to import theme:",
                    err,
                );
            }
        };
        reader.readAsText(file);
        (e.target as HTMLInputElement).value = "";
    }

    $effect(() => {
        const p = presets.find((pr) => pr.name === selectedName);
        isUserPreset = p ? !p.builtIn : false;
    });
    let isUserPreset = $state(false);
</script>

{#if presets.length > 0 || true}
    <div class="category-theme-bar">
        <!-- Top Row: Select & Actions -->
        <div class="top-row">
            <div class="action-buttons" class:hidden={showSaveInput}>
                <select
                    class="theme-select action-half"
                    bind:value={selectedName}
                    onchange={() => {
                        if (selectedName) handleApply(selectedName);
                    }}
                >
                    <option value="">Select preset...</option>
                    {#each presets as p}
                        <option value={p.name}>
                            {p.name}
                        </option>
                    {/each}
                </select>

                {#if isUserPreset}
                    <button
                        class="action-btn update-btn"
                        class:flash={saveFlash}
                        onclick={handleUpdate}
                        title="Update '{selectedName}' with current settings"
                    >
                        <HudIcon name="save-game" size={13} />
                    </button>
                {/if}
                <button
                    class="action-btn create-btn"
                    title="Create new theme from current settings"
                    onclick={() => (showSaveInput = true)}
                >
                    <span class="plus-icon">+</span>
                </button>
                <button
                    class="action-btn reset-btn"
                    title="Reset to defaults"
                    onclick={handleReset}
                >
                    <HudIcon name="reset" size={13} />
                </button>
                <button
                    class="action-btn edit-btn"
                    title="Manage themes"
                    onclick={() => (showEditModal = true)}
                >
                    <HudIcon name="tune" size={13} />
                </button>
                <button
                    class="action-btn import-btn"
                    title="Import theme from file"
                    onclick={handleImport}
                >
                    <HudIcon name="import" size={13} />
                </button>
                <input
                    type="file"
                    accept=".json"
                    style="display:none"
                    bind:this={fileInput}
                    onchange={onFileSelected}
                />
            </div>

            <!-- Save Input Drawer -->
            <div class="save-drawer" class:open={showSaveInput}>
                <input
                    type="text"
                    class="save-input"
                    placeholder="Theme name..."
                    bind:value={saveName}
                    onkeydown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") showSaveInput = false;
                    }}
                />
                <button
                    class="drawer-btn cancel"
                    onclick={() => (showSaveInput = false)}
                    title="Cancel"
                >
                    <HudIcon name="close" size={12} />
                </button>
                <button
                    class="drawer-btn confirm"
                    class:flash={saveFlash}
                    onclick={handleSave}
                    title="Save Theme"
                >
                    <HudIcon name="focus" size={12} />
                </button>
            </div>
        </div>

        <!-- Starred Chips Row (only starred presets) -->
        {#if starredPresets.length > 0}
            <div class="chips-row">
                {#each starredPresets as p}
                    <button
                        class="chip"
                        class:active={selectedName === p.name}
                        onclick={() => handleApply(p.name)}
                        title={p.builtIn
                            ? `Built-in: ${p.name}`
                            : `User: ${p.name}`}
                    >
                        {p.name}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<!-- ═══ Edit Modal ═══ -->
{#if showEditModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="modal-backdrop"
        onclick={(e) => {
            if (e.target === e.currentTarget) showEditModal = false;
        }}
    >
        <div class="modal-panel">
            <div class="modal-header">
                <span class="modal-title">Manage {meta.label} Themes</span>
                <button
                    class="modal-close"
                    onclick={() => (showEditModal = false)}
                >
                    <HudIcon name="close" size={12} />
                </button>
            </div>
            <div class="modal-grid">
                {#each presets as p}
                    <div
                        class="modal-chip"
                        class:active={selectedName === p.name}
                    >
                        <button
                            class="modal-chip-star"
                            onclick={() => toggleStar(p.name)}
                            title={starredNames.has(p.name)
                                ? "Unstar"
                                : "Star (show as chip)"}
                        >
                            <HudIcon name={starredNames.has(p.name) ? "yellow" : "grey"} size={13} />
                        </button>
                        <button
                            class="modal-chip-name"
                            onclick={() => {
                                handleApply(p.name);
                                showEditModal = false;
                            }}
                        >
                            {p.name}
                        </button>
                        {#if !p.builtIn}
                            <button
                                class="modal-chip-delete"
                                onclick={() => handleDelete(p.name)}
                                title="Delete theme"
                            >
                                <HudIcon name="close" size={12} />
                            </button>
                        {/if}
                    </div>
                {/each}
            </div>
            {#if presets.length === 0}
                <div class="modal-empty">
                    No themes yet. Create one with the + button.
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .category-theme-bar {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 4px 0 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 8px;
    }

    .top-row {
        position: relative;
        width: 100%;
        height: 30px;
        display: flex;
        align-items: center;
        overflow: hidden;
        border-radius: 5px;
    }

    .action-buttons {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        gap: 6px;
        transition:
            transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity 0.2s;
    }
    .action-buttons.hidden {
        transform: translateX(-15px);
        opacity: 0;
        pointer-events: none;
    }

    .action-half {
        flex: 1;
        min-width: 0;
        height: 100%;
    }

    .theme-select {
        background: rgba(255, 255, 255, 0.06);
        color: #ccc;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 5px;
        padding: 0 24px 0 10px;
        font-size: 11.5px;
        font-family: inherit;
        cursor: pointer;
        outline: none;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        transition:
            border-color 0.2s,
            background 0.2s;
    }
    .theme-select:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
    }
    .theme-select:focus {
        border-color: #4ade80;
    }
    .theme-select option {
        background: #151a25;
        color: #eee;
    }

    .action-btn {
        background: rgba(255, 255, 255, 0.04);
        color: #aaa;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 5px;
        font-size: 11.5px;
        font-family: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 10px;
        min-width: 30px;
        flex-shrink: 0;
        transition: all 0.2s;
    }
    .action-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.25);
    }

    .plus-icon {
        font-size: 14px;
        font-weight: bold;
        color: #888;
        transition: color 0.2s;
    }
    .action-btn:hover .plus-icon {
        color: #4ade80;
    }

    .save-drawer {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        gap: 4px;
        transform: translateX(100%);
        opacity: 0;
        transition:
            transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity 0.25s;
        pointer-events: none;
        background: #111520;
        z-index: 2;
    }
    .save-drawer.open {
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
    }

    .save-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.2);
        color: #fff;
        border: 1px solid rgba(74, 222, 128, 0.3);
        border-radius: 5px;
        padding: 0 10px;
        font-size: 11.5px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s;
    }
    .save-input:focus {
        border-color: #4ade80;
        box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.2) inset;
    }
    .save-input::placeholder {
        color: #666;
    }

    .drawer-btn {
        width: 30px;
        height: 100%;
        border: 1px solid;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .drawer-btn.cancel {
        background: rgba(255, 255, 255, 0.05);
        color: #999;
        border-color: rgba(255, 255, 255, 0.15);
    }
    .drawer-btn.cancel:hover {
        background: rgba(255, 55, 55, 0.15);
        color: #ff5555;
        border-color: rgba(255, 55, 55, 0.4);
    }
    .drawer-btn.confirm {
        background: rgba(74, 222, 128, 0.1);
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.3);
    }
    .drawer-btn.confirm:hover {
        background: rgba(74, 222, 128, 0.2);
        color: #4ade80;
        border-color: #4ade80;
    }
    .drawer-btn.confirm.flash {
        background: #4ade80;
        color: #000;
        transform: scale(0.95);
    }

    /* ── Starred Chips ── */
    .chips-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        width: 100%;
    }
    .chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        color: #bbb;
        font-size: 10.5px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .chip:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
        color: #fff;
    }
    .chip.active {
        background: rgba(74, 222, 128, 0.12);
        border-color: rgba(74, 222, 128, 0.4);
        color: #4ade80;
    }

    /* ── Edit Modal ── */
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
    }
    .modal-panel {
        background: #131825;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 16px 20px;
        min-width: 320px;
        max-width: 520px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
    }
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-title {
        font-size: 14px;
        font-weight: 600;
        color: #dde;
    }
    .modal-close {
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #888;
        font-size: 14px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }
    .modal-close:hover {
        background: rgba(255, 55, 55, 0.15);
        color: #ff5555;
        border-color: rgba(255, 55, 55, 0.4);
    }
    .modal-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    .modal-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        transition: all 0.2s;
    }
    .modal-chip:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.2);
    }
    .modal-chip.active {
        border-color: rgba(74, 222, 128, 0.4);
        background: rgba(74, 222, 128, 0.06);
    }
    .modal-chip-star {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        line-height: 1;
        transition: transform 0.15s;
    }
    .modal-chip-star:hover {
        transform: scale(1.2);
    }
    .modal-chip-name {
        background: none;
        border: none;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        padding: 0;
        font-family: inherit;
        transition: color 0.2s;
    }
    .modal-chip-name:hover {
        color: #fff;
    }
    .modal-chip-delete {
        background: none;
        border: none;
        color: rgba(255, 80, 80, 0.4);
        font-size: 14px;
        cursor: pointer;
        padding: 0 0 0 4px;
        line-height: 1;
        transition: all 0.2s;
    }
    .modal-chip-delete:hover {
        color: #ff5555;
        transform: scale(1.15);
    }
    .modal-empty {
        color: #556;
        font-size: 12px;
        text-align: center;
        padding: 20px 0;
    }
</style>
