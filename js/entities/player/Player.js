// js/entities/player/Player.js

import { Entity } from '../base/Entity.js';
import { GAME_CONFIG } from '../../config.js';

/**
 * Player entity representing the player's ship
 * Handles movement, shooting, power-ups, and shield mechanics
 */
export class Player extends Entity {
    constructor(canvasWidth, canvasHeight) {
        const config = GAME_CONFIG.player;
        const shipConfig = GAME_CONFIG.ship;
        
        super(
            canvasWidth / 2,
            canvasHeight - config.initialYOffset,
            config.width,
            config.height,
            config.color
        );

        // Canvas dimensions for boundary checking
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Movement properties
        this.baseSpeed = config.baseSpeed;
        this.speed = this.baseSpeed;
        this.targetX = this.x;
        this.targetY = this.y;

        // Life system
        this.initialLives = config.initialLives;
        this.lives = this.initialLives;
        this.maxLives = config.maxLives;

        // Shooting system
        this.lastShotTime = 0;
        this.shootDelay = config.shootDelay;
        this.autoFire = true;

        // Weapon system - track power levels for both modes
        this.bulletMode = "spread"; // "spread" or "parallel"
        this.spreadPowerLevel = 1;
        this.parallelPowerLevel = 1;
        this.spreadKills = 0;
        this.parallelKills = 0;
        this.maxReachedPower = 1;

        // Invincibility system
        this.invincible = false;
        this.invincibilityTimer = 0;
        this.invincibilityDuration = GAME_CONFIG.INVINCIBILITY_DURATION;

        // Vertical movement constraints
        this.minY = canvasHeight - config.initialYOffset * 1.5;
        this.maxY = canvasHeight - config.initialYOffset * 0.5;

        // Shield system
        this.shipConfig = shipConfig;
        this.shieldConfig = shipConfig.shield;
        this.shieldCapacity = this.shieldConfig.maxCapacity;
        this.shieldActive = this.shieldCapacity > 0;
        this.lastHitTime = 0;
        this.shieldRechargeTimer = 0;
        this.shieldRecharging = false;

        // Shield visual properties
        this.shieldImage = null;
        this.shieldImageLoaded = false;
        this.shieldAnimator = null;
        this.shieldCanvas = null;

        // Ship progression
        this.shipLevel = 1;
        this.currentLifeScore = 0;

        // Initialize shield if using image
        if (this.shieldConfig.useImage) {
            this.loadShieldImage();
        }
    }

    /**
     * Load shield animation image
     */
    loadShieldImage() {
        const self = this;
        this.shieldAnimator = null;
        this.shieldCanvas = document.createElement('canvas');

        // Use Gifler library if available
        if (typeof gifler !== 'undefined') {
            gifler(this.shieldConfig.imagefile)
                .get(function (animator) {
                    console.log("Shield animation loaded successfully");
                    self.shieldAnimator = animator;
                    self.shieldImageLoaded = true;
                    
                    self.shieldCanvas.width = animator.width;
                    self.shieldCanvas.height = animator.height;
                    animator.animateInCanvas(self.shieldCanvas);
                })
                .catch(error => {
                    console.error("Failed to load shield animation:", error);
                    self.shieldImageLoaded = false;
                });
        }
    }

    /**
     * Update player state
     * @param {number} deltaTime - Time since last frame
     * @param {number} canvasWidth - Canvas width for boundary checking
     */
    update(deltaTime, canvasWidth) {
        super.update(deltaTime);

        // Update invincibility timer
        if (this.invincible) {
            this.invincibilityTimer -= deltaTime;
            if (this.invincibilityTimer <= 0) {
                this.invincible = false;
            }
        }

        // Update shield recharge
        this.updateShieldRecharge(deltaTime);

        // Apply movement constraints
        this.applyMovementConstraints(canvasWidth);
    }

