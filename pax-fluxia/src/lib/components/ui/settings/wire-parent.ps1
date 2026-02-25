
# Phase 2d: Use dotall regex to replace each section body content atomically
# This avoids all nesting issues by matching on the unique first line of each section
param()

$file = "c:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\components\ui\GameSettingsPanel.svelte"
$content = Get-Content $file -Raw -Encoding UTF8

Write-Host "File size before: $($content.Length) chars"

# Helper to escape for use in replacement string
function escape_replace($s) { $s -replace '\$', '$$$$' }

# Each section replacement:  match from the {#if/else if} line through to the next {:else if or /if}
# Strategy: after the {#if sec.id === "X"} line, everything up to the NEXT \{:else if OR \{/if\} gets replaced
# We match greedily but stop at the next section boundary using a lookahead equivalent:
# Use [\s\S]*? (lazy) followed by (?=\s*\{(?::else if|/if))

$sectionReplacements = @(
    @{
        id        = "speed"
        component = @"

                    <ControlsSectionTiming
                        {panel}
                        {updatePanel}
                        {tickInterval}
                        {updateTickInterval}
                        {animLockModes}
                        {animLockRatios}
                        {animValues}
                        {getAnimValue}
                        {setAnimValue}
                        {formatAnimValue}
                        {pinValueToTickDuration}
                        {lockRatioToTick}
                        {lockRatioToAnimSpeed}
                    />
                
"@
    }
    @{
        id        = "battle"
        component = @"

                    <ControlsSectionBattle
                        {panel}
                        {updatePanel}
                        {values}
                        {enabled}
                        {updateValue}
                        {toggle}
                    />
                
"@
    }
    @{
        id        = "economy"
        component = @"

                    <ControlsSectionEconomy
                        {panel}
                        {updatePanel}
                        {transferRate}
                        {updateTransferRate}
                    />
                
"@
    }
    @{
        id        = "ai"
        component = @"

                    <ControlsSectionAI
                        {panel}
                        {updatePanel}
                        {values}
                        {enabled}
                        {updateValue}
                        {toggle}
                    />
                
"@
    }
    @{
        id        = "travel"
        component = @"

                    <ControlsSectionTravel
                        {panel}
                        {updatePanel}
                    />
                
"@
    }
    @{
        id        = "surge"
        component = @"

                    <ControlsSectionSurge
                        {panel}
                        {updatePanel}
                    />
                
"@
    }
    @{
        id        = "conquest"
        component = @"

                    <ControlsSectionConquest
                        {panel}
                        {updatePanel}
                    />
                
"@
    }
    @{
        id        = "ships"
        component = @"

                    <ControlsSectionShips
                        {panel}
                        {updatePanel}
                    />
                
"@
    }
    @{
        id        = "visuals"
        component = @"

                    <ControlsSectionVisuals
                        {panel}
                        {updatePanel}
                        {vis}
                        {updateVisual}
                        densityVariables={densityVariables}
                    />
                
"@
    }
    @{
        id        = "rules"
        component = @"

                    <ControlsSectionRules
                        {panel}
                        {updatePanel}
                    />
                
"@
    }
    @{
        id        = "logging"
        component = @"

                    <ControlsSectionLogging
                        {panel}
                        {updatePanel}
                        logCategories={logCategories}
                        {logRefresh}
                    />
                
"@
    }
)

foreach ($sr in $sectionReplacements) {
    $sid = $sr.id
    $comp = $sr.component
    
    # Match from after the {#if spec.id === "X"} or {:else if sec.id === "X"} boundary line
    # to just before the next boundary line (lazy match)
    # Pattern: the boundary line, then capture everything until next boundary
    $pattern = "(?s)((?:#if|:else if) sec\.id === `"$sid`"\})([\s\S]*?)(?=\s*\{(?::else if|/if\}))"
    
    $before = $content.Length
    $content = [regex]::Replace($content, $pattern, {
            param($m)
            $m.Groups[1].Value + $comp
        })
    
    if ($content.Length -ne $before) {
        Write-Host "Replaced section: $sid (delta: $($content.Length - $before) chars)"
    }
    else {
        Write-Host "WARNING: No change for section: $sid"
    }
}

# Add component imports after panelSync import
$importBlock = @"
    import ControlsSectionTiming   from './settings/ControlsSection-Timing.svelte';
    import ControlsSectionBattle   from './settings/ControlsSection-Battle.svelte';
    import ControlsSectionEconomy  from './settings/ControlsSection-Economy.svelte';
    import ControlsSectionAI       from './settings/ControlsSection-AI.svelte';
    import ControlsSectionTravel   from './settings/ControlsSection-Travel.svelte';
    import ControlsSectionSurge    from './settings/ControlsSection-Surge.svelte';
    import ControlsSectionConquest from './settings/ControlsSection-Conquest.svelte';
    import ControlsSectionShips    from './settings/ControlsSection-Ships.svelte';
    import ControlsSectionVisuals  from './settings/ControlsSection-Visuals.svelte';
    import ControlsSectionRules    from './settings/ControlsSection-Rules.svelte';
    import ControlsSectionLogging  from './settings/ControlsSection-Logging.svelte';
"@

$content = $content -replace "(    \} from '\./panelSync';)", "`$1`n$importBlock"

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)

$finalLines = (Get-Content $file -Encoding UTF8).Length
Write-Host "File size after: $($content.Length) chars. Lines: $finalLines"
