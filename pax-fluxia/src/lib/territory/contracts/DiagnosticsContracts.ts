export interface TerritoryDiagnosticMessage {
    level: 'info' | 'warn' | 'error';
    message: string;
    source: string;
}

export interface TerritoryRuntimeDiagnostics {
    startedAtMs: number;
    finishedAtMs: number;
    messages: TerritoryDiagnosticMessage[];
}