    /**
     * Update shield recharge system
     * @param {number} deltaTime - Time since last frame
     */
    updateShieldRecharge(deltaTime) {
        if (this.shieldCapacity < this.shieldConfig.maxCapacity) {
            this.shieldRechargeTimer += deltaTime;

            if (this.shieldRechargeTimer >= this.shieldConfig.rechargeDelay) {
                this.shieldRecharging = true;

                // Recharge one shield point every rechargeRate milliseconds
                if (this.shieldRechargeTimer >= this.shieldConfig.rechargeDelay + this.shieldConfig.rechargeRate) {
                    this.shieldCapacity = Math.min(this.shieldCapacity + 1, this.shieldConfig.maxCapacity);
                    this.shieldRechargeTimer = this.shieldConfig.rechargeDelay; // Reset to delay time
                    
                    console.log(`Shield recharged to ${this.shieldCapacity}/${this.shieldConfig.maxCapacity}`);
                }
            }
        } else {
            this.shieldRecharging = false;
        }

        this.shieldActive = this.shieldCapacity > 0;
    }

    /**
     * Apply movement constraints to keep player within bounds
     * @param {number} canvasWidth - Canvas width
     */
    applyMovementConstraints(canvasWidth) {
        // Horizontal constraints
        this.x = Math.max(0, Math.min(this.x, canvasWidth - this.width));
        
        // Vertical constraints
        this.y = Math.max(this.minY, Math.min(this.y, this.maxY));
    }

    /**
     * Set target position for movement
     * @param {number} x - Target X coordinate
     * @param {number} y - Target Y coordinate
     */
    setTarget(x, y) {
        this.targetX = x - this.width / 2;
        this.targetY = Math.max(this.minY, Math.min(y - this.height / 2, this.maxY));
    }

    /**
     * Get current bullet power level based on active mode
     * @returns {number} Current power level
     */
    getBulletPowerLevel() {
        return this.bulletMode === "spread" ? this.spreadPowerLevel : this.parallelPowerLevel;
    }

    /**
     * Switch between weapon modes
     */
    switchWeaponMode() {
        this.bulletMode = this.bulletMode === "spread" ? "parallel" : "spread";
        console.log(`Switched to ${this.bulletMode} mode, power level: ${this.getBulletPowerLevel()}`);
    }

    /**
     * Increase bullet power for current mode
     */
    increaseBulletPower() {
        const maxPower = GAME_CONFIG.maxBulletPowerLevel;
        
        if (this.bulletMode === "spread") {
            if (this.spreadPowerLevel < maxPower) {
                this.spreadPowerLevel++;
                this.maxReachedPower = Math.max(this.maxReachedPower, this.spreadPowerLevel);
            }
        } else {
            if (this.parallelPowerLevel < maxPower) {
                this.parallelPowerLevel++;
                this.maxReachedPower = Math.max(this.maxReachedPower, this.parallelPowerLevel);
            }
        }
    }

    /**
     * Add a kill to the current weapon mode
     */
    addKill() {
        if (this.bulletMode === "spread") {
            this.spreadKills++;
        } else {
            this.parallelKills++;
        }

        // Check for power up
        const killsForCurrentMode = this.bulletMode === "spread" ? this.spreadKills : this.parallelKills;
        const killsNeeded = GAME_CONFIG.killsPerPowerUp * Math.pow(GAME_CONFIG.powerLevelExponent, this.getBulletPowerLevel() - 1);

        if (killsForCurrentMode >= killsNeeded) {
            this.increaseBulletPower();
            // Reset kills for this mode
            if (this.bulletMode === "spread") {
                this.spreadKills = 0;
            } else {
                this.parallelKills = 0;
            }
        }
    }

