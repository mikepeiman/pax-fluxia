// ============================================================================
// Ownership Normalization
// ============================================================================

export const NEUTRAL_OWNER_ID = "neutral" as const;

export function normalizeInitialOwnerId(
    ownerId: string | null | undefined,
): string {
    if (typeof ownerId !== "string") return NEUTRAL_OWNER_ID;
    const trimmed = ownerId.trim();
    return trimmed.length > 0 ? trimmed : NEUTRAL_OWNER_ID;
}

export function normalizeUnownedStarsToNeutral<
    T extends { ownerId: string | null | undefined },
>(stars: Iterable<T>): number {
    let normalizedCount = 0;
    for (const star of stars) {
        const normalizedOwnerId = normalizeInitialOwnerId(star.ownerId);
        if (star.ownerId === normalizedOwnerId) continue;
        (star as { ownerId: string }).ownerId = normalizedOwnerId;
        normalizedCount += 1;
    }
    return normalizedCount;
}
