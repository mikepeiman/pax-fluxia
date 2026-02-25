
# Fix $props() syntax in all ControlsSection sub-components
# Replaces invalid "let { key: Type } = $props()" with "interface Props + let {...} = $props<Props>()"
param()

$dir = "c:\Users\mikep\Desktop\WebDev\PRISM-Atlas-DART v1\pax-fluxia\src\lib\components\ui\settings"

# Props definitions for each component
$propsMap = @{
    "ControlsSection-Timing"   = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        tickInterval: number;
        updateTickInterval: (v: number) => void;
        animLockModes: Record<string, any>;
        animLockRatios: Record<string, any>;
        animValues: Record<string, number>;
        getAnimValue: (key: string) => number;
        setAnimValue: (key: string, val: number) => void;
        formatAnimValue: (val: number, unit: string) => string;
        pinValueToTickDuration: (key: string) => void;
        lockRatioToTick: (key: string) => void;
        lockRatioToAnimSpeed: (key: string) => void;
    }
"@
        destructure = "    let { panel, updatePanel, tickInterval, updateTickInterval, animLockModes, animLockRatios, animValues, getAnimValue, setAnimValue, formatAnimValue, pinValueToTickDuration, lockRatioToTick, lockRatioToAnimSpeed } = `$props<Props>();"
    }
    "ControlsSection-Battle"   = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        values: Record<string, number>;
        enabled: Record<string, boolean>;
        updateValue: (key: string, val: number) => void;
        toggle: (key: string) => void;
    }
"@
        destructure = "    let { panel, updatePanel, values, enabled, updateValue, toggle } = `$props<Props>();"
    }
    "ControlsSection-Economy"  = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        transferRate: number;
        updateTransferRate: (v: number) => void;
    }
"@
        destructure = "    let { panel, updatePanel, transferRate, updateTransferRate } = `$props<Props>();"
    }
    "ControlsSection-AI"       = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        values: Record<string, number>;
        enabled: Record<string, boolean>;
        updateValue: (key: string, val: number) => void;
        toggle: (key: string) => void;
    }
"@
        destructure = "    let { panel, updatePanel, values, enabled, updateValue, toggle } = `$props<Props>();"
    }
    "ControlsSection-Travel"   = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }
"@
        destructure = "    let { panel, updatePanel } = `$props<Props>();"
    }
    "ControlsSection-Surge"    = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }
"@
        destructure = "    let { panel, updatePanel } = `$props<Props>();"
    }
    "ControlsSection-Conquest" = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }
"@
        destructure = "    let { panel, updatePanel } = `$props<Props>();"
    }
    "ControlsSection-Ships"    = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }
"@
        destructure = "    let { panel, updatePanel } = `$props<Props>();"
    }
    "ControlsSection-Visuals"  = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        vis: Record<string, any>;
        updateVisual: (key: string, val: any) => void;
        densityVariables: any[];
    }
"@
        destructure = "    let { panel, updatePanel, vis, updateVisual, densityVariables } = `$props<Props>();"
    }
    "ControlsSection-Rules"    = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
    }
"@
        destructure = "    let { panel, updatePanel } = `$props<Props>();"
    }
    "ControlsSection-Logging"  = @{
        interface   = @"
    interface Props {
        panel: Record<string, any>;
        updatePanel: (key: string, value: any) => void;
        logCategories: any[];
        logRefresh: number;
    }
"@
        destructure = "    let { panel, updatePanel, logCategories, logRefresh } = `$props<Props>();"
    }
}

foreach ($compName in $propsMap.Keys) {
    $filePath = Join-Path $dir "$compName.svelte"
    if (-not (Test-Path $filePath)) {
        Write-Host "MISSING: $filePath"
        continue
    }
    
    $c = Get-Content $filePath -Raw -Encoding UTF8
    
    $meta = $propsMap[$compName]
    $iface = $meta.interface
    $destr = $meta.destructure
    
    # Replace the bad let { ... } = $props(); block with interface + clean destructure
    # The bad block starts with "    let {" and ends with "    } = $props();"
    $c = [regex]::Replace($c, '(?s)    let \{.*?\} = \$props\(\);', "$iface`n$destr")
    
    # Also remove stray section comment stragglers like "<!-- ⚔️ BATTLE -->"
    $c = $c -replace '(?m)\r?\n\<!-- [^>]+ --\>\r?\n$', ''
    
    [System.IO.File]::WriteAllText($filePath, $c, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed: $compName.svelte"
}

Write-Host "All components fixed."