    /**
     * Take damage and handle shield/health logic
     * @param {number} damage - Damage amount
     * @returns {boolean} True if player was destroyed
     */
    takeDamage(damage) {
        if (this.invincible) {
            return false;
        }

        // Shield absorbs damage first
        if (this.shieldActive && this.shieldCapacity > 0) {
            this.shieldCapacity = Math.max(0, this.shieldCapacity - damage);
            this.shieldRechargeTimer = 0; // Reset recharge timer
            this.shieldRecharging = false;
            
            if (this.shieldCapacity <= 0) {
                this.shieldActive = false;
                console.log("Shield depleted!");
            } else {
                console.log(`Shield absorbed damage. Remaining: ${this.shieldCapacity}/${this.shieldConfig.maxCapacity}`);
                return false; // Shield absorbed all damage
            }
        }

        // If shield didn't absorb all damage, take life damage
        this.lives -= damage;
        this.makeInvincible();

        if (this.lives <= 0) {
            this.lives = 0;
            return true; // Player destroyed
        }

        return false;
    }

    /**
     * Make player temporarily invincible
     */
    makeInvincible() {
        this.invincible = true;
        this.invincibilityTimer = this.invincibilityDuration;
    }

    /**
     * Restore player to full health
     */
    heal() {
        this.lives = Math.min(this.lives + 1, this.maxLives);
    }

    /**
     * Reset after death while preserving some progress
     */
    resetAfterDeath() {
        // Reset position
        this.x = this.canvasWidth / 2 - this.width / 2;
        this.y = this.canvasHeight - GAME_CONFIG.player.initialYOffset;
        this.targetX = this.x;
        this.targetY = this.y;

        // Reset shield
        this.shieldCapacity = this.shieldConfig.maxCapacity;
        this.shieldActive = this.shieldCapacity > 0;
        this.shieldRechargeTimer = 0;
        this.shieldRecharging = false;

        // Make invincible briefly
        this.makeInvincible();

        // Reset current life score but preserve power levels
        this.currentLifeScore = 0;
    }

    /**
     * Check if player can shoot
     * @param {number} currentTime - Current timestamp
     * @returns {boolean} True if player can shoot
     */
    canShoot(currentTime) {
        return currentTime - this.lastShotTime >= this.shootDelay;
    }

    /**
     * Record that player has shot
     * @param {number} currentTime - Current timestamp
     */
    recordShot(currentTime) {
        this.lastShotTime = currentTime;
    }

    /**
     * Get weapon positions for bullet spawning
     * @returns {Array} Array of weapon position objects
     */
    getWeaponPositions() {
        const positions = [];
        const powerLevel = this.getBulletPowerLevel();

        // Base weapon position
        positions.push({
            x: this.getCenterX(),
            y: this.y
        });

        // Additional weapons based on power level
        if (powerLevel >= 2) {
            const offset = 15;
            positions.push(
                { x: this.getCenterX() - offset, y: this.y + 5 },
                { x: this.getCenterX() + offset, y: this.y + 5 }
            );
        }

        if (powerLevel >= 3) {
            const offset = 25;
            positions.push(
                { x: this.getCenterX() - offset, y: this.y + 10 },
                { x: this.getCenterX() + offset, y: this.y + 10 }
            );
        }

        if (powerLevel >= 4) {
            positions.push(
                { x: this.getCenterX(), y: this.y - 10 }
            );
        }

        if (powerLevel >= 5) {
            const offset = 35;
            positions.push(
                { x: this.getCenterX() - offset, y: this.y + 15 },
                { x: this.getCenterX() + offset, y: this.y + 15 }
            );
        }

        return positions;
    }

