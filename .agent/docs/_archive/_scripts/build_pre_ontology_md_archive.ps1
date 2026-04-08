# Builds pre-ontology Markdown recovery archive: historical Mar22-24 blobs not represented at HEAD.
# Rules: .md only; group by basename (case-insensitive); one archived file per basename;
#        multiple variants -> largest blob, tie-break Mar24 > Mar23 > Mar22.
# Skips a blob if the same SHA exists in ANY HEAD file with the same basename.
# Run from repo root:
#   powershell -NoProfile -File .agent/docs/_archive/_scripts/build_pre_ontology_md_archive.ps1
$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path "$PSScriptRoot/../../../..").Path
Set-Location $repoRoot

$archiveRoot = Join-Path $repoRoot ".agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24"
$filesDir = Join-Path $archiveRoot "files"
if (Test-Path $archiveRoot) { Remove-Item -Recurse -Force $archiveRoot }
New-Item -ItemType Directory -Force -Path $filesDir | Out-Null

$snaps = @(
    @{ Key = "Mar24"; Ref = "c4a30769fbed427282787371836731dbb15c6dd9"; Rank = 3 }
    @{ Key = "Mar23"; Ref = "ff5c3dfdc8148bb2831e2abb0b02d1e2cbd7701b"; Rank = 2 }
    @{ Key = "Mar22"; Ref = "504bf6442304a8cda1bbedfe0ee5af5fab7e6694"; Rank = 1 }
)

function Build-PathToShaMap([string]$ref) {
    $map = @{}
    $lines = git ls-tree -r $ref
    foreach ($line in $lines) {
        if ($line -notmatch '^[0-9]+ blob ([0-9a-f]{40})\t(.+)$') { continue }
        $sha = $Matches[1]
        $p = $Matches[2]
        if ($p -notmatch '\.md$') { continue }
        $map[$p] = $sha
    }
    return $map
}

function Get-BlobSize([string]$sha) {
    [long]$n = 0
    $s = git cat-file -s $sha 2>$null
    if ([long]::TryParse($s, [ref]$n)) { return $n }
    return 0
}

Write-Host "ls-tree HEAD..."
$headMap = Build-PathToShaMap "HEAD"
Write-Host "ls-tree snapshots..."
$snapMaps = @{}
foreach ($snap in $snaps) {
    Write-Host "  $($snap.Key) $($snap.Ref.Substring(0,7))..."
    $snapMaps[$snap.Key] = Build-PathToShaMap $snap.Ref
}

# HEAD: basename lower -> set of blob SHAs
$headByBase = @{}
foreach ($entry in $headMap.GetEnumerator()) {
    $p = $entry.Key
    $sha = $entry.Value
    $b = [System.IO.Path]::GetFileName($p).ToLowerInvariant()
    if (-not $headByBase.ContainsKey($b)) { $headByBase[$b] = [System.Collections.Generic.HashSet[string]]::new() }
    [void]$headByBase[$b].Add($sha)
}

# Union of historical paths
$histPaths = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($snap in $snaps) {
    foreach ($p in $snapMaps[$snap.Key].Keys) { [void]$histPaths.Add($p) }
}

# basename -> list of @{ Sha; Size; Rank; Key; SourcePath }
$candidatesByBase = @{}

foreach ($path in $histPaths) {
    $base = [System.IO.Path]::GetFileName($path)
    $baseKey = $base.ToLowerInvariant()

    foreach ($snap in $snaps) {
        $m = $snapMaps[$snap.Key]
        if (-not $m.ContainsKey($path)) { continue }
        $sha = $m[$path]

        if ($headByBase.ContainsKey($baseKey) -and $headByBase[$baseKey].Contains($sha)) {
            continue
        }

        if (-not $candidatesByBase.ContainsKey($baseKey)) {
            $candidatesByBase[$baseKey] = [System.Collections.Generic.List[hashtable]]::new()
        }
        $candidatesByBase[$baseKey].Add(@{
            Sha        = $sha
            Rank       = $snap.Rank
            Key        = $snap.Key
            SourcePath = $path
        })
    }
}

