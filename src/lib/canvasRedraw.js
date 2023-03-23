function canvasRedraw(ctx) {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, w, h);
    stars = get(store_stars);
    drawStarsOnHexCoords(stars, data, hexCenterCoords);
}

export {canvasRedraw};