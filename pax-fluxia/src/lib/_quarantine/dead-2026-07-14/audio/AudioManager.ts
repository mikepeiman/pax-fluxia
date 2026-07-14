// ============================================================================
// AudioManager - No-Op Stub (Tone.js removed — see DECISIONS.md 2026-02-10)
// ============================================================================
// All methods are no-ops. If audio is re-introduced later, use raw Web Audio API.

async function initAudio(): Promise<void> { /* no-op */ }
function playTick(): void { /* no-op */ }
function playOrderIssued(_starIndex: number = 0): void { /* no-op */ }
function playCombat(_intensity: number = 0.5): void { /* no-op */ }
function playConquest(): void { /* no-op */ }
function setVolume(_volume: number): void { /* no-op */ }
function setEnabled(_value: boolean): void { /* no-op */ }
function setTickVolume(_vol: number): void { /* no-op */ }
function setOrderVolume(_vol: number): void { /* no-op */ }
function setCombatVolume(_vol: number): void { /* no-op */ }
function getSettings() {
    return {
        enabled: false,
        masterVolume: 0,
        tickVolume: 0,
        orderVolume: 0,
        combatVolume: 0,
    };
}
function isInitialized(): boolean { return false; }
function dispose(): void { /* no-op */ }

// Export singleton-style access (same API as original)
export const audio = {
    init: initAudio,
    tick: playTick,
    order: playOrderIssued,
    combat: playCombat,
    conquest: playConquest,
    setVolume,
    setEnabled,
    setTickVolume,
    setOrderVolume,
    setCombatVolume,
    getSettings,
    isInitialized,
    dispose,
};

export default audio;
