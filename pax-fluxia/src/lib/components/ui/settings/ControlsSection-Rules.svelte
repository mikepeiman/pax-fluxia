<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();
</script>

<CategoryThemeBar category="rules" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Order Persistence</h4>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST}
        onchange={() => {
            GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST = !GAME_CONFIG.RETAIN_ORDER_ON_CONQUEST;
        }}
    />
    <span class="var-name">Retain Orders After Conquest</span>
    <span class="val">attack becomes move</span>
</label>

<div class="var-row grayed">
    <span class="future-desc">When enabled, attack orders survive a capture and continue as movement orders.</span>
</div>

<h4 class="sub-heading">Conflict Resolution</h4>
<label class="toggle-row">
    <input
        type="checkbox"
        checked={GAME_CONFIG.ALLOW_OPPOSING_ORDERS}
        onchange={() => {
            GAME_CONFIG.ALLOW_OPPOSING_ORDERS = !GAME_CONFIG.ALLOW_OPPOSING_ORDERS;
        }}
    />
    <span class="var-name">Allow Opposing Orders</span>
    <span class="val">A↔B coexist</span>
</label>

<div class="var-row grayed">
    <span class="future-desc">When disabled, opposing routes cancel instead of overlapping in both directions.</span>
</div>

<style>
    @import "./panel-shared.css";
</style>
