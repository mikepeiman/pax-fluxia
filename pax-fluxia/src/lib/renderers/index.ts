// ============================================================================
// Renderers Module — Barrel Exports
// ============================================================================

// Context & types
export type {
    RenderContainers,
    RenderTextures,
    PlayerHSL,
    ColorUtils,
} from './RenderContext';

// Container factory
export {
    createContainers,
    initShipRendering,
    createCaches,
} from './containerFactory';

// Color utilities
export {
    createColorUtils,
    hexToHSL,
    hslToHex,
    parseColor,
} from './colorUtils';

// Star rendering
export {
    renderStars,
    cleanupStaleStars,
    type StarRenderCaches,
    type StarRenderState,
} from './StarRenderer';

// Lane/connection rendering
export {
    renderConnections,
    renderOrderArrows,
    type OrderArrowState,
} from './LaneRenderer';

// Ship rendering
export {
    drawShip,
    renderShips,
    renderTravelingShips,
    renderFleets,
    applyTravelEasing,
    easeInOutCubic,
    type ShipRenderState,
    type ShipRenderResources,
} from './ShipRenderer';
