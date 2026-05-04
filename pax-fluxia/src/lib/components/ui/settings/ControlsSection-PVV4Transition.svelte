<script lang="ts">
    import { DEFAULT_GAME_CONFIG, GAME_CONFIG } from "$lib/config/game.config";
    import { derivePanelKey } from "../settingsDefs";
    import { bumpTerritoryVisualConfig } from "$lib/territory/bumpTerritoryVisualConfig";
    import { getTerritoryRenderModeLabel } from "$lib/territory/ui/territoryRenderModeCatalog";
    import type { Pvv4ProgressProfileId } from "$lib/territory/contracts/TerritoryFrameInput";

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }

    type Pvv4ConfigKey =
        | "PVV4_PROGRESS_PROFILE"
        | "PVV4_PROGRESS_BLEND"
        | "PVV4_STABLE_ANCHOR_EPS"
        | "PVV4_CHANGE_SPAN_EPS"
        | "PVV4_CHANGE_SPAN_PAD_POINTS";

    const PROGRESS_PROFILE_OPTIONS: ReadonlyArray<{
        id: Pvv4ProgressProfileId;
        label: string;
        description: string;
    }> = [
        {
            id: "smoothstep",
            label: "Smoothstep",
            description: "Current branch default. Softens the linear start/stop feel without changing endpoints.",
        },
        {
            id: "linear",
            label: "Linear",
            description: "Reference baseline. No additional easing beyond the raw scheduler progress.",
        },
        {
            id: "ease_in_out_quad",
            label: "Ease In Out Quad",
            description: "Slightly slower start with a more decisive middle section.",
        },
        {
            id: "ease_in_out_cubic",
            label: "Ease In Out Cubic",
            description: "Stronger easing for a calmer start/end and faster center.",
        },
    ];

    const PVV4_CONTROL_DEFAULTS: Record<Pvv4ConfigKey, string | number> = {
        PVV4_PROGRESS_PROFILE: DEFAULT_GAME_CONFIG.PVV4_PROGRESS_PROFILE,
        PVV4_PROGRESS_BLEND: DEFAULT_GAME_CONFIG.PVV4_PROGRESS_BLEND,
        PVV4_STABLE_ANCHOR_EPS: DEFAULT_GAME_CONFIG.PVV4_STABLE_ANCHOR_EPS,
        PVV4_CHANGE_SPAN_EPS: DEFAULT_GAME_CONFIG.PVV4_CHANGE_SPAN_EPS,
        PVV4_CHANGE_SPAN_PAD_POINTS: DEFAULT_GAME_CONFIG.PVV4_CHANGE_SPAN_PAD_POINTS,
    };

    let { panel, updatePanel }: Props = $props();

    let activeRenderMode = $derived(
        (panel.territoryRenderMode ??
            GAME_CONFIG.TERRITORY_RENDER_MODE ??
            "none") as string,
    );
    let activeGeometryMode = $derived(
        (panel.territoryGeometryMode ??
            GAME_CONFIG.TERRITORY_GEOMETRY_MODE ??
            "unified_vector") as string,
    );
    let activeFillTransitionMode = $derived(
        (panel.territoryFillTransitionMode ??
            GAME_CONFIG.TERRITORY_FILL_TRANSITION_MODE ??
            "off") as string,
    );
    let effectiveTransitionMs = $derived(
        (panel.territoryTransitionBindToTick ??
            GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ??
            false)
            ? (panel.tickInterval ?? GAME_CONFIG.BASE_TICK_MS ?? 1250)
            : (panel.territoryTransitionMs ??
                GAME_CONFIG.TERRITORY_TRANSITION_MS ??
                600),
    );
    let pvv4Active = $derived(activeRenderMode === "power_voronoi_canonical");
    let currentProgressProfile = $derived(
        ((panel.pvv4ProgressProfile ??
            GAME_CONFIG.PVV4_PROGRESS_PROFILE ??
            "smoothstep") as Pvv4ProgressProfileId),
    );

    function updateConfig(configKey: string, value: string | number | boolean): void {
        (GAME_CONFIG as Record<string, any>)[configKey] = value;
        updatePanel(derivePanelKey(configKey), value);
    }

    function formatEnum(value: string): string {
        return value.replace(/_/g, " ");
    }

    function switchToPvv4(): void {
        updateConfig("TERRITORY_RENDER_MODE", "power_voronoi_canonical");
        updateConfig("TERRITORY_FILL_TRANSITION_MODE", "pv_frontline");
        updateConfig("TERRITORY_GEOMETRY_MODE", "canonical_power_voronoi");
        updateConfig("TERRITORY_BORDER_TRANSITION_MODE", "off");
        updateConfig("TERRITORY_BORDER_TRANSITION", "none");
        bumpTerritoryVisualConfig();
    }

    function resetPvv4Controls(): void {
        for (const [configKey, value] of Object.entries(PVV4_CONTROL_DEFAULTS)) {
            updateConfig(configKey, value);
        }
    }
</script>

