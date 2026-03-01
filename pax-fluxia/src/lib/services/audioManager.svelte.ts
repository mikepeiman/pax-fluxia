import { log } from "$lib/utils/logger";

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
    | "conquest";

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
};

interface SoundConfig {
    file: string;
    defaultVolume: number;
    poolSize: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
    click: { file: "click.wav", defaultVolume: 0.3, poolSize: 3 },
    move: { file: "move.wav", defaultVolume: 0.5, poolSize: 5 },
    attack: { file: "attack.wav", defaultVolume: 0.3, poolSize: 10 },
    chat: { file: "chat.wav", defaultVolume: 0.6, poolSize: 2 },
    tick: { file: "tick.wav", defaultVolume: 0.4, poolSize: 3 },
    play: { file: "PLAY.WAV", defaultVolume: 0.6, poolSize: 1 },
    lose: { file: "lose.ogg", defaultVolume: 0.6, poolSize: 1 },
    win: { file: "win.ogg", defaultVolume: 0.6, poolSize: 1 },
    new_player: { file: "new_player.ogg", defaultVolume: 0.8, poolSize: 2 },
    conquest: { file: "conquest.wav", defaultVolume: 0.8, poolSize: 2 },
};

/** All sound type keys, exported for UI iteration */
export const ALL_SOUND_TYPES: SoundType[] = Object.keys(SOUND_CONFIGS) as SoundType[];

const STORAGE_PREFIX = "pax-audio";

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

        // Preload sound pools
        for (const type of ALL_SOUND_TYPES) {
            const config = SOUND_CONFIGS[type];
            const pool: HTMLAudioElement[] = [];
            for (let i = 0; i < config.poolSize; i++) {
                const audio = new Audio(`/sounds/${config.file}`);
                audio.volume = this.getEffectiveVolume(type);
                pool.push(audio);
            }
            this.pools.set(type, pool);
        }

        this.initialized = true;
        log.sys("AudioManager", `Initialized: master=${this.masterVolume}, muted=${this.muted}`);
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
                    console.error("Audio play error", e);
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

    toggleMute() {
        this.muted = !this.muted;
        this.persistMute();

        if (this.muted) {
            for (const pool of this.pools.values()) {
                pool.forEach(a => { a.pause(); a.currentTime = 0; });
            }
        }
    }

    /** Reset all volumes to defaults */
    resetDefaults() {
        this.masterVolume = 0.5;
        this.muted = false;
        this.persistMaster();
        this.persistMute();

        for (const type of ALL_SOUND_TYPES) {
            this.soundVolumes[type] = SOUND_CONFIGS[type].defaultVolume;
            this.persistSoundVolume(type);
        }
        this.updatePoolVolumes();
        log.sys("AudioManager", "Reset all volumes to defaults");
    }

    /** Get default volume for a sound type */
    getDefaultVolume(type: SoundType): number {
        return SOUND_CONFIGS[type].defaultVolume;
    }
}

export const audioManager = new AudioManager();
