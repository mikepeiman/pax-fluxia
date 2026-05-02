<script lang="ts">
    import { browser } from "$app/environment";
    import { fade, fly } from "svelte/transition";
    import PerimeterFieldDiagnosticsPanel from "$lib/components/ui/PerimeterFieldDiagnosticsPanel.svelte";

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    function portal(node: HTMLElement) {
        if (!browser) {
            return {};
        }

        document.body.appendChild(node);

        return {
            destroy() {
                if (node.parentNode === document.body) {
                    document.body.removeChild(node);
                }
            },
        };
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            onClose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
    class="transition-debug-modal"
    use:portal
    role="dialog"
    aria-modal="true"
    aria-label="Transition diagnostics"
    transition:fade={{ duration: 140 }}
>
    <button
        type="button"
        class="transition-debug-modal__scrim"
        aria-label="Close transition diagnostics"
        onclick={onClose}
    ></button>

    <section
        class="transition-debug-modal__shell"
        transition:fly={{ x: 18, duration: 220 }}
    >
        <header class="transition-debug-modal__header">
            <div class="transition-debug-modal__title-block">
                <p class="transition-debug-modal__eyebrow">Live Territory Debug</p>
                <h2>Transition Diagnostics</h2>
                <p class="transition-debug-modal__copy">
                    Adjust shared metaball and perimeter-field transition controls
                    against the current live config.
                </p>
            </div>

            <button
                type="button"
                class="transition-debug-modal__close"
                aria-label="Close transition diagnostics"
                onclick={onClose}
            >
                X
            </button>
        </header>

        <div class="transition-debug-modal__body">
            <PerimeterFieldDiagnosticsPanel />
        </div>
    </section>
</div>

<style>
    .transition-debug-modal {
        position: fixed;
        inset: 0;
        z-index: 1550;
        display: flex;
        justify-content: flex-end;
        padding: 16px;
        isolation: isolate;
    }

    .transition-debug-modal__scrim {
        position: absolute;
        inset: 0;
        border: 0;
        background:
            radial-gradient(circle at top, rgba(34, 197, 94, 0.08), transparent 40%),
            rgba(5, 10, 20, 0.68);
        backdrop-filter: blur(8px);
        cursor: pointer;
    }

    .transition-debug-modal__shell {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: min(420px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        overflow: hidden;
        padding: 18px;
        border-radius: 20px;
        border: 1px solid rgba(150, 190, 255, 0.22);
        background:
            linear-gradient(180deg, rgba(18, 26, 40, 0.96), rgba(8, 12, 22, 0.98));
        box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        color: #d9e4f0;
    }

    .transition-debug-modal__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
    }

    .transition-debug-modal__title-block {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }

    .transition-debug-modal__eyebrow {
        margin: 0;
        color: #86efac;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
    }

    .transition-debug-modal__header h2 {
        margin: 0;
        color: #f7fbff;
        font-size: 1.3rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .transition-debug-modal__copy {
        margin: 0;
        color: rgba(217, 228, 240, 0.72);
        font-size: 0.92rem;
        line-height: 1.45;
    }

    .transition-debug-modal__close {
        flex: 0 0 auto;
        min-width: 40px;
        min-height: 40px;
        border-radius: 999px;
        border: 1px solid rgba(150, 190, 255, 0.22);
        background: rgba(20, 28, 44, 0.92);
        color: rgba(217, 228, 240, 0.88);
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            background-color 0.15s ease,
            color 0.15s ease;
    }

    .transition-debug-modal__close:hover {
        border-color: rgba(134, 239, 172, 0.6);
        background: rgba(28, 42, 62, 0.96);
        color: #ffffff;
    }

    .transition-debug-modal__body {
        overflow: auto;
        padding-right: 4px;
    }

    .transition-debug-modal__body::-webkit-scrollbar {
        width: 10px;
    }

    .transition-debug-modal__body::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.04);
        border-radius: 999px;
    }

    .transition-debug-modal__body::-webkit-scrollbar-thumb {
        background: rgba(150, 190, 255, 0.28);
        border-radius: 999px;
    }

    @media (max-width: 700px) {
        .transition-debug-modal {
            justify-content: center;
            padding: 12px;
        }

        .transition-debug-modal__shell {
            width: min(100%, 520px);
            max-height: calc(100vh - 24px);
            padding: 16px;
            border-radius: 18px;
        }

        .transition-debug-modal__header {
            gap: 10px;
        }

        .transition-debug-modal__header h2 {
            font-size: 1.12rem;
        }
    }
</style>
