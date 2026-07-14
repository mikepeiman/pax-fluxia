import { describe, it, expect } from "vitest";
import {
    createCameraModel,
    clampZoom,
    ZOOM_MIN,
    ZOOM_MAX,
    type CameraModel,
    type CameraViewport,
} from "./cameraModel";

const VIEWPORT: CameraViewport = { width: 800, height: 400 };
const CONTENT = { minX: 0, minY: 0, width: 1000, height: 500 };

/** Mirrors GameCanvas.worldToScreen, which reads the applied stage transform. */
function worldToScreen(
    camera: CameraModel,
    viewport: CameraViewport,
    world: { x: number; y: number },
) {
    const t = camera.getTransform(viewport);
    return { x: world.x * t.scale + t.x, y: world.y * t.scale + t.y };
}

/** Mirrors GameCanvas.screenToWorld. */
function screenToWorld(
    camera: CameraModel,
    viewport: CameraViewport,
    screen: { x: number; y: number },
) {
    const t = camera.getTransform(viewport);
    return { x: (screen.x - t.x) / t.scale, y: (screen.y - t.y) / t.scale };
}

function fittedCamera(): CameraModel {
    const camera = createCameraModel();
    camera.setContentBounds(CONTENT);
    camera.fitBaseScaleTo(VIEWPORT);
    return camera;
}

/** Run the animation to completion, guarding against a non-converging model. */
function settle(camera: CameraModel): number {
    let frames = 0;
    while (camera.isAnimating()) {
        camera.stepAnimation();
        frames += 1;
        if (frames > 1000) throw new Error("camera animation did not converge");
    }
    return frames;
}

