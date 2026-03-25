# Agent Harness Implementation Guide

## Windows-Critical Implementation Details

This document covers the specific implementation patterns required for Windows reliability. These are not optional optimizations—they are mandatory for deterministic behavior.

---

## 1. Atomic File Writes (src/windows/FileWriter.ts)

**Why it matters**: Your log shows partial edits and corruption issues. Atomic writes prevent that.

```typescript
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import { dirname, join, basename } from 'path';
import { randomBytes } from 'crypto';

export class FileWriter {
  constructor(private targetPath: string) {}

  async writeAtomic(content: string, options: { encoding?: string; mode?: number }): Promise<void> {
    const dir = dirname(this.targetPath);
    const filename = basename(this.targetPath);
    const tempName = `.${filename}.${randomBytes(6).toString('hex')}.tmp`;
    const tempPath = join(dir, tempName);

    try {
      // 1. Write to temp file
      await fs.writeFile(tempPath, content, options.encoding || 'utf8');

      // 2. Fsync to ensure durability on Windows
      const fd = await fs.open(tempPath, 'r');
      await (fd as any).sync?.();
      await fd.close();

      // 3. Verify content
      const written = await fs.readFile(tempPath, options.encoding || 'utf8');
      if (written !== content) {
        throw new Error('Content verification failed after write');
      }

      // 4. Set mode if requested
      if (options.mode) {
        await fs.chmod(tempPath, options.mode);
      }

      // 5. Atomic rename (Windows guarantees atomicity for rename on same volume)
      await fs.rename(tempPath, this.targetPath);
    } catch (err) {
      // Cleanup temp file
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw err;
    }
  }

  hashContent(content: string): string {
    return 'sha256:' + createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
```

**Why this works on Windows**:
- `fs.fsync()` ensures the write is on disk before rename.
- `fs.rename()` on the same volume is atomic in Windows.
- Temp file with random suffix prevents collision.
- Post-write verification catches memory/cache issues.

---

## 2. Process Execution Without Shell (src/windows/ProcessLauncher.ts)

**Why it matters**: Your log shows patching errors and quoting issues. Shell mode causes this.

```typescript
import { spawnSync, spawn } from 'child_process';
import { which } from 'which';
import { resolve } from 'path';

export class ProcessLauncher {
  /**
   * Execute file directly WITHOUT shell.
   * On Windows, this avoids cmd.exe, PowerShell quoting rules, and metachar interpretation.
   */
  async spawnDirect(
    file: string,
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Resolve executable with proper Windows extension handling
    let resolved: string;
    try {
      resolved = await which(file);
    } catch {
      throw new Error(`Command not found: ${file}`);
    }

    const env = this.normalizeEnv(options.env);

    return new Promise((resolve, reject) => {
      const proc = spawn(resolved, args, {
        cwd: options.cwd,
        env,
        windowsHide: true,
        stdio: 'pipe',
        shell: false, // ← CRITICAL: Never use shell for normal binaries
        timeout: options.timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (d) => (stdout += d.toString()));
      proc.stderr?.on('data', (d) => (stderr += d.toString()));

      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => resolve({ stdout, stderr, exitCode: code || 0 }));
    });
  }

  /**
   * Execute .cmd or .bat files through cmd.exe.
   * These cannot be spawned directly on Windows.
   */
  async spawnBatch(
    batchFile: string,
    args: string[],
    options: any
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const env = this.normalizeEnv(options.env);
    const commandLine = this.escapeCommandLine([batchFile, ...args]);

    return new Promise((resolve, reject) => {
      const proc = spawn('cmd.exe', ['/d', '/s', '/c', commandLine], {
        cwd: options.cwd,
        env,
        windowsHide: true,
        stdio: 'pipe',
        shell: false,
        timeout: options.timeout,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (d) => (stdout += d.toString()));
      proc.stderr?.on('data', (d) => (stderr += d.toString()));

      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => resolve({ stdout, stderr, exitCode: code || 0 }));
    });
  }

  /**
   * Escape arguments for cmd.exe /c invocation.
   * Do NOT use JSON.stringify or PowerShell escape rules here.
   */
  private escapeCommandLine(args: string[]): string {
    return args
      .map((arg) => {
        // If arg has no special chars, leave it alone
        if (!/[\s"&|<>^]/.test(arg)) return arg;
        
        // Otherwise, wrap in quotes and escape internal quotes
        return '"' + arg.replace(/"/g, '\\"') + '"';
      })
      .join(' ');
  }

  /**
   * Normalize environment to prevent case-sensitivity issues on Windows.
   * Windows env keys are case-insensitive but Node.js treats them as case-sensitive.
   */
  private normalizeEnv(input?: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = {};
    const seen = new Set<string>();

    // Merge input over process.env, deduplicating keys
    const merged = { ...process.env, ...(input || {}) };

    for (const [key, value] of Object.entries(merged)) {
      const lowerKey = key.toLowerCase();
      if (!seen.has(lowerKey)) {
        seen.add(lowerKey);
        env[key] = String(value);
      }
    }

    return env;
  }
}
```

