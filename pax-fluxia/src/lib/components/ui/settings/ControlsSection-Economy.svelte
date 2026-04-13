<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        transferRate: number;
        updateTransferRate: (v: number) => void;
        syncFromConfig?: () => void;
    }

    let {
        panel,
        updatePanel,
        transferRate,
        updateTransferRate,
        syncFromConfig,
    }: Props = $props();
</script>

<CategoryThemeBar category="economy" onApply={() => syncFromConfig?.()} />

<h4 class="sub-heading">Production & Flow</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Production</span>
        <span class="val">{((panel.production ?? 0) as number).toFixed(2)}</span>
    </div>
    <input
        type="range"
        min="0"
        max="5"
        step="0.1"
        value={panel.production}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            GAME_CONFIG.BASE_PRODUCTION = value;
            updatePanel("production", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Transfer Rate</span>
        <span class="val">{transferRate}%</span>
    </div>
    <input
        type="range"
        min="1"
        max="100"
        step="1"
        value={transferRate}
        oninput={(event) =>
            updateTransferRate(parseInt((event.target as HTMLInputElement).value))}
    />
</div>

<div class="orb-pair">
    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">Min Transfer</span>
            <span class="val">{panel.minShipsPerTransfer ?? GAME_CONFIG.MIN_SHIPS_PER_TRANSFER}</span>
        </div>
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={panel.minShipsPerTransfer ?? GAME_CONFIG.MIN_SHIPS_PER_TRANSFER}
            oninput={(event) => {
                const value = parseInt((event.target as HTMLInputElement).value);
                GAME_CONFIG.MIN_SHIPS_PER_TRANSFER = value;
                updatePanel("minShipsPerTransfer", value);
            }}
        />
    </div>
    <div class="var-row compact">
        <div class="row-top">
            <span class="var-name">Max Transfer</span>
            <span class="val">{(panel.maxShipsPerTransfer ?? GAME_CONFIG.MAX_SHIPS_PER_TRANSFER) || "unlimited"}</span>
        </div>
        <input
            type="range"
            min="0"
            max="200"
            step="1"
            value={panel.maxShipsPerTransfer ?? GAME_CONFIG.MAX_SHIPS_PER_TRANSFER}
            oninput={(event) => {
                const value = parseInt((event.target as HTMLInputElement).value);
                GAME_CONFIG.MAX_SHIPS_PER_TRANSFER = value;
                updatePanel("maxShipsPerTransfer", value);
            }}
        />
    </div>
</div>

<h4 class="sub-heading">Repair Discipline</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Repair Rate</span>
        <span class="val">{panel.repair as number}%</span>
    </div>
    <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={panel.repair}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            GAME_CONFIG.REPAIR_RATE = value;
            updatePanel("repair", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Repair Suppress (Attacking)</span>
        <span class="val">{Math.round(((panel.repairSuppressAttacker ?? 0.5) as number) * 100)}%</span>
    </div>
    <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={Math.round(((panel.repairSuppressAttacker ?? 0.5) as number) * 100)}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value) / 100;
            GAME_CONFIG.REPAIR_SUPPRESS_ATTACKER = value;
            updatePanel("repairSuppressAttacker", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Repair Suppress (Defending)</span>
        <span class="val">{Math.round(((panel.repairSuppressDefender ?? 0.1) as number) * 100)}%</span>
    </div>
    <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={Math.round(((panel.repairSuppressDefender ?? 0.1) as number) * 100)}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value) / 100;
            GAME_CONFIG.REPAIR_SUPPRESS_DEFENDER = value;
            updatePanel("repairSuppressDefender", value);
        }}
    />
</div>

<h4 class="sub-heading">Starting Pressure</h4>
<div class="var-row">
    <div class="row-top">
        <span class="var-name">Starting Ships</span>
        <span class="val">{panel.startingShips ?? GAME_CONFIG.STARTING_SHIPS}</span>
    </div>
    <input
        type="range"
        min="0"
        max="200"
        step="5"
        value={panel.startingShips ?? GAME_CONFIG.STARTING_SHIPS}
        oninput={(event) => {
            const value = parseInt((event.target as HTMLInputElement).value);
            GAME_CONFIG.STARTING_SHIPS = value;
            updatePanel("startingShips", value);
        }}
    />
</div>

<div class="var-row">
    <div class="row-top">
        <span class="var-name">Defense Multiplier</span>
        <span class="val">{((panel.defense ?? 0) as number).toFixed(2)}x</span>
    </div>
    <input
        type="range"
        min="0.2"
        max="5"
        step="0.1"
        value={panel.defense}
        oninput={(event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            GAME_CONFIG.AGGRESSOR_ADVANTAGE = 1 / value;
            updatePanel("defense", value);
        }}
    />
</div>

<style>
    @import "./panel-shared.css";
</style>
