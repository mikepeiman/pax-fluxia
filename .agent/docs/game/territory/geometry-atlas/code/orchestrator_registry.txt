import type {
    TerritoryMethodDescriptor,
    TerritoryMethodId,
    TerritoryPipelineStageId,
} from './types';

// Runtime pipeline uses legacy fine-grained stages that executeStage() checks against.
// The 4-stage canonical model (ownership/geometry/transition/presentation) is a conceptual
// grouping—see types.ts—but the executor's if-chains still use these names.
export const TERRITORY_PIPELINE_STAGE_ORDER: TerritoryPipelineStageId[] = [
    'metric',
    'world_extension',
    'seed',
    'topology',
    'geometry',
    'loop',
    'animation',
    'render',
];

// ── Unified Method Registry ──────────────────────────────────────────────────
// All methods in one array. No static/dynamic split.
// Each method declares what stages it implements and which adapter renders it.

export const TERRITORY_METHODS: TerritoryMethodDescriptor[] = [
    {
        id: 'fg1_adaptive_field',
        label: 'FG1 Adaptive Field',
        description:
            'Adaptive triangulated graph-field frontier extraction. Bootstrap adapter maps to legacy PVV2 renderer.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
    },
    {
        id: 'fg2_seed_graph',
        label: 'FG2 Seed Graph',
        description:
            'Frontier-genesis seed graph method. Full native implementation of all pipeline stages.',
        implementedStages: [
            'metric',
            'world_extension',
            'seed',
            'topology',
            'geometry',
            'loop',
            'animation',
            'render',
        ],
        adapter: 'legacy_pvv3',
    },
    {
        id: 'fg1_mar19_refactor',
        label: 'FG1 Mar19 Refactor',
        description:
            'FG1 with class-encapsulated renderer and isolated PVV2RendererState. Non-destructive refactor of legacy_pvv2.',
        implementedStages: ['render'],
        adapter: 'refactored_pvv2',
    },
    // ┌─────────────────────────────────────────────────────────────────┐
    // │  SACROSANCT — DY4 Optimal Transport is the CANONICAL default   │
    // │  border animation mode. Do NOT modify, break, or change the    │
    // │  adapter without explicit user approval.                       │
    // │  See .agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md           │
    // └─────────────────────────────────────────────────────────────────┘
    {
        id: 'dy4_optimal_transport',
        label: 'DY4 Optimal Transport',
        description:
            'Mass-preserving ownership transport updates. CANONICAL DEFAULT — sacrosanct.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
    },
    {
        id: 'dy4_mar19_refactor',
        label: 'DY4 Mar19 Refactor',
        description:
            'DY4 with class-encapsulated transitions via FX system. Non-destructive refactor.',
        implementedStages: ['render'],
        adapter: 'refactored_pvv2',
    },
    {
        id: 'new_frontiers_0319',
        label: 'New-Frontiers-0319',
        description:
            'Ownership-annotated frontier with world-boundary-inclusive fill construction. Fixes fill/border divergence.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
    },
];

// ── Lookup Table ─────────────────────────────────────────────────────────────

export const TERRITORY_METHOD_BY_ID: Record<
    TerritoryMethodId,
    TerritoryMethodDescriptor
> = TERRITORY_METHODS.reduce(
    (acc, method) => {
        acc[method.id] = method;
        return acc;
    },
    {} as Record<TerritoryMethodId, TerritoryMethodDescriptor>,
);

// ════════════════════════════════════════════════════════════════════
// SACROSANCT DEFAULTS — DY4 Optimal Transport is the canonical border
// animation mode. These defaults must not change without explicit user
// approval. See .agent/SPECIFICATIONS/TERRITORY_ARCHITECTURE.md
// ════════════════════════════════════════════════════════════════════
export const DEFAULT_TERRITORY_METHOD: TerritoryMethodId =
    'dy4_optimal_transport';

// ── Backward-Compat Aliases (temporary) ──────────────────────────────────────
// These will be removed once all consumers migrate to the unified types.

/** @deprecated Use TERRITORY_METHODS */
export const TERRITORY_STATIC_METHODS = TERRITORY_METHODS.filter(m =>
    ['fg1_adaptive_field', 'fg1_mar19_refactor', 'fg2_seed_graph'].includes(m.id));
/** @deprecated Use TERRITORY_METHODS */
export const TERRITORY_DYNAMIC_METHODS = TERRITORY_METHODS.filter(m =>
    ['dy4_optimal_transport', 'dy4_mar19_refactor'].includes(m.id));
/** @deprecated Use TERRITORY_METHOD_BY_ID */
export const TERRITORY_STATIC_METHOD_BY_ID = TERRITORY_METHOD_BY_ID;
/** @deprecated Use TERRITORY_METHOD_BY_ID */
export const TERRITORY_DYNAMIC_METHOD_BY_ID = TERRITORY_METHOD_BY_ID;
/** @deprecated Use DEFAULT_TERRITORY_METHOD */
export const DEFAULT_TERRITORY_STATIC_METHOD = DEFAULT_TERRITORY_METHOD;
/** @deprecated Use DEFAULT_TERRITORY_METHOD */
export const DEFAULT_TERRITORY_DYNAMIC_METHOD = DEFAULT_TERRITORY_METHOD;