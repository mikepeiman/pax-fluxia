import type { OwnershipMode } from './OwnershipMode';
import { StarOwnershipSnapshotMode } from './modes/StarOwnershipSnapshotMode';

export const OWNERSHIP_MODES: readonly OwnershipMode[] = [
    new StarOwnershipSnapshotMode(),
];

export const OWNERSHIP_MODE_BY_ID: ReadonlyMap<OwnershipMode['id'], OwnershipMode> =
    new Map(OWNERSHIP_MODES.map((mode) => [mode.id, mode]));
