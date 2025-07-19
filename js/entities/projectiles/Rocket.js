// js/entities/projectiles/Rocket.js

import { Entity } from '../base/Entity.js';
import { GAME_CONFIG } from '../../config.js';

/**
 * Rocket projectile with intelligent targeting and area damage
 * Rockets seek out the alien with the most neighbors for maximum damage
 */
export class Rocket extends Entity {
    constructor(x, y) {
        const config = GAME_CONFIG.rocket;
        super(x, y, config.width, config.height, config.color);
        
        this.speedY = config.speedY;
        this.damage = config.damage;
        this.explosionRadius = config.explosionRadius;
        this.flameColor = config.flameColor;
        this.turnSpeed = config.turnRate;
        this.speed = Math.abs(config.speedY);
        
        // Targeting properties
        this.target = null;
        this.currentAngle = -Math.PI / 2; // Start pointing up
        this.setRotation(this.currentAngle);
        
        // Explosion properties
        this.exploded = false;
        this.explosionTimer = 0;
        
        // Visual effects
        this.thrustParticles = [];
        this.targetingRadius = 150; // Radius for neighbor detection
        
        // Lifetime management
        this.maxAge = 8000; // 8 seconds max lifetime
        
        // State tracking
        this.chasingDistance = GAME_CONFIG.rocket.distanceToStartChasing || 150;
        this.hasStartedChasing = false;
    }

    /**
     * Update rocket behavior and movement
     * @param {number} deltaTime - Time since last frame
     * @param {Array} aliens - Array of alien entities to target
     */
    update(deltaTime, aliens) {
        super.update(deltaTime);
        
        const speedFactor = deltaTime / 16.67;
        
        // Check if rocket should start chasing (after traveling some distance)
        if (!this.hasStartedChasing && this.y <= this.chasingDistance) {
            this.hasStartedChasing = true;
        }
        
        // Only start targeting after rocket has traveled enough
        if (this.hasStartedChasing) {
            // Find target if we don't have one or current target is invalid
            if (!this.target || !this.target.active) {
                this.findBestTarget(aliens);
            }
            
            // Home towards target
            if (this.target) {
                this.updateHoming(speedFactor);
            }
        }
        
        // Update position based on current angle and speed
        this.x += Math.cos(this.currentAngle) * this.speed * speedFactor;
        this.y += Math.sin(this.currentAngle) * this.speed * speedFactor;
        
        // Update thrust particles
        this.updateThrustParticles(deltaTime);
        
        // Deactivate if offscreen (top)
        if (this.y + this.height < -50) {
            this.active = false;
        }
    }

    /**
     * Update homing behavior towards target
     * @param {number} speedFactor - Speed adjustment factor
     */
    updateHoming(speedFactor) {
        const targetX = this.target.getCenterX();
        const targetY = this.target.getCenterY();
        const desiredAngle = Math.atan2(targetY - this.getCenterY(), targetX - this.getCenterX());
        
        let angleDiff = desiredAngle - this.currentAngle;
        
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Apply turn rate limit
        const maxTurn = this.turnSpeed * speedFactor;
        const turnAmount = this.clamp(angleDiff, -maxTurn, maxTurn);
        
        this.currentAngle += turnAmount;
        this.setRotation(this.currentAngle);
    }

    /**
     * Find the best target based on neighbor density
     * Targets aliens with the most neighbors for maximum area damage
     * @param {Array} aliens - Array of alien entities
     * @returns {Entity|null} Best target alien or null
     */
    findBestTarget(aliens) {
        if (!aliens || aliens.length === 0) return null;

        let bestTarget = null;
        let maxNeighbors = -1;
        let closestDistance = Infinity;

        for (const alien of aliens) {
            // Skip invalid aliens or aliens that are above the rocket
            if (!alien.active || alien.y < -alien.height || alien.y > this.y) continue;

            // Count neighbors within targeting radius
            let neighborCount = 0;
            const alienX = alien.getCenterX();
            const alienY = alien.getCenterY();

            for (const otherAlien of aliens) {
                if (!otherAlien.active || otherAlien === alien) continue;
                
                const dx = alienX - otherAlien.getCenterX();
                const dy = alienY - otherAlien.getCenterY();
                const distanceSquared = dx * dx + dy * dy;
                
                if (distanceSquared < this.targetingRadius * this.targetingRadius) {
                    neighborCount++;
                }
            }

            // Calculate distance to rocket for tie-breaking
            const rocketDistance = this.distanceTo(alien);

            // Prefer aliens with more neighbors, closer ones for ties
            const isBetterTarget = neighborCount > maxNeighbors || 
                                 (neighborCount === maxNeighbors && rocketDistance < closestDistance);

            if (isBetterTarget) {
                maxNeighbors = neighborCount;
                closestDistance = rocketDistance;
                bestTarget = alien;
            }
        }

        this.target = bestTarget;
        return bestTarget;
    }

    /**
     * Check if rocket should explode
     * @returns {boolean} True if rocket should explode
     */
    shouldExplode() {
        if (this.exploded) return false;
        
        // Explode if close to target
        if (this.target && this.target.active) {
            const distance = this.distanceTo(this.target);
            const explosionTriggerDistance = this.explosionRadius * 0.5;
            return distance <= explosionTriggerDistance;
        }
        
        return false;
    }

