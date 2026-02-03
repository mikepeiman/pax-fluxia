class Ship {
    constructor(radius, color, orbit, angle) {
        this.radius = radius;
        this.color = color;
        this.orbit = orbit;
        this.distance = 0;
        this.pos = { x: 0, y: 0 };
        this.angle = angle;
    }
}

export default Ship;