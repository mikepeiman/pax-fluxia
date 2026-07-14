/**
 * Camera model — zoom, pan, content bounds and the camera animation, with the
 * single definition of the stage transform.
 *
 * This is the MODEL only: it never touches Pixi. GameCanvas projects it onto
 * the scene graph (`applyZoomTransform` reads getTransform() and writes
 * app.stage). Keeping the projection out of here is what makes the camera
 * testable, and the stage has exactly one writer either way.
 *
 * Extracted from GameCanvas.svelte (Stage 5), where the content-centred
 * baseline transform was written out FOUR times — in applyZoomTransform,
 * clampPan, handleWheel and navigateToStar — with a comment in one of them
 * warning that it "must match the transform in applyZoomTransform". It now has
 * one definition: getTransform().
 */

export interface CameraViewport {
    width: number;
    height: number;
}

/** The stage transform: uniform scale plus a translation, in screen px. */
export interface CameraTransform {
    scale: number;
    x: number;
    y: number;
}

export interface CameraContentBounds {
    minX: number;
    minY: number;
    width: number;
    height: number;
}

export const ZOOM_MIN = 0.8; // Max zoom-out: 125% of gameboard visible
export const ZOOM_MAX = 5.0;
export const ZOOM_STEP = 0.1; // Per scroll notch
const CAMERA_EASE = 0.12; // Lerp factor per frame (0-1, higher = faster)
const CAMERA_EPSILON = 0.001; // Stop threshold

