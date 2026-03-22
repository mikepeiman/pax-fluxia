export type TerritoryVFXEventType =
    | 'territory_conquest_start'
    | 'virtual_star_spawn'
    | 'territory_retreat';

export interface TerritoryVFXEvent<TPayload = Record<string, unknown>> {
    type: TerritoryVFXEventType;
    atMs: number;
    payload: TPayload;
}

export interface TerritoryVFXCommand {
    kind: 'spawn_particles' | 'play_sound' | 'debug_marker';
    payload: Record<string, unknown>;
}

export interface VFXHandler {
    id: string;
    handles: readonly TerritoryVFXEventType[];
    tick(
        event: TerritoryVFXEvent,
        dtMs: number,
    ): readonly TerritoryVFXCommand[];
}
