function clearStarActiveStates(star, ctx, data, drawHex, getStarById, canvasArrow) {
    star.active = false;
        star.highlighted = false;
        star.draw(ctx, data, drawHex, getStarById, canvasArrow)
}

export { clearStarActiveStates}