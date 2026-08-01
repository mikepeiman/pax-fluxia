#!/usr/bin/env node
/**
 * Vendors the HUD typefaces from Google Fonts into static/fonts/hud/ as TTF,
 * matching the existing <Family>-<weight>.ttf convention. Fonts are vendored,
 * not linked, so the game has no runtime dependency on a font CDN.
 *   node tools/fetch-fonts.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "../static/fonts/hud");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

/** family -> { file, weights } */
const FAMILIES = [
  { name: "Chakra Petch", file: "ChakraPetch", weights: [500, 600, 700] },
  { name: "Barlow", file: "Barlow", weights: [400, 500, 600, 700] },
  { name: "Cormorant Garamond", file: "CormorantGaramond", weights: [600, 700] },
  { name: "Spectral", file: "Spectral", weights: [400, 500, 600] },
  { name: "Audiowide", file: "Audiowide", weights: [400] },
  { name: "Archivo", file: "Archivo", weights: [500, 600, 700] },
];

await mkdir(OUT, { recursive: true });
for (const fam of FAMILIES) {
  const q = `family=${encodeURIComponent(fam.name)}:wght@${fam.weights.join(";")}`;
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?${q}&display=swap`, {
      headers: { "User-Agent": UA },
    })
  ).text();
  // css2 returns the @font-face blocks in the requested weight order
  const blocks = css.split("@font-face").filter((b) => b.includes("src:"));
  for (const b of blocks) {
    const w = b.match(/font-weight:\s*(\d+)/)?.[1];
    const url = b.match(/url\((https:[^)]+)\)/)?.[1];
    if (!w || !url || !fam.weights.includes(Number(w))) continue;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const dest = path.join(OUT, `${fam.file}-${w}.ttf`);
    await writeFile(dest, buf);
    console.log(`✓ ${path.basename(dest)} ${(buf.length / 1024).toFixed(0)}kb`);
  }
}