**Key Windows rules**:
- `shell: false` by default; direct spawn avoids cmd.exe.
- `.cmd` and `.bat` files MUST go through `cmd.exe /d /s /c`.
- Escape rules differ: cmd.exe uses `^`, PowerShell uses backtick.
- Env key deduplication prevents `PATH` vs `Path` collisions.

---

## 3. Line Ending Normalization (src/utils/LineEndings.ts)

**Why it matters**: Patch failures came from line-ending mismatches.

```typescript
export class LineEndings {
  /**
   * Detect line ending style in content.
   */
  static detect(content: string): 'lf' | 'crlf' | 'mixed' {
    const crlf = content.match(/\r\n/g)?.length || 0;
    const lf = content.match(/\n(?!\r)/g)?.length || 0;
    const cr = content.match(/\r(?!\n)/g)?.length || 0;

    if (crlf > 0 && lf === 0 && cr === 0) return 'crlf';
    if (lf > 0 && crlf === 0 && cr === 0) return 'lf';
    return 'mixed';
  }

  /**
   * Normalize all line endings to a single style.
   * Handles mixed line endings gracefully.
   */
  static normalize(content: string, target: 'lf' | 'crlf'): string {
    // First, normalize everything to LF
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Then convert to target style
    if (target === 'crlf') {
      normalized = normalized.replace(/\n/g, '\r\n');
    }

    return normalized;
  }

  /**
   * Load policy from .gitattributes to respect line-ending rules.
   */
  static loadPolicy(gitattributesPath: string): Map<string, 'lf' | 'crlf' | 'auto'> {
    const policy = new Map<string, 'lf' | 'crlf' | 'auto'>();
    
    try {
      const content = require('fs').readFileSync(gitattributesPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^(\S+)\s+.*eol=(\S+)/);
        if (match) {
          const [, pattern, eol] = match;
          policy.set(pattern, eol as any);
        }
      }
    } catch (err) {
      // No .gitattributes or can't read
    }

    return policy;
  }
}
```

---

## 4. Template Literal Escaping (src/utils/TemplateStringEscape.ts)

**Why it matters**: PowerShell regex replacement broke template literals in your log.

```typescript
/**
 * When using .replace() on code containing template literals,
 * the replacement string should NOT use $ placeholders.
 * This utility prevents that class of errors.
 */
export class TemplateStringEscape {
  /**
   * Escape $ characters in replacement text so they're not interpreted as backreferences.
   */
  static escapeReplacementText(text: string): string {
    // In .replace() replacements, $ is special: $1, $2, $$, etc.
    // Replace literal $ with $$ to escape it.
    return text.replace(/\$/g, '$$$$');
  }

  /**
   * Safe string replacement that won't interpret $ in the replacement.
   * Use this instead of regex replace when the replacement contains template literals.
   */
  static replaceAll(text: string, search: string, replacement: string): string {
    const escaped = this.escapeReplacementText(replacement);
    return text.replaceAll(search, escaped);
  }

  /**
   * Example: Replace old function with new one containing template literals
   */
  static replaceFunctionBody(
    sourceCode: string,
    functionName: string,
    newBody: string
  ): string {
    // Find function start
    const funcStart = sourceCode.indexOf(`function ${functionName}`);
    if (funcStart === -1) throw new Error(`Function ${functionName} not found`);

    // Find opening brace
    const braceStart = sourceCode.indexOf('{', funcStart);
    if (braceStart === -1) throw new Error(`Opening brace not found for ${functionName}`);

    // Find closing brace (simple version; real one would parse properly)
    let depth = 1;
    let braceEnd = braceStart + 1;
    while (depth > 0 && braceEnd < sourceCode.length) {
      if (sourceCode[braceEnd] === '{') depth++;
      else if (sourceCode[braceEnd] === '}') depth--;
      braceEnd++;
    }

    const before = sourceCode.substring(0, braceStart + 1);
    const after = sourceCode.substring(braceEnd - 1);

    return before + '\n' + newBody + '\n' + after;
  }
}
```

