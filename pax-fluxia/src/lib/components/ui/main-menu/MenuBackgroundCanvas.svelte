<script lang="ts">
    import { browser } from "$app/environment";
    import type { BackgroundSelection } from "$lib/backgrounds";
    import { getMenuBackgroundPalette } from "$lib/backgrounds/runtime/menuPalette";
    import { renderMenuBackground } from "$lib/backgrounds/runtime/renderMenuBackground";
    import type { MenuTheme } from "./menuTheme";

    interface Props {
        selection: BackgroundSelection;
        legacyImage: string;
        menuTheme: MenuTheme;
    }

    let { selection, legacyImage, menuTheme }: Props = $props();

    let canvas = $state<HTMLCanvasElement | null>(null);
    let frameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const isLegacyImage = $derived(selection.modeId === "legacy_image");
    const legacyImageUrl = $derived(
        legacyImage ? `/assets/${legacyImage}` : "",
    );

    function stopRuntime() {
        if (!browser) return;
        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
            frameId = null;
        }
        resizeObserver?.disconnect();
        resizeObserver = null;
    }

    function resizeCanvas() {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = browser ? window.devicePixelRatio || 1 : 1;
        const nextWidth = Math.max(1, Math.round(rect.width * dpr));
        const nextHeight = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== nextWidth) canvas.width = nextWidth;
        if (canvas.height !== nextHeight) canvas.height = nextHeight;
    }

    function renderFrame(nowMs: number) {
        if (!canvas || isLegacyImage) {
            frameId = browser ? window.requestAnimationFrame(renderFrame) : null;
            return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            frameId = browser ? window.requestAnimationFrame(renderFrame) : null;
            return;
        }
        resizeCanvas();
        const dpr = browser ? window.devicePixelRatio || 1 : 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        renderMenuBackground({
            ctx,
            width: canvas.width / dpr,
            height: canvas.height / dpr,
            nowMs,
            selection,
            palette: getMenuBackgroundPalette(menuTheme),
        });
        frameId = window.requestAnimationFrame(renderFrame);
    }

    $effect(() => {
        if (!browser || !canvas || isLegacyImage) {
            stopRuntime();
            return;
        }

        stopRuntime();
        resizeCanvas();
        resizeObserver = new ResizeObserver(() => resizeCanvas());
        resizeObserver.observe(canvas);
        frameId = window.requestAnimationFrame(renderFrame);

        return () => {
            stopRuntime();
        };
    });
</script>

<div class="menu-background-layer" aria-hidden="true">
    {#if isLegacyImage}
        <div
            class="menu-background-image"
            style:background-image={legacyImageUrl ? `url(${legacyImageUrl})` : "none"}
        ></div>
    {:else}
        <canvas bind:this={canvas}></canvas>
    {/if}
    <div class="menu-background-vignette"></div>
</div>

<style>
    .menu-background-layer {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
    }

    canvas,
    .menu-background-image,
    .menu-background-vignette {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    canvas {
        display: block;
    }

    .menu-background-image {
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        opacity: 0.92;
        transform: scale(1.02);
    }

    .menu-background-vignette {
        background:
            radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.08), transparent 42%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.26));
        mix-blend-mode: screen;
        opacity: 0.58;
    }
</style>
