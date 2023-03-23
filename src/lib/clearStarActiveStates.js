function clearStarActiveStates(star, ctx) {
    star.active = false;
        star.highlighted = false;
        star.unhighlight(ctx)
}

export { clearStarActiveStates}