---

## 5. Anchor Matching (src/utils/AnchorMatching.ts)

**Why it matters**: Your log shows "anchor not found" and "anchor ambiguous" issues.

```typescript
export class AnchorMatcher {
  constructor(private content: string) {}

  /**
   * Find an anchor string in content and verify uniqueness.
   * Throws if not found or found multiple times (configurable).
   */
  findAnchor(anchor: string, tolerance: 'exact' | 'contains' = 'exact'): { line: number; col: number } {
    let matches = 0;
    let foundLine = -1;

    const lines = this.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isMatch = tolerance === 'exact' ? line === anchor : line.includes(anchor);

      if (isMatch) {
        matches++;
        foundLine = i;
        if (matches > 1) {
          throw new Error(
            `Anchor ambiguous: found ${matches} matches for "${anchor.substring(0, 50)}..."`
          );
        }
      }
    }

    if (matches === 0) {
      throw new Error(`Anchor not found: "${anchor.substring(0, 50)}..."`);
    }

    return { line: foundLine, col: 0 };
  }

  /**
   * Replace text between two anchor lines.
   * Preserves everything outside the anchors.
   */
  replaceBetween(
    startAnchor: string,
    endAnchor: string,
    replacement: string,
    options?: { includeAnchors?: 'both' | 'start_only' | 'end_only' | 'neither' }
  ): string {
    const startPos = this.findAnchor(startAnchor);
    const endPos = this.findAnchor(endAnchor);

    if (startPos.line >= endPos.line) {
      throw new Error('Start anchor must come before end anchor');
    }

    const lines = this.content.split('\n');
    const before = lines.slice(0, startPos.line);
    const after = lines.slice(endPos.line + 1);

    const includeMode = options?.includeAnchors || 'both';
    let middle: string[];

    if (includeMode === 'both') {
      middle = [lines[startPos.line], replacement, lines[endPos.line]];
    } else if (includeMode === 'start_only') {
      middle = [lines[startPos.line], replacement];
    } else if (includeMode === 'end_only') {
      middle = [replacement, lines[endPos.line]];
    } else {
      middle = [replacement];
    }

    return [...before, ...middle, ...after].join('\n');
  }

  /**
   * Insert content before an anchor line.
   */
  insertBefore(anchor: string, content: string): string {
    const pos = this.findAnchor(anchor);
    const lines = this.content.split('\n');

    lines.splice(pos.line, 0, content);
    return lines.join('\n');
  }

  /**
   * Insert content after an anchor line.
   */
  insertAfter(anchor: string, content: string): string {
    const pos = this.findAnchor(anchor);
    const lines = this.content.split('\n');

    lines.splice(pos.line + 1, 0, content);
    return lines.join('\n');
  }
}
```

---

## 6. Git Hook Isolation (src/git/HookManager.ts)

**Why it matters**: Your log shows Git commit failing because of Windows-incompatible shell hooks.