    /**
     * Draw the player
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        ctx.save();

        // Draw ship body
        this.drawShip(ctx);

        // Draw shield if active
        if (this.shieldActive) {
            this.drawShield(ctx);
        }

        // Apply invincibility flashing effect
        if (this.invincible) {
            ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
        }

        ctx.restore();
    }

    /**
     * Draw the ship body
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawShip(ctx) {
        const centerX = this.getCenterX();
        const centerY = this.getCenterY();

        // Draw main body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw cockpit
        const cockpitGradient = ctx.createLinearGradient(centerX, this.y, centerX, this.y + 15);
        cockpitGradient.addColorStop(0, GAME_CONFIG.player.cockpitGradient[0]);
        cockpitGradient.addColorStop(1, GAME_CONFIG.player.cockpitGradient[1]);
        
        ctx.fillStyle = cockpitGradient;
        ctx.fillRect(centerX - 8, this.y + 5, 16, 10);

        // Draw engines
        this.drawEngines(ctx);
    }

    /**
     * Draw engine effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawEngines(ctx) {
        const enginePositions = GAME_CONFIG.ship.enginePositions;
        
        enginePositions.forEach(engine => {
            const engineX = this.getCenterX() + engine.x;
            const engineY = this.getBottom() + engine.y;
            
            // Engine glow effect
            const gradient = ctx.createLinearGradient(engineX, engineY, engineX, engineY + engine.height);
            gradient.addColorStop(0, GAME_CONFIG.player.engineColor);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(engineX, engineY, engine.width, engine.height);
        });
    }

    /**
     * Draw shield effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawShield(ctx) {
        if (this.shieldConfig.useImage && this.shieldImageLoaded && this.shieldCanvas) {
            this.drawImageShield(ctx);
        } else {
            this.drawDrawnShield(ctx);
        }
    }

    /**
     * Draw image-based shield
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawImageShield(ctx) {
        const visual = this.shieldConfig.imageVisual;
        const centerX = this.getCenterX();
        const centerY = this.getCenterY();
        
        // Calculate shield size
        const shieldSize = Math.max(this.width, this.height) * visual.sizeFactor;
        
        // Calculate pulse effect
        const pulseTime = Date.now() * 0.001;
        const pulse = 1 + Math.sin(pulseTime * visual.pulseSpeed) * visual.pulseAmplitude;
        const finalSize = shieldSize * pulse;
        
        // Calculate opacity based on capacity
        const baseOpacity = visual.opacity;
        const capacityOpacity = (this.shieldCapacity / this.shieldConfig.maxCapacity) * 0.3;
        
        ctx.save();
        ctx.globalAlpha = baseOpacity + capacityOpacity;
        ctx.globalCompositeOperation = visual.blendMode;
        
        // Rotate shield
        ctx.translate(centerX, centerY);
        ctx.rotate(Date.now() * visual.rotation * 0.001);
        
        // Draw shield image
        ctx.drawImage(
            this.shieldCanvas,
            -finalSize / 2,
            -finalSize / 2,
            finalSize,
            finalSize
        );
        
        ctx.restore();
    }

    /**
     * Draw procedural shield
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawDrawnShield(ctx) {
        const visual = this.shieldConfig.visual;
        const centerX = this.getCenterX();
        const centerY = this.getCenterY();
        
        // Calculate shield radius
        const baseRadius = Math.max(this.width, this.height) * visual.baseSize;
        
        // Calculate pulse effect
        const pulseTime = Date.now() * 0.001;
        const pulse = 1 + Math.sin(pulseTime * visual.pulseSpeed) * visual.pulseAmplitude;
        const shieldRadius = baseRadius * pulse;
        
        // Calculate opacity
        const capacityAlpha = (this.shieldCapacity / this.shieldConfig.maxCapacity) * visual.capacityAlpha;
        const totalAlpha = visual.baseAlpha + capacityAlpha;
        
        ctx.save();
        
        // Outer shield ring
        ctx.globalAlpha = totalAlpha;
        ctx.strokeStyle = this.shieldConfig.color;
        ctx.lineWidth = visual.strokeWidth;
        ctx.beginPath();
        ctx.arc(centerX, centerY, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glow
        ctx.globalAlpha = totalAlpha * visual.innerGlowAlpha;
        ctx.fillStyle = this.shieldConfig.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, shieldRadius / visual.innerCircleSizeFactor, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            ...super.getDebugInfo(),
            lives: this.lives,
            bulletMode: this.bulletMode,
            spreadPower: this.spreadPowerLevel,
            parallelPower: this.parallelPowerLevel,
            shieldCapacity: this.shieldCapacity,
            invincible: this.invincible,
            shipLevel: this.shipLevel
        };
    }
}