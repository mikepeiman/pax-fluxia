// ============================================================================
// RenderContext — Shared context passed to all renderer modules
// ============================================================================
//
// Each renderer (StarRenderer, ShipRenderer, LaneRenderer, InputLayer) receives
// this context every frame. It owns the PIXI containers, textures, and caches
// that the renderers draw into, preserving the z-order hierarchy.
//
// See: arch_05_renderer_extraction_redteam.md
// ============================================================================

import * as PIXI from 'pixi.js';
import type { StarState, StarConnection, FleetState } from '$lib/types/game.types';
import type { VisualShipState } from '$lib/utils/render.utils';
import type { GAME_CONFIG as GameConfigType } from '$lib/config/game.config';

// ── Container Hierarchy ─────────────────────────────────────────────────────
// Mirrors the z-order in GameCanvas.svelte onMount:
//   stage → links → stars → glow → ships(particles+orb) → connections → labels → drag

export interface RenderContainers {
    /** Order arrow graphics (below stars) */
    linkGraphics: PIXI.Graphics;
    /** Star circle container */
    starsContainer: PIXI.Container;
    /** Star glow sprites (between stars and ships) */
    glowContainer: PIXI.Container;
    /** Ships parent — holds particleContainer + orbGraphics */
    shipsContainer: PIXI.Container;
    /** High-performance batched ship particles */
    shipParticleContainer: PIXI.ParticleContainer;
    /** Orb travel glow effects (needs Graphics for variable-radius) */
    orbGraphics: PIXI.Graphics;
    /** Lane connection graphics (above ships) */
    connectionGraphics: PIXI.Graphics;
    /** Star labels (ship counts, star IDs) */
    labelsContainer: PIXI.Container;
    /** Drag preview line + target highlight */
    dragPreviewGraphics: PIXI.Graphics;
}

// ── Shared Textures ─────────────────────────────────────────────────────────

export interface RenderTextures {
    /** 128px circle with radial gradient for anti-aliased ship rendering */
    shipCircle: PIXI.Texture;
    /** 256px soft radial gradient for star glow effect */
    starGlow: PIXI.Texture;
}

// ── Per-Frame State Snapshot ─────────────────────────────────────────────────

export interface FrameState {
    /** Current stars from game state */
    stars: StarState[];
    /** Star connections/lanes */
    connections: StarConnection[];
    /** Active fleets in transit */
    fleets: FleetState[];
    /** Lookup map: starId → star (avoid allocating per frame) */
    starsById: Map<string, StarState>;
    /** Ship orbit state per star */
    visualShips: Map<string, VisualShipState[]>;
    /** Ships in flight */
    travelingShips: VisualShipState[];
    /** Stars currently in tick-synced combat */
    starsInCombat: Set<string>;
    /** Pending conquest color transitions */
    pendingConquests: Map<string, { previousOwner: string; transitionTime: number }>;
    /** Conquest flash effects */
    conquestFlashes: Map<string, { startTime: number; duration: number }>;
}

// ── Camera ──────────────────────────────────────────────────────────────────

export interface CameraState {
    /** Fit-to-screen base scale */
    baseScale: number;
    /** User zoom multiplier */
    zoomLevel: number;
    /** Pan offset in world coords */
    panOffsetX: number;
    panOffsetY: number;
    /** Computed world dimensions */
    worldWidth: number;
    worldHeight: number;
}

// ── Graphics Caches ─────────────────────────────────────────────────────────

export interface GraphicsCaches {
    /** Per-star PIXI.Graphics for star circles */
    starGraphics: Map<string, PIXI.Graphics>;
    /** Per-star label containers */
    starLabels: Map<string, PIXI.Container>;
    /** Per-star glow sprites */
    glowSprites: Map<string, PIXI.Sprite>;
    /** Ship particle pool for recycling */
    shipParticlePool: PIXI.Particle[];
    /** Current index into particle pool */
    shipParticleIndex: number;
}

// ── The Complete Render Context ─────────────────────────────────────────────

export interface RenderContext {
    /** PIXI application instance */
    app: PIXI.Application;
    /** Named container hierarchy */
    containers: RenderContainers;
    /** Shared textures (ship circle, star glow) */
    textures: RenderTextures;
    /** Per-frame game state snapshot */
    frame: FrameState;
    /** Camera/viewport state */
    camera: CameraState;
    /** Reusable graphics caches */
    caches: GraphicsCaches;
    /** Game configuration (reactive) */
    config: typeof GameConfigType;
    /** Animation time (seconds, monotonic) */
    animationTime: number;
    /** True when game is paused */
    isPaused: boolean;
}

// ── Player Color Utilities ──────────────────────────────────────────────────
// Shared across all renderers that need player colors

export interface PlayerHSL {
    hex: number;
    h: number;
    s: number;
    l: number;
}

export interface ColorUtils {
    getPlayerColor(ownerId: string): number;
    getPlayerHSL(ownerId: string): PlayerHSL;
    getDensityFillColor(playerHsl: PlayerHSL, ringTier: number, darken?: boolean): number;
    parseColor(colorValue: string | number | { r: number; g: number; b: number }): number;
    hexToHSL(hex: number): { h: number; s: number; l: number };
    hslToHex(h: number, s: number, l: number): number;
}
