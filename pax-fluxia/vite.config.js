import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

// Dev-only plugin: writes GAME_CONFIG snapshot on POST /__settings-dump
function settingsDumpPlugin() {
  return {
    name: "settings-dump",
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      server.middlewares.use("/__settings-dump", (/** @type {import('http').IncomingMessage} */ req, /** @type {import('http').ServerResponse} */ res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
        let body = "";
        req.on("data", (/** @type {string} */ chunk) => (body += chunk));
        req.on("end", () => {
          try {
            const dir = path.resolve(server.config.root, "..", "common", "resources", "settings-live");
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, "current-settings.json"), body, "utf-8");
            res.statusCode = 200;
            res.end("ok");
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
      });
    },
  };
}

// Dev-only plugin: CRUD endpoints for saved maps at /__maps
function mapPersistPlugin() {
  return {
    name: "map-persist",
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      const mapsDir = () => {
        const dir = path.resolve(server.config.root, "..", "common", "resources", "saved-maps");
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      };

      // GET /__maps → list all saved maps
      // POST /__maps → save a map (body = MapDefinition JSON)
      // DELETE /__maps?name=X → delete a map
      server.middlewares.use("/__maps", (/** @type {import('http').IncomingMessage} */ req, /** @type {import('http').ServerResponse} */ res) => {
        res.setHeader("Content-Type", "application/json");

        if (req.method === "GET") {
          try {
            const dir = mapsDir();
            const files = fs.readdirSync(dir).filter((/** @type {string} */ f) => f.endsWith(".json"));
            const maps = files.map((/** @type {string} */ f) => {
              const content = fs.readFileSync(path.join(dir, f), "utf-8");
              return JSON.parse(content);
            });
            res.statusCode = 200;
            res.end(JSON.stringify(maps));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(e) }));
          }
          return;
        }

        if (req.method === "DELETE") {
          try {
            const url = new URL(req.url || "", "http://localhost");
            const name = url.searchParams.get("name");
            if (!name) { res.statusCode = 400; res.end(JSON.stringify({ error: "name required" })); return; }
            const slug = name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
            const filePath = path.join(mapsDir(), `${slug}.json`);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(e) }));
          }
          return;
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (/** @type {string} */ chunk) => (body += chunk));
          req.on("end", () => {
            try {
              const map = JSON.parse(body);
              const name = map?.metadata?.name || "untitled";
              const slug = name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
              const filePath = path.join(mapsDir(), `${slug}.json`);
              fs.writeFileSync(filePath, JSON.stringify(map, null, 2), "utf-8");
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, file: `${slug}.json` }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
      });
    },
  };
}

function browserBenchPlugin() {
  return {
    name: "browser-bench",
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/__bench")) {
          next();
          return;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pax Fluxia Browser Bench</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/src/lib/bench/browserBenchEntry.ts"></script>
  </body>
</html>`);
      });
    },
  };
}

const host = process.env.TAURI_DEV_HOST;
const benchmarkNoHmr = process.env.PAX_BENCH_NO_HMR === "1";
const benchmarkStandalone = process.env.PAX_BENCH_STANDALONE === "1";
const extraFsAllow = [
  path.resolve(process.cwd(), ".."),
  path.resolve(process.cwd(), "..", ".."),
  path.resolve(process.env.USERPROFILE || "", "Desktop", "WebDev", "pax-fluxia"),
  ...(process.env.PAX_VITE_EXTRA_FS_ALLOW
    ? process.env.PAX_VITE_EXTRA_FS_ALLOW.split(";").filter(Boolean)
    : []),
].filter((entry) => entry && fs.existsSync(entry));

// https://vite.dev/config/
export default defineConfig(async () => ({
  // Vitest: never collect tests from the quarantine holding area (cleanup Stage 3C).
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/_quarantine/**"],
  },
  plugins: [tailwindcss(), browserBenchPlugin(), sveltekit(), settingsDumpPlugin(), mapPersistPlugin()],
  optimizeDeps: {
    // Pre-bundle EVERY runtime dep Vite's cold-start scanner can't reach on its
    // own, so the first `vite dev` load doesn't discover a new dep mid-init,
    // re-optimize, and force a full reload that kills the game bootstrap (the
    // "first run doesn't load, kill + rerun works" bug). Scanner blind spots:
    //   - @pax/common is imported DYNAMICALLY (import("@pax/common")) → the
    //     scanner never sees it or its deps (@colyseus/schema, d3-delaunay).
    //   - d3-weighted-voronoi / jszip are CJS and only statically imported deep
    //     in the graph.
    include: [
      "pixi.js",
      "txtgen",
      "@colyseus/sdk",
      "@colyseus/schema",
      "d3-delaunay",
      "d3-weighted-voronoi",
      "jszip",
    ],
  },
  resolve: {
    dedupe: ["pixi.js", "svelte"],
    alias: {
      $lib: path.resolve(process.cwd(), "src/lib"),
      ...(benchmarkStandalone
        ? {
          "$app/navigation": path.resolve(
            process.cwd(),
            "src/lib/bench/navigationStub.ts",
          ),
        }
        : {}),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    fs: {
      allow: extraFsAllow,
    },
    hmr: benchmarkNoHmr
      ? false
      : host
        ? {
          protocol: "ws",
          host,
          port: 1421,
        }
        : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: [
        "**/src-tauri/**",
        "**/common/resources/settings-live/**",
        "**/common/resources/saved-maps/**",
      ],
    },
  },
}));
