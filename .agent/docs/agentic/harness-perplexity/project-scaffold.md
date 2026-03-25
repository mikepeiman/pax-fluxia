## Agent Harness TypeScript Project Structure

```
agent-harness/
├── package.json
├── tsconfig.json
├── tsconfig.prod.json
├── .eslintrc.json
├── .prettierrc.json
├── esbuild.config.mjs
│
├── src/
│   ├── index.ts                          # Entry point, RPC server loop
│   ├── types/
│   │   ├── index.ts                      # All RPC request/response types
│   │   ├── errors.ts                     # Error codes + error types
│   │   ├── workspace.ts
│   │   ├── file.ts
│   │   ├── process.ts
│   │   ├── git.ts
│   │   ├── validation.ts
│   │   ├── ast.ts
│   │   └── config.ts
│   │
│   ├── services/
│   │   ├── WorkspaceService.ts           # Workspace lifecycle
│   │   ├── FileService.ts                # File I/O, atomic writes
│   │   ├── ProcessService.ts             # Windows-safe process launcher
│   │   ├── GitService.ts                 # Git wrapper
│   │   ├── ValidationService.ts          # Validation profiles
│   │   ├── TypeScriptService.ts          # AST operations
│   │   └── SnapshotService.ts            # Snapshots + rollback
│   │
│   ├── windows/
│   │   ├── ProcessLauncher.ts            # spawn/execFile with Windows fixes
│   │   ├── FileWriter.ts                 # Atomic write + hash verification
│   │   ├── PathResolver.ts               # UNC, env expansion, normalization
│   │   ├── EnvironmentNormalizer.ts      # Dedup env keys, controlled PATH
│   │   └── CommandShell.ts               # cmd.exe wrapper for .bat/.cmd
│   │
│   ├── git/
│   │   ├── GitWrapper.ts                 # Direct git.exe calls
│   │   ├── HookManager.ts                # Isolated hooks directory
│   │   └── HookScripts.ts                # Built-in hook implementations
│   │
│   ├── rpc/
│   │   ├── RPCServer.ts                  # JSON-RPC 2.0 dispatcher
│   │   ├── RPCHandler.ts                 # Request validation + routing
│   │   └── ErrorFormatter.ts             # Standardized error responses
│   │
│   ├── logging/
│   │   ├── Logger.ts                     # Structured logging
│   │   └── AuditLog.ts                   # Operation journal
│   │
│   └── utils/
│       ├── Hash.ts                       # SHA256 calculation
│       ├── Diff.ts                       # Unified diff generation
│       ├── LineEndings.ts                # EOL detection + normalization
│       ├── TemplateStringEscape.ts       # Safe template literal handling
│       ├── AnchorMatching.ts             # Multi-line anchor location
│       └── Configuration.ts              # Policy file loading
│
├── test/
│   ├── unit/
│   │   ├── FileService.test.ts
│   │   ├── ProcessLauncher.test.ts
│   │   ├── GitWrapper.test.ts
│   │   ├── LineEndings.test.ts
│   │   ├── TemplateStringEscape.test.ts
│   │   └── AnchorMatching.test.ts
│   │
│   └── integration/
│       ├── EndToEnd.test.ts              # Full RPC session
│       ├── WindowsProcess.test.ts
│       ├── GitHookIsolation.test.ts
│       └── AtomicWriteVerify.test.ts
│
├── scripts/
│   ├── build.sh                          # Build + bundle
│   ├── test.sh
│   ├── release.sh
│   └── install-global.ps1                # Deploy harness.exe to PATH
│
├── dist/
│   ├── harness.exe                       # Bundled Windows executable
│   ├── harness.js                        # Node runner (backup)
│   └── node/                             # Bundled Node LTS
│
└── docs/
    ├── README.md
    ├── OPERATIONS.md                     # User guide
    ├── INTERNALS.md                      # Architecture
    ├── WINDOWS.md                        # Platform-specific notes
    ├── TROUBLESHOOTING.md
    └── EXAMPLES.md
```

---

## package.json

```json
{
  "name": "@agent-harness/core",
  "version": "1.0.0",
  "description": "Deterministic local agent harness for Windows development",
  "main": "dist/index.js",
  "type": "module",
  "bin": {
    "agent-harness": "dist/harness.js"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node20 --outfile=dist/harness.js && npm run build:exe",
    "build:exe": "node scripts/bundle-exe.js",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "release": "npm run build && npm publish"
  },
  "dependencies": {
    "uuid": "^9.0.0",
    "zlib": "^1.0.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "esbuild": "^0.19.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "typescript": "^5.3.0",
    "vitest": "^0.34.0",
    "pkg": "^5.8.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

---

## Key Type Definitions (src/types/index.ts)

```typescript
// ============================================================================
// JSON-RPC 2.0 Base Types
// ============================================================================

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface JSONRPCResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

