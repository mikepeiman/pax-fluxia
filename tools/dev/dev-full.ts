const bunPath = Bun.which("bun") ?? process.execPath;

const processes = [
    {
        name: "client",
        proc: Bun.spawn([bunPath, "--cwd", "pax-fluxia", "run", "dev"], {
            stdin: "inherit",
            stdout: "inherit",
            stderr: "inherit",
        }),
    },
    {
        name: "server",
        proc: Bun.spawn([bunPath, "--cwd", "pax-server", "run", "dev:node"], {
            stdin: "inherit",
            stdout: "inherit",
            stderr: "inherit",
        }),
    },
];

let shuttingDown = false;

async function shutdown(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const { proc } of processes) {
        try {
            proc.kill();
        } catch {}
    }
    await Promise.allSettled(processes.map(({ proc }) => proc.exited));
    process.exit(exitCode);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
        void shutdown(0);
    });
}

const result = await Promise.race(
    processes.map(async ({ name, proc }) => ({
        name,
        exitCode: await proc.exited,
    })),
);

console.error(`[dev:full] ${result.name} exited with code ${result.exitCode}`);
await shutdown(result.exitCode);
