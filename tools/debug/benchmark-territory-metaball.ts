import path from 'node:path';

const CLIENT_ROOT = path.resolve(import.meta.dir, '..', '..', 'pax-fluxia');
const result = Bun.spawnSync({
    cmd: [
        'bunx',
        'vitest',
        'run',
        'tools/debug/benchmark-territory-metaball.test.ts',
    ],
    cwd: CLIENT_ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
});

process.exit(result.exitCode);
