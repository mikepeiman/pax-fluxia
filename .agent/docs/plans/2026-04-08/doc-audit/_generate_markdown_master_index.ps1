# Emits MARKDOWN_MASTER_INDEX.csv + MARKDOWN_MASTER_INDEX.md — one row per git-tracked *.md.
# Columns: path, category, bytes, git_first_commit, git_first_date, git_last_commit, git_last_date,
#          in_tree_mar22, in_tree_mar24, processing_status, notes
# Excludes paths whose repo-relative path contains "bmad" (case-insensitive), e.g. `.agent/workflows/bmad-*`.
# Snapshot refs match _generate_markdown_manifest_index.ps1 (tree membership, not basename recovery).
#
# Run from repo root:
#   powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_master_index.ps1
#
# Optional: restrict scope (edit $ScopePrefixes):
#   $null or @() = entire repo; otherwise only paths starting with one of these prefixes (forward slashes).
$ErrorActionPreference = "Stop"
# doc-audit -> repo root: 2026-04-08, impl-plans, project, docs, .agent, repo (6 parents)
$repoRoot = $PSScriptRoot
1..6 | ForEach-Object { $repoRoot = Split-Path $repoRoot -Parent }
Set-Location (Resolve-Path $repoRoot)

# Git prints UTF-8; Windows PowerShell 5.x defaults can mangle non-ASCII pathnames.
$script:_PrevOutputEncoding = $OutputEncoding
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch { }

# --- config ---
$ScopePrefixes = @()
$RefMar22 = '504bf6442304a8cda1bbedfe0ee5af5fab7e6694'
$RefMar24 = 'c4a30769fbed427282787371836731dbb15c6dd9'

function Test-IsExcludedAuditPath([string]$path) {
    # Any path segment or filename containing "bmad" (e.g. bmad-master.md, workflows/bmad-foo.md).
    return $path -match '(?i)bmad'
}

function Normalize-RepoPath([string]$p) {
    return ($p -replace '\\', '/')
}

function Test-InScope([string]$normPath) {
    if (-not $ScopePrefixes -or $ScopePrefixes.Count -eq 0) { return $true }
    foreach ($prefix in $ScopePrefixes) {
        $pref = Normalize-RepoPath $prefix
        if ($normPath.StartsWith($pref, [StringComparison]::Ordinal)) { return $true }
    }
    return $false
}

function Invoke-GitArgs([string[]]$CommandArgs) {
    $all = @('-c', 'core.quotepath=false') + $CommandArgs
    & git @all
}

function Get-MdPathsAtRef([string]$ref) {
    $hs = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $lines = Invoke-GitArgs @('ls-tree', '-r', '--name-only', $ref) 2>$null
    foreach ($p in $lines) {
        if ($p -notmatch '\.md$') { continue }
        $n = Normalize-RepoPath $p
        if (Test-IsExcludedAuditPath $n) { continue }
        [void]$hs.Add($n)
    }
    return $hs
}