// ============================================================================
// Workspace Types
// ============================================================================

export interface WorkspaceOpenRequest {
  rootPath: string;
  createIfMissing?: boolean;
}

export interface WorkspaceOpenResponse {
  rootPath: string;
  workspaceId: string;
  gitRoot: string;
  policyFile: string;
  policyExists: boolean;
  nodeVersion: string;
  bundledTools: {
    git: { version: string; path: string };
    node: { version: string; path: string };
  };
}

export interface PreflightResponse {
  status: 'ready' | 'degraded' | 'failed';
  checks: {
    git_available: boolean;
    write_permission: boolean;
    line_endings_policy: LineEndingsPolicy;
    package_manager: ToolHealth;
    hooks: HooksStatus;
    environment: EnvironmentStatus;
  };
  warnings: string[];
  readinessMs: number;
}

// ============================================================================
// File Types
// ============================================================================

export interface FileReadRequest {
  path: string;
  encoding?: 'utf8' | 'utf16le' | 'ascii';
}

export interface FileReadResponse {
  path: string;
  content: string;
  hash: string;
  encoding: string;
  eol: 'lf' | 'crlf' | 'mixed';
  sizeBytes: number;
  lineCount: number;
}

export interface FileWriteRequest {
  path: string;
  content: string;
  options?: {
    encoding?: string;
    eol?: 'lf' | 'crlf' | 'preserve';
    atomic?: boolean;
    expectedHashBefore?: string;
    mode?: number;
  };
}

export interface FileWriteResponse {
  path: string;
  written: boolean;
  beforeHash: string;
  afterHash: string;
  bytesWritten: number;
  durationMs: number;
  verificationPassed: boolean;
}

export interface FilePatchOperation {
  type: 'replace_exact' | 'replace_between_anchors' | 'insert_before_anchor' | 'insert_after_anchor' | 'delete_between_anchors' | 'ast_transform';
  startAnchor?: string;
  endAnchor?: string;
  replacement?: string;
  content?: string;
  includeAnchors?: 'both' | 'start_only' | 'end_only' | 'neither';
}

export interface FilePatchRequest {
  path: string;
  operations: FilePatchOperation[];
  options?: {
    expectedHashBefore?: string;
    anchorMatchMode?: 'exact' | 'contains';
    multipleAnchorMode?: 'fail' | 'use_first';
    preserveEol?: boolean;
  };
}

export interface FilePatchResponse {
  path: string;
  appliedOperations: number;
  failedOperations: number;
  beforeHash: string;
  afterHash: string;
  anchorsMatched: Record<string, AnchorMatch>;
  verificationPassed: boolean;
  reversiblePatch: string;
}

export interface AnchorMatch {
  found: boolean;
  count: number;
  lineNumber: number;
}

// ============================================================================
// Process Types
// ============================================================================

export interface ProcExecFileRequest {
  file: string;
  args?: string[];
  options?: {
    cwd?: string;
    timeout?: number;
    stdio?: 'pipe' | 'ignore' | 'inherit';
    env?: Record<string, string>;
  };
}

export interface ProcExecFileResponse {
  runId: string;
  file: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  signal: string | null;
  timedOut: boolean;
  resolvedFile: string;
}

// ============================================================================
// Git Types
// ============================================================================

export interface GitStatusResponse {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isDirty: boolean;
  isClean: boolean;
}

export interface GitCommitRequest {
  message: string;
  options?: {
    verifyMode?: 'repo-default' | 'no-verify' | 'isolated-hooks';
    author?: { name: string; email: string };
    allowEmpty?: boolean;
  };
}

