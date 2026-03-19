<script lang="ts">
    import { GAME_CONFIG } from "$lib/config/game.config";
    import {
        TERRITORY_PIPELINE_STAGE_ORDER,
        type TerritoryPipelineArtifacts,
        type TerritoryPipelineStageId,
    } from "$lib/territory/orchestrator";
    import {
        DEFAULT_TERRITORY_METHOD,
        DEFAULT_TERRITORY_DYNAMIC_METHOD,
        DEFAULT_TERRITORY_STATIC_METHOD,
        TERRITORY_METHOD_BY_ID,
        TERRITORY_DYNAMIC_METHOD_BY_ID,
        TERRITORY_STATIC_METHOD_BY_ID,
    } from "$lib/territory/orchestrator/registry";
    import { territoryTraceRun } from "$lib/territory/orchestrator/traceStore";
    import CategoryThemeBar from "./CategoryThemeBar.svelte";

    // ControlsSection-Territory -- Territory Rendering (Voronoi + Metaball)

    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        syncFromConfig?: () => void;
    }

    let { panel, updatePanel, syncFromConfig }: Props = $props();

    // Bridge compatibility: keep legacy call sites, route to panel writes only.
    function debouncedConfigUpdate(
        _configKey: string,
        panelKey: string,
        value: any,
        _delayMs = 100,
    ) {
        updatePanel(panelKey, value);
    }

    function formatTraceValue(value: unknown): string {
        if (Array.isArray(value)) return `[${value.length}]`;
        if (typeof value === "number")
            return Number.isInteger(value) ? `${value}` : value.toFixed(2);
        if (typeof value === "boolean") return value ? "true" : "false";
        if (typeof value === "string") return value;
        if (value && typeof value === "object") {
            return `{${Object.keys(value as Record<string, unknown>).length}}`;
        }
        return String(value ?? "null");
    }

    function summarizeTraceRecord(
        record: Record<string, unknown> | undefined,
        limit = 6,
    ): string[] {
        if (!record) return [];
        return Object.entries(record)
            .filter(([, value]) => value !== undefined)
            .slice(0, limit)
            .map(([key, value]) => `${key}=${formatTraceValue(value)}`);
    }

    function getTraceArtifactEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{
        stageId: TerritoryPipelineStageId;
        artifact: Record<string, unknown>;
    }> {
        if (!artifacts) return [];
        return TERRITORY_PIPELINE_STAGE_ORDER.flatMap((stageId) => {
            const artifact = artifacts[stageId];
            if (!artifact) return [];
            return [{ stageId, artifact: artifact as Record<string, unknown> }];
        });
    }

    function getNextTraceStageLabel(stepCount: number): string {
        return TERRITORY_PIPELINE_STAGE_ORDER[stepCount] ?? "complete";
    }

    function getOwnerRegionLoopPreviewEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{ id: string; summary: string }> {
        const ownerRegionLoops = ((
            artifacts?.loop as
                | { ownerRegionLoops?: Array<Record<string, unknown>> }
                | undefined
        )?.ownerRegionLoops ?? []) as Array<Record<string, unknown>>;
        return ownerRegionLoops.slice(0, 4).map((loop, index) => {
            const ownerId =
                typeof loop.ownerId === "string" ? loop.ownerId : "?";
            const opposingOwnerId =
                typeof loop.opposingOwnerId === "string"
                    ? loop.opposingOwnerId
                    : "?";
            return {
                id:
                    typeof loop.regionLoopId === "string"
                        ? loop.regionLoopId
                        : `owner-region-${index}`,
                summary:
                    `${ownerId} vs ${opposingOwnerId} | ` +
                    `area=${formatTraceValue(loop.absArea)} | ` +
                    `conf=${formatTraceValue(loop.confidence)}`,
            };
        });
    }

    function getOwnerShellPreviewEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{ id: string; summary: string }> {
        const ownerShells = ((
            artifacts?.loop as
                | { ownerShells?: Array<Record<string, unknown>> }
                | undefined
        )?.ownerShells ?? []) as Array<Record<string, unknown>>;
        return ownerShells.slice(0, 4).map((shell, index) => {
            const ownerId =
                typeof shell.ownerId === "string" ? shell.ownerId : "?";
            const holeCount = Array.isArray(shell.holeLoopIds)
                ? shell.holeLoopIds.length
                : 0;
            return {
                id:
                    typeof shell.shellId === "string"
                        ? shell.shellId
                        : `owner-shell-${index}`,
                summary:
                    `${ownerId} | ` +
                    `area=${formatTraceValue(shell.absArea)} | ` +
                    `holes=${formatTraceValue(holeCount)} | ` +
                    `conf=${formatTraceValue(shell.confidence)}`,
            };
        });
    }

    function getOwnerHoldingTransitionSummary(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): string[] {
        const animation = (artifacts?.animation ?? undefined) as
            | Record<string, unknown>
            | undefined;
        if (!animation) return [];

        return [
            `transitions=${formatTraceValue(animation.ownerShellTransitionCount)}`,
            `matched=${formatTraceValue(animation.matchedOwnerShellCount)}`,
            `spawn=${formatTraceValue(animation.spawnedOwnerShellCount)}`,
            `vanish=${formatTraceValue(animation.vanishedOwnerShellCount)}`,
            `grow=${formatTraceValue(animation.grewOwnerShellCount)}`,
            `shrink=${formatTraceValue(animation.shrankOwnerShellCount)}`,
            `split=${formatTraceValue(animation.splitAnchoredSpawnCount)}`,
            `merge=${formatTraceValue(animation.mergeAnchoredVanishCount)}`,
            `fallback=${formatTraceValue(animation.ownerShellGeometryFallbackCount)}`,
            `holeTransitions=${formatTraceValue(animation.ownerShellHoleTransitionCount)}`,
        ];
    }

    function getOwnerHoldingTransitionPreviewEntries(
        artifacts: TerritoryPipelineArtifacts | undefined,
    ): Array<{ id: string; summary: string }> {
        const transitions = ((
            artifacts?.animation as
                | { ownerShellTransitions?: Array<Record<string, unknown>> }
                | undefined
        )?.ownerShellTransitions ?? []) as Array<Record<string, unknown>>;
        return transitions.slice(0, 6).map((transition, index) => {
            const ownerId =
                typeof transition.ownerId === "string"
                    ? transition.ownerId
                    : "?";
            const kind =
                typeof transition.kind === "string" ? transition.kind : "?";
            const anchorRelation =
                typeof transition.anchorRelation === "string"
                    ? transition.anchorRelation
                    : "none";
            const relationLabel =
                anchorRelation !== "none" ? `/${anchorRelation}` : "";
            return {
                id:
                    typeof transition.transitionId === "string"
                        ? transition.transitionId
                        : `owner-shell-transition-${index}`,
                summary:
                    `${ownerId} | ${kind}${relationLabel} | ` +
                    `conf=${formatTraceValue(transition.confidence)} | ` +
                    `contour=${formatTraceValue(transition.meanContourDistance)}/${formatTraceValue(transition.maxContourDistance)} | ` +
                    `holes=${formatTraceValue(transition.previousHoleCount)}->${formatTraceValue(transition.currentHoleCount)}`,
            };
        });
    }
    const TERRITORY_KEYS = [
        "territoryVoronoi",
        "territoryModifiedVoronoi",
        "territoryPowerVoronoi",
        "territoryPVV3",
        "territoryEngine",
        "territoryMetaball",
        "territoryPixel",
        "territoryGraph",
        "territoryContour",
        "territoryDistanceField",
    ] as const;
    function selectTerritory(
        chosen: (typeof TERRITORY_KEYS)[number],
        enabled: boolean,
    ) {
        if (enabled) {
            // Turn all off, then enable chosen exclusively
            for (let i = 0; i < TERRITORY_KEYS.length; i++) {
                const isChosen = TERRITORY_KEYS[i] === chosen;
                updatePanel(TERRITORY_KEYS[i], isChosen);
            }
        } else {
            // Allow turning off without forcing another on
            updatePanel(chosen, false);
        }
    }
    const BORDER_ENGINE_OPTIONS = [
        { id: "mesh", label: "Mesh (Clean)" },
        { id: "legacy_field", label: "Legacy Field (Reference)" },
        { id: "legacy_grid", label: "Legacy Grid (Reference)" },
    ] as const;
    const CANONICAL_FRONTIER_MODE_OPTIONS = [
        { id: "disabled", label: "Disabled" },
        { id: "diagnostic", label: "Diagnostic" },
        { id: "production", label: "Production" },
    ] as const;
    const TERRITORY_ENGINE_METHOD_OPTIONS = [
        { id: "fg1_adaptive_field", label: "FG1 Adaptive Field" },
        { id: "fg1_mar19_refactor", label: "FG1 Mar19 Refactor" },
        { id: "fg2_seed_graph", label: "FG2 Seed Graph" },
        { id: "new_frontiers_0319", label: "New-Frontiers-0319" },
    ] as const;
    const TERRITORY_ENGINE_MODE_OPTIONS = [
        { id: "static", label: "Static" },
        { id: "dynamic", label: "Dynamic" },
    ] as const;
    const TERRITORY_ENGINE_DYNAMIC_OPTIONS = [
        { id: "dy4_optimal_transport", label: "DY4 Optimal Transport" },
        { id: "dy4_mar19_refactor", label: "DY4 Mar19 Refactor" },
    ] as const;

    const MORPH_EASING_OPTIONS = [
        { id: "linear", label: "Linear" },
        { id: "smoothstep", label: "Smooth" },
        { id: "easeInOutQuad", label: "Quad" },
        { id: "easeInOutCubic", label: "Cubic" },
    ] as const;

    function lookupOptionLabel(
        options: ReadonlyArray<{ id: string; label: string }>,
        id: string,
    ): string {
        return options.find((option) => option.id === id)?.label ?? id;
    }

    function formatAdapterLabel(adapter: string): string {
        if (adapter === "legacy_pvv2") return "Legacy PVV2";
        if (adapter === "legacy_pvv3") return "Legacy PVV3";
        if (adapter === "legacy_df") return "Legacy Distance Field";
        return adapter;
    }

    function resolveMethodId(rawValue: unknown): string {
        if (typeof rawValue !== "string") return DEFAULT_TERRITORY_METHOD;
        return Object.prototype.hasOwnProperty.call(
            TERRITORY_METHOD_BY_ID,
            rawValue,
        )
            ? rawValue
            : DEFAULT_TERRITORY_METHOD;
    }

    // Legacy resolve helpers (used by route display, kept for backward-compat)
    function resolveStaticMethodId(rawValue: unknown): string {
        return resolveMethodId(rawValue);
    }
    function resolveDynamicMethodId(rawValue: unknown): string {
        return resolveMethodId(rawValue);
    }

    function getTerritoryEngineRoute() {
        // Use unified method key, fall back to legacy keys
        let methodId: string;
        if (
            panel.territoryEngineMethod ??
            GAME_CONFIG.TERRITORY_ENGINE_METHOD
        ) {
            methodId = resolveMethodId(
                panel.territoryEngineMethod ??
                    GAME_CONFIG.TERRITORY_ENGINE_METHOD,
            );
        } else if (
            (panel.territoryEngineMode ?? GAME_CONFIG.TERRITORY_ENGINE_MODE) ===
            "dynamic"
        ) {
            methodId = resolveMethodId(
                panel.territoryEngineDynamicMethod ??
                    GAME_CONFIG.TERRITORY_ENGINE_DYNAMIC_METHOD,
            );
        } else {
            methodId = resolveMethodId(
                panel.territoryEngineStaticMethod ??
                    GAME_CONFIG.TERRITORY_ENGINE_STATIC_METHOD,
            );
        }

        const method =
            TERRITORY_METHOD_BY_ID[
                methodId as keyof typeof TERRITORY_METHOD_BY_ID
            ];
        const methodLabel = method?.label ?? methodId;
        return {
            methodId,
            mode:
                method && method.implementedStages.length > 1
                    ? "static"
                    : "dynamic",
            adapter: method?.adapter ?? "legacy_pvv2",
            adapterLabel: formatAdapterLabel(method?.adapter ?? "legacy_pvv2"),
            methodLabel,
            // backward-compat aliases
            staticMethodId: methodId,
            dynamicMethodId: methodId,
            staticLabel: methodLabel,
            dynamicLabel: methodLabel,
        };
    }

    let territoryEngineRoute = $derived.by(() => getTerritoryEngineRoute());
    let territoryEngineRouteNote = $derived.by(() => {
        return `Active method: ${territoryEngineRoute.methodLabel} (${territoryEngineRoute.adapterLabel})`;
    });
    let territoryEngineInteropNote = $derived.by(() => {
        if (territoryEngineRoute.mode === "dynamic") {
            return "Dynamic mode is exclusive. The Dynamic Method picker wins and the standalone Static Method choice becomes reference only.";
        }
        return "Static mode is exclusive. Dynamic selections are stored, but inactive until you switch modes.";
    });

    let staticMethodControlState = $derived.by(() => {
        if (territoryEngineRoute.mode === "static") {
            return {
                badge: "active",
                note: "Static mode is live. Picking a static method changes the current route.",
                disabled: false,
            };
        }
        if (territoryEngineRoute.mode === "dynamic") {
            return {
                badge: "anchor only",
                note: `${territoryEngineRoute.dynamicLabel} pins the static anchor to ${territoryEngineRoute.staticLabel}.`,
                disabled: true,
            };
        }
        return {
            badge: "stored",
            note: "Static selections are stored only.",
            disabled: true,
        };
    });

    let dynamicMethodControlState = $derived.by(() => {
        if (territoryEngineRoute.mode === "dynamic") {
            return {
                badge: "active",
                note: "Dynamic mode is live. Picking a dynamic method changes the current route.",
                disabled: false,
            };
        }
        return {
            badge: "stored",
            note: "Dynamic selections are stored, but inactive until you switch to Dynamic mode.",
            disabled: true,
        };
    });

    let activeBorderEngine = $derived(
        (panel.dfBorderEngine ?? GAME_CONFIG.DF_BORDER_ENGINE ?? "mesh") as
            | "mesh"
            | "legacy_field"
            | "legacy_grid",
    );
    let activeCanonicalFrontierRuntimeMode = $derived(
        (panel.dfCanonicalFrontierRuntimeMode ??
            GAME_CONFIG.DF_CANONICAL_FRONTIER_RUNTIME_MODE ??
            "production") as "disabled" | "diagnostic" | "production",
    );
    let canonicalFrontierDiagnosticShow = $derived(
        Boolean(
            panel.dfCanonicalFrontierDiagnosticShow ??
                GAME_CONFIG.DF_CANONICAL_FRONTIER_DIAGNOSTIC_SHOW ??
                false,
        ),
    );
    let isLegacyFieldEngine = $derived(activeBorderEngine === "legacy_field");
    let isLegacyGridEngine = $derived(activeBorderEngine === "legacy_grid");
    /* ── V3.1 Three-Concern Architecture ── */

    const TERRITORY_STYLE_OPTIONS = [
        { id: "none", label: "Off" },
        { id: "territory_canonical", label: "Canonical" },
        { id: "territory_engine", label: "Engine (DY4)" },
        { id: "vs_pvv3", label: "PVV3" },
        { id: "power_voronoi", label: "PVV2" },
        { id: "distance_field", label: "Distance Field" },
        { id: "metaball", label: "Metaball" },
        { id: "pixel", label: "Pixel Art" },
        { id: "voronoi", label: "Voronoi" },
        { id: "graph", label: "Lane" },
        { id: "contour", label: "Contour" },
    ] as const;

    const FILL_TRANSITION_OPTIONS = [
        { id: "none", label: "Off" },
        { id: "frontier_morph", label: "Frontier Morph" },
        { id: "crossfade", label: "Crossfade" },
        { id: "tile_flip", label: "Tile Flip" },
    ] as const;

    const BORDER_TRANSITION_OPTIONS = [
        { id: "none", label: "Off" },
        { id: "pixi_graphics_morph", label: "Graphics Morph" },
        { id: "pixi_mesh_rope", label: "Rope Morph" },
        {
            id: "optimal_transport",
            label: "DY4 Transport",
        },
        { id: "smooth_morph", label: "Smooth (Legacy)" },
        { id: "pressure_wave", label: "Pressure Wave" },
    ] as const;

    const GEOMETRY_OPTIONS = [
        { id: "power_voronoi", label: "Power Voronoi" },
        { id: "unified_polygon", label: "Unified Polygon" },
    ] as const;

    /** Map style IDs to old boolean flag panel keys (backward compat) */
    const STYLE_TO_BOOLEAN: Record<string, string> = {
        vs_pvv3: "territoryPVV3",
        power_voronoi: "territoryPowerVoronoi",
        distance_field: "territoryDistanceField",
        voronoi: "territoryVoronoi",
        metaball: "territoryMetaball",
        pixel: "territoryPixel",
        graph: "territoryGraph",
        contour: "territoryContour",
    };

    function selectTerritoryStyle(styleId: string) {
        updatePanel("territoryRenderMode", styleId);
        // Reset diagnostic so it logs on next render frame
        (globalThis as any).__RENDER_MODE_LOGGED = false;
        // Sync old boolean flags for backward compat
        for (const [mode, panelKey] of Object.entries(STYLE_TO_BOOLEAN)) {
            updatePanel(panelKey, mode === styleId);
        }
    }

    function selectFillTransition(transitionId: string) {
        updatePanel("territoryFillTransition", transitionId);
    }

    function selectBorderTransition(transitionId: string) {
        updatePanel("territoryBorderTransition", transitionId);
    }

    function selectGeometryMode(modeId: string) {
        debouncedConfigUpdate(
            "TERRITORY_GEOMETRY_MODE",
            "territoryGeometryMode",
            modeId,
        );
    }
