import { drawStars } from "./drawStars.js";
// import hexCenterCoords from stores
import { store_hexCenterCoords, store_ctx } from "$stores/stores";
let hexCenterCoords = store_hexCenterCoords || [];
let ctx = null;
store_hexCenterCoords.subscribe((val) => {
    hexCenterCoords = val;
});
store_ctx.subscribe((val) => {
    ctx = val;
});

let uniqueVertexCoords = [];
let hexVertexCoords = [];

function generateHexGrid(width, height, r, offset = 0) {
    const a = (2 * Math.PI) / 6;
    let max = 0;
    let evenTest = 1;
    let even = false;
    for (let y = r; y + r * Math.sin(a) < height; y += offset + evenTest * (r * Math.sin(a))) {
        for (
            let x = r, j = 0;
            x + r * (1 + Math.cos(a)) < width;
            x += offset + r * (1 + Math.cos(a)), y += (-1) ** j++ * r * Math.sin(a)
        ) {
            j >= max ? (max = j + 1) : (max = max);
            x = roundNum(x, 3);
            y = parseFloat(y.toFixed(3));
            hexCenterCoords = [...hexCenterCoords, { x, y, r }];
        }
        max % 2 === 0 ? (even = true) : (even = false);
        even ? (evenTest = 2) : (evenTest = 1);
    }
    store_hexCenterCoords.set(hexCenterCoords);
    return hexCenterCoords;
}

function drawStarsOnHexCoords(stars, data, hexCenterCoords, starsToggle, shipsToggle, center, outline, vertices) {
    console.log(`🚀 ~ file: HexGridFunctions.js:41 ~ drawStarsOnHexCoords ~ stars:`, stars)
    let i = 0;
    drawStars(stars, ctx, data, starsToggle, shipsToggle);
    hexCenterCoords.forEach((hex) => {
        let color = `hsla(${i++}, 100%, 50%, 1)`;
        if (center) {
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(hex.x, hex.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
        if (outline) {
            let lineWidth = 1;
            drawHex(hex.x, hex.y, hex.r, lineWidth, color);
        }
    });
    if (vertices) {
        uniqueVertexCoords.forEach((vertex, i) => {
            let color = `hsla(${i}, 50%, 50%, 1)`;
            let lineWidth = 1;
            drawHex(vertex.x, vertex.y, 5, lineWidth, color);
        });
    }
}

function drawHex(cx, cy, r, lineWidth, color) {
    const a = (2 * Math.PI) / 6;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    for (let i = 0; i <= 6; i++) {
        const x = roundNum(cx + r * Math.cos(a * i), 3);
        const y = roundNum(cy + r * Math.sin(a * i), 3);
        ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
}

function getVertexCoords(hexCenterCoords) {
    hexCenterCoords.forEach((coord) => {
        const a = (2 * Math.PI) / 6;
        for (let i = 0; i <= 6; i++) {
            const x = roundNum(coord.x + coord.r * Math.cos(a * i), 3);
            const y = roundNum(coord.y + coord.r * Math.sin(a * i), 3);
            hexVertexCoords = [...hexVertexCoords, { x, y }];
        }
    });
    return hexVertexCoords;
}

function roundNum(num, places) {
    const x = Math.pow(10, places);
    return Math.round(num * x) / x;
}

export { generateHexGrid, drawStarsOnHexCoords, drawHex, getVertexCoords }