export function clampZoom(zoom: number): number {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

export interface CameraModel {
    setContentBounds: (bounds: CameraContentBounds) => void;
    getContentBounds: () => CameraContentBounds;
    /** World-space centre of the content box — the point the baseline centres on. */
    getContentCenter: () => { x: number; y: number };

    getBaseScale: () => number;
    setBaseScale: (scale: number) => void;
    /** Fit-to-screen: the largest scale showing the whole content box. */
    fitBaseScaleTo: (viewport: CameraViewport) => void;
    /** baseScale * zoomLevel — world units to screen px. */
    getEffectiveScale: () => number;

    getZoomLevel: () => number;
    /** Sets zoom clamped to [ZOOM_MIN, ZOOM_MAX]; returns the applied value. */
    setZoomClamped: (zoom: number) => number;
    getPan: () => { x: number; y: number };
    setPan: (x: number, y: number) => void;
    /** Pan by a screen-space drag delta from a remembered start offset. */
    panFromDrag: (
        startPanX: number,
        startPanY: number,
        deltaScreenX: number,
        deltaScreenY: number,
    ) => void;
    /** Pan so `worldPoint` sits under `screenPoint` at the current zoom. */
    setPanFromAnchor: (
        viewport: CameraViewport,
        screenPoint: { x: number; y: number },
        worldPoint: { x: number; y: number },
    ) => void;
    /** Clamp pan so content cannot be dragged away from the viewport. */
    clampPan: (viewport: CameraViewport) => void;
    /** THE stage transform. Every consumer of camera geometry goes through this. */
    getTransform: (viewport: CameraViewport) => CameraTransform;
    /** Back to default zoom, no pan. Does not animate. */
    reset: () => void;

    isAnimating: () => boolean;
    cancelAnimation: () => void;
    /** True once the camera has been placed; the first placement snaps. */
    isInitialized: () => boolean;
    /** Jump to the default view and mark initialized (first centerAndFit). */
    snapToDefault: () => void;
    animateToDefault: () => void;
    /** Animate until `worldPoint` is centred at `zoom`. */
    animateToWorldPoint: (
        worldPoint: { x: number; y: number },
        zoom: number,
    ) => void;
    /**
     * Advance one frame. Returns true when the camera moved and the caller
     * must re-apply the transform; false when idle.
     */
    stepAnimation: () => boolean;
}

export function createCameraModel(): CameraModel {
    let baseScale = 1; // Fit-to-screen scale (recalculated on resize)
    let zoomLevel = 1; // User zoom multiplier (1.0 = default fit)
    let panOffsetX = 0; // Pan offset in world coordinates
    let panOffsetY = 0;

    let contentMinX = 0;
    let contentMinY = 0;
    let contentWidth = 1600;
    let contentHeight = 900;

    let cameraAnimating = false;
    let targetZoom = 1;
    let targetPanX = 0;
    let targetPanY = 0;
    let cameraInitialized = false; // First placement is instant

    const getEffectiveScale = () => baseScale * zoomLevel;
    const getContentCenter = () => ({
        x: contentMinX + contentWidth / 2,
        y: contentMinY + contentHeight / 2,
    });

    /**
     * Stage translation with zero pan: the offset that centres the content box
     * in the viewport. Pan is then subtracted from it in world units.
     */
    function baseline(viewport: CameraViewport, effectiveScale: number) {
        const center = getContentCenter();
        return {
            x: viewport.width / 2 - center.x * effectiveScale,
            y: viewport.height / 2 - center.y * effectiveScale,
        };
    }

    function getTransform(viewport: CameraViewport): CameraTransform {
        const scale = getEffectiveScale();
        const base = baseline(viewport, scale);
        return {
            scale,
            x: base.x - panOffsetX * scale,
            y: base.y - panOffsetY * scale,
        };
    }

    function clampPan(viewport: CameraViewport): void {
        const scale = getEffectiveScale();
        // Only allow pan when zoomed-in content exceeds viewport
        const overflowX = Math.max(0, (contentWidth * scale - viewport.width) / 2);
        const overflowY = Math.max(
            0,
            (contentHeight * scale - viewport.height) / 2,
        );
        const maxPanX = overflowX / scale;
        const maxPanY = overflowY / scale;
        panOffsetX = Math.max(-maxPanX, Math.min(maxPanX, panOffsetX));
        panOffsetY = Math.max(-maxPanY, Math.min(maxPanY, panOffsetY));
    }

    return {
        setContentBounds: (bounds) => {
            contentMinX = bounds.minX;
            contentMinY = bounds.minY;
            contentWidth = bounds.width;
            contentHeight = bounds.height;
        },
        getContentBounds: () => ({
            minX: contentMinX,
            minY: contentMinY,
            width: contentWidth,
            height: contentHeight,
        }),
        getContentCenter,

        getBaseScale: () => baseScale,
        setBaseScale: (scale) => {
            baseScale = scale;
        },
        fitBaseScaleTo: (viewport) => {
            if (contentWidth > 0 && contentHeight > 0) {
                baseScale = Math.min(
                    viewport.width / contentWidth,
                    viewport.height / contentHeight,
                );
            }
        },
        getEffectiveScale,

        getZoomLevel: () => zoomLevel,
        setZoomClamped: (zoom) => {
            zoomLevel = clampZoom(zoom);
            return zoomLevel;
        },
        getPan: () => ({ x: panOffsetX, y: panOffsetY }),
        setPan: (x, y) => {
            panOffsetX = x;
            panOffsetY = y;
        },
        panFromDrag: (startPanX, startPanY, deltaScreenX, deltaScreenY) => {
            const scale = getEffectiveScale();
            panOffsetX = startPanX - deltaScreenX / scale;
            panOffsetY = startPanY - deltaScreenY / scale;
        },
        setPanFromAnchor: (viewport, screenPoint, worldPoint) => {
            const scale = getEffectiveScale();
            const base = baseline(viewport, scale);
            // Solve screenPoint = base - pan*scale + world*scale for pan.
            panOffsetX = worldPoint.x - (screenPoint.x - base.x) / scale;
            panOffsetY = worldPoint.y - (screenPoint.y - base.y) / scale;
        },
        clampPan,
        getTransform,
        reset: () => {
            zoomLevel = 1;
            panOffsetX = 0;
            panOffsetY = 0;
        },

        isAnimating: () => cameraAnimating,
        cancelAnimation: () => {
            cameraAnimating = false;
        },
        isInitialized: () => cameraInitialized,
        snapToDefault: () => {
            zoomLevel = 1;
            panOffsetX = 0;
            panOffsetY = 0;
            targetZoom = 1;
            targetPanX = 0;
            targetPanY = 0;
            cameraAnimating = false;
            cameraInitialized = true;
        },
        animateToDefault: () => {
            targetZoom = 1;
            targetPanX = 0;
            targetPanY = 0;
            cameraAnimating = true;
        },
        animateToWorldPoint: (worldPoint, zoom) => {
            targetZoom = clampZoom(zoom);
            // Centring worldPoint means the stage translation must be
            //   viewport/2 - world*es
            // and pan is defined by  transform = baseline - pan*es , so
            //   pan = -(desired - baseline)/es = world - contentCentre.
            // The viewport size and scale cancel out entirely.
            const center = getContentCenter();
            targetPanX = worldPoint.x - center.x;
            targetPanY = worldPoint.y - center.y;
            cameraAnimating = true;
        },
        stepAnimation: () => {
            if (!cameraAnimating) return false;

            const dz = targetZoom - zoomLevel;
            const dx = targetPanX - panOffsetX;
            const dy = targetPanY - panOffsetY;

            if (
                Math.abs(dz) < CAMERA_EPSILON &&
                Math.abs(dx) < CAMERA_EPSILON &&
                Math.abs(dy) < CAMERA_EPSILON
            ) {
                zoomLevel = targetZoom;
                panOffsetX = targetPanX;
                panOffsetY = targetPanY;
                cameraAnimating = false;
            } else {
                zoomLevel += dz * CAMERA_EASE;
                panOffsetX += dx * CAMERA_EASE;
                panOffsetY += dy * CAMERA_EASE;
            }
            return true;
        },
    };
}