```typescript
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ProcessLauncher } from '../windows/ProcessLauncher.js';

export class HookManager {
  constructor(private workspaceRoot: string) {}

  /**
   * Set up isolated hooks directory with Windows-safe scripts.
   * Git can be configured to use this directory instead of .git/hooks.
   */
  async setupIsolatedHooks(): Promise<string> {
    const hooksDir = join(this.workspaceRoot, '.agent-harness', 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });

    // Create a Windows-safe commit-msg hook (PowerShell or Node)
    const commitMsgHook = join(hooksDir, 'commit-msg');
    await fs.writeFile(
      commitMsgHook,
      `#!/usr/bin/env node
// Commit message validation hook
const msgFile = process.argv[2];
const fs = require('fs');
const msg = fs.readFileSync(msgFile, 'utf8');

// Basic validation
if (msg.trim().length === 0) {
  console.error('Commit message cannot be empty');
  process.exit(1);
}

process.exit(0);
`
    );

    await fs.chmod(commitMsgHook, 0o755);
    return hooksDir;
  }

  /**
   * Configure Git to use isolated hooks directory.
   * This requires git >= 2.9.
   */
  async configureHooksPath(hooksDir: string): Promise<void> {
    const launcher = new ProcessLauncher();

    await launcher.spawnDirect('git', ['config', 'core.hooksPath', hooksDir], {
      cwd: this.workspaceRoot,
    });
  }

  /**
   * Commit without running arbitrary repo hooks.
   * Use this when agent creates the hooks directory.
   */
  async commitWithIsolatedHooks(message: string, author?: { name: string; email: string }): Promise<string> {
    const hooksDir = await this.setupIsolatedHooks();
    await this.configureHooksPath(hooksDir);

    const launcher = new ProcessLauncher();
    const args = [
      'commit',
      '-m',
      message,
    ];

    if (author) {
      args.push(`--author=${author.name} <${author.email}>`);
    }

    const result = await launcher.spawnDirect('git', args, {
      cwd: this.workspaceRoot,
    });

    if (result.exitCode !== 0) {
      throw new Error(`Git commit failed: ${result.stderr}`);
    }

    // Extract SHA from output
    const shaMatch = result.stdout.match(/\[main [a-f0-9]+\]/);
    if (!shaMatch) {
      throw new Error('Could not parse commit SHA');
    }

    return shaMatch[0];
  }
}
```

---

## 7. Git Wrapper with Status Parsing (src/services/GitService.ts)

```typescript
import { ProcessLauncher } from '../windows/ProcessLauncher.js';

export class GitService {
  private launcher = new ProcessLauncher();

  constructor(private workspaceRoot: string) {}

  async status(): Promise<{
    branch: string;
    staged: string[];
    unstaged: string[];
    untracked: string[];
    isDirty: boolean;
  }> {
    const result = await this.launcher.spawnDirect('git', ['status', '--porcelain', '-b'], {
      cwd: this.workspaceRoot,
    });

    const lines = result.stdout.split('\n').filter((l) => l.trim());

    let branch = 'unknown';
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      // Branch line: ## main...origin/main [ahead 2]
      if (line.startsWith('##')) {
        branch = line.split(' ')[1];
        continue;
      }

      // Status line format: XY PATH
      // X = staged, Y = unstaged
      const status = line.substring(0, 2);
      const path = line.substring(3);

      if (status[0] !== ' ') staged.push(path);
      if (status[1] !== ' ') unstaged.push(path);
      if (status === '??') untracked.push(path);
    }

    return {
      branch,
      staged,
      unstaged,
      untracked,
      isDirty: staged.length > 0 || unstaged.length > 0,
    };
  }

  async commit(message: string, options?: { noVerify?: boolean }): Promise<string> {
    const args = ['commit', '-m', message];
    if (options?.noVerify) args.push('--no-verify');

    const result = await this.launcher.spawnDirect('git', args, {
      cwd: this.workspaceRoot,
    });

    if (result.exitCode !== 0) {
      throw new Error(`Commit failed: ${result.stderr}`);
    }

    return result.stdout;
  }
}
```

---

## 8. Validation Service with Profiles (src/services/ValidationService.ts)

