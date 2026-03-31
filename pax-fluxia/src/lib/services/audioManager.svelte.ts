import { log } from "$lib/utils/logger";
import { getFilesForSoundType, type SoundFileEntry } from "$lib/config/soundManifest";
import { GAME_CONFIG } from "$lib/config/game.config";
import { CATEGORY_KEYS } from "$lib/config/categoryThemes";

const AUDIO_STORAGE_KEY = 'pax-fluxia-audio-config';

/** Save all AUDIO_* GAME_CONFIG keys to localStorage */
function persistAudioConfig(): void {
    if (typeof window === 'undefined') return;
    try {
        const audioKeys = CATEGORY_KEYS.audio;
        const snapshot: Record<string, unknown> = {};
        for (const key of audioKeys) {
            snapshot[key] = (GAME_CONFIG as any)[key];
        }
        localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(snapshot));
    } catch { /* ignore quota errors */ }
}

/** Load persisted audio config from localStorage into GAME_CONFIG */
function loadAudioConfig(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
        if (!stored) return false;
        const parsed = JSON.parse(stored);
        for (const [key, val] of Object.entries(parsed)) {
            if (key in GAME_CONFIG) {
                (GAME_CONFIG as any)[key] = val;
            }
        }
        return true;
    } catch { return false; }
}

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

/** Human-readable labels for UI */
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

interface SoundConfig {
    file: string;
    defaultVolume: number;
    poolSize: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
    click: { file: "ui/click.wav", defaultVolume: 0.3, poolSize: 3 },
    move: { file: "move/move.wav", defaultVolume: 0.5, poolSize: 5 },
    attack: { file: "attack/attack.wav", defaultVolume: 0.3, poolSize: 10 },
    chat: { file: "ui/chat.wav", defaultVolume: 0.6, poolSize: 2 },
    tick: { file: "tick/tick.wav", defaultVolume: 0.4, poolSize: 3 },
    play: { file: "ui/PLAY.WAV", defaultVolume: 0.6, poolSize: 1 },
    lose: { file: "gameloss/lose.ogg", defaultVolume: 0.6, poolSize: 1 },
    win: { file: "gamewin/win.ogg", defaultVolume: 0.6, poolSize: 1 },
    new_player: { file: "ui/new_player.ogg", defaultVolume: 0.8, poolSize: 2 },
    conquest: { file: "conquest/mixkit-fast-small-sweep-transition-166.wav", defaultVolume: 0.8, poolSize: 2 },
    conquest_retreat: { file: "conquest/SWSH_Swish Fused Small 04_RSCPC_PX.wav", defaultVolume: 0.7, poolSize: 2 },
    conquest_scatter: { file: "conquest/WHSH_Whoosh Plasma 04_RSCPC_SFEW.wav", defaultVolume: 0.7, poolSize: 2 },
    conquest_complete: { file: "conquest/SWSH_Swish Crisp Large 01_RSCPC_PX.wav", defaultVolume: 0.8, poolSize: 2 },
    starloss: { file: "starloss/mixkit-arcade-mechanical-bling-210.wav", defaultVolume: 0.6, poolSize: 2 },
};

/** All sound type keys, exported for UI iteration */
export const ALL_SOUND_TYPES: SoundType[] = Object.keys(SOUND_CONFIGS) as SoundType[];

// ── Config Key Helpers ──────────────────────────────────────────────────────
// Convert between SoundType and GAME_CONFIG key names.
// SoundType "conquest_retreat" → config key suffix "CONQUEST_RETREAT"

function soundTypeToSuffix(type: SoundType): string {
    return type.toUpperCase();
}

function volKey(type: SoundType): keyof typeof GAME_CONFIG {
    return `AUDIO_VOL_${soundTypeToSuffix(type)}` as keyof typeof GAME_CONFIG;
}

function fileKey(type: SoundType): keyof typeof GAME_CONFIG {
    return `AUDIO_FILE_${soundTypeToSuffix(type)}` as keyof typeof GAME_CONFIG;
}

