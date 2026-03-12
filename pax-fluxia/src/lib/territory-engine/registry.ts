import type {
    TerritoryDynamicMethodDescriptor,
    TerritoryDynamicMethodId,
    TerritoryHybridPlanDescriptor,
    TerritoryHybridPlanId,
    TerritoryPipelineStageId,
    TerritoryStaticMethodDescriptor,
    TerritoryStaticMethodId,
} from './types';

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
            'Frontier-genesis seed graph method. Bootstrap adapter currently maps to legacy PVV3 renderer.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv3',
    },
    {
        id: 'fg3_implicit_trace',
        label: 'FG3 Implicit Trace',
        description:
            'Direct implicit frontier tracing method. Bootstrap adapter currently maps to legacy DF renderer.',
        implementedStages: ['render'],
        adapter: 'legacy_df',
    },
    {
        id: 'fg4_pairwise_arrangement',
        label: 'FG4 Pairwise Arrangement',
        description:
            'Pairwise bisector arrangement method. Bootstrap adapter currently maps to legacy PVV2 renderer.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
    },
    {
        id: 'fg5_rt_assisted_publish',
        label: 'FG5 RT-Assisted Publish',
        description:
            'Render-texture-assisted vector publish method. Bootstrap adapter currently maps to legacy DF renderer.',
        implementedStages: ['render'],
        adapter: 'legacy_df',
    },
];

export const TERRITORY_DYNAMIC_METHODS: TerritoryDynamicMethodDescriptor[] = [
    {
        id: 'dy1_span_graph_morph',
        label: 'DY1 Span Graph Morph',
        description:
            'Reuses static frontier graph and morphs on ownership deltas. Bootstrap adapter maps to legacy PVV3 path.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv3',
        anchorStaticMethodId: 'fg2_seed_graph',
    },
    {
        id: 'dy2_local_delta_patch',
        label: 'DY2 Local Delta Patch',
        description:
            'Incremental patching for local ownership deltas. Bootstrap adapter maps to legacy DF path.',
        implementedStages: ['render'],
        adapter: 'legacy_df',
        anchorStaticMethodId: 'fg3_implicit_trace',
    },
    {
        id: 'dy3_field_interp_stabilized',
        label: 'DY3 Field Interp Stabilized',
        description:
            'Stabilized field interpolation for temporal coherence. Bootstrap adapter maps to legacy DF path.',
        implementedStages: ['render'],
        adapter: 'legacy_df',
        anchorStaticMethodId: 'fg3_implicit_trace',
    },
    {
        id: 'dy4_optimal_transport',
        label: 'DY4 Optimal Transport',
        description:
            'Mass-preserving ownership transport updates. Bootstrap adapter maps to legacy PVV2 path.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
        anchorStaticMethodId: 'fg1_adaptive_field',
    },
    {
        id: 'dy5_corridor_event_decomposition',
        label: 'DY5 Corridor Event Decomposition',
        description:
            'Event-driven corridor decomposition with local recompute windows. Bootstrap adapter maps to legacy PVV3 path.',
        implementedStages: ['render'],
        adapter: 'legacy_pvv3',
        anchorStaticMethodId: 'fg2_seed_graph',
    },
];

export const TERRITORY_HYBRID_PLANS: TerritoryHybridPlanDescriptor[] = [
    {
        id: 'hy1_static_backbone_dynamic_refine',
        label: 'HY1 Static Backbone + Dynamic Refine',
        description:
            'Build static canonical frontier once, then apply dynamic local refinements.',
        staticMethodId: 'fg1_adaptive_field',
        dynamicMethodId: 'dy1_span_graph_morph',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
    },
    {
        id: 'hy2_seed_graph_local_delta',
        label: 'HY2 Seed Graph + Local Delta',
        description:
            'Use frontier-genesis seeds with local delta patching for tick updates.',
        staticMethodId: 'fg2_seed_graph',
        dynamicMethodId: 'dy2_local_delta_patch',
        implementedStages: ['render'],
        adapter: 'legacy_pvv3',
    },
    {
        id: 'hy3_implicit_field_transport',
        label: 'HY3 Implicit Field + Transport',
        description:
            'Implicit frontier extraction with transport-stabilized motion updates.',
        staticMethodId: 'fg3_implicit_trace',
        dynamicMethodId: 'dy4_optimal_transport',
        implementedStages: ['render'],
        adapter: 'legacy_df',
    },
    {
        id: 'hy4_pairwise_patch_transport',
        label: 'HY4 Pairwise + Patch + Transport',
        description:
            'Pairwise arrangement static pass with patch and transport dynamic controls.',
        staticMethodId: 'fg4_pairwise_arrangement',
        dynamicMethodId: 'dy4_optimal_transport',
        implementedStages: ['render'],
        adapter: 'legacy_pvv2',
    },
    {
        id: 'hy5_rt_publish_corridor_events',
        label: 'HY5 RT Publish + Corridor Events',
        description:
            'Render-texture publish with event-based corridor decomposition updates.',
        staticMethodId: 'fg5_rt_assisted_publish',
        dynamicMethodId: 'dy5_corridor_event_decomposition',
        implementedStages: ['render'],
        adapter: 'legacy_df',
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

export const TERRITORY_HYBRID_PLAN_BY_ID: Record<
    TerritoryHybridPlanId,
    TerritoryHybridPlanDescriptor
> = TERRITORY_HYBRID_PLANS.reduce(
    (acc, plan) => {
        acc[plan.id] = plan;
        return acc;
    },
    {} as Record<TerritoryHybridPlanId, TerritoryHybridPlanDescriptor>,
);

export const DEFAULT_TERRITORY_STATIC_METHOD: TerritoryStaticMethodId =
    'fg2_seed_graph';

export const DEFAULT_TERRITORY_DYNAMIC_METHOD: TerritoryDynamicMethodId =
    'dy2_local_delta_patch';

export const DEFAULT_TERRITORY_HYBRID_PLAN: TerritoryHybridPlanId =
    'hy2_seed_graph_local_delta';