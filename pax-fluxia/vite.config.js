import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
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

// Dev-only plugin: expose fixture maps from common/resources via /__fixture-maps
function fixtureMapPlugin() {
  return {
    name: "fixture-maps",
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      const resourceRoot = path.resolve(server.config.root, "..", "common", "resources");
      const fixtureDir = path.join(resourceRoot, "fixture-maps");

      server.middlewares.use("/__fixture-maps", (/** @type {import('http').IncomingMessage} */ req, /** @type {import('http').ServerResponse} */ res) => {
        res.setHeader("Content-Type", "application/json");

        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const url = new URL(req.url || "", "http://localhost");
          const requestedPath = url.searchParams.get("path");
          const requestedId = url.searchParams.get("id");

          if (!requestedPath && !requestedId) {
            const manifest = fs.existsSync(fixtureDir)
              ? fs
                  .readdirSync(fixtureDir)
                  .filter((file) => file.endsWith(".json"))
                  .map((file) => ({
                    id: path.basename(file, ".json"),
                    resourcePath: `common/resources/fixture-maps/${file}`,
                  }))
              : [];
            res.statusCode = 200;
            res.end(JSON.stringify(manifest));
            return;
          }

          const relativePath = requestedPath || `common/resources/fixture-maps/${requestedId}.json`;
          const absolutePath = path.resolve(server.config.root, "..", relativePath);
          if (!absolutePath.startsWith(resourceRoot)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid fixture path" }));
            return;
          }
          if (!fs.existsSync(absolutePath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Fixture map not found" }));
            return;
          }

          const content = fs.readFileSync(absolutePath, "utf-8");
          res.statusCode = 200;
          res.end(content);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit(), settingsDumpPlugin(), mapPersistPlugin(), fixtureMapPlugin()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
