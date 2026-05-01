/**
 * nudgeSliders — Svelte action that auto-injects +/- nudge buttons
 * around every input[type="range"] inside the host element.
 *
 * Usage: <div use:nudgeSliders>...sliders...</div>
 *
 * - Uses MutationObserver to catch dynamically-added sliders
 * - Reads step/min/max from the input attributes
 * - Dispatches native 'input' event so existing oninput handlers fire
 * - Mirrors the input's disabled state onto the injected buttons
 */

function createNudgeBtn(label: string, direction: -1 | 1, input: HTMLInputElement): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slider-nudge-btn';
    btn.textContent = label;
    btn.setAttribute('aria-label', direction === -1 ? 'Decrease' : 'Increase');
    btn.addEventListener('click', (e) => {
        if (input.disabled || btn.disabled) return;
        e.preventDefault();
        e.stopPropagation();
        const step = parseFloat(input.step) || 1;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const current = parseFloat(input.value);
        const next = Math.min(max, Math.max(min, current + step * direction));
        // Use native setter to trigger Svelte's event handling
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        )?.set;
        nativeInputValueSetter?.call(input, String(next));
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return btn;
}

function syncNudgeState(input: HTMLInputElement) {
    const wrapper = input.parentElement;
    if (!wrapper?.classList.contains('nudge-slider-wrap')) return;
    const disabled = input.disabled;
    wrapper.classList.toggle('nudge-slider-wrap--disabled', disabled);
    const buttons = wrapper.querySelectorAll<HTMLButtonElement>('.slider-nudge-btn');
    buttons.forEach((btn) => {
        btn.disabled = disabled;
        btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
}

function wrapSlider(input: HTMLInputElement) {
    // Skip if already wrapped
    if (input.parentElement?.classList.contains('nudge-slider-wrap')) {
        syncNudgeState(input);
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'nudge-slider-wrap';
    input.parentElement?.insertBefore(wrapper, input);
    wrapper.appendChild(createNudgeBtn('−', -1, input));
    wrapper.appendChild(input);
    wrapper.appendChild(createNudgeBtn('+', 1, input));
    syncNudgeState(input);
}

export function nudgeSliders(node: HTMLElement) {
    function processAll() {
        const sliders = node.querySelectorAll<HTMLInputElement>('input[type="range"]');
        sliders.forEach(wrapSlider);
    }

    // Defer to let Svelte finish rendering
    const initTimer = setTimeout(processAll, 100);

    // Watch for dynamically-added sliders (tab switches, etc.)
    const observer = new MutationObserver(() => {
        setTimeout(processAll, 50);
    });
    observer.observe(node, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled']
    });

    return {
        destroy() {
            clearTimeout(initTimer);
            observer.disconnect();
        }
    };
}
