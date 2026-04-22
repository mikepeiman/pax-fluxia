export const MAX_PORTAL_GROUPS = 12;

export const PORTAL_GROUP_IDS = Array.from(
    { length: MAX_PORTAL_GROUPS },
    (_, index) => String(index + 1),
);

export function normalizePortalGroupId(
    value: unknown,
): string | undefined {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value >= 1 && value <= MAX_PORTAL_GROUPS ? String(value) : undefined;
    }

    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return undefined;
    const parsed = Number(trimmed);
    return parsed >= 1 && parsed <= MAX_PORTAL_GROUPS ? String(parsed) : undefined;
}

export function isPortalStarType(value: unknown): value is 'portal' {
    return value === 'portal';
}
