/**
 * The sound-event vocabulary: the list of sound types and their visible labels.
 *
 * A LEAF module on purpose. These used to live in `audioManager.svelte.ts`
 * alongside the pools, the runes state and the DOM Audio objects — so anything
 * wanting merely to NAME a sound event had to import the whole audio subsystem.
 * The settings registry needs exactly that (it declares three controls per sound
 * type, so search and infotips know they exist), and it must stay importable
 * from plain scripts and tests.
 *
 * `audioManager` re-exports these, so existing importers are unaffected and
 * there is still one list.
 */

export type SoundType =
    | "click"
    | "move"
    | "attack"
    | "chat"
    | "tick"
    | "play"
    | "lose"
    | "win"
    | "new_player"
    | "conquest"
    | "conquest_retreat"
    | "conquest_scatter"
    | "conquest_complete"
    | "starloss";

/** Human-readable labels for UI. */
export const SOUND_LABELS: Record<SoundType, string> = {
    click: "UI Click",
    move: "Move Order",
    attack: "Attack Order",
    chat: "Chat Message",
    tick: "Game Tick",
    play: "Game Start",
    lose: "Defeat",
    win: "Victory",
    new_player: "Player Joined",
    conquest: "Conquest (Any)",
    conquest_retreat: "Conquest: Retreat",
    conquest_scatter: "Conquest: Scatter",
    conquest_complete: "Conquest: Complete",
    starloss: "Star Lost",
};

/**
 * All sound types, in UI order. This is the ORDER the audio section renders, so
 * it is also the order the registry declares — the two cannot disagree.
 */
export const ALL_SOUND_TYPES: SoundType[] = Object.keys(SOUND_LABELS) as SoundType[];

/**
 * The GAME_CONFIG suffix for a sound type: `conquest_retreat` -> `CONQUEST_RETREAT`.
 * The per-sound config keys are `AUDIO_VOL_<suffix>`, `AUDIO_FILE_<suffix>` and
 * `AUDIO_OFFSET_<suffix>`, built by template literal at both the read site
 * (audioManager) and the control site (ControlsSection-Audio).
 */
export function soundTypeConfigSuffix(type: SoundType): string {
    return type.toUpperCase();
}