</script>

<CategoryThemeBar category="territory" onApply={() => syncFromConfig?.()} />

<!-- ── V3.2 Four-Axis Territory Card ── -->
<div class="axis-card">
    <h4 class="axis-card-title">Territory Presentation</h4>

    <!-- Row 1: Geometry (teal) -->
    <div
        class="axis-row"
        style="--accent: #2dd4bf; --accent-bg: rgba(45,212,191,0.15)"
    >
        <span class="axis-label">Geometry</span>
        <div class="axis-buttons">
            {#each GEOMETRY_OPTIONS as opt}
                <button
                    class="axis-btn"
                    class:active={(panel.territoryGeometryMode ??
                        GAME_CONFIG.TERRITORY_GEOMETRY_MODE ??
                        "power_voronoi") === opt.id}
                    onclick={() => selectGeometryMode(opt.id)}
                    >{opt.label}</button
                >
            {/each}
        </div>
    </div>

    <!-- Row 2: Style (purple) -->
    <div
        class="axis-row"
        style="--accent: #a78bfa; --accent-bg: rgba(167,139,250,0.15)"
    >
        <span class="axis-label">Style</span>
        <div class="axis-buttons">
            {#each TERRITORY_STYLE_OPTIONS as opt}
                <button
                    class="axis-btn"
                    class:active={(panel.territoryRenderMode ??
                        GAME_CONFIG.TERRITORY_RENDER_MODE ??
                        "territory_engine") === opt.id}
                    onclick={() => selectTerritoryStyle(opt.id)}
                    >{opt.label}</button
                >
            {/each}
        </div>
    </div>

    <!-- Row 3: Fill Transition (gold) -->
    <div
        class="axis-row"
        style="--accent: #fbbf24; --accent-bg: rgba(251,191,36,0.15)"
    >
        <span class="axis-label">Fill Transition</span>
        <div class="axis-buttons">
            {#each FILL_TRANSITION_OPTIONS as opt}
                <button
                    class="axis-btn"
                    class:active={(panel.territoryFillTransition ??
                        "frontier_morph") === opt.id}
                    onclick={() => selectFillTransition(opt.id)}
                    >{opt.label}</button
                >
            {/each}
        </div>
    </div>

    <!-- Row 4: Border Transition (rose) -->
    <div
        class="axis-row"
        style="--accent: #fb7185; --accent-bg: rgba(251,113,133,0.15)"
    >
        <span class="axis-label">Border Transition</span>
        <div class="axis-buttons">
            {#each BORDER_TRANSITION_OPTIONS as opt}
                <button
                    class="axis-btn"
                    class:active={(panel.territoryBorderTransition ??
                        "smooth_morph") === opt.id}
                    onclick={() => selectBorderTransition(opt.id)}
                    >{opt.label}</button
                >
            {/each}
        </div>
    </div>
</div>

<!-- Border Transition Tuning -->
<div class="engine-control-group">
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Transition Easing</span>
        </div>
        <select
            class="mode-select"
            value={panel.borderTransEasing ??
                GAME_CONFIG.BORDER_TRANS_EASING ??
                "linear"}
            onchange={(e) => {
                debouncedConfigUpdate(
                    "BORDER_TRANS_EASING",
                    "borderTransEasing",
                    (e.target as HTMLSelectElement).value,
                );
            }}
        >
            <option value="linear">1. Linear (constant speed)</option>
            <option value="cubic">2. Cubic (smooth, no overshoot)</option>
            <option value="ease-out">3. Ease-out (decelerate)</option>
            <option value="ease-out-quad">4. Ease-out Quad (lighter)</option>
            <option value="sine">5. Sine (gentle S-curve)</option>
            <option value="back">6. Back (overshoot)</option>
            <option value="elastic">7. Elastic (bouncy)</option>
        </select>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Resample Points</span><span class="val"
                >{panel.borderTransResampleN ??
                    GAME_CONFIG.BORDER_TRANS_RESAMPLE_N ??
                    32}</span
            >
        </div>
        <input
            type="range"
            min="8"
            max="64"
            step="4"
            value={panel.borderTransResampleN ??
                GAME_CONFIG.BORDER_TRANS_RESAMPLE_N ??
                32}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "BORDER_TRANS_RESAMPLE_N",
                    "borderTransResampleN",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Frontier Resolution</span><span class="val"
                >{panel.frontierResolution ??
                    GAME_CONFIG.FRONTIER_RESOLUTION ??
                    5}px</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={panel.frontierResolution ??
                GAME_CONFIG.FRONTIER_RESOLUTION ??
                5}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "FRONTIER_RESOLUTION",
                    "frontierResolution",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Back Overshoot</span><span class="val"
                >{(
                    panel.borderTransOvershoot ??
                    GAME_CONFIG.BORDER_TRANS_OVERSHOOT ??
                    0
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={panel.borderTransOvershoot ??
                GAME_CONFIG.BORDER_TRANS_OVERSHOOT ??
                0}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "BORDER_TRANS_OVERSHOOT",
                    "borderTransOvershoot",
                    v,
                );
            }}
        />
    </div>
</div>

<!-- Active Layers toggles removed — V3 architecture uses Render Mode dropdown above -->

{#if panel.territoryModifiedVoronoi}
    <!-- -- Modified Voronoi Settings (F-138) -- -->
    <h4 class="sub-heading">Modified Voronoi Settings</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">? Star Margin</span><span class="val"
                >{panel.modifiedVoronoiStarMargin ??
                    GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="5"
            value={panel.modifiedVoronoiStarMargin ??
                GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_STAR_MARGIN",
                    "modifiedVoronoiStarMargin",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">?? Arc Strength</span><span class="val"
                >{(
                    panel.modifiedVoronoiArcStrength ??
                    GAME_CONFIG.MODIFIED_VORONOI_ARC_STRENGTH
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={panel.modifiedVoronoiArcStrength ??
                GAME_CONFIG.MODIFIED_VORONOI_ARC_STRENGTH}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_ARC_STRENGTH",
                    "modifiedVoronoiArcStrength",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">?? Arc Threshold</span><span class="val"
                >{panel.modifiedVoronoiArcThreshold ??
                    GAME_CONFIG.MODIFIED_VORONOI_ARC_THRESHOLD}�</span
            >
        </div>
        <input
            type="range"
            min="30"
            max="180"
            step="5"
            value={panel.modifiedVoronoiArcThreshold ??
                GAME_CONFIG.MODIFIED_VORONOI_ARC_THRESHOLD}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_ARC_THRESHOLD",
                    "modifiedVoronoiArcThreshold",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">?? Arc Min Segment</span><span class="val"
                >{panel.modifiedVoronoiArcMinSegment ??
                    GAME_CONFIG.MODIFIED_VORONOI_ARC_MIN_SEGMENT}px</span
            >
        </div>
        <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={panel.modifiedVoronoiArcMinSegment ??
                GAME_CONFIG.MODIFIED_VORONOI_ARC_MIN_SEGMENT}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_ARC_MIN_SEGMENT",
                    "modifiedVoronoiArcMinSegment",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">??? Corridor Sites</span><span class="val"
                >{(panel.modifiedVoronoiCorridorEnabled ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED)
                    ? "ON"
                    : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={panel.modifiedVoronoiCorridorEnabled ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("modifiedVoronoiCorridorEnabled", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">?? Corridor Spacing</span><span class="val"
                >{panel.modifiedVoronoiCorridorSpacing ??
                    GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}px</span
            >
        </div>
        <input
            type="range"
            min="20"
            max="200"
            step="5"
            value={panel.modifiedVoronoiCorridorSpacing ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_CORRIDOR_SPACING",
                    "modifiedVoronoiCorridorSpacing",
                    v,
                );
            }}
        />
    </div>
{/if}

{#if panel.territoryEngine ?? GAME_CONFIG.TERRITORY_ENGINE_ENABLED}
    <h4 class="sub-heading">⚙️ Geometry</h4>
    <div
        class="row-bottom"
        style="font-size: 10px; opacity: 0.6; padding: 2px 4px;"
    >
        Geometry engine computes territory boundaries from game state. All
        visual styles consume its output.
    </div>

    <h4 class="sub-heading">Shape / Motion</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Conquest Animation Timing</span><span
                class="val"
                >{panel.territoryTransitionMs ??
                    GAME_CONFIG.TERRITORY_TRANSITION_MS}ms</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={panel.territoryTransitionMs ??
                GAME_CONFIG.TERRITORY_TRANSITION_MS}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "TERRITORY_TRANSITION_MS",
                    "territoryTransitionMs",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Morph Control Points</span><span class="val"
                >{panel.territoryMorphControlPoints ??
                    GAME_CONFIG.TERRITORY_MORPH_CONTROL_POINTS}</span
            >
        </div>
        <input
            type="range"
            min="5"
            max="300"
            step="1"
            value={panel.territoryMorphControlPoints ??
                GAME_CONFIG.TERRITORY_MORPH_CONTROL_POINTS}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                updatePanel("territoryMorphControlPoints", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Morph Easing</span>
        </div>
        <div style="display:flex;gap:4px;padding:2px 0;flex-wrap:wrap">
            {#each MORPH_EASING_OPTIONS as easing}
                <button
                    class="mini-btn"
                    class:active={(panel.dfMorphEasing ??
                        GAME_CONFIG.DF_MORPH_EASING ??
                        "linear") === easing.id}
                    onclick={() => updatePanel("dfMorphEasing", easing.id)}
                    >{easing.label}</button
                >
            {/each}
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Boundary Mode</span><span class="val"
                >{panel.territoryBoundaryMode ??
                    GAME_CONFIG.TERRITORY_BOUNDARY_MODE ??
                    "smooth"}</span
            >
        </div>
        <div style="display:flex; gap:4px;">
            <button
                class="mini-btn"
                class:active={(panel.territoryBoundaryMode ??
                    GAME_CONFIG.TERRITORY_BOUNDARY_MODE) === "segment"}
                onclick={() =>
                    debouncedConfigUpdate(
                        "TERRITORY_BOUNDARY_MODE",
                        "territoryBoundaryMode",
                        "segment",
                    )}>Segment</button
            >
            <button
                class="mini-btn"
                class:active={(panel.territoryBoundaryMode ??
                    GAME_CONFIG.TERRITORY_BOUNDARY_MODE) === "smooth"}
                onclick={() =>
                    debouncedConfigUpdate(
                        "TERRITORY_BOUNDARY_MODE",
                        "territoryBoundaryMode",
                        "smooth",
                    )}>Smooth</button
            >
        </div>
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Fill Alpha</span><span class="val"
                >{(panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA).toFixed(
                    2,
                )}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={panel.voronoiAlpha ?? GAME_CONFIG.VORONOI_ALPHA}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate("VORONOI_ALPHA", "voronoiAlpha", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Neutral Transparent</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.neutralTerritoryTransparent ??
                        GAME_CONFIG.NEUTRAL_TERRITORY_TRANSPARENT}
                    onchange={(e) => {
                        const v = (e.target as HTMLInputElement).checked;
                        debouncedConfigUpdate(
                            "NEUTRAL_TERRITORY_TRANSPARENT",
                            "neutralTerritoryTransparent",
                            v,
                        );
                    }}
                />
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Width</span><span class="val"
                >{(
                    panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH
                ).toFixed(1)}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={panel.voronoiBorderWidth ?? GAME_CONFIG.VORONOI_BORDER_WIDTH}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_BORDER_WIDTH",
                    "voronoiBorderWidth",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Border Alpha</span><span class="val"
                >{(
                    panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={panel.voronoiBorderAlpha ?? GAME_CONFIG.VORONOI_BORDER_ALPHA}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_BORDER_ALPHA",
                    "voronoiBorderAlpha",
                    v,
                );
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Geometry Smooth Passes</span><span
                class="val"
                >{Math.round(
                    panel.voronoiBorderSmooth ??
                        GAME_CONFIG.VORONOI_BORDER_SMOOTH,
                )}</span
            >
        </div>
        <div class="row-hint">
            Chaikin passes — modifies actual border/fill geometry coordinates.
            0=angular, 2=smooth, 5=very round
        </div>
        <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={panel.voronoiBorderSmooth ??
                GAME_CONFIG.VORONOI_BORDER_SMOOTH}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_BORDER_SMOOTH",
                    "voronoiBorderSmooth",
                    v,
                );
            }}
        />
    </div>

    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Saturation</span><span class="val"
                >{(
                    panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiSaturation ?? GAME_CONFIG.VORONOI_SATURATION}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_SATURATION",
                    "voronoiSaturation",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Lightness</span><span class="val"
                >{(
                    panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS
                ).toFixed(2)}</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={panel.voronoiLightness ?? GAME_CONFIG.VORONOI_LIGHTNESS}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "VORONOI_LIGHTNESS",
                    "voronoiLightness",
                    v,
                );
            }}
        />
    </div>
    <h4 class="sub-heading">Bias / Pressure</h4>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">MSR Star Margin</span><span class="val"
                >{panel.modifiedVoronoiStarMargin ??
                    GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}px</span
            >
        </div>
        <input
            type="range"
            min="0"
            max="500"
            step="5"
            value={panel.modifiedVoronoiStarMargin ??
                GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_STAR_MARGIN",
                    "modifiedVoronoiStarMargin",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">CX Corridor Sites</span><span class="val"
                >{(panel.modifiedVoronoiCorridorEnabled ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED)
                    ? "ON"
                    : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={panel.modifiedVoronoiCorridorEnabled ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("modifiedVoronoiCorridorEnabled", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">CX Corridor Spacing</span><span class="val"
                >{panel.modifiedVoronoiCorridorSpacing ??
                    GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}px</span
            >
        </div>
        <input
            type="range"
            min="20"
            max="200"
            step="5"
            value={panel.modifiedVoronoiCorridorSpacing ??
                GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_CORRIDOR_SPACING",
                    "modifiedVoronoiCorridorSpacing",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">DX Disconnect Buffer</span><span class="val"
                >{(panel.modifiedVoronoiDisconnectEnabled ??
                GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED)
                    ? "ON"
                    : "OFF"}</span
            >
        </div>
        <input
            type="checkbox"
            checked={panel.modifiedVoronoiDisconnectEnabled ??
                GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED}
            onchange={(e) => {
                const v = (e.target as HTMLInputElement).checked;
                updatePanel("modifiedVoronoiDisconnectEnabled", v);
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">DX Disconnect Distance</span><span
                class="val"
                >{panel.modifiedVoronoiDisconnectDistance ??
                    GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}px</span
            >
        </div>
        <input
            type="range"
            min="50"
            max="800"
            step="25"
            value={panel.modifiedVoronoiDisconnectDistance ??
                GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE}
            oninput={(e) => {
                const v = +(e.target as HTMLInputElement).value;
                debouncedConfigUpdate(
                    "MODIFIED_VORONOI_DISCONNECT_DISTANCE",
                    "modifiedVoronoiDisconnectDistance",
                    v,
                );
            }}
        />
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Trace Mode</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.territoryEngineTraceMode ??
                        GAME_CONFIG.TERRITORY_ENGINE_TRACE_MODE}
                    onchange={(e) => {
                        const v = (e.target as HTMLInputElement).checked;
                        updatePanel("territoryEngineTraceMode", v);
                    }}
                />
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>
    <div class="var-row">
        <div class="row-top">
            <span class="var-name">Step Mode</span>
            <label class="toggle-switch">
                <input
                    type="checkbox"
                    checked={panel.territoryEngineStepMode ??
                        GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE}
                    onchange={(e) => {
                        const v = (e.target as HTMLInputElement).checked;
                        updatePanel("territoryEngineStepMode", v);
                    }}
                />
                <span class="toggle-slider"></span>
            </label>
        </div>
    </div>
    {#if panel.territoryEngineStepMode ?? GAME_CONFIG.TERRITORY_ENGINE_STEP_MODE}
        <div class="var-row compact">
            <div class="row-top">
                <span class="var-name">Advance Stage</span>
                <span class="val"
                    >{panel.territoryEngineStepAdvanceToken ??
                        GAME_CONFIG.TERRITORY_ENGINE_STEP_ADVANCE_TOKEN}</span
                >
            </div>
            <div style="display:flex; gap:6px;">
                <button
                    class="mini-btn"
                    onclick={() => {
                        const nextToken =
                            (panel.territoryEngineStepAdvanceToken ??
                                GAME_CONFIG.TERRITORY_ENGINE_STEP_ADVANCE_TOKEN) +
                            1;
                        updatePanel(
                            "territoryEngineStepAdvanceToken",
                            nextToken,
                        );
                    }}>Advance</button
                >
                <button
                    class="mini-btn"
                    onclick={() => {
                        updatePanel("territoryEngineStepAdvanceToken", 0);
                    }}>Reset</button
                >
            </div>
        </div>
    {/if}
    <div class="trace-panel">
        <div class="row-top">
            <span class="var-name">Trace Inspector</span>
            {#if $territoryTraceRun}
                <span class="val">run {$territoryTraceRun.runId}</span>
            {:else}
                <span class="val">no trace</span>
            {/if}
        </div>
        {#if $territoryTraceRun}
            <div class="trace-chip-row">
                <span class="trace-chip"
                    >steps {$territoryTraceRun.steps
                        .length}/{TERRITORY_PIPELINE_STAGE_ORDER.length}</span
                >
                <span class="trace-chip"
                    >next {getNextTraceStageLabel(
                        $territoryTraceRun.steps.length,
                    )}</span
                >
                <span class="trace-chip"
                    >mode {$territoryTraceRun.selection.mode}</span
                >
                <span class="trace-chip"
                    >static {$territoryTraceRun.selection.staticMethodId}</span
                >
                <span class="trace-chip"
                    >{$territoryTraceRun.totalDurationMs}ms</span
                >
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Meta</div>
                <div class="trace-summary">
                    {summarizeTraceRecord($territoryTraceRun.meta, 8).join(
                        " | ",
                    )}
                </div>
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Owner Region Loops</div>
                {#each getOwnerRegionLoopPreviewEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-detail-line">{entry.summary}</div>
                {/each}
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Owner Shells</div>
                {#each getOwnerShellPreviewEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-detail-line">{entry.summary}</div>
                {/each}
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Holding Transitions</div>
                <div class="trace-summary">
                    {getOwnerHoldingTransitionSummary(
                        $territoryTraceRun.artifacts,
                    ).join(" | ")}
                </div>
                {#each getOwnerHoldingTransitionPreviewEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-detail-line">{entry.summary}</div>
                {/each}
            </div>
            <div class="trace-section">
                <div class="trace-section-title">Artifacts</div>
                {#each getTraceArtifactEntries($territoryTraceRun.artifacts) as entry}
                    <div class="trace-entry">
                        <div class="trace-entry-head">
                            <span class="trace-badge">{entry.stageId}</span>
                            <span class="val"
                                >{Object.keys(entry.artifact).length} keys</span
                            >
                        </div>
                        <div class="trace-summary">
                            {summarizeTraceRecord(entry.artifact, 8).join(
                                " | ",
                            )}
                        </div>
                    </div>
                {/each}
            </div>

            <div class="trace-section">
                <div class="trace-section-title">Steps</div>
                {#each $territoryTraceRun.steps as step}
                    <div class="trace-entry">
                        <div class="trace-entry-head">
                            <span class="trace-badge">{step.stageId}</span>
                            <span class="val">{step.durationMs}ms</span>
                        </div>
                        <div class="trace-summary">
                            {summarizeTraceRecord(step.summary, 8).join(" | ")}
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="trace-empty">
                Enable Trace Mode or Step Mode to capture a territory-engine run
                here.
            </div>
        {/if}
    </div>
{/if}

<!-- Per-renderer settings removed — V3.1 uses three-concern architecture (Style + Fill Transition + Border Transition) -->

<style>
    @import "./panel-shared.css";
    /* ── V3.2 Axis Card Layout ── */
    .axis-card {
        background: rgba(20, 20, 30, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 10px 12px 8px;
        margin: 4px 0 8px;
    }
    .axis-card-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #ccc;
        margin: 0 0 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .axis-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 5px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .axis-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
    .axis-label {
        flex-shrink: 0;
        width: 80px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--accent, #888);
        padding-top: 4px;
        font-weight: 600;
    }
    .axis-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        flex: 1;
        min-width: 0;
    }
    .axis-btn {
        padding: 3px 8px;
        background: transparent;
        border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
        border-radius: 10px;
        color: var(--accent, #888);
        font-size: 9px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
        line-height: 1.3;
    }
    .axis-btn:hover {
        background: var(--accent-bg, rgba(255, 255, 255, 0.06));
        border-color: var(--accent, #888);
    }
    .axis-btn.active {
        background: var(--accent, #888);
        border-color: var(--accent, #888);
        color: #111;
        font-weight: 600;
    }
    /* Legacy compat — keep old selectors but not used by card */
    .triple-select-row {
        display: flex;
        gap: 6px;
        padding: 2px 4px;
    }
    .triple-select-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .triple-select-col .mode-select {
        width: 100%;
    }
    .triple-label {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: #888;
    }
    .sub-heading {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #aaa;
        margin: 12px 0 6px;
        padding: 0 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 3px;
    }
    .mode-btn {
        flex: 1;
        padding: 3px 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.7rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .mode-btn:hover {
        border-color: rgba(100, 200, 255, 0.3);
        color: #93c5fd;
    }
    .mode-btn.active {
        background: rgba(100, 200, 255, 0.15);
        border-color: rgba(100, 200, 255, 0.4);
        color: #93c5fd;
        font-weight: 600;
    }
    .var-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 2px 4px;
    }
    .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .var-name {
        font-size: 11px;
        color: #ccc;
    }
    .val {
        font-size: 10px;
        color: #888;
        font-family: monospace;
    }
    .mode-select {
        background: rgba(255, 255, 255, 0.08);
        color: #ddd;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        font-size: 11px;
        padding: 2px 6px;
        cursor: pointer;
    }
    .mode-select:focus {
        outline: 1px solid rgba(100, 180, 255, 0.5);
    }
    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 28px;
        height: 14px;
    }
    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        transition: 0.2s;
    }
    .toggle-slider::before {
        position: absolute;
        content: "";
        height: 10px;
        width: 10px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: 0.2s;
    }
    .toggle-switch input:checked + .toggle-slider {
        background-color: #4ade80;
    }
    .toggle-switch input:checked + .toggle-slider::before {
        transform: translateX(14px);
    }
    input[type="range"] {
        width: 100%;
        height: 4px;
        appearance: none;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 2px;
        outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4ade80;
        cursor: pointer;
    }
    .grayed {
        color: #888;
    }
    .mini-btn {
        padding: 3px 10px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        letter-spacing: 0.5px;
    }
    .mini-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.8);
        border-color: rgba(255, 255, 255, 0.25);
    }
    .mini-btn.active {
        background: rgba(74, 222, 128, 0.2);
        border-color: #4ade80;
        color: #4ade80;
        box-shadow: 0 0 6px rgba(74, 222, 128, 0.25);
    }
    .mini-btn.reference-only,
    .mini-btn:disabled {
        cursor: not-allowed;
        opacity: 0.42;
        box-shadow: none;
    }
    .mini-btn.reference-only:hover,
    .mini-btn:disabled:hover {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.5);
        border-color: rgba(255, 255, 255, 0.15);
    }
    .engine-control-group.reference-only {
        opacity: 0.78;
    }
    .engine-route-hint {
        font-size: 10px;
        line-height: 1.35;
        color: rgba(255, 255, 255, 0.58);
        padding: 1px 0 4px;
    }
    .trace-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 8px 4px 0;
        padding: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.03);
    }
    .trace-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    .trace-chip {
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(74, 222, 128, 0.12);
        border: 1px solid rgba(74, 222, 128, 0.2);
        color: #9ae6b4;
        font-size: 10px;
        font-family: monospace;
    }
    .trace-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .trace-section-title {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #8fb7ff;
    }
    .trace-entry {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 6px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.04);
    }
    .trace-entry-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    .trace-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(147, 197, 253, 0.12);
        color: #bfdbfe;
        font-size: 10px;
        font-family: monospace;
    }
    .trace-summary {
        font-size: 10px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.72);
        font-family: monospace;
        word-break: break-word;
    }
    .trace-detail-line {
        font-size: 10px;
        line-height: 1.35;
        color: rgba(255, 255, 255, 0.68);
        font-family: monospace;
    }
    .trace-empty {
        font-size: 10px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.58);
    }
</style>
