import { log } from "$lib/utils/logger";
import { getFilesForSoundType, type SoundFileEntry } from "$lib/config/soundManifest";

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
    conquest: "Star Conquered",
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
    starloss: { file: "starloss/mixkit-arcade-mechanical-bling-210.wav", defaultVolume: 0.6, poolSize: 2 },
};

/** All sound type keys, exported for UI iteration */
export const ALL_SOUND_TYPES: SoundType[] = Object.keys(SOUND_CONFIGS) as SoundType[];

const STORAGE_PREFIX = "pax-audio";

// ── Audio Theme Type ────────────────────────────────────────────────────────

export interface AudioTheme {
    name: string;
    created: string;
    masterVolume: number;
    muted: boolean;
    soundVolumes: Record<SoundType, number>;
    soundFiles: Record<SoundType, string>;
    builtIn?: boolean;
}

const AUDIO_THEMES_KEY = `${STORAGE_PREFIX}-themes`;
const AUDIO_SELECTED_THEME_KEY = `${STORAGE_PREFIX}-selected-theme`;

class AudioManager {
    private pools: Map<SoundType, HTMLAudioElement[]> = new Map();
    private lastPlayTime: Map<SoundType, number> = new Map();
    private initialized: boolean = false;

    // ── Reactive state ──
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
    /** Available audio themes */
    public savedThemes = $state<AudioTheme[]>([]);
    /** Currently selected theme name */
    public selectedThemeName = $state("");

    // ── Init ──
    init() {
        if (this.initialized || typeof window === "undefined") return;

        // Load master settings
        const savedVol = localStorage.getItem(`${STORAGE_PREFIX}-volume`);
        if (savedVol !== null) this.masterVolume = parseFloat(savedVol);

        const savedMute = localStorage.getItem(`${STORAGE_PREFIX}-muted`);
        if (savedMute !== null) this.muted = savedMute === "true";

        // Load per-sound volumes
        for (const type of ALL_SOUND_TYPES) {
            const saved = localStorage.getItem(`${STORAGE_PREFIX}-vol-${type}`);
            if (saved !== null) {
                this.soundVolumes[type] = parseFloat(saved);
            }
        }

        // Load per-sound file assignments
        for (const type of ALL_SOUND_TYPES) {
            const savedFile = localStorage.getItem(`${STORAGE_PREFIX}-file-${type}`);
            if (savedFile !== null) {
                this.soundFiles[type] = savedFile;
            }
        }

        // Load saved themes
        this.savedThemes = this.loadThemesFromStorage();
        const selectedName = localStorage.getItem(AUDIO_SELECTED_THEME_KEY);
        if (selectedName) this.selectedThemeName = selectedName;

        // Preload sound pools
        for (const type of ALL_SOUND_TYPES) {
            this.rebuildPool(type);
        }

        this.initialized = true;
        log.sys("AudioManager", `Initialized: master=${this.masterVolume}, muted=${this.muted}, ${ALL_SOUND_TYPES.length} sound types`);
    }

    // ── Pool Management ──