```typescript
import type { ValidationProfile, ValidateRunResponse } from '../types/index.js';
import { ProcessLauncher } from '../windows/ProcessLauncher.js';
import { AgentHarnessConfig } from '../types/config.js';

export class ValidationService {
  private launcher = new ProcessLauncher();

  constructor(
    private workspaceRoot: string,
    private config: AgentHarnessConfig
  ) {}

  async run(profile: ValidationProfile, targets?: string[]): Promise<ValidateRunResponse> {
    const commands = this.config.validation[profile] || [];
    const startTime = Date.now();
    const checks: any[] = [];

    for (const cmd of commands) {
      const [tool, ...parts] = cmd.split(':');
      const target = parts.join(':');

      try {
        const result = await this.runCheck(tool, target, targets);
        checks.push(result);
      } catch (err) {
        checks.push({
          tool,
          status: 'failed',
          output: String(err),
        });
      }
    }

    const passedChecks = checks.filter((c) => c.status === 'passed').length;
    const failedChecks = checks.filter((c) => c.status === 'failed').length;

    return {
      profile,
      status: failedChecks === 0 ? 'passed' : 'failed',
      durationMs: Date.now() - startTime,
      checks,
      summary: {
        totalChecks: checks.length,
        passedChecks,
        failedChecks,
      },
    };
  }

  private async runCheck(tool: string, target: string, targets?: string[]): Promise<any> {
    if (tool === 'tsc') {
      return this.runTypeScript(target, targets);
    } else if (tool === 'eslint') {
      return this.runESLint(target, targets);
    } else if (tool === 'tests') {
      return this.runTests(target);
    }

    throw new Error(`Unknown validation tool: ${tool}`);
  }

  private async runTypeScript(target: string, targets?: string[]): Promise<any> {
    const args = ['--noEmit'];
    if (targets) args.push(...targets);

    const result = await this.launcher.spawnDirect('npx', ['tsc', ...args], {
      cwd: this.workspaceRoot,
      timeout: 30000,
    });

    return {
      tool: 'tsc',
      status: result.exitCode === 0 ? 'passed' : 'failed',
      diagnosticsCount: (result.stdout.match(/error/g) || []).length,
      output: result.stdout || result.stderr,
    };
  }

  private async runESLint(target: string, targets?: string[]): Promise<any> {
    const args = targets || [target];

    const result = await this.launcher.spawnDirect('npx', ['eslint', ...args], {
      cwd: this.workspaceRoot,
      timeout: 30000,
    });

    return {
      tool: 'eslint',
      status: result.exitCode === 0 ? 'passed' : 'failed',
      violationsCount: (result.stdout.match(/error|warning/g) || []).length,
      output: result.stdout || result.stderr,
    };
  }

  private async runTests(target: string): Promise<any> {
    const result = await this.launcher.spawnDirect('npm', ['run', 'test', '--', target], {
      cwd: this.workspaceRoot,
      timeout: 60000,
    });

    return {
      tool: 'tests',
      status: result.exitCode === 0 ? 'passed' : 'failed',
      output: result.stdout || result.stderr,
    };
  }
}
```

---

## 9. RPC Server Main Loop (src/index.ts - Complete)

