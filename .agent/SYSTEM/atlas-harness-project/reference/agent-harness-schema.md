# Agent Harness JSON-RPC 2.0 API Schema

**Version**: 1.0.0  
**Platform**: Windows 10+  
**Node**: LTS (bundled)  
**Language**: TypeScript  

---

## Overview

All communication uses JSON-RPC 2.0 over stdio. The harness accepts requests in the form:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "workspace.open",
  "params": {...}
}
```

Responses:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {...}
}
```

or errors:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {...}
  }
}
```

---

## Error Codes

| Code | Name | Meaning |
|------|------|---------|
| -32700 | Parse error | JSON parse failure |
| -32600 | Invalid Request | Malformed RPC |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Bad parameter type or value |
| -32603 | Internal error | Harness crash or assertion |
| -32000 to -32099 | Server error | Reserved for application errors |
| 1000 | Workspace error | Open/preflight/status failed |
| 2000 | File error | Read/write/stat failed |
| 3000 | Process error | Spawn/exec failed |
| 4000 | Git error | Git operation failed |
| 5000 | Validation error | Check failed or timed out |
| 6000 | AST error | TypeScript transform failed |

---

## Workspace Operations

### workspace.open

Opens a workspace and initializes harness state.

**Request:**
```json
{
  "method": "workspace.open",
  "params": {
    "rootPath": "C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia",
    "createIfMissing": false
  }
}
```

**Response:**
```json
{
  "result": {
    "rootPath": "C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia",
    "workspaceId": "ws_abc123def456",
    "gitRoot": "C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia",
    "policyFile": ".agent-harness.json",
    "policyExists": true,
    "nodeVersion": "20.10.0",
    "bundledTools": {
      "git": { "version": "2.43.0", "path": "C:\\..\\git.exe" },
      "node": { "version": "20.10.0", "path": "..." }
    }
  }
}
```

**Errors:**
- `1001`: `root_path_not_found`
- `1002`: `not_a_git_repo`
- `1003`: `insufficient_permissions`

---

### workspace.preflight

Validates workspace health before edit session.

**Request:**
```json
{
  "method": "workspace.preflight",
  "params": {}
}
```

**Response:**
```json
{
  "result": {
    "status": "ready",
    "checks": {
      "git_available": true,
      "write_permission": true,
      "line_endings_policy": {
        "status": "enforced",
        "file": ".gitattributes",
        "policy": {
          "default": "lf",
          "overrides": {
            "*.ps1": "crlf",
            "*.bat": "crlf"
          }
        }
      },
      "package_manager": {
        "type": "bun",
        "health": "ok",
        "lastInstallMs": 1200000
      },
      "hooks": {
        "configured": true,
        "hooksPath": ".git/hooks",
        "isolatedHooksReady": true
      },
      "environment": {
        "platform": "win32",
        "env_duplicates": []
      }
    },
    "warnings": [],
    "readinessMs": 340
  }
}
```

**Errors:**
- `1010`: `preflight_failed`
- `1011`: `git_not_found`
- `1012`: `insufficient_write_permission`
- `1013`: `corrupt_package_manager` (bun/npm broken)

---

### workspace.snapshot

Creates a snapshot of workspace state (files + git staging area).

**Request:**
```json
{
  "method": "workspace.snapshot",
  "params": {
    "label": "before_renderer_refactor"
  }
}
```

**Response:**
```json
{
  "result": {
    "snapshotId": "snap_20260309_143022_abc123",
    "label": "before_renderer_refactor",
    "timestamp": 1741516822000,
    "files": 47,
    "stagedChanges": 0,
    "unstagedChanges": 3,
    "indexPath": ".agent-harness/snapshots/snap_20260309_143022_abc123.tar.gz"
  }
}
```

---

### workspace.rollback

Restores workspace from snapshot.

**Request:**
```json
{
  "method": "workspace.rollback",
  "params": {
    "snapshotId": "snap_20260309_143022_abc123",
    "verify": true
  }
}
```

**Response:**
```json
{
  "result": {
    "restored": true,
    "filesRestored": 47,
    "stagedChanges": 0,
    "unstagedChanges": 0,
    "durationMs": 234
  }
}
```

**Errors:**
- `1020`: `snapshot_not_found`
- `1021`: `restore_failed`

---

### workspace.status

Returns current workspace Git + file state.

**Request:**
```json
{
  "method": "workspace.status",
  "params": {}
}
```

**Response:**
```json
{
  "result": {
    "branch": "main",
    "ahead": 0,
    "behind": 0,
    "staged": ["src/lib/renderers/DistanceFieldTerritoryRenderer.ts"],
    "unstaged": ["src/lib/config/game.config.ts"],
    "untracked": [],
    "isDirty": true,
    "isClean": false
  }
}
```

---

## File Operations

### file.read

Reads a file with detected encoding and line-ending info.

**Request:**
```json
{
  "method": "file.read",
  "params": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "encoding": "utf8"
  }
}
```

**Response:**
```json
{
  "result": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "content": "export class DistanceFieldTerritoryRenderer { ... }",
    "hash": "sha256:abc123...",
    "encoding": "utf8",
    "eol": "lf",
    "sizeBytes": 45230,
    "lineCount": 1247
  }
}
```

**Errors:**
- `2001`: `file_not_found`
- `2002`: `encoding_unknown`
- `2003`: `read_permission_denied`

---

### file.write

Writes a file atomically with verification.

**Request:**
```json
{
  "method": "file.write",
  "params": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "content": "export class DistanceFieldTerritoryRenderer { ... }",
    "options": {
      "encoding": "utf8",
      "eol": "lf",
      "atomic": true,
      "expectedHashBefore": "sha256:oldvalue",
      "mode": 0o644
    }
  }
}
```

**Response:**
```json
{
  "result": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "written": true,
    "beforeHash": "sha256:oldvalue",
    "afterHash": "sha256:newvalue",
    "bytesWritten": 45240,
    "durationMs": 12,
    "verificationPassed": true
  }
}
```

**Errors:**
- `2010`: `write_permission_denied`
- `2011`: `parent_directory_not_found`
- `2012`: `atomic_write_failed`
- `2013`: `hash_mismatch` (expectedHashBefore did not match)
- `2014`: `verification_failed` (post-write hash check failed)

---

### file.stat

Returns file metadata without content.

**Request:**
```json
{
  "method": "file.stat",
  "params": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts"
  }
}
```

**Response:**
```json
{
  "result": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "exists": true,
    "isFile": true,
    "isDirectory": false,
    "sizeBytes": 45230,
    "mtime": 1741516822000,
    "hash": "sha256:abc123...",
    "eol": "lf"
  }
}
```

---

### file.patch

Applies structured edit operations to a file.

**Request:**
```json
{
  "method": "file.patch",
  "params": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "operations": [
      {
        "type": "replace_between_anchors",
        "startAnchor": "function renderMeshBorderOverlay(ctx: BorderFamilyRenderContext",
        "endAnchor": "}\n\nfunction stepVectorBorderBuildJob",
        "replacement": "function renderMeshBorderOverlay(ctx: BorderFamilyRenderContext, alignmentContract: AlignmentContract): boolean {\n  const canonicalRuntimeMode = normalizeCanonicalFrontierRuntimeMode(\n    GAME_CONFIG.DF_CANONICAL_FRONTIER_RUNTIME_MODE,\n  );\n  // ... (new body)\n}\n\nfunction stepVectorBorderBuildJob"
      }
    ],
    "options": {
      "expectedHashBefore": "sha256:oldvalue",
      "anchorMatchMode": "exact",
      "multipleAnchorMode": "fail",
      "preserveEol": true
    }
  }
}
```

**Response:**
```json
{
  "result": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "appliedOperations": 1,
    "failedOperations": 0,
    "beforeHash": "sha256:oldvalue",
    "afterHash": "sha256:newvalue",
    "anchorsMatched": {
      "startAnchor": { "found": true, "count": 1, "lineNumber": 1847 },
      "endAnchor": { "found": true, "count": 1, "lineNumber": 2048 }
    },
    "verificationPassed": true,
    "reversiblePatch": "... (unified diff for rollback)"
  }
}
```

**Errors:**
- `2020`: `patch_anchor_not_found`
- `2021`: `patch_anchor_ambiguous` (found 2+ matches)
- `2022`: `patch_no_changes`
- `2023`: `patch_verify_failed`

---

### file.replaceBetween

Convenience operation: replace text between two anchors.

**Request:**
```json
{
  "method": "file.replaceBetween",
  "params": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "startAnchor": "const borderWidth =",
    "endAnchor": "const borderAlpha =",
    "replacement": "const borderWidth = Math.max(0, GAME_CONFIG.DF_BORDER_WIDTH ?? 0);\nconst configuredBorderSoftness = Math.max(0, GAME_CONFIG.DF_BORDER_SOFTNESS ?? 0);\nconst borderSoftness = useCanonical && canonicalRuntimeMode === 'production'\n  ? Math.max(configuredBorderSoftness, DF_CANONICAL_MIN_SOFTNESS_PX)\n  : configuredBorderSoftness;\n",
    "options": {
      "includeAnchors": "start_only"
    }
  }
}
```

---

### file.insertAt

Insert text at anchor position.

**Request:**
```json
{
  "method": "file.insertAt",
  "params": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "anchor": "function normalizeBorderFamily(rawFamily: unknown): BorderFamilyId {",
    "position": "before",
    "content": "function cloneVectorBorderPolylines(polylines: VectorBorderPolyline[]): VectorBorderPolyline[] {\n  return polylines.map((polyline) => ({\n    ownerA: polyline.ownerA,\n    ownerB: polyline.ownerB,\n    points: [...polyline.points],\n  }));\n}\n\n"
  }
}
```

---

### file.deleteRange

Delete content between two anchors.

**Request:**
```json
{
  "method": "file.deleteRange",
  "params": {
    "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "startAnchor": "let cachedCanonicalLastValidPolylines: FrontierPolyline[] = [];",
    "endAnchor": "let lastMeshVisibilityWarnFp = '';",
    "includeEnd": false
  }
}
```

---

## Process Operations

### proc.execFile

Execute a binary without shell.

**Request:**
```json
{
  "method": "proc.execFile",
  "params": {
    "file": "npm",
    "args": ["run", "check"],
    "options": {
      "cwd": "C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia",
      "timeout": 60000,
      "stdio": "pipe",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Response:**
```json
{
  "result": {
    "runId": "run_20260309_143022_xyz789",
    "file": "npm",
    "args": ["run", "check"],
    "exitCode": 0,
    "stdout": "✓ TypeScript diagnostics OK\n",
    "stderr": "",
    "startTime": 1741516822000,
    "endTime": 1741516824000,
    "durationMs": 2100,
    "signal": null,
    "timedOut": false,
    "resolvedFile": "C:\\Program Files\\nodejs\\npm.cmd"
  }
}
```

**Errors:**
- `3001`: `command_not_found`
- `3002`: `cwd_not_found`
- `3003`: `timeout_exceeded`
- `3004`: `spawn_failed`

---

### proc.which

Resolve an executable name to full path.

**Request:**
```json
{
  "method": "proc.which",
  "params": {
    "name": "npm"
  }
}
```

**Response:**
```json
{
  "result": {
    "name": "npm",
    "found": true,
    "path": "C:\\Program Files\\nodejs\\npm.cmd",
    "resolved": "C:\\Program Files\\nodejs\\npm.js",
    "type": "cmd"
  }
}
```

---

## Git Operations

### git.status

Get current Git state.

**Request:**
```json
{
  "method": "git.status",
  "params": {}
}
```

**Response:**
```json
{
  "result": {
    "branch": "main",
    "ahead": 0,
    "behind": 0,
    "staged": [
      "src/lib/renderers/DistanceFieldTerritoryRenderer.ts"
    ],
    "unstaged": [
      "src/lib/config/game.config.ts"
    ],
    "untracked": [],
    "isDirty": true,
    "isClean": false
  }
}
```

---

### git.add

Stage files.

**Request:**
```json
{
  "method": "git.add",
  "params": {
    "paths": ["src/lib/renderers/DistanceFieldTerritoryRenderer.ts"]
  }
}
```

**Response:**
```json
{
  "result": {
    "added": 1,
    "paths": ["src/lib/renderers/DistanceFieldTerritoryRenderer.ts"]
  }
}
```

---

### git.restore

Discard unstaged changes.

**Request:**
```json
{
  "method": "git.restore",
  "params": {
    "paths": ["src/lib/config/game.config.ts"],
    "staged": false
  }
}
```

**Response:**
```json
{
  "result": {
    "restored": 1,
    "paths": ["src/lib/config/game.config.ts"]
  }
}
```

---

### git.diff

Get diff for specific files.

**Request:**
```json
{
  "method": "git.diff",
  "params": {
    "paths": ["src/lib/renderers/DistanceFieldTerritoryRenderer.ts"],
    "staged": true,
    "format": "unified"
  }
}
```

**Response:**
```json
{
  "result": {
    "diff": "--- a/src/lib/renderers/DistanceFieldTerritoryRenderer.ts\n+++ b/src/lib/renderers/DistanceFieldTerritoryRenderer.ts\n@@ -1847,2 +1847,15 @@\n-function renderMeshBorderOverlay(ctx: BorderFamilyRenderContext) { ... }\n+function renderMeshBorderOverlay(ctx: BorderFamilyRenderContext, alignmentContract: AlignmentContract): boolean { ... }\n",
    "summary": {
      "filesChanged": 1,
      "insertions": 42,
      "deletions": 8
    }
  }
}
```

---

### git.commit

Create a commit.

**Request:**
```json
{
  "method": "git.commit",
  "params": {
    "message": "refactor: split producer/publisher state in mesh renderer",
    "options": {
      "verifyMode": "isolated-hooks",
      "author": { "name": "Agent", "email": "agent@local" },
      "allowEmpty": false
    }
  }
}
```

**Response:**
```json
{
  "result": {
    "sha": "abc123def456789",
    "message": "refactor: split producer/publisher state in mesh renderer",
    "author": "Agent <agent@local>",
    "timestamp": 1741516822000,
    "hooksRan": ["commit-msg"],
    "hooksOutput": ""
  }
}
```

**Errors:**
- `4001`: `git_not_found`
- `4002`: `nothing_to_commit`
- `4003`: `commit_hook_failed`
- `4004`: `commit_hook_incompatible_windows`

---

## Validation Operations

### validate.run

Run validation profile.

**Request:**
```json
{
  "method": "validate.run",
  "params": {
    "profile": "targeted",
    "targets": ["src/lib/renderers/"],
    "timeoutMs": 30000
  }
}
```

**Response:**
```json
{
  "result": {
    "profile": "targeted",
    "status": "passed",
    "durationMs": 2300,
    "checks": [
      {
        "tool": "tsc",
        "status": "passed",
        "diagnosticsCount": 0,
        "output": "No errors"
      },
      {
        "tool": "eslint",
        "status": "passed",
        "violationsCount": 0,
        "output": ""
      }
    ],
    "summary": {
      "totalChecks": 2,
      "passedChecks": 2,
      "failedChecks": 0
    }
  }
}
```

**Errors:**
- `5001`: `validation_timeout`
- `5002`: `profile_not_found`
- `5003`: `tool_missing`
- `5004`: `validation_failed`

---

## AST Operations (TypeScript)

### ts.findSymbol

Find symbol definition in TypeScript.

**Request:**
```json
{
  "method": "ts.findSymbol",
  "params": {
    "file": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "symbolName": "renderMeshBorderOverlay",
    "kind": "function"
  }
}
```

**Response:**
```json
{
  "result": {
    "found": true,
    "symbol": "renderMeshBorderOverlay",
    "kind": "function",
    "file": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "line": 1847,
    "column": 0,
    "text": "function renderMeshBorderOverlay(ctx: BorderFamilyRenderContext): boolean {"
  }
}
```

---

### ts.replaceFunctionBody

Replace function body safely.

**Request:**
```json
{
  "method": "ts.replaceFunctionBody",
  "params": {
    "file": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "functionName": "renderMeshBorderOverlay",
    "newBody": "const canonicalRuntimeMode = normalizeCanonicalFrontierRuntimeMode(\n  GAME_CONFIG.DF_CANONICAL_FRONTIER_RUNTIME_MODE,\n);\n// ... rest of body"
  }
}
```

**Response:**
```json
{
  "result": {
    "replaced": true,
    "functionName": "renderMeshBorderOverlay",
    "file": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
    "linesReplaced": 201,
    "diagnostics": 0
  }
}
```

---

## Configuration Schema

### .agent-harness.json

Example repository policy file:

```json
{
  "$schema": "https://agent-harness.local/schema/v1.json",
  "version": 1,
  "name": "pax-fluxia",
  "os": "windows",
  "minNodeVersion": "20.0.0",
  
  "defaultShellFallback": "disabled",
  
  "git": {
    "commitVerifyMode": "isolated-hooks",
    "hooksDirectory": ".agent-harness/hooks",
    "allowedHooks": ["commit-msg"]
  },
  
  "files": {
    "defaultEncoding": "utf8",
    "defaultEol": "lf",
    "atomicWrites": true,
    "maxPatchOperations": 10
  },
  
  "validation": {
    "fast": ["tsc:diagnostics-open-files"],
    "targeted": ["tsc:diagnostics-package", "eslint:open-files"],
    "full": ["tsc:diagnostics-all", "eslint:all", "tests:unit"]
  },
  
  "tools": {
    "node": {
      "source": "bundled",
      "version": "20.10.0"
    },
    "bun": {
      "source": "workspace",
      "enableShellFallback": false
    },
    "git": {
      "source": "system",
      "minVersion": "2.43.0"
    }
  }
}
```

---

## Example: Complete Edit Session

**Session goal**: Replace `renderMeshBorderOverlay` function and commit.

```json
[
  {
    "id": 1,
    "method": "workspace.open",
    "params": { "rootPath": "C:\\Users\\mikep\\Desktop\\WebDev\\pax-fluxia" }
  },
  {
    "id": 2,
    "method": "workspace.preflight",
    "params": {}
  },
  {
    "id": 3,
    "method": "workspace.snapshot",
    "params": { "label": "before_mesh_refactor" }
  },
  {
    "id": 4,
    "method": "file.read",
    "params": { "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts" }
  },
  {
    "id": 5,
    "method": "file.patch",
    "params": {
      "path": "src/lib/renderers/DistanceFieldTerritoryRenderer.ts",
      "operations": [
        {
          "type": "replace_between_anchors",
          "startAnchor": "function renderMeshBorderOverlay(ctx: BorderFamilyRenderContext",
          "endAnchor": "}\n\nfunction stepVectorBorderBuildJob",
          "replacement": "function renderMeshBorderOverlay(ctx: BorderFamilyRenderContext, alignmentContract: AlignmentContract): boolean {\n  const canonicalRuntimeMode = normalizeCanonicalFrontierRuntimeMode(\n    GAME_CONFIG.DF_CANONICAL_FRONTIER_RUNTIME_MODE,\n  );\n  // ... (complete new body)\n}\n\nfunction stepVectorBorderBuildJob"
        }
      ]
    }
  },
  {
    "id": 6,
    "method": "validate.run",
    "params": { "profile": "targeted", "targets": ["src/lib/renderers/"] }
  },
  {
    "id": 7,
    "method": "git.add",
    "params": { "paths": ["src/lib/renderers/DistanceFieldTerritoryRenderer.ts"] }
  },
  {
    "id": 8,
    "method": "git.commit",
    "params": {
      "message": "refactor: split producer/publisher state in mesh border renderer",
      "options": { "verifyMode": "isolated-hooks" }
    }
  }
]
```

---

## Design Principles

1. **No shell by default**: All operations use direct executable invocation on Windows. Shell is a fallback only.
2. **Atomic file operations**: Write to temp, verify hash, rename into place.
3. **Structured errors**: Every failure is a typed code + message, not prose.
4. **Transactional edits**: Snapshots + rollback available for any point.
5. **Windows-first**: Paths use native Windows separators, newlines normalized per `.gitattributes`.
6. **Verification always**: Every mutation includes pre/post hashes and optional postcondition checks.
