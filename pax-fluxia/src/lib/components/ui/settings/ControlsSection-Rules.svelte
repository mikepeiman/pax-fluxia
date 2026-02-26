<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";

    // ControlsSection-RULES â€” In-Game Settings Controls: Rules
    // Extracted from GameSettingsPanel.svelte

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }
    let { panel, updatePanel }: Props = $props();
    import CategoryThemeBar from './CategoryThemeBar.svelte';
</script>

<CategoryThemeBar category="rules" onApply={() => {}} />


<label class="toggle-row">
    <input
        type="checkbox"
        checked={GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST}
        onchange={() => {
            GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST =
                !GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST;
        }}
    />
    <span class="var-name"
        >Retain orders after conquest</span
    >
</label>
<div
    class="var-row grayed"
    style="font-size: 9px; padding: 0 4px 4px; margin-top: -6px; opacity: 0.6;"
>
    Attack orders become movement orders when target is
    captured
</div>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={GAME_CONFIG.ALLOW_OPPOSING_ORDERS}
        onchange={() => {
            GAME_CONFIG.ALLOW_OPPOSING_ORDERS =
                !GAME_CONFIG.ALLOW_OPPOSING_ORDERS;
        }}
    />
    <span class="var-name">Allow opposing orders</span>
</label>
<div
    class="var-row grayed"
    style="font-size: 9px; padding: 0 4px 4px; margin-top: -6px; opacity: 0.6;"
>
    A→B and B→A movement orders can coexist (default: off =
    opposing cancels)
</div>

<style>
    @import './panel-shared.css';
</style>
