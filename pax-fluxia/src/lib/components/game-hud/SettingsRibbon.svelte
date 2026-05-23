<script lang="ts">
  import HudIcon from "$lib/components/ui/hud/HudIcon.svelte";
  import GameSettingsPanel from "$lib/components/ui/GameSettingsPanel.svelte";
  import type { SettingsSectionId } from "$lib/components/ui/settings/settingsRegistry";
  import type { HudDockSide } from "./types";

  interface Props {
    width: number;
    dockSide: HudDockSide;
    resizeActive: boolean;
    ribbonExpanded: boolean;
    forceOpenSection: SettingsSectionId | null;
    forceOpenSectionNonce: number;
    onResizePointerDown: (event: PointerEvent) => void;
    onClose: () => void;
    onToggleRibbonExpanded: () => void;
    onToggleDockSide: () => void;
    class?: string;
  }

  let {
    width,
    dockSide,
    resizeActive,
    ribbonExpanded,
    forceOpenSection,
    forceOpenSectionNonce,
    onResizePointerDown,
    onClose,
    onToggleRibbonExpanded,
    onToggleDockSide,
    class: className = "",
  }: Props = $props();
</script>

<aside
  class={`pf-settings-ribbon ${className}`}
  class:pf-settings-ribbon--dock-left={dockSide === "left"}
  style={`width:${width}px;`}
>
  <div
    class="pf-settings-ribbon__resize"
    class:active={resizeActive}
    role="separator"
    aria-orientation="vertical"
    title="Drag to resize settings"
    onpointerdown={onResizePointerDown}
  ></div>
  <button
    type="button"
    class="pf-settings-ribbon__close"
    onclick={onClose}
    title="Close settings"
    aria-label="Close settings"
  >
    <HudIcon name="close" size={14} />
  </button>
  <GameSettingsPanel
    {forceOpenSection}
    {forceOpenSectionNonce}
    {ribbonExpanded}
    {onToggleRibbonExpanded}
    {dockSide}
    {onToggleDockSide}
  />
</aside>