function offsetKey(type: SoundType): keyof typeof GAME_CONFIG {
    return `AUDIO_OFFSET_${soundTypeToSuffix(type)}` as keyof typeof GAME_CONFIG;
}

// ── Legacy Migration ────────────────────────────────────────────────────────

const LEGACY_STORAGE_PREFIX = "pax-audio";

function migrateLegacyAudioSettings(): boolean {
    if (typeof window === "undefined") return false;

    // Check if legacy keys exist
    const legacyVol = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-volume`);
    if (legacyVol === null) return false; // No legacy data

    log.sys("AudioManager", "Migrating legacy pax-audio-* localStorage keys to GAME_CONFIG...");

    // Master volume
    const savedVol = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-volume`);
    if (savedVol !== null) GAME_CONFIG.AUDIO_MASTER_VOLUME = parseFloat(savedVol);

    // Muted
    const savedMute = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-muted`);
    if (savedMute !== null) GAME_CONFIG.AUDIO_MUTED = savedMute === "true";

    // Separate conquest sounds
    const savedSepConquest = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-separate-conquest`);
    if (savedSepConquest !== null) GAME_CONFIG.AUDIO_SEPARATE_CONQUEST = savedSepConquest === "true";

    // Per-sound volumes, files, offsets
    for (const type of ALL_SOUND_TYPES) {
        const savedTypeVol = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-vol-${type}`);
        if (savedTypeVol !== null) {
            (GAME_CONFIG as any)[volKey(type)] = parseFloat(savedTypeVol);
        }

        const savedFile = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-file-${type}`);
        if (savedFile !== null) {
            (GAME_CONFIG as any)[fileKey(type)] = savedFile;
        }

        const savedOffset = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}-offset-${type}`);
        if (savedOffset !== null) {
            (GAME_CONFIG as any)[offsetKey(type)] = parseFloat(savedOffset);
        }
    }

    // Clean up legacy keys
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-volume`);
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-muted`);
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-separate-conquest`);
    for (const type of ALL_SOUND_TYPES) {
        localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-vol-${type}`);
        localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-file-${type}`);
        localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-offset-${type}`);
    }
    // Also clean legacy theme storage
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-themes`);
    localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}-selected-theme`);

    log.sys("AudioManager", "Legacy migration complete — old pax-audio-* keys removed");
    return true;
}

// ── Audio Theme Type (kept for backward compat / import) ────────────────────

export interface AudioTheme {
    name: string;
    created: string;
    masterVolume: number;
    muted: boolean;
    soundVolumes: Record<SoundType, number>;
    soundFiles: Record<SoundType, string>;
    builtIn?: boolean;
}

// ── AudioManager ────────────────────────────────────────────────────────────
// Now reads/writes GAME_CONFIG for all audio settings.
// Reactive $state mirrors are synced from GAME_CONFIG on init and on every set.

class AudioManager {
    private pools: Map<SoundType, HTMLAudioElement[]> = new Map();
    private lastPlayTime: Map<SoundType, number> = new Map();
    private initialized: boolean = false;
    /** Sound types with missing/unplayable files — silently skipped */
    private disabledSounds: Set<SoundType> = new Set();

    // ── Reactive state (mirrors of GAME_CONFIG for Svelte binding) ──
    public masterVolume = $state(0.5);
    public muted = $state(false);
    /** Per-sound volumes (0–1), user-adjustable */
    public soundVolumes = $state<Record<SoundType, number>>(
        Object.fromEntries(
            ALL_SOUND_TYPES.map(t => [t, SOUND_CONFIGS[t].defaultVolume])
        ) as Record<SoundType, number>
    );
    /** Per-sound file assignments (path relative to /sounds/) */
    public soundFiles = $state<Record<SoundType, string>>(
        Object.fromEntries(
            ALL_SOUND_TYPES.map(t => [t, SOUND_CONFIGS[t].file])
        ) as Record<SoundType, string>
    );
    /** Per-sound start offset in seconds (skip ramp-up) */
    public soundOffsets = $state<Record<SoundType, number>>(
        Object.fromEntries(
            ALL_SOUND_TYPES.map(t => [t, 0])
        ) as Record<SoundType, number>
    );
    /** When true, conquest plays subtype-specific sound; when false, plays generic 'conquest' */
    public separateConquestSounds = $state(true);
    /** Available audio themes (legacy — now use category themes) */
    public savedThemes = $state<AudioTheme[]>([]);
    /** Currently selected theme name */
    public selectedThemeName = $state("");

    // ── Init ──
    init() {
        if (this.initialized || typeof window === "undefined") return;

        // Migrate legacy pax-audio-* keys to GAME_CONFIG if present
        migrateLegacyAudioSettings();

        // Load persisted audio config from localStorage
        loadAudioConfig();

        // Sync reactive state from GAME_CONFIG
        this.syncFromConfig();

        // Preload sound pools
        for (const type of ALL_SOUND_TYPES) {
            this.rebuildPool(type);
        }

        this.initialized = true;
        log.sys("AudioManager", `Initialized: master=${this.masterVolume}, muted=${this.muted}, ${ALL_SOUND_TYPES.length} sound types (via GAME_CONFIG)`);
    }

    /**
     * Pull all audio reactive state from GAME_CONFIG.
     * Called on init and when themes are applied externally.
     */
    syncFromConfig() {
        this.masterVolume = GAME_CONFIG.AUDIO_MASTER_VOLUME;
        this.muted = GAME_CONFIG.AUDIO_MUTED;
        this.separateConquestSounds = GAME_CONFIG.AUDIO_SEPARATE_CONQUEST;

        for (const type of ALL_SOUND_TYPES) {
            this.soundVolumes[type] = (GAME_CONFIG as any)[volKey(type)] as number;
            this.soundFiles[type] = (GAME_CONFIG as any)[fileKey(type)] as string;
            this.soundOffsets[type] = (GAME_CONFIG as any)[offsetKey(type)] as number;
        }

        // Rebuild pools if already initialized (file may have changed)
        if (this.initialized) {
            for (const type of ALL_SOUND_TYPES) {
                this.rebuildPool(type);
            }
            this.updatePoolVolumes();
        }
    }

    // ── Pool Management ──

    private rebuildPool(type: SoundType) {
        const config = SOUND_CONFIGS[type];
        const filePath = this.soundFiles[type];
        const pool: HTMLAudioElement[] = [];
        const url = `/sounds/${filePath}`;
        for (let i = 0; i < config.poolSize; i++) {
            const audio = new Audio(url);
            audio.volume = this.getEffectiveVolume(type);
            pool.push(audio);
        }
        this.pools.set(type, pool);
    }

    // ── Helpers ──
    private getEffectiveVolume(type: SoundType): number {
        return this.soundVolumes[type] * this.masterVolume;
    }

    private updatePoolVolumes() {
        for (const [type, pool] of this.pools.entries()) {
            const vol = this.getEffectiveVolume(type);
            pool.forEach(a => { a.volume = vol; });
        }
    }

    // ── Public API ──

    play(type: SoundType, coalesceWindowMs: number = 0) {
        if (!this.initialized || this.muted) return;

        const now = performance.now();
        if (coalesceWindowMs > 0) {
            const lastTime = this.lastPlayTime.get(type) || 0;
            if (now - lastTime < coalesceWindowMs) return;
        }
        this.lastPlayTime.set(type, now);

        const pool = this.pools.get(type);
        if (!pool) return;

        // Skip sounds with missing/unplayable files
        if (this.disabledSounds.has(type)) return;

        const audio = pool.find(a => a.paused || a.ended);
        if (audio) {
            audio.volume = this.getEffectiveVolume(type);
            audio.currentTime = this.soundOffsets[type] || 0;
            audio.play().catch(e => {
                if (e.name === 'NotSupportedError' || e.name === 'NotAllowedError') {
                    // Missing file or browser restriction — disable silently
                    if (e.name === 'NotSupportedError') this.disabledSounds.add(type);
                } else {
                    log.error("AudioManager", `Play error for ${type}`, e);
                }
            });
        }
    }

    /** Preview a sound at its current volume (ignores coalesce) */
    preview(type: SoundType) {
        if (!this.initialized) return;
        // Temporarily unmute for preview
        const wasMuted = this.muted;
        if (wasMuted) this.muted = false;
        this.play(type);
        if (wasMuted) this.muted = true;
    }

    setMasterVolume(volume: number) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        GAME_CONFIG.AUDIO_MASTER_VOLUME = this.masterVolume;
        this.updatePoolVolumes();
        persistAudioConfig();
    }

    setSoundVolume(type: SoundType, volume: number) {
        this.soundVolumes[type] = Math.max(0, Math.min(1, volume));
        (GAME_CONFIG as any)[volKey(type)] = this.soundVolumes[type];
        // Update the pool for this sound type
        const pool = this.pools.get(type);
        if (pool) {
            const vol = this.getEffectiveVolume(type);
            pool.forEach(a => { a.volume = vol; });
        }
        persistAudioConfig();
    }

    /** Change which audio file is used for a sound type */
    setSoundFile(type: SoundType, filePath: string) {
        const oldFile = this.soundFiles[type];
        this.soundFiles[type] = filePath;
        (GAME_CONFIG as any)[fileKey(type)] = filePath;

        // File-linked offset: when file changes, reset offset to 0
        // (old offset was tuned for the old file)
        if (oldFile !== filePath) {
            this.soundOffsets[type] = 0;
            (GAME_CONFIG as any)[offsetKey(type)] = 0;
        }

        // Rebuild audio pool with new file — re-enable in case it was disabled
        this.disabledSounds.delete(type);
        if (this.initialized) {
            this.rebuildPool(type);
        }
        log.sys("AudioManager", `Changed ${type} file → ${filePath}`);
        persistAudioConfig();
    }

    /** Get available files for a sound type from the manifest */
    getAvailableFiles(type: SoundType): SoundFileEntry[] {
        return getFilesForSoundType(type);
    }

    /** Set per-sound start offset in seconds (trims ramp-up) */
    setSoundOffset(type: SoundType, offsetSec: number) {
        this.soundOffsets[type] = Math.max(0, offsetSec);
        (GAME_CONFIG as any)[offsetKey(type)] = this.soundOffsets[type];
        persistAudioConfig();
    }

    /** Toggle separate conquest sounds (subtype-specific vs generic) */
    setSeparateConquestSounds(value: boolean) {
        this.separateConquestSounds = value;
        GAME_CONFIG.AUDIO_SEPARATE_CONQUEST = value;
        persistAudioConfig();
    }

    toggleMute() {
        this.muted = !this.muted;
        GAME_CONFIG.AUDIO_MUTED = this.muted;

        if (this.muted) {
            for (const pool of this.pools.values()) {
                pool.forEach(a => { a.pause(); a.currentTime = 0; });
            }
        }
        persistAudioConfig();
    }

    /** Reset all volumes and file assignments to defaults */
    resetDefaults() {
        this.masterVolume = 0.5;
        this.muted = false;
        GAME_CONFIG.AUDIO_MASTER_VOLUME = 0.5;
        GAME_CONFIG.AUDIO_MUTED = false;
        GAME_CONFIG.AUDIO_SEPARATE_CONQUEST = true;
        this.separateConquestSounds = true;

        for (const type of ALL_SOUND_TYPES) {
            this.soundVolumes[type] = SOUND_CONFIGS[type].defaultVolume;
            this.soundFiles[type] = SOUND_CONFIGS[type].file;
            this.soundOffsets[type] = 0;
            (GAME_CONFIG as any)[volKey(type)] = this.soundVolumes[type];
            (GAME_CONFIG as any)[fileKey(type)] = this.soundFiles[type];
            (GAME_CONFIG as any)[offsetKey(type)] = 0;
        }
        // Rebuild all pools
        if (this.initialized) {
            for (const type of ALL_SOUND_TYPES) {
                this.rebuildPool(type);
            }
        }
        this.updatePoolVolumes();
        persistAudioConfig();
        log.sys("AudioManager", "Reset all volumes and files to defaults");
    }

    /** Get default volume for a sound type */
    getDefaultVolume(type: SoundType): number {
        return SOUND_CONFIGS[type].defaultVolume;
    }

    /** Get default file for a sound type */
    getDefaultFile(type: SoundType): string {
        return SOUND_CONFIGS[type].file;
    }

    // ── Audio Theme API (kept for backward compat) ──
    // These now work through GAME_CONFIG. The category theme system is the
    // primary mechanism; these methods exist so existing UI code doesn't break.

    /** Export current audio settings as a named theme */
    exportAudioTheme(name: string): AudioTheme {
        return {
            name,
            created: new Date().toISOString(),
            masterVolume: this.masterVolume,
            muted: this.muted,
            soundVolumes: { ...this.soundVolumes },
            soundFiles: { ...this.soundFiles },
        };
    }

    /**
     * Apply an audio theme — sets all audio GAME_CONFIG keys.
     * File-linked offsets: offsets only apply when the theme's file matches.
     */
    applyAudioTheme(theme: AudioTheme) {
        this.masterVolume = theme.masterVolume;
        this.muted = theme.muted;
        GAME_CONFIG.AUDIO_MASTER_VOLUME = theme.masterVolume;
        GAME_CONFIG.AUDIO_MUTED = theme.muted;

        for (const type of ALL_SOUND_TYPES) {
            if (theme.soundVolumes[type] !== undefined) {
                this.soundVolumes[type] = theme.soundVolumes[type];
                (GAME_CONFIG as any)[volKey(type)] = theme.soundVolumes[type];
            }
            if (theme.soundFiles[type] !== undefined) {
                const newFile = theme.soundFiles[type];
                const oldFile = this.soundFiles[type];
                this.soundFiles[type] = newFile;
                (GAME_CONFIG as any)[fileKey(type)] = newFile;

                // File-linked offset: only apply offset if file matches
                if (newFile !== oldFile) {
                    this.soundOffsets[type] = 0;
                    (GAME_CONFIG as any)[offsetKey(type)] = 0;
                }
            }
        }

        // Rebuild all pools and update volumes
        if (this.initialized) {
            for (const type of ALL_SOUND_TYPES) {
                this.rebuildPool(type);
            }
        }

        this.selectedThemeName = theme.name;
        log.sys("AudioManager", `Applied audio theme: ${theme.name}`);
    }

    /** Save current settings as a named theme (legacy — prefer category themes) */
    saveAudioTheme(name: string): AudioTheme {
        const theme = this.exportAudioTheme(name);
        this.savedThemes = this.savedThemes.filter(t => t.name !== name);
        this.savedThemes = [theme, ...this.savedThemes];
        this.selectedThemeName = name;
        log.sys("AudioManager", `Saved audio theme: ${name}`);
        return theme;
    }

    /** Delete a saved audio theme */
    deleteAudioTheme(name: string) {
        this.savedThemes = this.savedThemes.filter(t => t.name !== name);
        if (this.selectedThemeName === name) {
            this.selectedThemeName = "";
        }
        log.sys("AudioManager", `Deleted audio theme: ${name}`);
    }

    /** Get the built-in "Default" audio theme */
    getDefaultTheme(): AudioTheme {
        return {
            name: "Default",
            created: "2026-01-01T00:00:00.000Z",
            masterVolume: 0.5,
            muted: false,
            builtIn: true,
            soundVolumes: Object.fromEntries(
                ALL_SOUND_TYPES.map(t => [t, SOUND_CONFIGS[t].defaultVolume])
            ) as Record<SoundType, number>,
            soundFiles: Object.fromEntries(
                ALL_SOUND_TYPES.map(t => [t, SOUND_CONFIGS[t].file])
            ) as Record<SoundType, string>,
        };
    }

    /** All themes including built-in Default */
    getAllThemes(): AudioTheme[] {
        return [this.getDefaultTheme(), ...this.savedThemes];
    }
}

export const audioManager = new AudioManager();
