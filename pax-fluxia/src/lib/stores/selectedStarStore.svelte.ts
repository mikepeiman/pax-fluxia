// ============================================================================
// Selected Star Store — tracks which star the player has clicked for info
// ============================================================================

let selectedStarId: string | null = $state(null);

export const selectedStarStore = {
    get id() { return selectedStarId; },
    select(starId: string) { selectedStarId = starId; },
    deselect() { selectedStarId = null; },
    toggle(starId: string) {
        selectedStarId = selectedStarId === starId ? null : starId;
    }
};
