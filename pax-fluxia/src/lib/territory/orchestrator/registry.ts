import type {
    TerritoryDynamicMethodDescriptor,
    TerritoryDynamicMethodId,
    TerritoryPipelineStageId,
    TerritoryStaticMethodDescriptor,
    TerritoryStaticMethodId,
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

export const TERRITORY_STATIC_METHODS: TerritoryStaticMethodDescriptor[] = [
    {
        id: 'fg1_adaptive_field',
        label: 'FG1 Adaptive Field',
        description:
            'Adaptive triangulated graph-field frontier extraction. Bootstrap adapter currently maps to legacy PVV2 renderer.',
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
            'FG1 with class-encapsulated renderer and FX-based transitions. Non-destructive refactor of legacy_pvv2.',
        implementedStages: ['render'],
        adapter: 'refactored_pvv2',
    },
];

export const TERRITORY_DYNAMIC_METHODS: TerritoryDynamicMethodDescriptor[] = [
    {
        id: 'dy4_optimal_transport',
        label: 'DY4 Optimal Transport',
        // ┌─────────────────────────────────────────────────────────────────┐
        // │  SACROSANCT — This is the CANONICAL default border animation   │
        // │  mode. It produces the most unique and attractive border       │
        // │  animations in the game. Do NOT modify, break, or change the   │
        // │  adapter/anchor without explicit user approval.                │
        // │  See .atlas/DECISIONS.md for rationale.                        │
        // └─────────────────────────────────────────────────────────────────┘
        description:
            'Mass-preserving ownership transport updates. Bootstrap adapter maps to legacy PVV2 path. CANONICAL DEFAULT — sacrosanct.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
        anchorStaticMethodId: 'fg1_adaptive_field',
    },
    {
        id: 'dy4_mar19_refactor',
        label: 'DY4 Mar19 Refactor',
        description:
            'DY4 with class-encapsulated transitions via FX system. Non-destructive refactor of legacy_pvv2.',
        implementedStages: ['render'],
        adapter: 'refactored_pvv2',
        anchorStaticMethodId: 'fg1_mar19_refactor',
    },
];

export const TERRITORY_STATIC_METHOD_BY_ID: Record<
    TerritoryStaticMethodId,
    TerritoryStaticMethodDescriptor
> = TERRITORY_STATIC_METHODS.reduce(
    (acc, method) => {
        acc[method.id] = method;
        return acc;
    },
    {} as Record<TerritoryStaticMethodId, TerritoryStaticMethodDescriptor>,
);

export const TERRITORY_DYNAMIC_METHOD_BY_ID: Record<
    TerritoryDynamicMethodId,
    TerritoryDynamicMethodDescriptor
> = TERRITORY_DYNAMIC_METHODS.reduce(
    (acc, method) => {
        acc[method.id] = method;
        return acc;
    },
    {} as Record<TerritoryDynamicMethodId, TerritoryDynamicMethodDescriptor>,
);

// ════════════════════════════════════════════════════════════════════
// SACROSANCT DEFAULTS — DY4 Optimal Transport is the canonical border
// animation mode. It uses the legacy_pvv2 adapter (PowerVoronoiRenderer)
// anchored to fg1_adaptive_field. These defaults must not change without
// explicit user approval. See .atlas/DECISIONS.md.
// ════════════════════════════════════════════════════════════════════
export const DEFAULT_TERRITORY_STATIC_METHOD: TerritoryStaticMethodId =
    'fg1_adaptive_field';

export const DEFAULT_TERRITORY_DYNAMIC_METHOD: TerritoryDynamicMethodId =
    'dy4_optimal_transport';