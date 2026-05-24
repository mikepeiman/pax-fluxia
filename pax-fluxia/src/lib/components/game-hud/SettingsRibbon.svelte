<script lang="ts">
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
    onSectionActivityChange?: (hasOpenSections: boolean) => void;
    onRestartGame?: () => void;
    onQuitGame?: () => void;
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
    onSectionActivityChange,
    onRestartGame,
    onQuitGame,
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
  <GameSettingsPanel
    {forceOpenSection}
    {forceOpenSectionNonce}
    {ribbonExpanded}
    {onToggleRibbonExpanded}
    {dockSide}
    {onToggleDockSide}
    {onSectionActivityChange}
    onCloseSettings={onClose}
    {onRestartGame}
    {onQuitGame}
  />
</aside>
