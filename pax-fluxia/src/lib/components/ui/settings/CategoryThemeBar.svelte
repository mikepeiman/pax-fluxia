<script lang="ts">
    import {
        type ThemeCategory,
        type CategoryPreset,
        listCategoryPresets,
        saveCategoryPreset,
        applyCategoryPreset,
        deleteCategoryPreset,
        CATEGORY_META,
    } from "$lib/config/categoryThemes";

    interface Props {
        category: ThemeCategory;
        onApply?: () => void;
    }
    let { category, onApply }: Props = $props();

    const meta = $derived(CATEGORY_META[category]);
    let presets = $derived(listCategoryPresets(category));
    let selectedName = $state("");
    let showSaveInput = $state(false);
    let saveName = $state("");

    function refresh() {
        // Force reactivity by touching category — $derived handles this
    }

    function handleApply(name: string) {
        const preset = presets.find((p) => p.name === name);
        if (preset) {
            applyCategoryPreset(preset);
            selectedName = name;
            onApply?.();
        }
    }

    function handleSave() {
        const name = saveName.trim();
        if (!name) return;
        saveCategoryPreset(category, name);
        saveName = "";
        showSaveInput = false;
        selectedName = name;
        refresh();
    }

    function handleDelete(name: string) {
        deleteCategoryPreset(category, name);
        if (selectedName === name) selectedName = "";
        refresh();
    }
</script>

{#if presets.length > 0 || true}
    <div class="category-theme-bar">
        <!-- Dropdown -->
        <select
            class="theme-select"
            value={selectedName}
            onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                if (v) handleApply(v);
            }}
        >
            <option value="">{meta.icon} Select preset…</option>
            {#each presets as p}
                <option value={p.name}>
                    {p.builtIn ? "📦 " : ""}{p.name}
                </option>
            {/each}
        </select>

        <!-- Save button -->
        <button
            class="bar-btn"
            title="Save current as preset"
            onclick={() => (showSaveInput = !showSaveInput)}>💾</button
        >

        <!-- Save input (expanded) -->
        {#if showSaveInput}
            <div class="save-row">
                <input
                    type="text"
                    class="save-input"
                    placeholder="Preset name…"
                    bind:value={saveName}
                    onkeydown={(e) => {
                        if (e.key === "Enter") handleSave();
                    }}
                />
                <button class="bar-btn save-confirm" onclick={handleSave}
                    >✓</button
                >
            </div>
        {/if}

        <!-- Chips row -->
        {#if presets.length > 0}
            <div class="chips-row">
                {#each presets as p}
                    <button
                        class="chip"
                        class:active={selectedName === p.name}
                        onclick={() => handleApply(p.name)}
                        title={p.builtIn
                            ? `Built-in: ${p.name}`
                            : `User: ${p.name}`}
                    >
                        {p.name}
                        {#if !p.builtIn}
                            <span
                                role="button"
                                tabindex="-1"
                                class="chip-delete"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(p.name);
                                }}
                                onkeydown={(e) => {
                                    if (e.key === "Enter") {
                                        e.stopPropagation();
                                        handleDelete(p.name);
                                    }
                                }}>×</span
                            >
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .category-theme-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        padding: 4px 0 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 4px;
    }

    .theme-select {
        flex: 1;
        min-width: 120px;
        background: rgba(255, 255, 255, 0.06);
        color: #ccc;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 5px;
        padding: 4px 22px 4px 8px;
        font-size: 11px;
        font-family: inherit;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 6px center;
    }
    .theme-select:focus {
        outline: 1px solid rgba(100, 180, 255, 0.5);
        border-color: rgba(100, 180, 255, 0.5);
    }
    .theme-select option {
        background: #1a1e2a;
        color: #ddd;
    }

    .bar-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.04);
        color: #889;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
    }
    .bar-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: #4ade80;
        color: #fff;
    }

    .save-row {
        display: flex;
        gap: 3px;
        width: 100%;
        margin-top: 2px;
    }
    .save-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.06);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        padding: 3px 8px;
        font-size: 11px;
        font-family: inherit;
        outline: none;
    }
    .save-input:focus {
        border-color: #4ade80;
    }
    .save-confirm {
        width: 24px;
        height: 24px;
        font-size: 14px;
        color: #4ade80;
    }

    .chips-row {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        width: 100%;
        margin-top: 2px;
    }
    .chip {
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 2px 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        color: #aab;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
    }
    .chip:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
        color: #ddd;
    }
    .chip.active {
        background: rgba(74, 222, 128, 0.12);
        border-color: rgba(74, 222, 128, 0.4);
        color: #4ade80;
    }
    .chip-delete {
        font-size: 12px;
        line-height: 1;
        opacity: 0.4;
        cursor: pointer;
    }
    .chip-delete:hover {
        opacity: 1;
        color: #ff5555;
    }
</style>
