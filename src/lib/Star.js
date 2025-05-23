import { store_stars } from "$stores/stores";
import { get } from "svelte/store";
import { data } from "$stores/Data";
let stars = get(store_stars);

class Star {
    constructor(id, x, y, radius, type, hue, numShips) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseRadius = radius;
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

        // Enhanced visual properties
        this.animationPhase = Math.random() * Math.PI * 2;
        this.pulseIntensity = 1;
        this.coronaRotation = 0;
        this.energyLevel = 0.5;
        this.lastParticleEmission = 0;
        this.glowRadius = radius * 3;
        this.starFlares = [];
        this.energyRings = [];

        // Initialize star flares
        this.initializeStarFlares();

        // Type-specific properties
        this.typeColors = {
            1: { primary: '#ff6b6b', secondary: '#ff8e53', tertiary: '#ffd93d' }, // Red giant
            2: { primary: '#4ecdc4', secondary: '#45b7d1', tertiary: '#a8e6cf' }, // Blue star
            3: { primary: '#f9ca24', secondary: '#f0932b', tertiary: '#ffbe76' }, // Yellow star
            4: { primary: '#6c5ce7', secondary: '#a29bfe', tertiary: '#fd79a8' }, // Purple star
            5: { primary: '#00d2d3', secondary: '#54a0ff', tertiary: '#5f27cd' }  // Cyan star
        };
    }

    initializeStarFlares() {
        // Create random flares around the star
        const flareCount = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < flareCount; i++) {
            this.starFlares.push({
                angle: (Math.PI * 2 * i) / flareCount + Math.random() * 0.5,
                length: this.radius * (1.5 + Math.random() * 1.5),
                width: this.radius * (0.1 + Math.random() * 0.2),
                speed: 0.02 + Math.random() * 0.03,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    createEnergyRing() {
        this.energyRings.push({
            radius: this.radius,
            maxRadius: this.radius * 4,
            alpha: 1,
            rotation: Math.random() * Math.PI * 2,
            speed: 0.1 + Math.random() * 0.05
        });
    }

    draw(ctx, data, drawHex, getStarById, canvasArrow, animationEngine = null, tickProgress = 0) {
        const currentTime = performance.now();

        // Update animation properties
        this.animationPhase += 0.03;
        this.coronaRotation += 0.01;

        // Surge animation based on tick progress
        const surgeMultiplier = animationEngine ?
            (1 + animationEngine.getSurgeProgress() * 0.3) :
            (1 + Math.sin(this.animationPhase) * 0.1);

        this.radius = this.baseRadius * surgeMultiplier;

        // Update energy rings
        this.energyRings = this.energyRings.filter(ring => {
            ring.radius += ring.speed * surgeMultiplier;
            ring.alpha = 1 - (ring.radius - this.radius) / (ring.maxRadius - this.radius);
            ring.rotation += 0.02;
            return ring.alpha > 0;
        });

        // Emit particles for active stars
        if (this.active && animationEngine && currentTime - this.lastParticleEmission > 200) {
            animationEngine.createStarPulse(this.x, this.y, this.getTypeColor().primary);
            this.lastParticleEmission = currentTime;
        }

        // Draw star background glow
        this.drawStarGlow(ctx, surgeMultiplier);

        // Draw energy rings
        this.drawEnergyRings(ctx);

        // Draw star corona
        this.drawStarCorona(ctx, surgeMultiplier);

        // Draw star flares
        this.drawStarFlares(ctx, surgeMultiplier);

        // Draw main star body
        this.drawStarCore(ctx, surgeMultiplier);

        // Draw energy core
        this.drawEnergyCore(ctx, surgeMultiplier);

        // Draw labels if enabled
        if (data.drawLabels) {
            this.drawLabels(ctx);
        }

        // Draw active state effects
        if (this.active) {
            this.activeStarHexBorderHighlight(ctx, drawHex, surgeMultiplier);

            // Create energy ring on activation
            if (Math.random() < 0.1) {
                this.createEnergyRing();
            }
        }

        // Draw attack vectors
        if (this.attackMoveTargetId) {
            stars = get(store_stars);
            let destination = getStarById(stars, this.attackMoveTargetId);
            let origin = getStarById(stars, this.id);
            if (destination) {
                destination.attackMoveTargetId === this.id ? (destination.attackMoveTargetId = null) : null;
                this.drawEnhancedArrow(ctx, destination, origin, animationEngine);
            }
        }
    }

    drawStarGlow(ctx, surgeMultiplier) {
        const typeColor = this.getTypeColor();
        const glowRadius = this.glowRadius * surgeMultiplier;

        // Create radial gradient for glow
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius,
            this.x, this.y, glowRadius
        );

        gradient.addColorStop(0, typeColor.primary + '80');
        gradient.addColorStop(0.3, typeColor.secondary + '40');
        gradient.addColorStop(0.7, typeColor.tertiary + '20');
        gradient.addColorStop(1, 'transparent');

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawEnergyRings(ctx) {
        this.energyRings.forEach(ring => {
            const typeColor = this.getTypeColor();

            ctx.save();
            ctx.globalAlpha = ring.alpha * 0.6;
            ctx.strokeStyle = typeColor.primary;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = ring.rotation * 10;

            ctx.beginPath();
            ctx.arc(this.x, this.y, ring.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner energy ring
            ctx.globalAlpha = ring.alpha * 0.3;
            ctx.strokeStyle = typeColor.secondary;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.lineDashOffset = -ring.rotation * 8;

            ctx.beginPath();
            ctx.arc(this.x, this.y, ring.radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        });
    }

    drawStarCorona(ctx, surgeMultiplier) {
        const typeColor = this.getTypeColor();
        const coronaRadius = this.radius * 2 * surgeMultiplier;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.coronaRotation);

        // Draw corona spikes
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const spikeLength = coronaRadius * (0.3 + Math.sin(this.animationPhase + i) * 0.2);

            const gradient = ctx.createLinearGradient(
                0, 0,
                Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength
            );
            gradient.addColorStop(0, typeColor.secondary + 'CC');
            gradient.addColorStop(0.7, typeColor.tertiary + '66');
            gradient.addColorStop(1, 'transparent');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3 * surgeMultiplier;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawStarFlares(ctx, surgeMultiplier) {
        const typeColor = this.getTypeColor();

        ctx.save();
        ctx.translate(this.x, this.y);

        this.starFlares.forEach((flare, index) => {
            flare.phase += flare.speed;
            const intensity = 0.5 + Math.sin(flare.phase) * 0.5;
            const currentLength = flare.length * surgeMultiplier * intensity;

            const gradient = ctx.createLinearGradient(
                0, 0,
                Math.cos(flare.angle) * currentLength,
                Math.sin(flare.angle) * currentLength
            );
            gradient.addColorStop(0, typeColor.primary + 'AA');
            gradient.addColorStop(0.5, typeColor.secondary + '66');
            gradient.addColorStop(1, 'transparent');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = flare.width * surgeMultiplier;
            ctx.beginPath();
            ctx.moveTo(Math.cos(flare.angle) * this.radius, Math.sin(flare.angle) * this.radius);
            ctx.lineTo(Math.cos(flare.angle) * currentLength, Math.sin(flare.angle) * currentLength);
            ctx.stroke();
        });

        ctx.restore();
    }

    drawStarCore(ctx, surgeMultiplier) {
        const typeColor = this.getTypeColor();

        // Main star body with gradient
        const gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, typeColor.tertiary);
        gradient.addColorStop(0.6, typeColor.secondary);
        gradient.addColorStop(1, typeColor.primary);

        ctx.save();
        ctx.shadowBlur = 20 * surgeMultiplier;
        ctx.shadowColor = typeColor.primary;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawEnergyCore(ctx, surgeMultiplier) {
        const typeColor = this.getTypeColor();
        const coreRadius = this.radius * 0.4 * surgeMultiplier;
        const pulseIntensity = 0.7 + Math.sin(this.animationPhase * 2) * 0.3;

        ctx.save();
        ctx.globalAlpha = pulseIntensity;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawLabels(ctx) {
        const fontSize = 18;
        ctx.save();
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000000';

        // Star ID
        ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.id, this.x, this.y - fontSize);

        // Ship count
        ctx.font = `bold ${fontSize * 0.8}px 'Courier New', monospace`;
        ctx.fillStyle = '#ffff00';
        ctx.fillText(this.ships.length, this.x, this.y + fontSize * 0.5);

        ctx.restore();
    }

    drawEnhancedArrow(ctx, destination, origin, animationEngine) {
        const dx = destination.x - origin.x;
        const dy = destination.y - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Animated energy beam
        ctx.save();
        ctx.strokeStyle = this.getTypeColor().primary;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = performance.now() * 0.01;

        ctx.beginPath();
        ctx.moveTo(origin.x + Math.cos(angle) * origin.radius,
            origin.y + Math.sin(angle) * origin.radius);
        ctx.lineTo(destination.x - Math.cos(angle) * destination.radius,
            destination.y - Math.sin(angle) * destination.radius);
        ctx.stroke();

        // Arrowhead with glow
        const arrowSize = 15;
        const arrowX = destination.x - Math.cos(angle) * destination.radius;
        const arrowY = destination.y - Math.sin(angle) * destination.radius;

        ctx.fillStyle = this.getTypeColor().primary;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.getTypeColor().primary;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Create particle trail if animation engine available
        if (animationEngine && Math.random() < 0.3) {
            const trailX = origin.x + dx * (0.3 + Math.random() * 0.4);
            const trailY = origin.y + dy * (0.3 + Math.random() * 0.4);
            animationEngine.createShipTrail(trailX, trailY);
        }
    }

    getTypeColor() {
        return this.typeColors[this.type] || this.typeColors[1];
    }

    update(tick) {
        // Energy increases with type efficiency
        this.type === 1 ? this.numShips++ : null;
        this.type === 2 && tick % 2 == 0 ? this.numShips++ : null;
        this.type === 3 && tick % 3 == 0 ? this.numShips++ : null;
        this.type === 4 && tick % 4 == 0 ? this.numShips++ : null;
        this.type === 5 && tick % 5 == 0 ? this.numShips++ : null;

        // Update energy level based on ship count
        this.energyLevel = Math.min(1, this.numShips / 100);
    }

    activeStarHexBorderHighlight(ctx, drawHex, surgeMultiplier = 1) {
        this.highlighted = true;
        const lineWidth = 5 * surgeMultiplier;
        const typeColor = this.getTypeColor();

        // Pulsing hex border
        const pulseIntensity = 0.7 + Math.sin(this.animationPhase * 3) * 0.3;
        ctx.save();
        ctx.globalAlpha = pulseIntensity;
        ctx.shadowBlur = 15;
        ctx.shadowColor = typeColor.primary;
        drawHex(this.x, this.y, this.radius * 2.5, lineWidth, typeColor.primary);
        ctx.restore();

        // Secondary hex ring
        ctx.save();
        ctx.globalAlpha = 0.5;
        drawHex(this.x, this.y, this.radius * 3, lineWidth * 0.5, typeColor.secondary);
        ctx.restore();
    }

    handleEvent(e) {
        console.log(`🚀 ~ file: Star.js ~ line 334 ~ Star ~ onEvent ~ e.type: `, e.type);
        console.log(`🚀 ~ file: Star.js ~ line 334 ~ Star ~ onEvent ~ e`, e);
        if (e.type === 'mouseover') {
            console.log(` e.type: mouseover `);
            this.hue = 0;
        }
    }
}

export default Star;
