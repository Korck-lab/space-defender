// js/entities/projectiles/Bullet.js

import { Entity } from '../base/Entity.js';
import { GAME_CONFIG } from '../../config.js';
import { drawRect } from '../../drawing.js';

/**
 * Bullet entity for player and enemy projectiles
 * Supports both basic straight-line bullets and homing bullets
 */
export class Bullet extends Entity {
    constructor(x, y, config, speedX = 0, speedY, damage, owner = "player", target = null) {
        super(x, y, config.width, config.height, config.color);
        
        this.speedX = speedX;
        this.speedY = speedY;
        this.damage = damage;
        this.owner = owner;
        this.config = config;
        
        // Homing properties
        this.isHoming = owner === "miniShip";
        this.target = target;
        this.turnRate = config.turnRate || 0;
        
        // Visual properties
        this.trailLength = 5;
        this.trailPositions = [];
        
        // Lifetime management
        this.maxAge = 5000; // 5 seconds max lifetime
        
        // Store initial speed for calculations
        this.initialSpeed = Math.sqrt(speedX * speedX + speedY * speedY);
    }

    /**
     * Update bullet position and behavior
     * @param {number} deltaTime - Time since last frame
     * @param {Object} gameState - Current game state (for target finding)
     */
    update(deltaTime, gameState) {
        super.update(deltaTime);
        
        const speedFactor = deltaTime / 16.67; // Normalize to ~60fps
        
        // Store previous position for trail
        this.trailPositions.unshift({ x: this.x, y: this.y });
        if (this.trailPositions.length > this.trailLength) {
            this.trailPositions.pop();
        }
        
        // Handle homing behavior
        if (this.isHoming) {
            this.updateHoming(speedFactor, gameState);
        }
        
        // Update position
        this.x += this.speedX * speedFactor;
        this.y += this.speedY * speedFactor;
        
        // Update rotation to match movement direction
        this.rotation = Math.atan2(this.speedY, this.speedX);
    }

    /**
     * Update homing behavior
     * @param {number} speedFactor - Speed adjustment factor
     * @param {Object} gameState - Current game state
     */
    updateHoming(speedFactor, gameState) {
        // Find or validate target
        if (!this.target || !this.target.active) {
            this.findNewTarget(gameState);
        }
        
        if (this.target && this.target.active) {
            this.homingTowardsTarget(speedFactor);
        } else {
            // No target available, stop homing
            this.isHoming = false;
        }
    }

    /**
     * Find a new target for homing
     * @param {Object} gameState - Current game state
     */
    findNewTarget(gameState) {
        if (!gameState || !gameState.entities || !gameState.entities.aliens) {
            return;
        }
        
        const aliens = gameState.entities.aliens;
        let closestAlien = null;
        let closestDistance = Infinity;
        
        // Find closest active alien
        for (const alien of aliens) {
            if (!alien.active) continue;
            
            const distance = this.distanceTo(alien);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestAlien = alien;
            }
        }
        