    private rebuildPool(type: SoundType) {
        const config = SOUND_CONFIGS[type];
        const filePath = this.soundFiles[type];
        const pool: HTMLAudioElement[] = [];
        // Determine full URL: if path contains '/', it's a subdirectory path;
        // otherwise it's a legacy root file
        const url = filePath.includes('/') ? `/sounds/${filePath}` : `/sounds/${filePath}`;
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

    private persistMaster() {
        if (typeof window === "undefined") return;
        localStorage.setItem(`${STORAGE_PREFIX}-volume`, this.masterVolume.toString());
    }

    private persistMute() {
        if (typeof window === "undefined") return;
        localStorage.setItem(`${STORAGE_PREFIX}-muted`, this.muted.toString());
    }

    private persistSoundVolume(type: SoundType) {
        if (typeof window === "undefined") return;
        localStorage.setItem(`${STORAGE_PREFIX}-vol-${type}`, this.soundVolumes[type].toString());
    }

    private persistSoundFile(type: SoundType) {
        if (typeof window === "undefined") return;
        localStorage.setItem(`${STORAGE_PREFIX}-file-${type}`, this.soundFiles[type]);
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

        const audio = pool.find(a => a.paused || a.ended);
        if (audio) {
            audio.volume = this.getEffectiveVolume(type);
            audio.currentTime = 0;
            audio.play().catch(e => {
                if (e.name !== "NotAllowedError") {
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
        this.persistMaster();
        this.updatePoolVolumes();
    }

    setSoundVolume(type: SoundType, volume: number) {
        this.soundVolumes[type] = Math.max(0, Math.min(1, volume));
        this.persistSoundVolume(type);
        // Update the pool for this sound type
        const pool = this.pools.get(type);
        if (pool) {
            const vol = this.getEffectiveVolume(type);
            pool.forEach(a => { a.volume = vol; });
        }
    }

    /** Change which audio file is used for a sound type */
    setSoundFile(type: SoundType, filePath: string) {
        this.soundFiles[type] = filePath;
        this.persistSoundFile(type);
        // Rebuild audio pool with new file
        if (this.initialized) {
            this.rebuildPool(type);
        }
        log.sys("AudioManager", `Changed ${type} file → ${filePath}`);
    }

    /** Get available files for a sound type from the manifest */
    getAvailableFiles(type: SoundType): SoundFileEntry[] {
        return getFilesForSoundType(type);
    }

    toggleMute() {
        this.muted = !this.muted;
        this.persistMute();

        if (this.muted) {
            for (const pool of this.pools.values()) {
                pool.forEach(a => { a.pause(); a.currentTime = 0; });
            }
        }
    }

    /** Reset all volumes and file assignments to defaults */
    resetDefaults() {
        this.masterVolume = 0.5;
        this.muted = false;
        this.persistMaster();
        this.persistMute();

        for (const type of ALL_SOUND_TYPES) {
            this.soundVolumes[type] = SOUND_CONFIGS[type].defaultVolume;
            this.soundFiles[type] = SOUND_CONFIGS[type].file;
            this.persistSoundVolume(type);
            this.persistSoundFile(type);
        }
        // Rebuild all pools
        if (this.initialized) {
            for (const type of ALL_SOUND_TYPES) {
                this.rebuildPool(type);
            }
        }
        this.updatePoolVolumes();
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

    // ── Audio Theme API ──

    private loadThemesFromStorage(): AudioTheme[] {
        try {
            const raw = localStorage.getItem(AUDIO_THEMES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    private persistThemes() {
        if (typeof window === "undefined") return;
        localStorage.setItem(AUDIO_THEMES_KEY, JSON.stringify(this.savedThemes));
    }

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

    /** Apply an audio theme — sets all volumes and file assignments */
    applyAudioTheme(theme: AudioTheme) {
        this.masterVolume = theme.masterVolume;
        this.muted = theme.muted;
        this.persistMaster();
        this.persistMute();

        for (const type of ALL_SOUND_TYPES) {
            if (theme.soundVolumes[type] !== undefined) {
                this.soundVolumes[type] = theme.soundVolumes[type];
                this.persistSoundVolume(type);
            }
            if (theme.soundFiles[type] !== undefined) {
                this.soundFiles[type] = theme.soundFiles[type];
                this.persistSoundFile(type);
            }
        }

        // Rebuild all pools and update volumes
        if (this.initialized) {
            for (const type of ALL_SOUND_TYPES) {
                this.rebuildPool(type);
            }
        }

        this.selectedThemeName = theme.name;
        localStorage.setItem(AUDIO_SELECTED_THEME_KEY, theme.name);
        log.sys("AudioManager", `Applied audio theme: ${theme.name}`);
    }

    /** Save current settings as a named theme */
    saveAudioTheme(name: string): AudioTheme {
        const theme = this.exportAudioTheme(name);
        // Replace if same name exists
        this.savedThemes = this.savedThemes.filter(t => t.name !== name);
        this.savedThemes = [theme, ...this.savedThemes];
        this.persistThemes();
        this.selectedThemeName = name;
        localStorage.setItem(AUDIO_SELECTED_THEME_KEY, name);
        log.sys("AudioManager", `Saved audio theme: ${name}`);
        return theme;
    }

    /** Delete a saved audio theme */
    deleteAudioTheme(name: string) {
        this.savedThemes = this.savedThemes.filter(t => t.name !== name);
        this.persistThemes();
        if (this.selectedThemeName === name) {
            this.selectedThemeName = "";
            localStorage.removeItem(AUDIO_SELECTED_THEME_KEY);
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
