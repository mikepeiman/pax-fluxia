/**
 * AudioManager - Subtle, evocative game audio using Tone.js
 * 
 * Sounds:
 * - Tick: Soft metronome pulse each game tick
 * - Order: Soft chime when issuing commands (per star dragged through)
 * - Combat: Subtle percussive sounds, scaled to battle size
 * - Conquest: Triumphant arpeggio on star capture
 */

import * as Tone from 'tone';

// Audio state
let initialized = false;
let enabled = true;
let masterVolume = 0.3;
let tickVolume = 0.5;
let orderVolume = 0.7;
let combatVolume = 0.5;

// Synths and effects
let tickSynth: Tone.MembraneSynth | null = null;
let orderSynth: Tone.PolySynth | null = null;
let combatSynth: Tone.MetalSynth | null = null; // Changed from NoiseSynth to avoid timing issues

// Effects chain
let reverb: Tone.Reverb | null = null;
let filter: Tone.Filter | null = null;
let masterGain: Tone.Gain | null = null;

// Combat sound cooldown to prevent timing errors
let lastCombatTime = 0;
const COMBAT_COOLDOWN = 50; // ms between combat sounds

/**
 * Initialize the audio system (must be called after user interaction)
 */
export async function initAudio(): Promise<void> {
    if (initialized) return;

    try {
        // Start audio context (requires user gesture)
        await Tone.start();

        // Master gain
        masterGain = new Tone.Gain(masterVolume).toDestination();

        // Reverb for spacey feel
        reverb = new Tone.Reverb({
            decay: 3,
            wet: 0.25
        }).connect(masterGain);
        await reverb.ready;

        // Low-pass filter for warmth
        filter = new Tone.Filter({
            frequency: 2500,
            type: 'lowpass'
        }).connect(reverb);

        // Tick synth - soft membrane drum
        tickSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 2,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.15,
                sustain: 0,
                release: 0.1
            }
        }).connect(filter);
        tickSynth.volume.value = -22;

        // Order synth - soft chimes/bells
        orderSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.01,
                decay: 0.25,
                sustain: 0.1,
                release: 0.6
            }
        }).connect(filter);
        orderSynth.volume.value = -16;

        // Combat synth - metallic percussion (no timing issues like NoiseSynth)
        combatSynth = new Tone.MetalSynth({
            frequency: 80,
            envelope: {
                attack: 0.001,
                decay: 0.1,
                release: 0.05
            },
            harmonicity: 3.1,
            modulationIndex: 16,
            resonance: 2000,
            octaves: 1
        }).connect(filter);
        combatSynth.volume.value = -28;

        initialized = true;
        console.log('[Audio] Initialized');
    } catch (err) {
        console.warn('[Audio] Failed to initialize:', err);
    }
}

/**
 * Play tick sound (each game tick)
 */
export function playTick(): void {
    if (!initialized || !enabled || !tickSynth || tickVolume === 0) return;
    
    // Very subtle low thump
    tickSynth.triggerAttackRelease('C1', '32n', Tone.now(), 0.3 * tickVolume);
}

/**
 * Play order issued sound (when dragging through a star)
 */
export function playOrderIssued(starIndex: number = 0): void {
    if (!initialized || !enabled || !orderSynth || orderVolume === 0) return;
    
    // Ascending notes based on star index in chain
    const notes = ['C4', 'E4', 'G4', 'B4', 'C5', 'E5'];
    const note = notes[Math.min(starIndex, notes.length - 1)];
    
    orderSynth.triggerAttackRelease(note, '16n', Tone.now(), 0.4 * orderVolume);
}

/**
 * Play combat sound (scaled to battle intensity)
 * @param intensity 0-1 scale of how intense the battle is
 */
export function playCombat(intensity: number = 0.5): void {
    if (!initialized || !enabled || !combatSynth || combatVolume === 0) return;
    
    // Cooldown to prevent "Start time must be greater" errors
    const now = Date.now();
    if (now - lastCombatTime < COMBAT_COOLDOWN) return;
    lastCombatTime = now;
    
    // MetalSynth uses triggerAttackRelease with duration
    const duration = 0.03 + intensity * 0.08;
    const velocity = (0.2 + intensity * 0.5) * combatVolume;
    
    try {
        combatSynth.triggerAttackRelease(duration, Tone.now(), velocity);
    } catch (e) {
        // Silently ignore timing errors
    }
}

/**
 * Play conquest/capture sound
 */
export function playConquest(): void {
    if (!initialized || !enabled || !orderSynth) return;
    
    // Triumphant rising arpeggio
    const now = Tone.now();
    orderSynth.triggerAttackRelease('C4', '8n', now, 0.5);
    orderSynth.triggerAttackRelease('E4', '8n', now + 0.1, 0.5);
    orderSynth.triggerAttackRelease('G4', '8n', now + 0.2, 0.5);
    orderSynth.triggerAttackRelease('C5', '4n', now + 0.3, 0.6);
}

/**
 * Set master volume
 * @param volume 0-1 scale
 */
export function setVolume(volume: number): void {
    masterVolume = Math.max(0, Math.min(1, volume));
    if (masterGain) {
        masterGain.gain.value = masterVolume;
    }
}

/**
 * Enable/disable all audio
 */
export function setEnabled(value: boolean): void {
    enabled = value;
}

/**
 * Set individual volume levels (0-1)
 */
export function setTickVolume(vol: number): void {
    tickVolume = Math.max(0, Math.min(1, vol));
}

export function setOrderVolume(vol: number): void {
    orderVolume = Math.max(0, Math.min(1, vol));
}

export function setCombatVolume(vol: number): void {
    combatVolume = Math.max(0, Math.min(1, vol));
}

/**
 * Get current volume settings
 */
export function getSettings() {
    return {
        enabled,
        masterVolume,
        tickVolume,
        orderVolume,
        combatVolume
    };
}

/**
 * Check if audio is initialized
 */
export function isInitialized(): boolean {
    return initialized;
}

/**
 * Cleanup audio resources
 */
export function dispose(): void {
    if (tickSynth) tickSynth.dispose();
    if (orderSynth) orderSynth.dispose();
    if (combatSynth) combatSynth.dispose();
    if (reverb) reverb.dispose();
    if (filter) filter.dispose();
    if (masterGain) masterGain.dispose();
    
    initialized = false;
}

// Export singleton-style access
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
    dispose
};

export default audio;
