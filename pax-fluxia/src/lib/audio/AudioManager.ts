/**
 * AudioManager - Subtle, evocative game audio using Tone.js
 * 
 * Sounds:
 * - Tick: Soft metronome pulse each game tick
 * - Ambient: Very low harmonic drone (beautiful, not dissonant)
 * - Order: Soft chime when issuing commands (per star dragged through)
 * - Combat: Subtle percussive sounds, scaled to battle size
 */

import * as Tone from 'tone';

// Audio state
let initialized = false;
let enabled = true;
let masterVolume = 0.3;

// Synths and effects
let tickSynth: Tone.MembraneSynth | null = null;
let orderSynth: Tone.PolySynth | null = null;
let combatSynth: Tone.NoiseSynth | null = null;
let ambientSynth: Tone.PolySynth | null = null;
let ambientLoop: Tone.Loop | null = null;

// Effects chain
let reverb: Tone.Reverb | null = null;
let filter: Tone.Filter | null = null;
let masterGain: Tone.Gain | null = null;

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
            decay: 4,
            wet: 0.3
        }).connect(masterGain);
        await reverb.ready;

        // Low-pass filter for warmth
        filter = new Tone.Filter({
            frequency: 2000,
            type: 'lowpass'
        }).connect(reverb);

        // Tick synth - soft membrane drum
        tickSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 2,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.1
            }
        }).connect(filter);
        tickSynth.volume.value = -20;

        // Order synth - soft chimes/bells
        orderSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.1,
                release: 0.8
            }
        }).connect(filter);
        orderSynth.volume.value = -18;

        // Combat synth - filtered noise bursts
        combatSynth = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0,
                release: 0.05
            }
        }).connect(filter);
        combatSynth.volume.value = -25;

        // Ambient synth - warm pad drone
        ambientSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 2,
                decay: 1,
                sustain: 0.8,
                release: 3
            }
        }).connect(reverb);
        ambientSynth.volume.value = -30;

        // Start ambient drone (very subtle)
        startAmbient();

        initialized = true;
        console.log('[Audio] Initialized');
    } catch (err) {
        console.warn('[Audio] Failed to initialize:', err);
    }
}

/**
 * Start the ambient harmonic drone
 */
function startAmbient(): void {
    if (!ambientSynth) return;

    // Harmonic, beautiful chord - Cmaj7 voicing
    const chordNotes = ['C2', 'G2', 'E3', 'B3'];
    
    // Play initial chord
    ambientSynth.triggerAttack(chordNotes, Tone.now());

    // Slowly evolve the chord
    ambientLoop = new Tone.Loop((time) => {
        if (!ambientSynth || !enabled) return;
        
        // Subtle harmonic shifts
        const variations = [
            ['C2', 'G2', 'E3', 'B3'],  // Cmaj7
            ['D2', 'A2', 'F3', 'C4'],  // Dm7
            ['E2', 'B2', 'G3', 'D4'],  // Em7
            ['F2', 'C3', 'A3', 'E4'],  // Fmaj7
        ];
        const chord = variations[Math.floor(Math.random() * variations.length)];
        
        ambientSynth.releaseAll(time);
        ambientSynth.triggerAttack(chord, time + 0.1);
    }, 16); // Every 16 seconds
    
    ambientLoop.start(0);
    Tone.Transport.start();
}

/**
 * Play tick sound (each game tick)
 */
export function playTick(): void {
    if (!initialized || !enabled || !tickSynth) return;
    
    // Very subtle low thump
    tickSynth.triggerAttackRelease('C1', '32n', Tone.now(), 0.3);
}

/**
 * Play order issued sound (when dragging through a star)
 */
export function playOrderIssued(starIndex: number = 0): void {
    if (!initialized || !enabled || !orderSynth) return;
    
    // Ascending notes based on star index in chain
    const notes = ['C4', 'E4', 'G4', 'B4', 'C5', 'E5'];
    const note = notes[Math.min(starIndex, notes.length - 1)];
    
    orderSynth.triggerAttackRelease(note, '16n', Tone.now(), 0.4);
}

/**
 * Play combat sound (scaled to battle intensity)
 * @param intensity 0-1 scale of how intense the battle is
 */
export function playCombat(intensity: number = 0.5): void {
    if (!initialized || !enabled || !combatSynth) return;
    
    // Scale duration and volume by intensity
    const duration = 0.05 + intensity * 0.15;
    const volume = -30 + intensity * 10;
    
    combatSynth.volume.value = volume;
    combatSynth.triggerAttackRelease(duration, Tone.now());
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
    if (!enabled && ambientSynth) {
        ambientSynth.releaseAll();
    } else if (enabled && initialized && ambientSynth) {
        const chordNotes = ['C2', 'G2', 'E3', 'B3'];
        ambientSynth.triggerAttack(chordNotes, Tone.now());
    }
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
    if (ambientLoop) {
        ambientLoop.stop();
        ambientLoop.dispose();
    }
    if (tickSynth) tickSynth.dispose();
    if (orderSynth) orderSynth.dispose();
    if (combatSynth) combatSynth.dispose();
    if (ambientSynth) ambientSynth.dispose();
    if (reverb) reverb.dispose();
    if (filter) filter.dispose();
    if (masterGain) masterGain.dispose();
    
    Tone.Transport.stop();
    
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
    isInitialized,
    dispose
};

export default audio;
