import type { TerritoryConquestEvent } from '../contracts/OwnershipContracts';
import { filePrefixFromIsoTimestamp } from './snapshotExport';

const INVALID_FILENAME_CHARS_RE = /[<>:"/\\|?*\x00-\x1F]/g;
const FILE_LABEL_LIMIT = 72;

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

function abbreviateOwnerToken(ownerId: string): string {
    if (ownerId === 'human-player') return 'hp';
    if (ownerId === 'world') return 'w';
    const aiMatch = /^ai-(\d+)$/i.exec(ownerId);
    if (aiMatch) return `a${aiMatch[1]}`;
    const cleaned = ownerId.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
    return cleaned.slice(0, 8) || 'u';
}

function abbreviateStarToken(starId: string): string {
    const starMatch = /^star-(\d+)$/i.exec(starId);
    if (starMatch) return `S${starMatch[1]}`;
    const cleaned = sanitizeConquestLabelForFilename(starId)
        .replace(/[_-]+/g, '')
        .toUpperCase();
    return cleaned.slice(0, 12) || 'S';
}

function formatConquestEventFileCode(event: TerritoryConquestEvent): string {
    const attackers = listAttackerStarIds(event);
    const target = abbreviateStarToken(event.starId);
    if (attackers.length === 0) {
        return `${abbreviateOwnerToken(event.previousOwner)}-to-${abbreviateOwnerToken(event.newOwner)}_${target}`;
    }
    const attackerLead = abbreviateStarToken(attackers[0]!);
    const attackerToken =
        attackers.length === 1
            ? attackerLead
            : `${attackerLead}+${attackers.length - 1}`;
    return `${attackerToken}-to-${target}`;
}

function collapseConquestLabels(labels: readonly string[], forFile: boolean): string {
    if (labels.length === 0) return forFile ? 'cq' : 'conquest';
    if (labels.length === 1) return labels[0]!;

    const joined = forFile ? labels.join('__') : labels.join(' + ');
    const limit = forFile ? FILE_LABEL_LIMIT : 120;
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
        conquestEvents.map((event) => formatConquestEventFileCode(event)),
        true,
    );
    return sanitizeConquestLabelForFilename(`cq_${label}`);
}

function canonicalizeConquestEventForHash(event: TerritoryConquestEvent): string {
    const attackers = listAttackerStarIds(event).join(',');
    const scatterTargets = (event.scatterTargetIds ?? []).join(',');
    const scatterCounts = (event.scatterShipCounts ?? []).join(',');
    const transfers = (event.attackerShipTransfers ?? []).join(',');
    return [
        event.tick ?? '',
        event.atMs ?? '',
        event.conquestType ?? '',
        event.previousOwner,
        event.newOwner,
        event.starId,
        event.attackerStarId ?? '',
        attackers,
        scatterTargets,
        scatterCounts,
        transfers,
        event.shipsCaptured ?? '',
        event.shipsDestroyed ?? '',
        event.shipsEscaped ?? '',
        event.shipsTransferred ?? '',
    ].join('|');
}

function fnv1a32(value: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

export function buildConquestCaptureHash(
    timestamp: string,
    transitionId: string,
    conquestEvents: readonly TerritoryConquestEvent[],
): string {
    const hashInput = [
        timestamp,
        transitionId,
        ...conquestEvents.map(canonicalizeConquestEventForHash),
    ].join('||');
    const hash = fnv1a32(hashInput).toString(36).padStart(7, '0');
    return `h${hash.slice(-7)}`;
}

export function buildConquestFilePrefix(
    timestamp: string,
    conquestEvents: readonly TerritoryConquestEvent[],
    transitionId?: string,
): string {
    const base = `${filePrefixFromIsoTimestamp(timestamp)}_${buildConquestEventGroupFileLabel(conquestEvents)}`;
    if (!transitionId) return base;
    return `${base}_${buildConquestCaptureHash(timestamp, transitionId, conquestEvents)}`;
}
