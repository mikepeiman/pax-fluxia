// ============================================================================
// RenderContext — Shared types for renderer modules
// ============================================================================
//
// Provides container hierarchy, texture, and color utility interfaces
// consumed by StarRenderer, ShipRenderer, LaneRenderer, and containerFactory.
// ============================================================================

import * as PIXI from 'pixi.js';

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
    /** Selection highlight overlay (above ships) */
    selectionOverlayGraphics: PIXI.Graphics;
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