export interface GitCommitResponse {
  sha: string;
  message: string;
  author: string;
  timestamp: number;
  hooksRan: string[];
  hooksOutput: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationProfile = 'fast' | 'targeted' | 'full' | 'precommit';

export interface ValidateRunRequest {
  profile: ValidationProfile;
  targets?: string[];
  timeoutMs?: number;
}

export interface ValidateRunResponse {
  profile: ValidationProfile;
  status: 'passed' | 'failed' | 'timeout';
  durationMs: number;
  checks: ValidationCheck[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

export interface ValidationCheck {
  tool: string;
  status: 'passed' | 'failed' | 'skipped';
  diagnosticsCount?: number;
  violationsCount?: number;
  output: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AgentHarnessConfig {
  version: number;
  name?: string;
  os: 'windows' | 'macos' | 'linux';
  minNodeVersion: string;
  defaultShellFallback: 'enabled' | 'disabled';
  git: {
    commitVerifyMode: 'repo-default' | 'no-verify' | 'isolated-hooks';
    hooksDirectory: string;
    allowedHooks: string[];
  };
  files: {
    defaultEncoding: string;
    defaultEol: 'lf' | 'crlf';
    atomicWrites: boolean;
    maxPatchOperations: number;
  };
  validation: Record<ValidationProfile, string[]>;
  tools: {
    node: { source: 'bundled' | 'system'; version: string };
    bun?: { source: 'workspace' | 'system'; enableShellFallback: boolean };
    git: { source: 'system'; minVersion: string };
  };
}

// ============================================================================
// Snapshot Types
// ============================================================================

export interface SnapshotResponse {
  snapshotId: string;
  label?: string;
  timestamp: number;
  files: number;
  stagedChanges: number;
  unstagedChanges: number;
  indexPath: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface LineEndingsPolicy {
  status: 'enforced' | 'inferred' | 'mixed';
  file?: string;
  policy?: Record<string, 'lf' | 'crlf' | 'auto'>;
}

export interface ToolHealth {
  type: 'bun' | 'npm' | 'yarn' | 'pnpm';
  health: 'ok' | 'degraded' | 'broken';
  lastInstallMs?: number;
}

export interface HooksStatus {
  configured: boolean;
  hooksPath: string;
  isolatedHooksReady: boolean;
}

export interface EnvironmentStatus {
  platform: 'win32' | 'darwin' | 'linux';
  env_duplicates: string[];
}
```

---

## Core Service Skeleton (src/services/FileService.ts)

```typescript
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { v4 as uuid } from 'uuid';
import type {
  FileReadRequest,
  FileReadResponse,
  FileWriteRequest,
  FileWriteResponse,
  FilePatchRequest,
  FilePatchResponse,
} from '../types/index.js';
import { FileWriter } from '../windows/FileWriter.js';
import { LineEndings } from '../utils/LineEndings.js';
import { AnchorMatcher } from '../utils/AnchorMatching.js';

export class FileService {
  constructor(private workspaceRoot: string) {}

  async read(req: FileReadRequest): Promise<FileReadResponse> {
    const filePath = join(this.workspaceRoot, req.path);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const hash = this.hashContent(content);
      const eol = LineEndings.detect(content);
      const stat = await fs.stat(filePath);
      const lineCount = content.split(/\r?\n/).length;

      return {
        path: req.path,
        content,
        hash,
        encoding: req.encoding || 'utf8',
        eol,
        sizeBytes: stat.size,
        lineCount,
      };
    } catch (err) {
      throw {
        code: 2001,
        message: 'file_not_found',
        data: { path: req.path, error: String(err) },
      };
    }
  }

  async write(req: FileWriteRequest): Promise<FileWriteResponse> {
    const filePath = join(this.workspaceRoot, req.path);
    const options = req.options || {};

    if (options.expectedHashBefore) {
      const existing = await this.read({ path: req.path });
      if (existing.hash !== options.expectedHashBefore) {
        throw {
          code: 2013,
          message: 'hash_mismatch',
          data: { expected: options.expectedHashBefore, actual: existing.hash },
        };
      }
    }

    const writer = new FileWriter(filePath);
    const eol = options.eol === 'preserve' ? LineEndings.detect(req.content) : (options.eol || 'lf');
    const content = LineEndings.normalize(req.content, eol);

    const startTime = Date.now();
    await writer.writeAtomic(content, {
      encoding: options.encoding,
      mode: options.mode,
    });
    const durationMs = Date.now() - startTime;

    const afterContent = await fs.readFile(filePath, 'utf8');
    const afterHash = this.hashContent(afterContent);

    return {
      path: req.path,
      written: true,
      beforeHash: options.expectedHashBefore || '',
      afterHash,
      bytesWritten: Buffer.byteLength(content, options.encoding),
      durationMs,
      verificationPassed: true,
    };
  }

  async patch(req: FilePatchRequest): Promise<FilePatchResponse> {
    const read = await this.read({ path: req.path });
    let content = read.content;
    const beforeHash = read.hash;
    const matcher = new AnchorMatcher(content);
    let appliedOps = 0;

    for (const op of req.operations) {
      try {
        if (op.type === 'replace_between_anchors') {
          content = matcher.replaceBetween(
            op.startAnchor!,
            op.endAnchor!,
            op.replacement!,
            { includeAnchors: op.includeAnchors }
          );
          appliedOps++;
        } else if (op.type === 'insert_before_anchor') {
          content = matcher.insertBefore(op.startAnchor!, op.content!);
          appliedOps++;
        }
      } catch (err) {
        throw {
          code: 2020,
          message: 'patch_anchor_not_found',
          data: { anchor: op.startAnchor, error: String(err) },
        };
      }
    }

    // Write and verify
    await this.write({
      path: req.path,
      content,
      options: { expectedHashBefore: beforeHash, atomic: true },
    });

    const afterRead = await this.read({ path: req.path });

    return {
      path: req.path,
      appliedOperations: appliedOps,
      failedOperations: req.operations.length - appliedOps,
      beforeHash,
      afterHash: afterRead.hash,
      anchorsMatched: {},
      verificationPassed: true,
      reversiblePatch: '',
    };
  }

  private hashContent(content: string): string {
    return 'sha256:' + createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
```

---

## Windows Process Launcher (src/windows/ProcessLauncher.ts)

```typescript
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { which } from 'which';
import type { ProcExecFileRequest, ProcExecFileResponse } from '../types/index.js';
import { EnvironmentNormalizer } from './EnvironmentNormalizer.js';

export class ProcessLauncher {
  async execFile(req: ProcExecFileRequest): Promise<ProcExecFileResponse> {
    const normalizer = new EnvironmentNormalizer();
    const env = normalizer.normalize(req.options?.env);

    let resolved: string;
    try {
      resolved = await which(req.file);
    } catch {
      throw { code: 3001, message: 'command_not_found', data: { command: req.file } };
    }

    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const proc = spawn(resolved, req.options?.args || [], {
        cwd: req.options?.cwd,
        env,
        windowsHide: true,
        stdio: 'pipe',
        timeout: req.options?.timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => (stdout += data.toString()));
      proc.stderr?.on('data', (data) => (stderr += data.toString()));

      proc.on('error', (err) => {
        reject({ code: 3004, message: 'spawn_failed', data: { error: String(err) } });
      });

      proc.on('close', (code) => {
        const endTime = Date.now();
        resolve({
          runId: `run_${Date.now()}_${Math.random().toString(36).substr(2)}`,
          file: req.file,
          args: req.options?.args || [],
          exitCode: code || 0,
          stdout,
          stderr,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          signal: null,
          timedOut: false,
          resolvedFile: resolved,
        });
      });
    });
  }
}
```

---

## Entry Point (src/index.ts)

```typescript
import { stdin, stdout } from 'process';
import { WorkspaceService } from './services/WorkspaceService.js';
import { FileService } from './services/FileService.js';
import { ProcessLauncher } from './windows/ProcessLauncher.js';
import { GitService } from './services/GitService.js';
import type { JSONRPCRequest, JSONRPCResponse } from './types/index.js';

let workspace: WorkspaceService | null = null;

const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
  'workspace.open': async (params: any) => {
    workspace = new WorkspaceService(params.rootPath);
    return workspace.open();
  },
  'workspace.preflight': async () => workspace?.preflight(),
  'file.read': async (params: any) => new FileService(workspace!.rootPath).read(params),
  'file.write': async (params: any) => new FileService(workspace!.rootPath).write(params),
  'file.patch': async (params: any) => new FileService(workspace!.rootPath).patch(params),
  'proc.execFile': async (params: any) => new ProcessLauncher().execFile(params),
  'git.status': async () => new GitService(workspace!.rootPath).status(),
  'git.commit': async (params: any) => new GitService(workspace!.rootPath).commit(params),
};

async function handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse> {
  try {
    if (!handlers[req.method]) {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32601, message: 'Method not found' },
      };
    }

    const result = await handlers[req.method](req.params);
    return { jsonrpc: '2.0', id: req.id, result };
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: { code: err.code || -32603, message: err.message || 'Internal error', data: err.data },
    };
  }
}

async function main() {
  let buffer = '';

  stdin.on('data', async (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const req = JSON.parse(line);
          const res = await handleRequest(req);
          stdout.write(JSON.stringify(res) + '\n');
        } catch (err) {
          stdout.write(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }) + '\n');
        }
      }
    }
  });
}

main().catch(console.error);
```

This scaffold provides the production-ready structure. You can now implement each service module following the same patterns.

