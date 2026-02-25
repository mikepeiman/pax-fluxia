
# Phase 2: Extract section content from GameSettingsPanel.svelte into ControlsSection-*.svelte sub-components
param()

$file = "c:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\components\ui\GameSettingsPanel.svelte"
$outDir = "c:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\components\ui\settings"

$lines = Get-Content $file -Encoding UTF8

# Find section boundaries (0-indexed line numbers)
$sectionIds = @("speed","battle","economy","ai","travel","surge","conquest","ships","visuals","rules","logging")

$sectionStarts = @{}
for ($i = 0; $i -lt $lines.Length; $i++) {
    foreach ($sid in $sectionIds) {
        if ($lines[$i] -match "(?:if|else if) sec\.id === `"$($sid)`"") {
            $sectionStarts[$sid] = $i
        }
    }
}

Write-Host "=== Section start lines (0-indexed) ==="
$sectionStarts.GetEnumerator() | Sort-Object Value | ForEach-Object {
    Write-Host "  $($_.Key): line $($_.Value) (display: $($_.Value + 1))"
}

# Sort sections by line number  
$ordered = $sectionStarts.GetEnumerator() | Sort-Object Value | ForEach-Object { $_.Key }

# For each section, find its content lines (between the {#if/else if} line and the next {else if/if}):
$sectionContent = @{}
$sortedStarts = $sectionStarts.GetEnumerator() | Sort-Object Value | ForEach-Object { @{Key=$_.Key; Start=$_.Value} }

for ($s = 0; $s -lt $sortedStarts.Count; $s++) {
    $sid = $sortedStarts[$s].Key
    $start = $sortedStarts[$s].Start + 1  # line after the {#if/else if} line
    
    if ($s + 1 -lt $sortedStarts.Count) {
        $end = $sortedStarts[$s + 1].Start - 1  # line before next section's {:else if}
    } else {
        # Last section - find the closing {/if} of the dispatch block
        $end = $start
        for ($j = $start; $j -lt $lines.Length; $j++) {
            if ($lines[$j] -match "^\s+\{:else if sec\.id|^\s+\{/if\}") {
                $end = $j - 1
                break
            }
        }
    }
    
    # Trim trailing blank lines
    while ($end -gt $start -and [string]::IsNullOrWhiteSpace($lines[$end])) { $end-- }
    
    $sectionContent[$sid] = $lines[$start..$end]
    Write-Host "Section '$sid': lines $($start+1) to $($end+1) ($($end - $start + 1) lines)"
}

# Section name mapping: id -> component name + display name
$sectionMeta = @{
    "speed"    = @{ Name = "ControlsSection-Timing";   Label = "Timing" }
    "battle"   = @{ Name = "ControlsSection-Battle";   Label = "Battle" }
    "economy"  = @{ Name = "ControlsSection-Economy";  Label = "Core / Economy" }
    "ai"       = @{ Name = "ControlsSection-AI";       Label = "AI Behavior" }
    "travel"   = @{ Name = "ControlsSection-Travel";   Label = "Path & Easing" }
    "surge"    = @{ Name = "ControlsSection-Surge";    Label = "Surge & Orbs" }
    "conquest" = @{ Name = "ControlsSection-Conquest"; Label = "Conquest" }
    "ships"    = @{ Name = "ControlsSection-Ships";    Label = "Ship Appearance" }
    "visuals"  = @{ Name = "ControlsSection-Visuals";  Label = "Map & Grid" }
    "rules"    = @{ Name = "ControlsSection-Rules";    Label = "Rules" }
    "logging"  = @{ Name = "ControlsSection-Logging";  Label = "Logging" }
}

# Sections that need animLock props (only "speed" since it has ANIM_SLIDERS)
$needsAnimLock = @("speed")
# Sections that need values/enabled/toggle/updateValue (combat-style sliders)
$needsCombat = @("battle", "ai")

# Build component files
foreach ($sid in $sectionIds) {
    $meta = $sectionMeta[$sid]
    $componentName = $meta.Name
    $label = $meta.Label
    $bodyLines = $sectionContent[$sid]
    
    # De-indent by 20 spaces (5 levels of 4-space indent in the parent)
    $dedented = $bodyLines | ForEach-Object {
        if ($_.Length -ge 20 -and $_.Substring(0, [Math]::Min(20, $_.Length)).Trim() -eq "") {
            $_.Substring([Math]::Min(20, $_.Length))
        } else {
            $_.TrimStart()
        }
    }
    $body = $dedented -join "`n"
    
    # Build props list based on section needs
    $propsBase = @(
        "    panel: Record<string, any>,"
        "    updatePanel: (key: string, value: any) => void,"
    )
    
    $extraProps = ""
    $extraImports = ""
    
    if ($needsCombat -contains $sid) {
        $extraProps += @"
    values: Record<string, number>,
    enabled: Record<string, boolean>,
    updateValue: (key: string, val: number) => void,
    toggle: (key: string) => void,
"@
    }
    
    if ($sid -eq "economy") {
        $extraProps += "    transferRate: number,`n    updateTransferRate: (v: number) => void,`n"
    }
    
    if ($sid -eq "speed") {
        $extraProps += @"
    tickInterval: number,
    updateTickInterval: (v: number) => void,
    animLockModes: Record<string, any>,
    animLockRatios: Record<string, any>,
    animValues: Record<string, number>,
    getAnimValue: (key: string) => number,
    setAnimValue: (key: string, val: number) => void,
    formatAnimValue: (val: number, unit: string) => string,
    pinValueToTickDuration: (key: string) => void,
    lockRatioToTick: (key: string) => void,
    lockRatioToAnimSpeed: (key: string) => void,
"@
        $extraImports = "    import { GAME_CONFIG } from `"`$lib/config/game.config`";`n    import { animationStore } from `"`$lib/stores/animationStore.svelte`";`n    import { ANIM_SLIDERS } from `"../settingsDefs`";`n    import { recalcAnimLocksOnTickChange, recalcAnimLocksOnAnimSpeedChange } from `"../panelSync`";"
    }
    
    if ($sid -eq "visuals") {
        $extraProps += @"
    vis: Record<string, any>,
    updateVisual: (key: string, val: any) => void,
    densityVariables: any[],
"@
    }
    
    if ($sid -eq "logging") {
        $extraProps += "    logCategories: any[],`n    logRefresh: number,`n"
    }
    
    if ($sid -eq "ships") {
        $extraProps += ""
    }
    
    # Default: add GAME_CONFIG import
    if (-not $extraImports) {
        $extraImports = "    import { GAME_CONFIG } from `"`$lib/config/game.config`";"
    }
    
    $propsAll = ($propsBase -join "`n") + "`n" + $extraProps.TrimEnd()
    
    $componentContent = @"
<script lang="ts">
$extraImports

    // ControlsSection-$($sid.ToUpper()) — In-Game Settings Controls: $label
    // Extracted from GameSettingsPanel.svelte

    let {
$propsAll
    } = `$props();
</script>

$body
"@
    
    $outPath = Join-Path $outDir "$componentName.svelte"
    Set-Content -Path $outPath -Value $componentContent -Encoding UTF8
    Write-Host "Created: $componentName.svelte ($($bodyLines.Length) extracted lines)"
}

Write-Host "`nAll $($sectionIds.Length) section components created in $outDir"
