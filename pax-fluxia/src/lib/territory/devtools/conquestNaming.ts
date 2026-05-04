import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import { filePrefixFromIsoTimestamp } from './snapshotExport';

const INVALID_FILENAME_CHARS_RE = /[<>:"/\\|?*\x00-\x1F]/g;

function dedupeNonEmpty(values: ReadonlyArray<string | null | undefined>): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        if (typeof value !== 'string' || value.length === 0) continue;
        if (seen.has(value)) continue;
        seen.add(value);
        result.push(value);
    }
    return result;
}

export function listAttackerStarIds(event: TerritoryConquestEvent): string[] {
    return dedupeNonEmpty([
        event.attackerStarId,
        ...(event.attackerStarIds ?? []),
    ]);
}

function formatAttackerStarToken(event: TerritoryConquestEvent): string {
    const attackerStarIds = listAttackerStarIds(event);
    if (attackerStarIds.length === 0) return 'unknown-star';
    if (attackerStarIds.length === 1) return attackerStarIds[0]!;
    return `${attackerStarIds[0]}+${attackerStarIds.length - 1}`;
}

export function formatConquestEventLabel(event: TerritoryConquestEvent): string {
    return `${formatAttackerStarToken(event)}(${event.newOwner})_conquers_${event.starId}(${event.previousOwner})`;
}

function collapseConquestLabels(labels: readonly string[], forFile: boolean): string {
    if (labels.length === 0) return 'conquest';
    if (labels.length === 1) return labels[0]!;

    const joined = forFile ? labels.join('__') : labels.join(' + ');
    const limit = forFile ? 160 : 120;
    if (joined.length <= limit) return joined;

    const remainderCount = labels.length - 1;
    return forFile
        ? `${labels[0]}__plus-${remainderCount}-more`
        : `${labels[0]} + ${remainderCount} more`;
}

export function formatConquestEventGroupLabel(
    conquestEvents: readonly TerritoryConquestEvent[],
): string {
    return collapseConquestLabels(
        conquestEvents.map((event) => formatConquestEventLabel(event)),
        false,
    );
}

export function sanitizeConquestLabelForFilename(label: string): string {
    return (
        label
            .replace(INVALID_FILENAME_CHARS_RE, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/_+/g, '_')
            .replace(/^\.+|\.+$/g, '')
            .replace(/^[-_]+|[-_]+$/g, '') || 'conquest'
    );
}

export function buildConquestEventGroupFileLabel(
    conquestEvents: readonly TerritoryConquestEvent[],
): string {
    const label = collapseConquestLabels(
        conquestEvents.map((event) => formatConquestEventLabel(event)),
        true,
    );
    return sanitizeConquestLabelForFilename(label);
}

export function buildConquestFilePrefix(
    timestamp: string,
    conquestEvents: readonly TerritoryConquestEvent[],
): string {
    return `${filePrefixFromIsoTimestamp(timestamp)}_${buildConquestEventGroupFileLabel(conquestEvents)}`;
}
