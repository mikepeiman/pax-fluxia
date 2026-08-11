/**
 * settingsNav — the navigation DECISIONS, as data.
 *
 * Kept out of GameSettingsPanel so "what does opening a category show?" is a
 * pure function with a test, not behaviour buried in a click handler that can
 * only be checked by clicking. Same reasoning as the settings registry: the
 * panel is a projection of decisions made here.
 */

/** What a category should show when the user opens it. */
export interface CategoryOpenState {
    /** Show every section in the category at once. */
    showAll: boolean;
    /** The single section to open, or null (All, or a deliberately collapsed body). */
    sectionId: string | null;
}

/**
 * Decide what opening a category reveals.
 *
 * DEFAULT IS "ALL". Opening a category should show what is in it; picking the
 * category's first chip hides every other section behind a choice the user
 * never made. A remembered section is an explicit past choice and still wins.
 *
 * The three states of `remembered`:
 *   - a section id  → the user last chose that section here; restore it.
 *   - `null`        → the user deliberately collapsed the body; keep it closed.
 *   - `undefined`   → no choice yet. Show All.
 *
 * A stale id (a section that no longer exists, e.g. after a registry change)
 * falls back to All rather than to the first chip, for the same reason.
 *
 * A single-chip category has no "All" chip in the UI to toggle back from, so it
 * opens on its one section.
 */
export function resolveCategoryOpenState(
    chipIds: readonly string[],
    remembered: string | null | undefined,
): CategoryOpenState {
    if (typeof remembered === "string" && chipIds.includes(remembered)) {
        return { showAll: false, sectionId: remembered };
    }
    if (remembered === null) {
        return { showAll: false, sectionId: null };
    }
    if (chipIds.length > 1) {
        return { showAll: true, sectionId: null };
    }
    return { showAll: false, sectionId: chipIds[0] ?? null };
}
