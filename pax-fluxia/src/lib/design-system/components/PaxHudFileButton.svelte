<script lang="ts">
  import PaxHudIconButton from "./PaxHudIconButton.svelte";

  interface Props {
    icon: string;
    title: string;
    accept?: string;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    class?: string;
    onFileSelected: (file: File, event: Event) => void;
  }

  let {
    icon,
    title,
    accept,
    active = false,
    danger = false,
    disabled = false,
    class: className = "",
    onFileSelected,
  }: Props = $props();

  let inputElement: HTMLInputElement | null = $state(null);

  function openPicker() {
    if (disabled) return;
    inputElement?.click();
  }

  function handleChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      onFileSelected(file, event);
    }
    input.value = "";
  }
</script>

<span class="pax-hud-file-button">
  <PaxHudIconButton
    {icon}
    {title}
    {active}
    {danger}
    {disabled}
    class={className}
    onclick={openPicker}
  />
  <input
    bind:this={inputElement}
    class="pax-hud-file-button__input"
    type="file"
    {accept}
    tabindex="-1"
    aria-hidden="true"
    onchange={handleChange}
  />
</span>

<style>
  .pax-hud-file-button {
    display: inline-flex;
  }

  .pax-hud-file-button__input {
    position: fixed;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    pointer-events: none;
  }
</style>