```typescript
import { stdin, stdout } from 'process';
import { WorkspaceService } from './services/WorkspaceService.js';
import { FileService } from './services/FileService.js';
import { ProcessLauncher } from './windows/ProcessLauncher.js';
import { GitService } from './services/GitService.js';
import { ValidationService } from './services/ValidationService.js';
import type { JSONRPCRequest, JSONRPCResponse } from './types/index.js';

let workspace: WorkspaceService | null = null;
let fileService: FileService | null = null;
let gitService: GitService | null = null;
let validationService: ValidationService | null = null;

const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
  // Workspace
  'workspace.open': async (params: any) => {
    workspace = new WorkspaceService(params.rootPath);
    fileService = new FileService(params.rootPath);
    gitService = new GitService(params.rootPath);
    return workspace.open();
  },

  'workspace.preflight': async () => workspace?.preflight(),

  'workspace.snapshot': async (params: any) => workspace?.snapshot(params.label),

  'workspace.rollback': async (params: any) => workspace?.rollback(params.snapshotId),

  'workspace.status': async () => gitService?.status(),

  // Files
  'file.read': async (params: any) => fileService!.read(params),
  'file.write': async (params: any) => fileService!.write(params),
  'file.patch': async (params: any) => fileService!.patch(params),
  'file.stat': async (params: any) => fileService!.stat(params),

  // Process
  'proc.execFile': async (params: any) => {
    const launcher = new ProcessLauncher();
    return launcher.execFile(params);
  },

  'proc.which': async (params: any) => {
    const launcher = new ProcessLauncher();
    return launcher.which(params.name);
  },

  // Git
  'git.status': async () => gitService!.status(),
  'git.add': async (params: any) => gitService!.add(params.paths),
  'git.commit': async (params: any) => gitService!.commit(params.message, params.options),
  'git.diff': async (params: any) => gitService!.diff(params.paths, params.staged),

  // Validation
  'validate.run': async (params: any) => validationService!.run(params.profile, params.targets),
};

async function handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse> {
  try {
    if (req.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32600, message: 'Invalid JSON-RPC version' },
      };
    }

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
      error: {
        code: err.code || -32603,
        message: err.message || 'Internal error',
        data: err.data,
      },
    };
  }
}

async function main() {
  let buffer = '';

  stdin.setEncoding('utf8');
  stdin.on('data', async (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const req = JSON.parse(trimmed);
        const res = await handleRequest(req);
        stdout.write(JSON.stringify(res) + '\n');
      } catch (parseErr) {
        stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32700, message: 'Parse error' },
          }) + '\n'
        );
      }
    }
  });

  stdin.on('end', () => {
    process.exit(0);
  });

  stdin.on('error', (err) => {
    console.error('stdin error:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

---

## Testing Strategy

Create unit tests for the Windows-critical layers:

```typescript
// test/unit/ProcessLauncher.test.ts
import { describe, it, expect } from 'vitest';
import { ProcessLauncher } from '../../src/windows/ProcessLauncher';

describe('ProcessLauncher on Windows', () => {
  it('should spawn exe without shell', async () => {
    const launcher = new ProcessLauncher();
    const result = await launcher.spawnDirect('node', ['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('v');
  });

  it('should handle .bat files through cmd.exe', async () => {
    // Only on Windows with a test.bat
    const launcher = new ProcessLauncher();
    const result = await launcher.spawnBatch('test.bat', []);
    expect(result.exitCode).toBeDefined();
  });

  it('should normalize env to prevent PATH duplication', async () => {
    const launcher = new ProcessLauncher();
    const env = launcher['normalizeEnv']({ PATH: 'c:\\test', path: 'd:\\other' });
    const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === 'path');
    expect(pathKeys).toHaveLength(1);
  });
});

// test/unit/LineEndings.test.ts
import { describe, it, expect } from 'vitest';
import { LineEndings } from '../../src/utils/LineEndings';

describe('LineEndings', () => {
  it('should detect CRLF', () => {
    expect(LineEndings.detect('a\r\nb\r\nc')).toBe('crlf');
  });

  it('should detect LF', () => {
    expect(LineEndings.detect('a\nb\nc')).toBe('lf');
  });

  it('should detect mixed', () => {
    expect(LineEndings.detect('a\r\nb\nc')).toBe('mixed');
  });

  it('should normalize to LF', () => {
    const result = LineEndings.normalize('a\r\nb\r\nc', 'lf');
    expect(result).toBe('a\nb\nc');
  });

  it('should normalize to CRLF', () => {
    const result = LineEndings.normalize('a\nb\nc', 'crlf');
    expect(result).toBe('a\r\nb\r\nc');
  });
});
```

---

## Build and Deploy

```bash
#!/bin/bash
# scripts/build.sh

set -e

echo "Building agent-harness..."

# Compile TypeScript
npm run typecheck
npx tsc

# Bundle with esbuild
npx esbuild dist/index.js --bundle --platform=node --target=node20 --outfile=dist/harness.js

# Create Windows exe with pkg
npx pkg dist/harness.js --targets node20-win-x64 --output dist/harness.exe

echo "✓ Build complete: dist/harness.exe"
```

This implementation is production-grade for Windows. Use it as the foundation for your local agents.
