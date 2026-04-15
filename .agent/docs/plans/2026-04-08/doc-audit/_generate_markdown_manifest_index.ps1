# Generates MARKDOWN_FULL_MANIFEST_VS_HEAD.md — full-repo .md inventory vs HEAD.
# Run from repo root:
#   powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_manifest_index.ps1
$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot
1..6 | ForEach-Object { $repoRoot = Split-Path $repoRoot -Parent }
Set-Location (Resolve-Path $repoRoot)

function Test-IsExcludedAuditPath([string]$path) {
    return $path -match '(?i)bmad'
}

function Get-MdPaths([string]$ref) {
    git ls-tree -r --name-only $ref | Where-Object { $_ -match '\.md$' -and -not (Test-IsExcludedAuditPath $_) }
}

$snaps = @(
    @{ Key = "HEAD"; Ref = "HEAD"; Label = "Current HEAD" }
    @{ Key = "D1"; Ref = "c4a30769fbed427282787371836731dbb15c6dd9"; Label = "End 2026-03-24 (c4a3076)" }
    @{ Key = "D2"; Ref = "ff5c3dfdc8148bb2831e2abb0b02d1e2cbd7701b"; Label = "End 2026-03-23 (ff5c3df)" }
    @{ Key = "D3"; Ref = "504bf6442304a8cda1bbedfe0ee5af5fab7e6694"; Label = "End 2026-03-22 (504bf64)" }
)

$sets = @{}
$basenames = @{}

foreach ($s in $snaps) {
    $paths = @(Get-MdPaths $s.Ref)
    $hs = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($p in $paths) { [void]$hs.Add($p) }
    $sets[$s.Key] = $hs
    $bn = @{}
    foreach ($p in $paths) {
        $leaf = Split-Path -Leaf $p
        if (-not $bn.ContainsKey($leaf)) { $bn[$leaf] = [System.Collections.Generic.List[string]]::new() }
        [void]$bn[$leaf].Add($p)
    }
    $basenames[$s.Key] = $bn
}

$head = $sets["HEAD"]
$d1 = $sets["D1"]
$d2 = $sets["D2"]
$d3 = $sets["D3"]

function Diff-OnlyInA([System.Collections.Generic.HashSet[string]]$a, [System.Collections.Generic.HashSet[string]]$b) {
    $only = New-Object System.Collections.Generic.List[string]
    foreach ($x in $a) {
        if (-not $b.Contains($x)) { $only.Add($x) }
    }
    $only.Sort([StringComparer]::Ordinal)
    return $only
}

$onlyD1 = Diff-OnlyInA $d1 $head
$onlyD2 = Diff-OnlyInA $d2 $head
$onlyD3 = Diff-OnlyInA $d3 $head
$onlyHeadVsD1 = Diff-OnlyInA $head $d1

$historicalOnlyUnion = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($p in $onlyD1) { [void]$historicalOnlyUnion.Add($p) }
foreach ($p in $onlyD2) { [void]$historicalOnlyUnion.Add($p) }
foreach ($p in $onlyD3) { [void]$historicalOnlyUnion.Add($p) }
$histList = [System.Collections.Generic.List[string]]::new($historicalOnlyUnion)
$histList.Sort([StringComparer]::Ordinal)

function Resolve-Basename([string]$path, $headBasenames) {
    $leaf = Split-Path -Leaf $path
    if ($headBasenames.ContainsKey($leaf)) {
        return ($headBasenames[$leaf] -join ' | ')
    }
    return ""
}

$headBn = $basenames["HEAD"]

