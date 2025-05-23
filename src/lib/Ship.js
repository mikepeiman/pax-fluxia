class Ship {
    constructor(radius, color, orbit, angle, type = 1) {
        this.radius = radius;
        this.baseRadius = radius;
        this.color = color;
        this.orbit = orbit;
        this.baseOrbit = orbit;
        this.distance = 0;
        this.pos = { x: 0, y: 0 };
        this.angle = angle;
        this.baseAngle = angle;
        this.type = type;

        // Enhanced visual properties
        this.animationPhase = Math.random() * Math.PI * 2;
        this.engineGlow = 0;
        this.trailPoints = [];
        this.maxTrailLength = 8;
        this.lastTrailTime = 0;
        this.pulseIntensity = 1;
        this.warpField = 0;
        this.thrustLevel = 0.5;

        // Ship type specific properties
        this.shipTypes = {
            1: {
                name: 'Fighter',
                color: '#ff6b6b',
                speed: 1.2,
                size: 1,
                trailColor: '#ff8e53',
                shape: 'triangle'
            },
            2: {
                name: 'Cruiser',
                color: '#4ecdc4',
                speed: 0.8,
                size: 1.5,
                trailColor: '#45b7d1',
                shape: 'diamond'
            },
            3: {
                name: 'Destroyer',
                color: '#f9ca24',
                speed: 0.6,
                size: 2,
                trailColor: '#f0932b',
                shape: 'hexagon'
            },
            4: {
                name: 'Battleship',
                color: '#6c5ce7',
                speed: 0.4,
                size: 2.5,
                trailColor: '#a29bfe',
                shape: 'rect'
            }
        };

        // Set type-specific properties
        const shipType = this.shipTypes[this.type] || this.shipTypes[1];
        this.color = shipType.color;
        this.speedMultiplier = shipType.speed;
        this.sizeMultiplier = shipType.size;
        this.trailColor = shipType.trailColor;
        this.shape = shipType.shape;

        // Randomize some properties for variety
        this.engineFlickerPhase = Math.random() * Math.PI * 2;
        this.personalHue = Math.random() * 30 - 15; // ±15 degree hue variation
    }

    update(starX, starY, speed, animationEngine = null, tickProgress = 0) {
        const currentTime = performance.now();

        // Update animation properties
        this.animationPhase += 0.1;
        this.engineFlickerPhase += 0.3;

        // Surge animation based on tick progress
        const surgeProgress = animationEngine ? animationEngine.getSurgeProgress() :
            (0.5 + Math.sin(tickProgress * Math.PI * 2) * 0.5);

        // Apply surge to movement speed
        const surgeSpeedMultiplier = 0.5 + surgeProgress * 1.5;
        this.angle += speed * this.speedMultiplier * surgeSpeedMultiplier;

        // Apply surge to orbit distance
        this.orbit = this.baseOrbit * (1 + surgeProgress * 0.2);

        // Calculate position with enhanced orbital mechanics
        const orbitVariation = Math.sin(this.animationPhase * 0.5) * 0.1; // Slight orbital wobble
        const effectiveOrbit = this.orbit * (1 + orbitVariation);

        this.pos = {
            x: starX + Math.cos(this.angle) * effectiveOrbit,
            y: starY + Math.sin(this.angle) * effectiveOrbit
        };

        // Update engine effects
        this.thrustLevel = 0.3 + surgeProgress * 0.7;
        this.engineGlow = 0.5 + Math.sin(this.engineFlickerPhase) * 0.3 + surgeProgress * 0.5;

        // Update trail
        this.updateTrail(currentTime);

        // Create particle trails for active ships
        if (animationEngine && Math.random() < 0.1 * surgeProgress) {
            animationEngine.createShipTrail(this.pos.x, this.pos.y);
        }
    }

    updateTrail(currentTime) {
        // Add new trail point every few milliseconds
        if (currentTime - this.lastTrailTime > 50) {
            this.trailPoints.unshift({
                x: this.pos.x,
                y: this.pos.y,
                time: currentTime,
                intensity: this.thrustLevel
            });

            // Limit trail length
            if (this.trailPoints.length > this.maxTrailLength) {
                this.trailPoints.pop();
            }

            this.lastTrailTime = currentTime;
        }

        // Update trail point intensities
        this.trailPoints = this.trailPoints.filter(point => {
            const age = currentTime - point.time;
            point.alpha = Math.max(0, 1 - age / 1000); // Fade over 1 second
            return point.alpha > 0;
        });
    }

    draw(ctx, animationEngine = null, tickProgress = 0) {
        if (!this.pos.x || !this.pos.y) return;

        const currentTime = performance.now();
        const surgeProgress = animationEngine ? animationEngine.getSurgeProgress() :
            (0.5 + Math.sin(tickProgress * Math.PI * 2) * 0.5);

        // Calculate dynamic properties
        const currentRadius = this.baseRadius * this.sizeMultiplier * (1 + surgeProgress * 0.3);
        const glowRadius = currentRadius * 3;

        ctx.save();

        // Draw trail first (behind ship)
        this.drawTrail(ctx, surgeProgress);

        // Draw engine glow
        this.drawEngineGlow(ctx, currentRadius, glowRadius, surgeProgress);

        // Draw ship body
        this.drawShipBody(ctx, currentRadius, surgeProgress);

        // Draw engine exhaust
        this.drawEngineExhaust(ctx, currentRadius, surgeProgress);

        // Draw energy shield (when surging)
        if (surgeProgress > 0.7) {
            this.drawEnergyShield(ctx, currentRadius, surgeProgress);
        }

        ctx.restore();
    }

    drawTrail(ctx, surgeProgress) {
        if (this.trailPoints.length < 2) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < this.trailPoints.length - 1; i++) {
            const point = this.trailPoints[i];
            const nextPoint = this.trailPoints[i + 1];
            const alpha = point.alpha * (1 - i / this.trailPoints.length) * surgeProgress;

            if (alpha <= 0) continue;

            // Create gradient for trail segment
            const gradient = ctx.createLinearGradient(
                point.x, point.y, nextPoint.x, nextPoint.y
            );
            gradient.addColorStop(0, this.trailColor + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
            gradient.addColorStop(1, this.trailColor + Math.floor(alpha * 128).toString(16).padStart(2, '0'));

            ctx.strokeStyle = gradient;
            ctx.lineWidth = (this.baseRadius * this.sizeMultiplier * 0.5) * alpha;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(nextPoint.x, nextPoint.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawEngineGlow(ctx, currentRadius, glowRadius, surgeProgress) {
        // Outer engine glow
        const gradient = ctx.createRadialGradient(
            this.pos.x, this.pos.y, currentRadius,
            this.pos.x, this.pos.y, glowRadius
        );

        const glowAlpha = (0.3 + this.engineGlow * 0.4) * surgeProgress;
        gradient.addColorStop(0, this.color + Math.floor(glowAlpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.5, this.trailColor + Math.floor(glowAlpha * 128).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawShipBody(ctx, currentRadius, surgeProgress) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle + Math.PI / 2); // Point in direction of movement

        // Ship shadow/outline
        ctx.shadowBlur = 10 * surgeProgress;
        ctx.shadowColor = this.color;

        // Main ship body gradient
        const bodyGradient = ctx.createRadialGradient(
            -currentRadius * 0.3, -currentRadius * 0.3, 0,
            0, 0, currentRadius
        );
        bodyGradient.addColorStop(0, '#ffffff');
        bodyGradient.addColorStop(0.3, this.color);
        bodyGradient.addColorStop(1, this.getDarkerColor(this.color));

        ctx.fillStyle = bodyGradient;

        // Draw ship shape based on type
        switch (this.shape) {
            case 'triangle':
                this.drawTriangleShip(ctx, currentRadius);
                break;
            case 'diamond':
                this.drawDiamondShip(ctx, currentRadius);
                break;
            case 'hexagon':
                this.drawHexagonShip(ctx, currentRadius);
                break;
            case 'rect':
                this.drawRectShip(ctx, currentRadius);
                break;
            default:
                this.drawTriangleShip(ctx, currentRadius);
        }

        ctx.restore();
    }

    drawTriangleShip(ctx, radius) {
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(-radius * 0.7, radius * 0.5);
        ctx.lineTo(radius * 0.7, radius * 0.5);
        ctx.closePath();
        ctx.fill();

        // Cockpit detail
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDiamondShip(ctx, radius) {
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(-radius * 0.5, 0);
        ctx.lineTo(0, radius);
        ctx.lineTo(radius * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        // Central core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHexagonShip(ctx, radius) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Hexagonal detail
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawRectShip(ctx, radius) {
        const width = radius * 1.5;
        const height = radius;

        ctx.fillRect(-width / 2, -height / 2, width, height);

        // Command bridge
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-width * 0.3, -height * 0.3, width * 0.6, height * 0.2);

        // Engine blocks
        ctx.fillStyle = this.trailColor;
        ctx.fillRect(-width * 0.4, height * 0.2, width * 0.2, height * 0.3);
        ctx.fillRect(width * 0.2, height * 0.2, width * 0.2, height * 0.3);
    }

    drawEngineExhaust(ctx, currentRadius, surgeProgress) {
        const exhaustLength = currentRadius * 2 * this.thrustLevel * surgeProgress;
        const exhaustAngle = this.angle - Math.PI / 2; // Opposite to movement direction

        if (exhaustLength > 0) {
            ctx.save();

            // Engine exhaust gradient
            const exhaustGradient = ctx.createLinearGradient(
                this.pos.x, this.pos.y,
                this.pos.x + Math.cos(exhaustAngle) * exhaustLength,
                this.pos.y + Math.sin(exhaustAngle) * exhaustLength
            );
            exhaustGradient.addColorStop(0, this.trailColor + 'CC');
            exhaustGradient.addColorStop(0.5, this.trailColor + '66');
            exhaustGradient.addColorStop(1, 'transparent');

            ctx.strokeStyle = exhaustGradient;
            ctx.lineWidth = currentRadius * 0.5;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(
                this.pos.x + Math.cos(exhaustAngle) * exhaustLength,
                this.pos.y + Math.sin(exhaustAngle) * exhaustLength
            );
            ctx.stroke();

            ctx.restore();
        }
    }

    drawEnergyShield(ctx, currentRadius, surgeProgress) {
        const shieldRadius = currentRadius * 2;
        const shieldAlpha = (surgeProgress - 0.7) / 0.3; // Fade in during high surge

        ctx.save();
        ctx.globalAlpha = shieldAlpha * 0.5;

        // Rotating shield pattern
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.animationPhase);

        // Shield gradient
        const shieldGradient = ctx.createRadialGradient(0, 0, currentRadius, 0, 0, shieldRadius);
        shieldGradient.addColorStop(0, 'transparent');
        shieldGradient.addColorStop(0.7, this.color + '44');
        shieldGradient.addColorStop(1, this.color + '88');

        ctx.strokeStyle = shieldGradient;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    getDarkerColor(hexColor) {
        // Simple function to darken a hex color
        const num = parseInt(hexColor.replace('#', ''), 16);
        const amt = -40;
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    // Warp effect for ship transfers
    createWarpOut(animationEngine) {
        if (animationEngine) {
            animationEngine.createWarpEffect(this.pos.x, this.pos.y);
        }
    }

    createWarpIn(animationEngine) {
        if (animationEngine) {
            animationEngine.createWarpEffect(this.pos.x, this.pos.y);
            animationEngine.createExplosion(this.pos.x, this.pos.y, 0.5);
        }
    }
}

export default Ship;
