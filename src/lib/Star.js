import { store_stars } from "$stores/stores";
import { get } from "svelte/store";
let stars = get(store_stars);
class Star {
    constructor(id, x, y, radius, type, hue, numShips) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.type = type;
        this.hue = hue;
        this.numShips = numShips;
        this.xMin = x - radius;
        this.xMax = x + radius;
        this.yMin = y - radius;
        this.yMax = y + radius;
        this.ships = [];
        this.highlighted = false;
        this.active = false;
        this.attackMoveTarget = null;
        this.attackMoveTargetId = null;
        this.starsThatTargetThisStar = [];
        this.shipsPerTickPercentage = 0.05;
        this.shipsPerTick = 2;
        this.shipsToTransfer = [];
    }

    draw(ctx, data, drawHex, getStarById, canvasArrow) {
        let star = new Path2D();
        ctx.beginPath();
        star.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${this.hue}, 50%, 50%, 1)`;
        ctx.fill(star);
        let fontSize = 18;
        if (this.highlighted) {
            this.highlight(ctx);
        }
        if (this.active) {
            this.activeStarHexBorderHighlight(ctx, drawHex);
        }
        if (data.drawLabels) {
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            // ctx.fillText(this.ships.length, this.x - this.radius / 3, this.y + fontSize / 3);
            ctx.fillStyle = '#fff';
            ctx.fillText(this.id, this.x, this.y - fontSize / 2);
            ctx.fillStyle = '#000';
            ctx.fillText(this.ships.length, this.x, this.y + fontSize / 3);
        }
        if (this.attackMoveTargetId ) {
            stars = get(store_stars)
            let destination = getStarById(stars, this.attackMoveTargetId);
            let origin = getStarById(stars, this.id);
            destination.attackMoveTargetId === star.id ? (destination.attackMoveTargetId = null) : null;
            canvasArrow(ctx, destination, origin);
        }
    }

    update(tick) {
        this.type === 1 ? this.numShips++ : null;
        this.type === 2 && tick % 2 == 0 ? this.numShips++ : null;
        this.type === 3 && tick % 3 == 0 ? this.numShips++ : null;
        this.type === 4 && tick % 4 == 0 ? this.numShips++ : null;
        this.type === 5 && tick % 5 == 0 ? this.numShips++ : null;
    }

    highlight(ctx) {
        // ctx.save();
        this.highlighted = true;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${this.hue + 20}, 100%, 50%, 1)`;
        ctx.fill();
        // ctx.restore();
    }
    activeStarHexBorderHighlight(ctx, drawHex) {
        // ctx.save();
        this.highlighted = true;
        let lineWidth = 3;
        let color = `hsla(${this.hue}, 100%, 50%, 1)`;
        drawHex(this.x, this.y, this.radius * 2, lineWidth, color);
        // ctx.lineWidth = 1;
        // ctx.arc(this.x, this.y, this.radius * 2.2, 0, 2 * Math.PI);
        // ctx.fillStyle = `hsla(${this.hue + 20}, 100%, 50%, 1)`;
        // ctx.fill();
        // ctx.restore();
    }

    unhighlight(ctx) {
        this.highlighted = false;
        // ctx.save();

        ctx.beginPath();
        // ctx.lineWidth = 1;
        ctx.arc(this.x, this.y, this.radius * 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${this.hue + 20}, 50%, 50%, 1)`;
        ctx.fill();
        // ctx.restore();
    }

    handleEvent(e) {
        console.log(`🚀 ~ file: index.svelte ~ line 334 ~ Star ~ onEvent ~ e.type: `, e.type);
        console.log(`🚀 ~ file: index.svelte ~ line 334 ~ Star ~ onEvent ~ e`, e);
        console.log(`🚀 ~ file: index.svelte ~ line 214 ~ onEvent ~ this`, this.x);
        console.log(`🚀 ~ file: index.svelte ~ line 214 ~ onEvent ~ this`, this.y);
        if (e.type === 'mouseover') {
            console.log(` e.type: mouseover `);
            this.hue = 0;
        }
    }
}

export default Star;