function Get-Category([string]$p) {
    if ($p.StartsWith('.agent/WIP Work-In-Progress/', [StringComparison]::Ordinal)) { return 'WIP' }

    if ($p.StartsWith('.agent/docs/game/territory/', [StringComparison]::Ordinal)) { return 'game_territory' }
    if ($p.StartsWith('.agent/docs/game/', [StringComparison]::Ordinal)) { return 'game_other' }

    if ($p.StartsWith('.agent/docs/plans/completed/proposals/', [StringComparison]::Ordinal)) { return 'plans_completed_proposals' }
    if ($p.StartsWith('.agent/docs/plans/', [StringComparison]::Ordinal)) { return 'plans' }

    if ($p.StartsWith('.agent/docs/project/sessions/', [StringComparison]::Ordinal)) { return 'sessions' }
    if ($p.StartsWith('.agent/docs/project/process/', [StringComparison]::Ordinal)) { return 'process' }
    if ($p.StartsWith('.agent/docs/project/implementation-plans/', [StringComparison]::Ordinal)) { return 'implementation_plans' }
    if ($p.StartsWith('.agent/docs/project/decisions/', [StringComparison]::Ordinal)) { return 'project_decisions' }
    if ($p.StartsWith('.agent/docs/project/post-mortems/', [StringComparison]::Ordinal)) { return 'project_postmortems' }
    if ($p.StartsWith('.agent/docs/project/', [StringComparison]::Ordinal)) { return 'project_other' }

    if ($p.StartsWith('.agent/docs/research/', [StringComparison]::Ordinal)) { return 'research' }
    if ($p.StartsWith('.agent/docs/_archive/', [StringComparison]::Ordinal)) { return 'docs_archive' }
    if ($p.StartsWith('.agent/docs/_review-reconcile/', [StringComparison]::Ordinal)) { return 'review_reconcile' }
    if ($p.StartsWith('.agent/docs/agentic/', [StringComparison]::Ordinal)) { return 'agentic' }
    if ($p.StartsWith('.agent/docs/engineering/', [StringComparison]::Ordinal)) { return 'engineering' }
    if ($p.StartsWith('.agent/docs/atlas/', [StringComparison]::Ordinal)) { return 'docs_atlas_mirror' }
    if ($p.StartsWith('.agent/docs/', [StringComparison]::Ordinal)) { return 'docs_other' }

    if ($p.StartsWith('.agent/rules/', [StringComparison]::Ordinal)) { return 'agent_rules' }
    if ($p.StartsWith('.agent/', [StringComparison]::Ordinal)) { return 'agent_other' }

    if ($p.StartsWith('pax-fluxia/', [StringComparison]::Ordinal)) { return 'pax_fluxia' }
    if ($p.StartsWith('common/', [StringComparison]::Ordinal)) { return 'common' }
    if ($p.StartsWith('pax-server/', [StringComparison]::Ordinal)) { return 'pax_server' }

    if ($p.StartsWith('.atlas/', [StringComparison]::Ordinal)) { return 'atlas' }
    if ($p.StartsWith('.gemini/', [StringComparison]::Ordinal)) { return 'gemini' }

    if ($p -eq 'README.md') { return 'root_readme' }
    return 'other'
}

function Get-HeadBlobSize([string]$normPath) {
    $line = Invoke-GitArgs @('ls-tree', 'HEAD', '--', $normPath) 2>$null | Select-Object -First 1
    if (-not $line) { return 0 }
    if ($line -match '^[0-9]+ blob ([0-9a-f]{40})\t') {
        $sha = $Matches[1]
        $s = git cat-file -s $sha 2>$null
        [long]$n = 0
        if ([long]::TryParse($s, [ref]$n)) { return $n }
    }
    return 0
}

function Get-GitLogPair([string]$normPath, [string]$diffFilter) {
    if ($diffFilter) {
        $raw = Invoke-GitArgs @(
            'log', '--follow', "--diff-filter=$diffFilter", '-1', '--format=%H|%cI', 'HEAD', '--', $normPath
        ) 2>$null
    }
    else {
        $raw = Invoke-GitArgs @('log', '-1', '--format=%H|%cI', 'HEAD', '--', $normPath) 2>$null
    }
    if (-not $raw) { return @{ H = ''; I = '' } }
    $parts = $raw -split '\|', 2
    return @{ H = $parts[0]; I = if ($parts.Count -gt 1) { $parts[1] } else { '' } }
}

function Escape-CsvField([string]$s) {
    if ($null -eq $s) { return '""' }
    if ($s -match '[,"\r\n]') {
        return '"' + ($s -replace '"', '""') + '"'
    }
    return $s
}

Write-Host "ls-tree HEAD (tracked .md)..."
$allMd = @(Invoke-GitArgs @('ls-tree', '-r', '--name-only', 'HEAD') | Where-Object { $_ -match '\.md$' })
$rows = [System.Collections.Generic.List[object]]::new()

$set22 = Get-MdPathsAtRef $RefMar22
$set24 = Get-MdPathsAtRef $RefMar24

$i = 0
foreach ($rel in $allMd) {
    $i++
    if ($i % 50 -eq 0) { Write-Host "  $i / $($allMd.Count)..." }
    $p = Normalize-RepoPath $rel
    if (Test-IsExcludedAuditPath $p) { continue }
    if (-not (Test-InScope $p)) { continue }

    $cat = Get-Category $p
    $bytes = Get-HeadBlobSize $p
    $last = Get-GitLogPair $p ''
    $first = Get-GitLogPair $p 'A'
    $y22 = if ($set22.Contains($p)) { 'y' } else { 'n' }
    $y24 = if ($set24.Contains($p)) { 'y' } else { 'n' }

    $rows.Add([pscustomobject]@{
        path               = $p
        category           = $cat
        bytes              = $bytes
        git_first_commit   = $first.H
        git_first_date     = $first.I
        git_last_commit    = $last.H
        git_last_date      = $last.I
        in_tree_mar22      = $y22
        in_tree_mar24      = $y24
        processing_status  = 'unprocessed'
        notes              = ''
    })
}

