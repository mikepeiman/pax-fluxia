function hitTest(x, y, star) {
    console.log(`🚀 ~ file: hitTest.js:2 ~ hitTest ~ x, y, star:`, x, y, star)
    return (
        x >= star.xMin && x <= star.xMax && y >= star.yMin && y <= star.yMax
    );
}

export {hitTest};