import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import fs from "node:fs";
import path from "node:path";

/** @typedef {import("vite").PluginOption} PluginOption */
/** @typedef {import("vite").ViteDevServer} ViteDevServer */
/** @typedef {import("node:http").IncomingMessage} IncomingMessage */
/** @typedef {import("node:http").ServerResponse} ServerResponse */

// Dev-only plugin: writes GAME_CONFIG snapshot on POST /__settings-dump
/** @returns {PluginOption} */
function settingsDumpPlugin() {
  return {
    name: "settings-dump",
    /** @param {ViteDevServer} server */
    configureServer(server) {
      server.middlewares.use(
        "/__settings-dump",
        /**
         * @param {IncomingMessage} req
         * @param {ServerResponse} res
         */
        (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
          }

          let body = "";
          req.on(
            "data",
            /** @param {Buffer | string} chunk */
            (chunk) => {
              body += chunk.toString();
            },
          );
          req.on("end", () => {
            try {
              const dir = path.resolve(
                server.config.root,
                "..",
                "common",
                "resources",
                "settings-live",
              );
              fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(
                path.join(dir, "current-settings.json"),
                body,
                "utf-8",
              );
              res.statusCode = 200;
              res.end("ok");
            } catch (error) {
              res.statusCode = 500;
              res.end(String(error));
            }
          });
        },
      );
    },
  };
}

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit(), settingsDumpPlugin()],

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