$sortedRows = @($rows | Sort-Object path)

$csvPath = Join-Path $PSScriptRoot "MARKDOWN_MASTER_INDEX.csv"
$mdPath = Join-Path $PSScriptRoot "MARKDOWN_MASTER_INDEX.md"

$header = 'path,category,bytes,git_first_commit,git_first_date,git_last_commit,git_last_date,in_tree_mar22,in_tree_mar24,processing_status,notes'
$csb = [System.Text.StringBuilder]::new()
[void]$csb.AppendLine($header)
foreach ($r in $sortedRows) {
    $line = @(
        (Escape-CsvField $r.path)
        (Escape-CsvField $r.category)
        $r.bytes
        (Escape-CsvField $r.git_first_commit)
        (Escape-CsvField $r.git_first_date)
        (Escape-CsvField $r.git_last_commit)
        (Escape-CsvField $r.git_last_date)
        $r.in_tree_mar22
        $r.in_tree_mar24
        (Escape-CsvField $r.processing_status)
        (Escape-CsvField $r.notes)
    ) -join ','
    [void]$csb.AppendLine($line)
}
$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($csvPath, $csb.ToString(), $utf8Bom)

$byCat = $sortedRows | Group-Object category | Sort-Object Name
$msb = [System.Text.StringBuilder]::new()
[void]$msb.AppendLine('# Markdown master index (git-tracked `*.md`)')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('**Canonical enumeration** for idea mining: one row per tracked markdown file at HEAD, with category rules, git first/last touch, and Mar22/Mar24 **tree membership** (same refs as `MARKDOWN_FULL_MANIFEST_VS_HEAD.md`).')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('- **Full data (CSV):** [MARKDOWN_MASTER_INDEX.csv](./MARKDOWN_MASTER_INDEX.csv)')
[void]$msb.AppendLine('- **Generator:** `_generate_markdown_master_index.ps1`')
[void]$msb.AppendLine('- **Post-mortem / pipeline:** [IDEA_MINING_PIPELINE_POSTMORTEM.md](./IDEA_MINING_PIPELINE_POSTMORTEM.md)')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('**Excluded from this audit index:** any repo path containing `bmad` (case-insensitive), including `.agent/workflows/bmad-*` and recovered filenames.')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('**Basename recovery (not exhaustive):** `.agent/docs/_archive/pre-ontology-md-recovery-2026-03-22-24/` - see that README.')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('## Snapshot refs')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('| Flag | Ref | Meaning |')
[void]$msb.AppendLine('|------|-----|---------|')
[void]$msb.AppendLine("| in_tree_mar22 | ``$RefMar22`` | Path present in tree at end 2026-03-22 |")
[void]$msb.AppendLine("| in_tree_mar24 | ``$RefMar24`` | Path present in tree at end 2026-03-24 |")
[void]$msb.AppendLine('')
[void]$msb.AppendLine('## Counts by category')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('| category | files |')
[void]$msb.AppendLine('|----------|-------|')
foreach ($g in $byCat) {
    [void]$msb.AppendLine('| ' + $g.Name + ' | ' + $g.Count + ' |')
}
[void]$msb.AppendLine('')
[void]$msb.AppendLine('**Total indexed:** ' + $sortedRows.Count)
[void]$msb.AppendLine('')
[void]$msb.AppendLine('## Regenerate')
[void]$msb.AppendLine('')
[void]$msb.AppendLine('```powershell')
[void]$msb.AppendLine('powershell -NoProfile -File .agent/docs/project/implementation-plans/2026-04-08/doc-audit/_generate_markdown_master_index.ps1')
[void]$msb.AppendLine('```')
[void]$msb.AppendLine('')

[System.IO.File]::WriteAllText($mdPath, $msb.ToString(), [System.Text.UTF8Encoding]::new($false))

Write-Host "Wrote $csvPath ($($sortedRows.Count) rows)"
Write-Host "Wrote $mdPath"

$OutputEncoding = $script:_PrevOutputEncoding