# Per basename: unique by SHA (keep best rank per SHA), then winner by size then rank
$winners = [System.Collections.Generic.List[object]]::new()
foreach ($baseKey in ($candidatesByBase.Keys | Sort-Object)) {
    $list = $candidatesByBase[$baseKey]
    $bySha = @{}
    foreach ($c in $list) {
        if (-not $bySha.ContainsKey($c.Sha)) {
            $bySha[$c.Sha] = $c
        }
        else {
            $e = $bySha[$c.Sha]
            if ($c.Rank -gt $e.Rank) { $bySha[$c.Sha] = $c }
            }
    }
    $unique = @($bySha.Values)
    foreach ($u in $unique) {
        $u.Size = Get-BlobSize $u.Sha
    }
    $winner = $unique | Sort-Object -Property @{ Expression = { $_.Size }; Descending = $true }, @{ Expression = { $_.Rank }; Descending = $true } | Select-Object -First 1
    [void]$winners.Add([PSCustomObject]@{
            Basename   = [System.IO.Path]::GetFileName($winner.SourcePath)
            BaseKey    = $baseKey
            BlobSha    = $winner.Sha
            Size       = $winner.Size
            Snapshot   = $winner.Key
            SourcePath = $winner.SourcePath
        })
}

$manifestLines = [System.Collections.Generic.List[string]]::new()
[void]$manifestLines.Add("basename`tblob_sha`tsize_bytes`tsnapshot`tsource_path_at_snapshot")

$unsafe = '[<>:"/\\|?*]'

Write-Host "Writing $($winners.Count) files..."
foreach ($w in ($winners | Sort-Object BaseKey)) {
    $safeName = $w.Basename
    if ($safeName -match $unsafe) {
        $safeName = ($w.BaseKey -replace $unsafe, '_') + '.md'
    }
    $outFile = Join-Path $filesDir $safeName
    $n = 1
    while (Test-Path $outFile) {
        $stem = [System.IO.Path]::GetFileNameWithoutExtension($safeName)
        $outFile = Join-Path $filesDir ($stem + "_" + $n + ".md")
        $n++
    }

    $content = git cat-file blob $w.BlobSha
    [System.IO.File]::WriteAllText($outFile, $content, [System.Text.UTF8Encoding]::new($false))

    [void]$manifestLines.Add(
        ($w.Basename + "`t" + $w.BlobSha + "`t" + $w.Size + "`t" + $w.Snapshot + "`t" + $w.SourcePath)
    )
}

$readme = @'
# Pre-ontology Markdown recovery (Mar 22-24, 2026)

**Generated:** __GEN__

Historical snapshots: `504bf64` (end Mar 22), `ff5c3df` (end Mar 23), `c4a3076` (end Mar 24).

## What was archived

For each **basename** `*.md` that appeared under those trees: if the blob **SHA** was **not** already present in **any** current `HEAD` file with the **same basename** (case-insensitive), one copy was written under `files/`.

When several historical paths or snapshots produced different blobs for the same basename, **one** blob was kept: **largest size**, then **newer snapshot** (Mar24 > Mar23 > Mar22).

## Layout

- `files/` - recovered markdown (flat; names from original basename; rare collision -> numeric suffix).
- `MANIFEST.tsv` - basename, blob SHA, size, winning snapshot, source path at that snapshot.

## Regenerate

From repo root:

```powershell
powershell -NoProfile -File .agent/docs/_archive/_scripts/build_pre_ontology_md_archive.ps1
```

## Atlas Harness (optional)

Use MCP atlas-harness `file_list` / `file_read` to spot-check, or `code_references` after re-homing content. Bulk extraction uses git + this script.

## Caveat

Same basename in different folders may have been different documents; this archive keeps **one** body per basename. Use `MANIFEST.tsv` and `git show <blob>` for other SHAs if needed.
'@
$readme = $readme.Replace('__GEN__', (Get-Date -Format 'yyyy-MM-dd HH:mm'))

[System.IO.File]::WriteAllText((Join-Path $archiveRoot "README.md"), $readme, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllLines((Join-Path $archiveRoot "MANIFEST.tsv"), $manifestLines, [System.Text.UTF8Encoding]::new($false))

Write-Host "Done. Archive: $archiveRoot"
Write-Host "Files written: $($winners.Count)"