<div class="pvv4-shell">
    <div class="pvv4-head">
        <div>
            <h4 class="sub-heading">PVV4 Transition</h4>
            <p class="section-note">
                Exposes the current PVV4 timing bet and the active-front planning heuristics
                directly in the in-game Settings UI.
            </p>
        </div>
        <div class="head-actions">
            {#if pvv4Active}
                <span class="status-badge">PVV4 active</span>
            {/if}
            <button class="btn-xs" type="button" onclick={resetPvv4Controls}>
                Reset PVV4 Controls
            </button>
        </div>
    </div>

    <div class="status-grid">
        <div class="status-card">
            <span class="status-label">Render Mode</span>
            <strong>{getTerritoryRenderModeLabel(activeRenderMode)}</strong>
        </div>
        <div class="status-card">
            <span class="status-label">Geometry Mode</span>
            <strong>{formatEnum(activeGeometryMode)}</strong>
        </div>
        <div class="status-card">
            <span class="status-label">Fill Transition</span>
            <strong>{formatEnum(activeFillTransitionMode)}</strong>
        </div>
        <div class="status-card">
            <span class="status-label">Transition Duration</span>
            <strong>{Math.round(Number(effectiveTransitionMs))} ms</strong>
        </div>
    </div>

    {#if !pvv4Active}
        <div class="inactive-banner">
            <div>
                <strong>PVV4 is not the active territory mode.</strong>
                <p>
                    These controls persist now, but only affect live conquests when
                    `power_voronoi_canonical + pv_frontline` is active.
                </p>
            </div>
            <button class="btn-xs btn-primary" type="button" onclick={switchToPvv4}>
                Switch to PVV4
            </button>
        </div>
    {/if}

    <section>
        <h4 class="sub-heading">Bet A · Timing</h4>
        <div class="row-hint">
            Applies live during sampling. Safe to adjust while a conquest transition is already in motion.
        </div>

        <div class="var-row">
            <div class="row-top">
                <span
                    class="var-name"
                    data-setting-config-key="PVV4_PROGRESS_PROFILE"
                    data-setting-description="Sample-time progress profile for the PVV4 frontline transition path."
                >
                    Progress Profile
                </span>
                <span class="val">{PROGRESS_PROFILE_OPTIONS.find((option) => option.id === currentProgressProfile)?.label ?? currentProgressProfile}</span>
            </div>
            <div class="row-hint row-hint--tight">
                {PROGRESS_PROFILE_OPTIONS.find((option) => option.id === currentProgressProfile)?.description}
            </div>
            <select
                class="mode-select"
                value={currentProgressProfile}
                onchange={(event) =>
                    updateConfig(
                        "PVV4_PROGRESS_PROFILE",
                        (event.target as HTMLSelectElement).value as Pvv4ProgressProfileId,
                    )}
            >
                {#each PROGRESS_PROFILE_OPTIONS as option}
                    <option value={option.id}>{option.label}</option>
                {/each}
            </select>
        </div>

        <div class="var-row">
            <div class="row-top">
                <span
                    class="var-name"
                    data-setting-config-key="PVV4_PROGRESS_BLEND"
                    data-setting-description="Blend between raw linear scheduler progress and the selected PVV4 profile."
                >
                    Profile Blend
                </span>
                <span class="val">{Number(panel.pvv4ProgressBlend ?? GAME_CONFIG.PVV4_PROGRESS_BLEND ?? 0.4).toFixed(2)}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={panel.pvv4ProgressBlend ?? GAME_CONFIG.PVV4_PROGRESS_BLEND ?? 0.4}
                oninput={(event) =>
                    updateConfig(
                        "PVV4_PROGRESS_BLEND",
                        Number((event.target as HTMLInputElement).value),
                    )}
            />
        </div>

        <label class="toggle-row">
            <input
                type="checkbox"
                checked={panel.territoryTransitionBindToTick ??
                    GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ??
                    true}
                onchange={(event) =>
                    updateConfig(
                        "TERRITORY_TRANSITION_BIND_TO_TICK",
                        (event.target as HTMLInputElement).checked,
                    )}
            />
            <span
                class="var-name"
                data-setting-config-key="TERRITORY_TRANSITION_BIND_TO_TICK"
                data-setting-description="Mirror of the shared conquest-transition timing binding."
            >
                Bind Territory Transition To Tick
            </span>
            <span class="val">
                {(panel.territoryTransitionBindToTick ??
                    GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ??
                    true)
                    ? "On"
                    : "Off"}
            </span>
        </label>

        <div class="var-row">
            <div class="row-top">
                <span
                    class="var-name"
                    data-setting-config-key="TERRITORY_TRANSITION_MS"
                    data-setting-description="Mirror of the shared conquest-transition duration slider."
                >
                    Stored Transition Duration
                </span>
                <span class="val">{Math.round(Number(panel.territoryTransitionMs ?? GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 600))} ms</span>
            </div>
            <div class="row-hint row-hint--tight">
                {(panel.territoryTransitionBindToTick ??
                    GAME_CONFIG.TERRITORY_TRANSITION_BIND_TO_TICK ??
                    true)
                    ? "Tick binding is on, so the live duration currently follows BASE_TICK_MS. This slider sets the stored unbound value."
                    : "This is the shared conquest-transition duration used by the live PVV4 path when tick binding is off."}
            </div>
            <input
                type="range"
                min="0"
                max="3000"
                step="50"
                value={panel.territoryTransitionMs ?? GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 600}
                oninput={(event) =>
                    updateConfig(
                        "TERRITORY_TRANSITION_MS",
                        Number((event.target as HTMLInputElement).value),
                    )}
            />
        </div>
    </section>

    <section>
        <h4 class="sub-heading">Bet B · Motion Isolation</h4>
        <div class="row-hint">
            Applies on next conquest. These values affect active-front planning, not the current in-flight sample.
        </div>

        <div class="var-row">
            <div class="row-top">
                <span
                    class="var-name"
                    data-setting-config-key="PVV4_STABLE_ANCHOR_EPS"
                    data-setting-description="Tolerance for deciding whether a structural anchor should stay pinned across PRE and POST."
                >
                    Stable Anchor Epsilon
                </span>
                <span class="val">{Number(panel.pvv4StableAnchorEps ?? GAME_CONFIG.PVV4_STABLE_ANCHOR_EPS ?? 2).toFixed(2)} px</span>
            </div>
            <input
                type="range"
                min="0"
                max="12"
                step="0.25"
                value={panel.pvv4StableAnchorEps ?? GAME_CONFIG.PVV4_STABLE_ANCHOR_EPS ?? 2}
                oninput={(event) =>
                    updateConfig(
                        "PVV4_STABLE_ANCHOR_EPS",
                        Number((event.target as HTMLInputElement).value),
                    )}
            />
        </div>

        <div class="var-row">
            <div class="row-top">
                <span
                    class="var-name"
                    data-setting-config-key="PVV4_CHANGE_SPAN_EPS"
                    data-setting-description="Tolerance for deciding which front points are truly changing versus visually static."
                >
                    Changed Span Epsilon
                </span>
                <span class="val">{Number(panel.pvv4ChangeSpanEps ?? GAME_CONFIG.PVV4_CHANGE_SPAN_EPS ?? 2).toFixed(2)} px</span>
            </div>
            <input
                type="range"
                min="0"
                max="12"
                step="0.25"
                value={panel.pvv4ChangeSpanEps ?? GAME_CONFIG.PVV4_CHANGE_SPAN_EPS ?? 2}
                oninput={(event) =>
                    updateConfig(
                        "PVV4_CHANGE_SPAN_EPS",
                        Number((event.target as HTMLInputElement).value),
                    )}
            />
        </div>

        <div class="var-row">
            <div class="row-top">
                <span
                    class="var-name"
                    data-setting-config-key="PVV4_CHANGE_SPAN_PAD_POINTS"
                    data-setting-description="Symmetric point padding applied around the detected changed span before active sections are marked."
                >
                    Changed Span Padding
                </span>
                <span class="val">{Math.round(Number(panel.pvv4ChangeSpanPadPoints ?? GAME_CONFIG.PVV4_CHANGE_SPAN_PAD_POINTS ?? 0))} pts</span>
            </div>
            <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={panel.pvv4ChangeSpanPadPoints ?? GAME_CONFIG.PVV4_CHANGE_SPAN_PAD_POINTS ?? 0}
                oninput={(event) =>
                    updateConfig(
                        "PVV4_CHANGE_SPAN_PAD_POINTS",
                        Number((event.target as HTMLInputElement).value),
                    )}
            />
        </div>
    </section>
</div>

<style>
    @import "./panel-shared.css";

    .pvv4-shell {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .pvv4-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
    }

    .section-note,
    .row-hint {
        margin: 0;
        font-size: 11px;
        line-height: 1.45;
        color: rgba(187, 205, 223, 0.82);
    }

    .row-hint--tight {
        margin-top: -2px;
    }

    .head-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .status-badge {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(103, 232, 249, 0.14);
        border: 1px solid rgba(103, 232, 249, 0.28);
        color: #9be7f2;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .status-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }

    .status-card {
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(180deg, rgba(103, 232, 249, 0.08), rgba(255, 255, 255, 0.03));
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .status-card strong {
        font-size: 12px;
        color: rgba(236, 242, 249, 0.94);
        text-transform: capitalize;
    }

    .status-label {
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(150, 193, 228, 0.8);
    }

    .inactive-banner {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid rgba(245, 158, 11, 0.28);
        background: rgba(245, 158, 11, 0.09);
    }

    .inactive-banner p {
        margin: 4px 0 0;
        font-size: 11px;
        line-height: 1.45;
        color: rgba(229, 231, 235, 0.85);
    }

    .btn-primary {
        border-color: rgba(103, 232, 249, 0.36);
        color: #d5faff;
        background: rgba(103, 232, 249, 0.11);
    }

    .btn-primary:hover {
        border-color: rgba(103, 232, 249, 0.55);
        background: rgba(103, 232, 249, 0.17);
    }

    @media (max-width: 720px) {
        .pvv4-head,
        .inactive-banner {
            flex-direction: column;
            align-items: stretch;
        }

        .status-grid {
            grid-template-columns: 1fr;
        }

        .head-actions {
            justify-content: flex-start;
        }
    }
</style>