$outPath = Join-Path $PSScriptRoot "MARKDOWN_FULL_MANIFEST_VS_HEAD.md"
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('# Markdown full manifest: historical commits vs current HEAD')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('**Method:** `git ls-tree -r --name-only <ref>` filtered to paths ending in `.md` (ASCII). Paths containing `bmad` (case-insensitive) are **excluded** from this audit manifest.')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Snapshot commits')
[void]$sb.AppendLine('')
foreach ($s in $snaps) {
    $log = (git log -1 --format="%h %ci %s" $s.Ref 2>$null)
    [void]$sb.AppendLine('- **' + $s.Label + '** - ' + $log)
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Counts')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| Snapshot | .md files |')
[void]$sb.AppendLine('|----------|-----------|')
foreach ($s in $snaps) {
    [void]$sb.AppendLine('| ' + $s.Label + ' | ' + $sets[$s.Key].Count + ' |')
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Only in historical tree, not in current HEAD (by snapshot)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('These paths existed in git at that commit but are absent at HEAD (deleted, renamed, or not on this branch).')
[void]$sb.AppendLine('')

function Append-DiffSection([string]$title, $list, $headBnMap) {
    [void]$sb.AppendLine('### ' + $title + ' (' + $list.Count + ' paths)')
    [void]$sb.AppendLine('')
    foreach ($p in $list) {
        $hint = Resolve-Basename $p $headBnMap
        if ($hint) {
            [void]$sb.AppendLine('- `' + $p + '` - *same basename at HEAD:* `' + $hint + '`')
        }
        else {
            [void]$sb.AppendLine('- `' + $p + '`')
        }
    }
    [void]$sb.AppendLine('')
}

Append-DiffSection 'End 2026-03-24 vs HEAD' $onlyD1 $headBn
Append-DiffSection 'End 2026-03-23 vs HEAD' $onlyD2 $headBn
Append-DiffSection 'End 2026-03-22 vs HEAD' $onlyD3 $headBn

[void]$sb.AppendLine('## Union: in any of Mar22-Mar24 snapshots but not in HEAD (' + $histList.Count + ' unique paths)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('Tag key: `22` = present at end Mar22, `23` = end Mar23, `24` = end Mar24.')
[void]$sb.AppendLine('')
foreach ($p in $histList) {
    $tags = @()
    if ($d1.Contains($p)) { $tags += '24' }
    if ($d2.Contains($p)) { $tags += '23' }
    if ($d3.Contains($p)) { $tags += '22' }
    $tagStr = $tags -join ','
    $hint = Resolve-Basename $p $headBn
    if ($hint) {
        [void]$sb.AppendLine('- `[' + $tagStr + ']` `' + $p + '` -> `' + $hint + '`')
    }
    else {
        [void]$sb.AppendLine('- `[' + $tagStr + ']` `' + $p + '`')
    }
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Only in current HEAD, not at end of 2026-03-24 (' + $onlyHeadVsD1.Count + ' paths)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('New or re-introduced since the Mar 24 snapshot.')
[void]$sb.AppendLine('')
foreach ($p in $onlyHeadVsD1) {
    [void]$sb.AppendLine('- `' + $p + '`')
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Cross-index: every HEAD path vs snapshots (exact path)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('For each `.md` at current HEAD: whether the **same path** existed at end Mar22 / Mar23 / Mar24 (`Y` = yes, `-` = no).')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| Path | Mar22 | Mar23 | Mar24 |')
[void]$sb.AppendLine('|------|-------|-------|-------|')
$headSortedList = [System.Collections.Generic.List[string]]::new($head)
$headSortedList.Sort([StringComparer]::Ordinal)
foreach ($p in $headSortedList) {
    $c22 = if ($d3.Contains($p)) { 'Y' } else { '-' }
    $c23 = if ($d2.Contains($p)) { 'Y' } else { '-' }
    $c24 = if ($d1.Contains($p)) { 'Y' } else { '-' }
    $esc = $p -replace '\|', '\|'
    [void]$sb.AppendLine('| `' + $esc + '` | ' + $c22 + ' | ' + $c23 + ' | ' + $c24 + ' |')
}
[void]$sb.AppendLine('')
$histUnionAll = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($x in $d1) { [void]$histUnionAll.Add($x) }
foreach ($x in $d2) { [void]$histUnionAll.Add($x) }
foreach ($x in $d3) { [void]$histUnionAll.Add($x) }
$histAllSorted = [System.Collections.Generic.List[string]]::new($histUnionAll)
$histAllSorted.Sort([StringComparer]::Ordinal)
[void]$sb.AppendLine('## Cross-index: every historical path (union of three snapshots) vs HEAD')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('Union of all `.md` paths that appear in **any** of the three snapshots (' + $histAllSorted.Count + ' unique paths). `HEAD` = exact path at current HEAD; if `-`, check basename hints in sections above.')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| Path | in 22 | in 23 | in 24 | at HEAD |')
[void]$sb.AppendLine('|------|-------|-------|-------|---------|')
foreach ($p in $histAllSorted) {
    $i22 = if ($d3.Contains($p)) { 'Y' } else { '-' }
    $i23 = if ($d2.Contains($p)) { 'Y' } else { '-' }
    $i24 = if ($d1.Contains($p)) { 'Y' } else { '-' }
    $atHead = if ($head.Contains($p)) { 'Y' } else { '-' }
    $esc = $p -replace '\|', '\|'
    [void]$sb.AppendLine('| `' + $esc + '` | ' + $i22 + ' | ' + $i23 + ' | ' + $i24 + ' | ' + $atHead + ' |')
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Full path lists (appendix)')
[void]$sb.AppendLine('')
foreach ($s in $snaps) {
    $sorted = [System.Collections.Generic.List[string]]::new($sets[$s.Key])
    $sorted.Sort([StringComparer]::Ordinal)
    [void]$sb.AppendLine('### ' + $s.Label + ' - ' + $sorted.Count + ' files')
    [void]$sb.AppendLine('')
    foreach ($p in $sorted) {
        [void]$sb.AppendLine('- `' + $p + '`')
    }
    [void]$sb.AppendLine('')
}

$genLine = '**Generated:** ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ' (local)'
$regen = '**Regenerate:** run from repo root: `powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_manifest_index.ps1`'
$full = $genLine + "`n`n" + $regen + "`n`n" + $sb.ToString()
[System.IO.File]::WriteAllText($outPath, $full, [System.Text.UTF8Encoding]::new($false))
Write-Host "Wrote $outPath"
