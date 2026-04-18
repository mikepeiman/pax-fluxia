// ============================================================================
// Classic Pax Galaxia Map Parser
// ============================================================================
//
// Parses the legacy .txt map format from the original Pax Galaxia game.
//
// Format:
//   Header: players=N, stars=N, registered=N, scalex, scaley, dx, dy
//   Star lines: TYPE-OWNER-sSHIPS-xX-yY-nCONN_COUNT-sup0-blo0 conn1 conn2 ...
//
//   TYPE letters: V=grey(void), Y=yellow, G=green, B=blue, R=red, O=orange, T=teal
//                 Numeric types (2, 3, etc.) are treated as grey/neutral
//   OWNER: 0=neutral, A-F=player factions
//   sSHIPS: starting ship count (e.g., s0, s2, s20, s100)
//   Connections: space-separated 0-based indices of connected stars
// ============================================================================

import { createLegacyClassicMap, importLegacyMapDefinition } from '@pax/common/maps';
import type { MapDefinition } from '$lib/types/map.types';
import type { StarType } from '$lib/types/game.types';

/** Map classic type letters to Pax Fluxia star types */
const TYPE_MAP: Record<string, StarType> = {
    'V': 'grey',     // Void
    'Y': 'yellow',
    'G': 'green',
    'B': 'blue',
    'R': 'red',
    'O': 'grey',     // Orange → map to grey (no orange in Pax Fluxia)
    'T': 'grey',     // Teal → map to grey (no teal in Pax Fluxia)
};

/** Map owner letters to faction IDs (used as ownerId) */
const FACTION_MAP: Record<string, string> = {
    '0': 'neutral',
    'A': 'player-A',
    'B': 'player-B',
    'C': 'player-C',
    'D': 'player-D',
    'E': 'player-E',
    'F': 'player-F',
};

/**
 * Parse a classic Pax Galaxia .txt map into a MapDefinition.
 * 
 * @param name - Display name for the map
 * @param text - Raw .txt file contents
 * @returns MapDefinition compatible with gameStore
 */
export function parseClassicMap(name: string, text: string): MapDefinition {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    // Parse header
    let playerCount = 0;
    let headerEnd = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('players=')) {
            playerCount = parseInt(line.split('=')[1], 10);
        } else if (line.startsWith('stars=') || line.startsWith('registered=') ||
            line.startsWith('scalex=') || line.startsWith('scaley=') ||
            line.startsWith('dx=') || line.startsWith('dy=')) {
            // Skip header lines
        } else {
            // First non-header line = first star
            headerEnd = i;
            break;
        }
    }

    const starLines = lines.slice(headerEnd);

    // Parse stars
    const stars: MapDefinition['stars'] = [];
    const connectionIndices: number[][] = []; // per-star connection indices

    // Regex: TYPE-OWNER-sSHIPS-xX-yY-nCONNS-sup0-blo0
    const starRegex = /^([A-Z0-9])-([A-Z0-9])-s(\d+)-x(\d+)-y(\d+)-n(\d+)-sup\d+-blo\d+(?:\s+(.*))?$/;

    for (let i = 0; i < starLines.length; i++) {
        const match = starLines[i].match(starRegex);
        if (!match) {
            console.warn(`[ClassicMapParser] Skipping unrecognized line ${headerEnd + i}: "${starLines[i]}"`);
            continue;
        }

        const [, typeChar, ownerChar, shipsStr, xStr, yStr, , connStr] = match;
        const starType = TYPE_MAP[typeChar] || 'grey';
        const ownerId = FACTION_MAP[ownerChar] || 'neutral';
        const activeShips = parseInt(shipsStr, 10);
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);

        stars.push({
            id: `star-${i}`,
            x,
            y,
            ownerId,
            starType,
            activeShips,
        });

        // Parse connection indices
        const conns = connStr
            ? connStr.trim().split(/\s+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n))
            : [];
        connectionIndices.push(conns);
    }

    // Build connections (deduplicated, bidirectional)
    const connSet = new Set<string>();
    const connections: MapDefinition['connections'] = [];

    for (let i = 0; i < connectionIndices.length; i++) {
        for (const j of connectionIndices[i]) {
            if (j < 0 || j >= stars.length) continue;
            const key = [Math.min(i, j), Math.max(i, j)].join('|');
            if (!connSet.has(key)) {
                connSet.add(key);
                const s1 = stars[i];
                const s2 = stars[j];
                const distance = Math.sqrt((s1.x - s2.x) ** 2 + (s1.y - s2.y) ** 2);
                connections.push({
                    id: `lane-${connections.length}-${key.replace(/\|/g, '-')}`,
                    sourceId: `star-${i}`,
                    targetId: `star-${j}`,
                    distance,
                });
            }
        }
    }

    // Extract unique factions for metadata
    const factions = new Set(stars.map(s => s.ownerId).filter(id => id !== 'neutral'));

    return importLegacyMapDefinition(
        createLegacyClassicMap(name, stars, connections),
        {
            kind: 'classic',
            sourceId: name,
        },
    );
}

/**
 * Get the set of unique faction IDs from a parsed classic map.
 * Useful for remapping factions to actual player IDs at game start.
 */
export function getClassicMapFactions(map: MapDefinition): string[] {
    const factions = new Set<string>();
    for (const star of map.stars) {
        if (star.ownerId && star.ownerId !== 'neutral') {
            factions.add(star.ownerId);
        }
    }
    return Array.from(factions).sort();
}
