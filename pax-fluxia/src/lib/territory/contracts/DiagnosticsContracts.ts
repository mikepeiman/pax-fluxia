import type { PowerVoronoiDiagnosticBundle } from '../pvFrontline/contracts';
import type { TransitionFallbackReason } from './TransitionContracts';

export interface TerritoryDiagnosticMessage {
    level: 'info' | 'warn' | 'error';
    message: string;
    source: string;
}

export interface TerritoryRuntimeDiagnostics {
    startedAtMs: number;
    finishedAtMs: number;
    messages: TerritoryDiagnosticMessage[];
    modeDiagnostics?: PowerVoronoiDiagnosticBundle | null;
    transitionFallbackReason?: TransitionFallbackReason | null;
}
