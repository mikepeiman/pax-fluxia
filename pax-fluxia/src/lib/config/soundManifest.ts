// ============================================================================
// Sound Manifest — Auto-generated list of available audio files
// Maps sound categories to available files in static/sounds/
//
// To regenerate: run `bun scripts/generate-sound-manifest.ts`
// Or add files to static/sounds/<category>/ and update this list manually.
// ============================================================================

export interface SoundFileEntry {
    /** Display name (filename without extension) */
    label: string;
    /** Path relative to /sounds/ (e.g. "tick/snap-close-02.wav") */
    path: string;
    /** Category directory this file lives in */
    category: string;
}

/**
 * All available sound files grouped by category directory.
 * Categories map to SoundType or are available as general alternatives.
 */
export const SOUND_MANIFEST: Record<string, SoundFileEntry[]> = {
    attack: [
        { label: "attack", path: "attack/attack.wav", category: "attack" },
    ],
    move: [
        { label: "move", path: "move/move.wav", category: "move" },
    ],
    tick: [
        { label: "tick", path: "tick/tick.wav", category: "tick" },
        { label: "game-ball-tap", path: "tick/mixkit-game-ball-tap-2073.wav", category: "tick" },
        { label: "snap-close-02", path: "tick/snap-close-02.wav", category: "tick" },
        { label: "snap-close-03", path: "tick/snap-close-03.wav", category: "tick" },
        { label: "snap-close-05", path: "tick/snap-close-05.wav", category: "tick" },
        { label: "snap-close-06", path: "tick/snap-close-06.wav", category: "tick" },
        { label: "snap-close-15", path: "tick/snap-close-15.wav", category: "tick" },
    ],
    conquest: [
        { label: "fast-small-sweep", path: "conquest/mixkit-fast-small-sweep-transition-166.wav", category: "conquest" },
        { label: "Swish Crisp Large 01", path: "conquest/SWSH_Swish Crisp Large 01_RSCPC_PX.wav", category: "conquest" },
        { label: "Swish Fused Large 08", path: "conquest/SWSH_Swish Fused Large 08_RSCPC_PX.wav", category: "conquest" },
        { label: "Swish Fused Large 15", path: "conquest/SWSH_Swish Fused Large 15_RSCPC_PX.wav", category: "conquest" },
        { label: "Swish Fused Small 04", path: "conquest/SWSH_Swish Fused Small 04_RSCPC_PX.wav", category: "conquest" },
        { label: "Whoosh Plasma 04", path: "conquest/WHSH_Whoosh Plasma 04_RSCPC_SFEW.wav", category: "conquest" },
    ],
    starloss: [
        { label: "arcade-mechanical-bling", path: "starloss/mixkit-arcade-mechanical-bling-210.wav", category: "starloss" },
    ],
    gamewin: [
        { label: "win", path: "gamewin/win.ogg", category: "gamewin" },
        { label: "casino-bling-achievement", path: "gamewin/mixkit-casino-bling-achievement-2067.wav", category: "gamewin" },
    ],
    gameloss: [
        { label: "lose", path: "gameloss/lose.ogg", category: "gameloss" },
        { label: "Impact - Cher Effect", path: "gameloss/Impact - Cher Effect.wav", category: "gameloss" },
    ],
    ui: [
        { label: "click", path: "ui/click.wav", category: "ui" },
        { label: "chat", path: "ui/chat.wav", category: "ui" },
        { label: "PLAY", path: "ui/PLAY.WAV", category: "ui" },
        { label: "new_player", path: "ui/new_player.ogg", category: "ui" },
        { label: "Braam - Retro Pulse", path: "ui/Braam - Retro Pulse.wav", category: "ui" },
        { label: "Retro - Chip Power", path: "ui/Retro - Chip Power.wav", category: "ui" },
        { label: "Retro - Shuriken Laser", path: "ui/Retro - Shuriken Laser.wav", category: "ui" },
        { label: "Ploppy Plop", path: "ui/Short - Ploppy Plop.wav", category: "ui" },
        { label: "Mini Impact", path: "ui/Sub - Mini Impact.wav", category: "ui" },
        { label: "HITS-05", path: "ui/Generdyn - HITS - 05.wav", category: "ui" },
        { label: "HITS-06", path: "ui/Generdyn - HITS - 06.wav", category: "ui" },
        { label: "HITS-10", path: "ui/Generdyn - HITS - 10.wav", category: "ui" },
        { label: "HITS-13", path: "ui/Generdyn - HITS - 13.wav", category: "ui" },
        { label: "casino-bling-achievement", path: "ui/mixkit-casino-bling-achievement-2067.wav", category: "ui" },
        { label: "video-game-alert-sweep", path: "ui/mixkit-explainer-video-game-alert-sweep-236.wav", category: "ui" },
        { label: "extra-bonus", path: "ui/mixkit-extra-bonus-in-a-video-game-2045.wav", category: "ui" },
        { label: "player-jumping", path: "ui/mixkit-player-jumping-in-a-video-game-2043.wav", category: "ui" },
        { label: "positive-notification", path: "ui/mixkit-quick-positive-video-game-notification-interface-265.wav", category: "ui" },
        { label: "health-recharge", path: "ui/mixkit-video-game-health-recharge-2837.wav", category: "ui" },
        { label: "retro-click", path: "ui/mixkit-video-game-retro-click-237.wav", category: "ui" },
    ],
};

/**
 * Flat list of ALL available sound files across all categories.
 */
export const ALL_SOUND_FILES: SoundFileEntry[] = Object.values(SOUND_MANIFEST).flat();

/**
 * Map from SoundType to which manifest categories are relevant.
 * Each SoundType can pick from its primary category + the "ui" general pool.
 */
export const SOUND_TYPE_CATEGORIES: Record<string, string[]> = {
    click: ["ui"],
    move: ["move", "ui"],
    attack: ["attack", "ui"],
    chat: ["ui"],
    tick: ["tick", "ui"],
    play: ["ui"],
    lose: ["gameloss", "ui"],
    win: ["gamewin", "ui"],
    new_player: ["ui"],
    conquest: ["conquest", "ui"],
    conquest_retreat: ["conquest", "ui"],
    conquest_scatter: ["conquest", "ui"],
    conquest_complete: ["conquest", "ui"],
    starloss: ["starloss", "ui"],
};

/**
 * Get available sound files for a given SoundType.
 * Returns files from relevant categories.
 */
export function getFilesForSoundType(soundType: string): SoundFileEntry[] {
    const categories = SOUND_TYPE_CATEGORIES[soundType] ?? ["ui"];
    const files: SoundFileEntry[] = [];
    for (const cat of categories) {
        files.push(...(SOUND_MANIFEST[cat] ?? []));
    }
    return files;
}

// ── Build-time glob discovery (REMOVED) ─────────────────────────────────────
// The previous import.meta.glob('/static/sounds/**/*') caused 404 errors
// because Vite doesn't serve public dir files through the module system.
// The hardcoded SOUND_MANIFEST above is the source of truth.
