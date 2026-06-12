<script lang="ts">
  import { ToggleGroup } from "@ark-ui/svelte/toggle-group";
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import {
    hudSegmentedControl,
    type HudSegmentedControlVariants,
  } from "$lib/design-system/variants/hud";

  export interface PaxHudSegmentedOption {
    value: string;
    label: string;
    icon?: string;
    title?: string;
    disabled?: boolean;
  }

  interface Props {
    value: string;
    options: PaxHudSegmentedOption[];
    ariaLabel: string;
    density?: HudSegmentedControlVariants["density"];
    iconSize?: number;
    class?: string;
    onValueChange: (value: string) => void;
  }

  let {
    value,
    options,
    ariaLabel,
    density = "balanced",
    iconSize = 15,
    class: className = "",
    onValueChange,
  }: Props = $props();

  const styles = $derived(hudSegmentedControl({ density }));

  function handleValueChange(details: { value: string[] }) {
    const nextValue = details.value[0];
    if (nextValue != null && nextValue !== value) {
      onValueChange(nextValue);
    }
  }
</script>

<ToggleGroup.Root
  value={[value]}
  onValueChange={handleValueChange}
  class={styles.root({ class: className })}
  aria-label={ariaLabel}
>
  {#each options as option}
    <ToggleGroup.Item
      value={option.value}
      disabled={option.disabled}
      title={option.title ?? option.label}
      aria-label={option.title ?? option.label}
      class={styles.item()}
    >
      {#if option.icon}
        <HudIcon name={option.icon} size={iconSize} />
      {/if}
      <span>{option.label}</span>
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>