        this.target = closestAlien;
    }

    /**
     * Update homing movement towards target
     * @param {number} speedFactor - Speed adjustment factor
     */
    homingTowardsTarget(speedFactor) {
        const targetX = this.target.getCenterX();
        const targetY = this.target.getCenterY();
        
        // Calculate desired angle
        const desiredAngle = Math.atan2(
            targetY - this.getCenterY(),
            targetX - this.getCenterX()
        );
        
        // Calculate current angle
        const currentAngle = Math.atan2(this.speedY, this.speedX);
        
        // Find the shortest angular distance
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply turn rate limit
        const turnAmount = this.clamp(angleDiff, -this.turnRate, this.turnRate);
        const newAngle = currentAngle + turnAmount;
        
        // Update velocity with fixed speed
        const speed = this.config.speed || this.initialSpeed;
        this.speedX = Math.cos(newAngle) * speed;
        this.speedY = Math.sin(newAngle) * speed;
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
     * Check if bullet should explode (for specific bullet types)
     * @returns {boolean} True if bullet should explode
     */
    shouldExplode() {
        // Override in subclasses for specific explosion logic
        return false;
    }

    /**
     * Get bullet trajectory prediction
     * @param {number} timeAhead - Time to predict ahead (ms)
     * @returns {Object} Predicted position {x, y}
     */
    predictPosition(timeAhead) {
        const speedFactor = timeAhead / 16.67;
        return {
            x: this.x + this.speedX * speedFactor,
            y: this.y + this.speedY * speedFactor
        };
    }

    /**
     * Create bullet based on weapon configuration
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {string} weaponType - Type of weapon ("spread", "parallel", etc.)
     * @param {number} powerLevel - Power level of weapon
     * @param {string} owner - Owner of the bullet
     * @param {Object} target - Target for homing bullets
     * @returns {Bullet} Created bullet instance
     */
    static createBullet(x, y, weaponType, powerLevel, owner = "player", target = null) {
        const bulletConfig = this.getBulletConfig(weaponType, owner);
        const damage = this.calculateDamage(bulletConfig, powerLevel, weaponType);
        const { speedX, speedY } = this.calculateSpeed(bulletConfig, weaponType, owner);
        
        return new Bullet(x, y, bulletConfig, speedX, speedY, damage, owner, target);
    }

    /**
     * Get bullet configuration based on type and owner
     * @param {string} weaponType - Type of weapon
     * @param {string} owner - Owner of the bullet
     * @returns {Object} Bullet configuration
     */
    static getBulletConfig(weaponType, owner) {
        if (owner === "player") {
            return GAME_CONFIG.bullets.player;
        } else if (owner === "alienFighter") {
            return GAME_CONFIG.bullets.alienFighter;
        } else if (owner === "miniShip") {
            return GAME_CONFIG.bullets.miniShipRocket;
        }
        
        return GAME_CONFIG.bullets.player; // Default fallback
    }

    /**
     * Calculate bullet damage based on configuration and power level
     * @param {Object} bulletConfig - Bullet configuration
     * @param {number} powerLevel - Power level
     * @param {string} weaponType - Weapon type
     * @returns {number} Calculated damage
     */
    static calculateDamage(bulletConfig, powerLevel, weaponType) {
        let baseDamage = bulletConfig.baseDamageMultiplier || 1;
        
        if (weaponType === "parallel") {
            baseDamage *= bulletConfig.parallelDamageFactor || 1;
        }
        
        return baseDamage * powerLevel;
    }

    /**
     * Calculate bullet speed based on configuration
     * @param {Object} bulletConfig - Bullet configuration
     * @param {string} weaponType - Weapon type
     * @param {string} owner - Owner of the bullet
     * @returns {Object} Speed vector {speedX, speedY}
     */
    static calculateSpeed(bulletConfig, weaponType, owner) {
        if (owner === "player") {
            return {
                speedX: 0,
                speedY: bulletConfig.speedY
            };
        } else if (owner === "alienFighter") {
            return {
                speedX: 0,
                speedY: bulletConfig.speed
            };
        } else if (owner === "miniShip") {
            return {
                speedX: 0,
                speedY: -bulletConfig.speed // Mini ships shoot upward
            };
        }
        
        return { speedX: 0, speedY: -5 }; // Default upward movement
    }

    /**
     * Create spread pattern bullets
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {number} powerLevel - Power level
     * @param {string} owner - Owner of the bullets
     * @returns {Array} Array of bullets
     */
    static createSpreadPattern(x, y, powerLevel, owner = "player") {
        const bullets = [];
        const bulletConfig = this.getBulletConfig("spread", owner);
        const angleMultiplier = bulletConfig.spreadAngleMultiplier;
        
        // Center bullet
        bullets.push(this.createBullet(x, y, "spread", powerLevel, owner));
        
        // Additional bullets based on power level
        for (let i = 1; i <= Math.min(powerLevel - 1, 4); i++) {
            const angle = i * angleMultiplier;
            
            // Left bullet
            const leftSpeedX = -Math.sin(angle) * Math.abs(bulletConfig.speedY);
            const leftSpeedY = bulletConfig.speedY;
            bullets.push(new Bullet(x, y, bulletConfig, leftSpeedX, leftSpeedY, 
                this.calculateDamage(bulletConfig, powerLevel, "spread"), owner));
            
            // Right bullet
            const rightSpeedX = Math.sin(angle) * Math.abs(bulletConfig.speedY);
            const rightSpeedY = bulletConfig.speedY;
            bullets.push(new Bullet(x, y, bulletConfig, rightSpeedX, rightSpeedY, 
                this.calculateDamage(bulletConfig, powerLevel, "spread"), owner));
        }
        
        return bullets;
    }

    /**
     * Create parallel pattern bullets
     * @param {Array} weaponPositions - Array of weapon positions
     * @param {number} powerLevel - Power level
     * @param {string} owner - Owner of the bullets
     * @returns {Array} Array of bullets
     */
    static createParallelPattern(weaponPositions, powerLevel, owner = "player") {
        const bullets = [];
        const bulletConfig = this.getBulletConfig("parallel", owner);
        
        weaponPositions.forEach(pos => {
            bullets.push(this.createBullet(pos.x, pos.y, "parallel", powerLevel, owner));
        });
        
        return bullets;
    }

    /**
     * Draw the bullet
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        // Draw trail first
        this.drawTrail(ctx);
        
        // Draw main bullet
        if (typeof drawRect === 'function') {
            drawRect(ctx, this.x, this.y, this.width, this.height, this.color);
        } else {
            // Fallback drawing
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Draw homing indicator for homing bullets
        if (this.isHoming && this.target) {
            this.drawHomingIndicator(ctx);
        }
    }

    /**
     * Draw bullet trail
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawTrail(ctx) {
        if (this.trailPositions.length < 2) return;
        
        ctx.save();
        
        for (let i = 0; i < this.trailPositions.length - 1; i++) {
            const alpha = (this.trailPositions.length - i) / this.trailPositions.length * 0.5;
            const pos = this.trailPositions[i];
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            
            const size = this.width * (alpha + 0.3);
            ctx.fillRect(
                pos.x + (this.width - size) / 2,
                pos.y + (this.height - size) / 2,
                size,
                size
            );
        }
        
        ctx.restore();
    }

    /**
     * Draw homing indicator
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawHomingIndicator(ctx) {
        if (!this.target) return;
        
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.globalAlpha = 0.5;
        
        ctx.beginPath();
        ctx.moveTo(this.getCenterX(), this.getCenterY());
        ctx.lineTo(this.target.getCenterX(), this.target.getCenterY());
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
            owner: this.owner,
            damage: this.damage,
            isHoming: this.isHoming,
            hasTarget: !!this.target,
            speed: { x: this.speedX, y: this.speedY }
        };
    }
}