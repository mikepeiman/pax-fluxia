// ============================================================================
// Container Factory — Builds the PIXI container hierarchy + shared textures
// ============================================================================
//
// Extracts the ~120 LOC of container/texture initialization from GameCanvas
// onMount into a reusable factory. Returns RenderContainers + RenderTextures.
// ============================================================================

import * as PIXI from 'pixi.js';
import type { RenderContainers, RenderTextures } from './RenderContext';

/**
 * Create the layered container hierarchy on the PIXI stage.
 * 
 * Z-order (bottom to top):
 *   linkGraphics → starsContainer → glowContainer → shipsContainer
 *   → connectionGraphics → labelsContainer → dragPreviewGraphics
 */
export function createContainers(stage: PIXI.Container): RenderContainers {
    // Territory alpha overlay (bottommost — below everything)
    const territoryGraphics = new PIXI.Graphics();
    stage.addChild(territoryGraphics);

    // Order arrows (below stars)
    const linkGraphics = new PIXI.Graphics();
    stage.addChild(linkGraphics);

    // Star circles
    const starsContainer = new PIXI.Container();
    stage.addChild(starsContainer);

    // Glow layer — between stars and ships
    const glowContainer = new PIXI.Container();
    stage.addChild(glowContainer);

    // Ships parent
    const shipsContainer = new PIXI.Container();
    stage.addChild(shipsContainer);

    // The particle container and orb graphics are children of shipsContainer,
    // but we need the ship texture first → initialized separately in initShipRendering()
    // Placeholder — will be set by initShipRendering()
    const shipParticleContainer = null as unknown as PIXI.ParticleContainer;
    const orbGraphics = null as unknown as PIXI.Graphics;

    // Selection overlay (hex highlight — above ships so it's visible)
    const selectionOverlayGraphics = new PIXI.Graphics();
    stage.addChild(selectionOverlayGraphics);

    // Connections (above ships so lanes stay visible under dense clusters)
    const connectionGraphics = new PIXI.Graphics();
    stage.addChild(connectionGraphics);

    // Labels (ship counts, star IDs)
    const labelsContainer = new PIXI.Container();
    stage.addChild(labelsContainer);

    // Drag preview (topmost)
    const dragPreviewGraphics = new PIXI.Graphics();
    stage.addChild(dragPreviewGraphics);

    return {
        linkGraphics,
        starsContainer,
        glowContainer,
        shipsContainer,
        shipParticleContainer,
        orbGraphics,
        selectionOverlayGraphics,
        connectionGraphics,
        labelsContainer,
        dragPreviewGraphics,
        territoryGraphics,
    };
}

/**
 * Create shared textures for ship rendering and star glow.
 * Also creates the ParticleContainer and orbGraphics within shipsContainer.
 * 
 * Must be called after createContainers(). Mutates containers.shipParticleContainer
 * and containers.orbGraphics in-place.
 */
export function initShipRendering(
    containers: RenderContainers,
): RenderTextures {
    // 128px circle with radial gradient for anti-aliased ship rendering
    const texSize = 128;
    const texCanvas = document.createElement('canvas');
    texCanvas.width = texSize;
    texCanvas.height = texSize;
    const ctx = texCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(
        texSize / 2, texSize / 2, 0,
        texSize / 2, texSize / 2, texSize / 2,
    );
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.85, 'rgba(255,255,255,1)');
    grad.addColorStop(0.95, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(texSize / 2, texSize / 2, texSize / 2, 0, Math.PI * 2);
    ctx.fill();
    const shipCircle = PIXI.Texture.from(texCanvas);
    shipCircle.source.scaleMode = 'linear';

    // 256px soft radial gradient for star glow
    const glowSize = 256;
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowSize;
    glowCanvas.height = glowSize;
    const glowCtx = glowCanvas.getContext('2d')!;
    const glowGrad = glowCtx.createRadialGradient(
        glowSize / 2, glowSize / 2, 0,
        glowSize / 2, glowSize / 2, glowSize / 2,
    );
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
    glowGrad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    glowGrad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
    glowCtx.fillStyle = glowGrad;
    glowCtx.beginPath();
    glowCtx.arc(glowSize / 2, glowSize / 2, glowSize / 2, 0, Math.PI * 2);
    glowCtx.fill();
    const starGlow = PIXI.Texture.from(glowCanvas);
    starGlow.source.scaleMode = 'linear';

    // ParticleContainer for all ship rendering (outlines + fills + damage)
    const shipParticleContainer = new PIXI.ParticleContainer({
        texture: shipCircle,
        dynamicProperties: {
            position: true,
            color: true,
            vertex: true, // needed for scale changes
        },
        roundPixels: true,
    });
    containers.shipsContainer.addChild(shipParticleContainer);
    (containers as any).shipParticleContainer = shipParticleContainer;

    // Orb travel effects need Graphics (variable-radius glow circles)
    const orbGraphics = new PIXI.Graphics();
    containers.shipsContainer.addChild(orbGraphics);
    (containers as any).orbGraphics = orbGraphics;

    return { shipCircle, starGlow };
}

/**
 * Initialize empty graphics caches.
 */
export function createCaches() {
    return {
        starGraphics: new Map<string, PIXI.Graphics>(),
        starLabels: new Map<string, PIXI.Container>(),
        glowSprites: new Map<string, PIXI.Sprite>(),
        shipParticlePool: [] as PIXI.Particle[],
        shipParticleIndex: 0,
    };
}
