const fs = require('fs');
const path = 'c:\\Users\\mikep\\Desktop\\WebDev\\PRISM-Atlas-DART v1\\pax-fluxia\\src\\lib\\renderers\\VoronoiRenderer.ts';
let c = fs.readFileSync(path, 'utf8');
let changes = 0;

// Fix 1: Apply blur to cellGraphics, not voronoiContainer
const old1 = 'voronoiContainer.filters = [cachedBlurFilter];';
const new1 = 'cellGraphics.filters = [cachedBlurFilter];';
if (c.includes(old1)) { c = c.replace(old1, new1); changes++; }

const old2 = 'voronoiContainer.filters = [];';
const new2 = 'if (cellGraphics) cellGraphics.filters = [];';
if (c.includes(old2)) { c = c.replace(old2, new2); changes++; }

fs.writeFileSync(path, c);
console.log(`VoronoiRenderer fixed: ${changes} replacements`);