    /**
     * Trigger rocket explosion
     */
    explode() {
        this.exploded = true;
        this.active = false;
    }

    /**
     * Get explosion data for damage calculation
     * @returns {Object} Explosion data
     */
    getExplosionData() {
        return {
            x: this.getCenterX(),
            y: this.getCenterY(),
            radius: this.explosionRadius,
            damage: this.damage,
            falloff: GAME_CONFIG.rocket.areaDamageFalloff || 0.9
        };
    }

    /**
     * Update thrust particle effects
     * @param {number} deltaTime - Time since last frame
     */
    updateThrustParticles(deltaTime) {
        // Add new thrust particle
        if (this.active && Math.random() < 0.7) {
            const thrustAngle = this.currentAngle + Math.PI + (Math.random() - 0.5) * 0.5;
            const thrustSpeed = 2 + Math.random() * 3;
            
            this.thrustParticles.push({
                x: this.getCenterX() + Math.cos(this.currentAngle + Math.PI) * this.height * 0.3,
                y: this.getCenterY() + Math.sin(this.currentAngle + Math.PI) * this.height * 0.3,
                vx: Math.cos(thrustAngle) * thrustSpeed,
                vy: Math.sin(thrustAngle) * thrustSpeed,
                life: 200 + Math.random() * 100,
                maxLife: 300,
                size: 2 + Math.random() * 2
            });
        }
        
        // Update existing particles
        for (let i = this.thrustParticles.length - 1; i >= 0; i--) {
            const particle = this.thrustParticles[i];
            particle.x += particle.vx * deltaTime / 16.67;
            particle.y += particle.vy * deltaTime / 16.67;
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.thrustParticles.splice(i, 1);
            }
        }
    }

    /**
     * Get all aliens within explosion radius
     * @param {Array} aliens - Array of alien entities
     * @returns {Array} Aliens within explosion radius
     */
    getAliensInExplosionRadius(aliens) {
        const affected = [];
        const centerX = this.getCenterX();
        const centerY = this.getCenterY();
        
        for (const alien of aliens) {
            if (!alien.active) continue;
            
            const distance = Math.sqrt(
                Math.pow(alien.getCenterX() - centerX, 2) + 
                Math.pow(alien.getCenterY() - centerY, 2)
            );
            
            if (distance <= this.explosionRadius) {
                affected.push({
                    alien,
                    distance,
                    damageMultiplier: this.calculateDamageMultiplier(distance)
                });
            }
        }
        
        return affected;
    }

    /**
     * Calculate damage multiplier based on distance from explosion center
     * @param {number} distance - Distance from explosion center
     * @returns {number} Damage multiplier (0-1)
     */
    calculateDamageMultiplier(distance) {
        if (distance >= this.explosionRadius) return 0;
        
        const falloff = GAME_CONFIG.rocket.areaDamageFalloff || 0.9;
        const normalizedDistance = distance / this.explosionRadius;
        
        return Math.pow(1 - normalizedDistance, 1 / falloff);
    }

    /**
     * Clamp value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    /**
     * Draw the rocket
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        // Draw thrust particles first
        this.drawThrustParticles(ctx);
        
        // Draw rocket body
        ctx.save();
        ctx.translate(this.getCenterX(), this.getCenterY());
        ctx.rotate(this.currentAngle + Math.PI / 2);
        
        // Main body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Rocket nose cone
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2 - 5);
        ctx.lineTo(-this.width / 2, -this.height / 2);
        ctx.lineTo(this.width / 2, -this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Rocket fins
        ctx.fillStyle = '#666';
        ctx.fillRect(-this.width / 2 - 2, this.height / 2 - 8, 4, 8);
        ctx.fillRect(this.width / 2 - 2, this.height / 2 - 8, 4, 8);
        
        ctx.restore();
        
        // Draw targeting line if we have a target
        if (this.target && this.hasStartedChasing) {
            this.drawTargetingLine(ctx);
        }
        
        // Draw explosion radius preview (debug mode)
        if (this.showDebug) {
            this.drawExplosionRadius(ctx);
        }
    }

    /**
     * Draw thrust particle effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawThrustParticles(ctx) {
        ctx.save();
        
        for (const particle of this.thrustParticles) {
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.flameColor;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * Draw targeting line to current target
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawTargetingLine(ctx) {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.globalAlpha = 0.5;
        
        ctx.beginPath();
        ctx.moveTo(this.getCenterX(), this.getCenterY());
        ctx.lineTo(this.target.getCenterX(), this.target.getCenterY());
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Draw explosion radius (debug)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawExplosionRadius(ctx) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.globalAlpha = 0.3;
        
        ctx.beginPath();
        ctx.arc(this.getCenterX(), this.getCenterY(), this.explosionRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            ...super.getDebugInfo(),
            hasTarget: !!this.target,
            targetDistance: this.target ? this.distanceTo(this.target) : null,
            hasStartedChasing: this.hasStartedChasing,
            explosionRadius: this.explosionRadius,
            currentAngle: this.currentAngle,
            thrustParticleCount: this.thrustParticles.length
        };
    }
}