describe("cameraModel", () => {
    describe("fit", () => {
        it("fits the content box to the viewport", () => {
            const camera = fittedCamera();
            // min(800/1000, 400/500) = 0.8 on both axes.
            expect(camera.getBaseScale()).toBeCloseTo(0.8);
        });

        it("fits to the tighter axis so content is never cropped", () => {
            const camera = createCameraModel();
            camera.setContentBounds({ minX: 0, minY: 0, width: 1000, height: 2000 });
            camera.fitBaseScaleTo(VIEWPORT);
            // Height is the binding constraint: 400/2000 = 0.2 < 800/1000 = 0.8
            expect(camera.getBaseScale()).toBeCloseTo(0.2);
        });

        it("ignores a degenerate content box rather than dividing by zero", () => {
            const camera = createCameraModel();
            camera.setContentBounds({ minX: 0, minY: 0, width: 0, height: 0 });
            camera.fitBaseScaleTo(VIEWPORT);
            expect(camera.getBaseScale()).toBe(1);
        });
    });

    describe("transform", () => {
        it("centres the content box at rest", () => {
            const camera = fittedCamera();
            const center = worldToScreen(camera, VIEWPORT, camera.getContentCenter());
            expect(center.x).toBeCloseTo(VIEWPORT.width / 2);
            expect(center.y).toBeCloseTo(VIEWPORT.height / 2);
        });

        it("keeps the content centred at any zoom when pan is zero", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(3);
            const center = worldToScreen(camera, VIEWPORT, camera.getContentCenter());
            expect(center.x).toBeCloseTo(VIEWPORT.width / 2);
            expect(center.y).toBeCloseTo(VIEWPORT.height / 2);
        });

        it("screenToWorld and worldToScreen round-trip", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(2.3);
            camera.setPan(37, -19);
            const world = screenToWorld(camera, VIEWPORT, { x: 123, y: 77 });
            const back = worldToScreen(camera, VIEWPORT, world);
            expect(back.x).toBeCloseTo(123);
            expect(back.y).toBeCloseTo(77);
        });
    });

    describe("anchored zoom", () => {
        // This is the invariant handleWheel exists to preserve: zooming with the
        // wheel must not slide the map out from under the cursor.
        it("keeps the world point under the cursor fixed while zooming in", () => {
            const camera = fittedCamera();
            const cursor = { x: 100, y: 50 };
            const worldBefore = screenToWorld(camera, VIEWPORT, cursor);

            camera.setZoomClamped(camera.getZoomLevel() + 0.5);
            camera.setPanFromAnchor(VIEWPORT, cursor, worldBefore);

            const after = worldToScreen(camera, VIEWPORT, worldBefore);
            expect(after.x).toBeCloseTo(cursor.x);
            expect(after.y).toBeCloseTo(cursor.y);
        });

        it("holds the anchor across a sequence of wheel notches", () => {
            const camera = fittedCamera();
            const cursor = { x: 640, y: 310 };

            for (let i = 0; i < 12; i += 1) {
                const worldBefore = screenToWorld(camera, VIEWPORT, cursor);
                camera.setZoomClamped(camera.getZoomLevel() + 0.1);
                camera.setPanFromAnchor(VIEWPORT, cursor, worldBefore);
                const after = worldToScreen(camera, VIEWPORT, worldBefore);
                expect(after.x).toBeCloseTo(cursor.x);
                expect(after.y).toBeCloseTo(cursor.y);
            }
        });

        it("holds the anchor when zooming out too", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(4);
            const cursor = { x: 200, y: 300 };
            const worldBefore = screenToWorld(camera, VIEWPORT, cursor);

            camera.setZoomClamped(camera.getZoomLevel() - 1.5);
            camera.setPanFromAnchor(VIEWPORT, cursor, worldBefore);

            const after = worldToScreen(camera, VIEWPORT, worldBefore);
            expect(after.x).toBeCloseTo(cursor.x);
            expect(after.y).toBeCloseTo(cursor.y);
        });
    });

    describe("zoom limits", () => {
        it("clamps to the configured range", () => {
            expect(clampZoom(99)).toBe(ZOOM_MAX);
            expect(clampZoom(0)).toBe(ZOOM_MIN);
            expect(clampZoom(2)).toBe(2);
        });

        it("setZoomClamped reports the value actually applied", () => {
            const camera = fittedCamera();
            expect(camera.setZoomClamped(99)).toBe(ZOOM_MAX);
            expect(camera.getZoomLevel()).toBe(ZOOM_MAX);
        });
    });

    describe("clampPan", () => {
        it("forbids panning when the content already fits", () => {
            const camera = fittedCamera(); // zoom 1 == exactly fitted
            camera.setPan(500, 500);
            camera.clampPan(VIEWPORT);
            expect(camera.getPan()).toEqual({ x: 0, y: 0 });
        });

        it("allows panning once zoomed in, bounded by the overflow", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(2);
            camera.setPan(10_000, 0);
            camera.clampPan(VIEWPORT);

            // es = 1.6; overflow = (1000*1.6 - 800)/2 = 400 screen px -> 250 world
            expect(camera.getPan().x).toBeCloseTo(250);
        });

        it("leaves an in-range pan untouched", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(2);
            camera.setPan(10, -5);
            camera.clampPan(VIEWPORT);
            expect(camera.getPan().x).toBeCloseTo(10);
            expect(camera.getPan().y).toBeCloseTo(-5);
        });

        it("is symmetric about the centre", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(2);
            camera.setPan(-10_000, 0);
            camera.clampPan(VIEWPORT);
            expect(camera.getPan().x).toBeCloseTo(-250);
        });
    });

    describe("panFromDrag", () => {
        it("moves the world with the pointer, not against it", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(2);
            const scale = camera.getEffectiveScale();

            // Dragging right by 80px should shift pan LEFT by 80/scale world units,
            // so the content appears to follow the finger.
            camera.panFromDrag(0, 0, 80, 0);
            expect(camera.getPan().x).toBeCloseTo(-80 / scale);
        });

        it("is measured from the remembered start offset, not the current pan", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(2);
            const scale = camera.getEffectiveScale();
            camera.setPan(999, 999); // current pan must not leak in
            camera.panFromDrag(100, 50, 40, 20);
            expect(camera.getPan().x).toBeCloseTo(100 - 40 / scale);
            expect(camera.getPan().y).toBeCloseTo(50 - 20 / scale);
        });
    });

    describe("animation", () => {
        it("snapToDefault jumps home and marks the camera initialized", () => {
            const camera = fittedCamera();
            expect(camera.isInitialized()).toBe(false);
            camera.setZoomClamped(3);
            camera.setPan(50, 50);

            camera.snapToDefault();
            expect(camera.isInitialized()).toBe(true);
            expect(camera.isAnimating()).toBe(false);
            expect(camera.getZoomLevel()).toBe(1);
            expect(camera.getPan()).toEqual({ x: 0, y: 0 });
        });

        it("stepAnimation reports idle when nothing is animating", () => {
            const camera = fittedCamera();
            expect(camera.stepAnimation()).toBe(false);
        });

        it("animateToDefault converges back to the default view", () => {
            const camera = fittedCamera();
            camera.setZoomClamped(4);
            camera.setPan(120, -80);

            camera.animateToDefault();
            expect(camera.isAnimating()).toBe(true);
            settle(camera);

            expect(camera.getZoomLevel()).toBeCloseTo(1);
            expect(camera.getPan().x).toBeCloseTo(0);
            expect(camera.getPan().y).toBeCloseTo(0);
        });

        it("animateToWorldPoint ends with that point at the viewport centre", () => {
            const camera = fittedCamera();
            const target = { x: 800, y: 100 };

            camera.animateToWorldPoint(target, 2.5);
            settle(camera);

            expect(camera.getZoomLevel()).toBeCloseTo(2.5);
            const screen = worldToScreen(camera, VIEWPORT, target);
            expect(screen.x).toBeCloseTo(VIEWPORT.width / 2);
            expect(screen.y).toBeCloseTo(VIEWPORT.height / 2);
        });

        it("animateToWorldPoint clamps its requested zoom", () => {
            const camera = fittedCamera();
            camera.animateToWorldPoint({ x: 0, y: 0 }, 500);
            settle(camera);
            expect(camera.getZoomLevel()).toBeCloseTo(ZOOM_MAX);
        });

        it("cancelAnimation freezes the camera mid-flight", () => {
            const camera = fittedCamera();
            camera.animateToWorldPoint({ x: 900, y: 400 }, 3);
            camera.stepAnimation();
            const midZoom = camera.getZoomLevel();

            camera.cancelAnimation();
            expect(camera.stepAnimation()).toBe(false);
            expect(camera.getZoomLevel()).toBe(midZoom);
        });
    });
});
