import type { MapConnection, MapLaneMode } from '@pax/common/mapgen';

export interface LanePolylineRebuildWorkerRequest {
    requestId: number;
    nodes: Array<{ id: string; x: number; y: number }>;
    connections: Array<{ sourceId: string; targetId: string }>;
    mode: MapLaneMode;
    clearancePx: number;
}

export interface LanePolylineRebuildWorkerResponse {
    requestId: number;
    elapsedMs: number;
    connections: MapConnection[];
}
