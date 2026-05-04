export type BackgroundModeId =
    | 'legacy_image'
    | 'nebula_veil'
    | 'banner_light'
    | 'shadow_mist'
    | 'starlit_dust'
    | 'leyline_flow'
    | 'ember_kingdom'
    | 'frost_veins'
    | 'storm_current';

export type BackgroundSurface = 'game' | 'menu';

export type BackgroundLayerId =
    | 'interior'
    | 'particles'
    | 'frontier'
    | 'accent';

export interface BackgroundTunableDef {
    readonly key: string;
    readonly label: string;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly defaultValue: number;
    readonly description?: string;
}

export type BackgroundTunables = Record<string, number>;

export interface BackgroundModeDefinition {
    readonly id: BackgroundModeId;
    readonly label: string;
    readonly description: string;
    readonly supportsMenu: boolean;
    readonly supportsGame: boolean;
    readonly sharedTunables: readonly BackgroundTunableDef[];
    readonly modeTunables: readonly BackgroundTunableDef[];
    readonly defaultsBySurface: Readonly<Record<BackgroundSurface, BackgroundTunables>>;
    readonly requiredLayers: readonly BackgroundLayerId[];
    readonly runtimeSupport: readonly string[];
    readonly primary?: boolean;
}

export interface BackgroundSelection {
    readonly modeId: BackgroundModeId;
    readonly tunables: BackgroundTunables;
    readonly legacyImage?: string;
}

export interface BackgroundChangeDetail {
    readonly surface: BackgroundSurface;
    readonly selection: BackgroundSelection;
    readonly legacyImage: string;
}

export type BackgroundCapabilityMatrix = Readonly<
    Record<string, readonly BackgroundModeId[]>
>;
