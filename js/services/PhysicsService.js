// js/services/PhysicsService.js

import { GAME_EVENTS } from './EventBus.js';

/**
 * Handles physics calculations, movement, and entity interactions
 * Extracted from Game.js to improve separation of concerns
 */
export class PhysicsService {
    constructor(eventBus, gameWidth, gameHeight) {
        this.eventBus = eventBus;
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        
        // Physics constants
        this.gravity = 0.5;
        this.friction = 0.98;
        this.maxVelocity = 20;
        
        // Movement interpolation
        this.lerpFactor = 0.1;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for physics-related events
     */
    setupEventListeners() {
        this.eventBus.on(GAME_EVENTS.COLLISION_DETECTED, this.handleCollision.bind(this));
    }

    /**
     * Update physics for all entities
     * @param {number} deltaTime - Time since last frame
     * @param {Object} gameState - Current game state
     */
    updatePhysics(deltaTime, gameState) {
        // Update player physics
        if (gameState.player) {
            this.updatePlayerPhysics(gameState.player, deltaTime);
        }
        
        // Update entity physics
        this.updateEntityPhysics(gameState.entities.bullets, deltaTime, gameState);
        this.updateEntityPhysics(gameState.entities.rockets, deltaTime, gameState);
        this.updateEntityPhysics(gameState.entities.aliens, deltaTime, gameState);
        this.updateEntityPhysics(gameState.entities.items, deltaTime, gameState);
        this.updateEntityPhysics(gameState.entities.wingmen, deltaTime, gameState);
        this.updateEntityPhysics(gameState.entities.miniShips, deltaTime, gameState);
        this.updateEntityPhysics(gameState.entities.debris, deltaTime, gameState);
        
        // Update particle physics
        if (gameState.particleManager) {
            this.updateParticlePhysics(gameState.particleManager, deltaTime);
        }
    }

    /**
     * Update player physics
     * @param {Player} player - Player entity
     * @param {number} deltaTime - Time since last frame
     */
    updatePlayerPhysics(player, deltaTime) {
        // Apply movement constraints
        player.x = Math.max(0, Math.min(player.x, this.gameWidth - player.width));
        player.y = Math.max(0, Math.min(player.y, this.gameHeight - player.height));
        
        // Update player-specific physics (shield recharge, invincibility, etc.)
        this.updatePlayerSpecialPhysics(player, deltaTime);
    }

    /**
     * Update special player physics (shield, invincibility, etc.)
     * @param {Player} player - Player entity
     * @param {number} deltaTime - Time since last frame
     */
    updatePlayerSpecialPhysics(player, deltaTime) {
        // Update invincibility timer
        if (player.invincible && player.invincibilityTimer > 0) {
            player.invincibilityTimer -= deltaTime;
            if (player.invincibilityTimer <= 0) {
                player.invincible = false;
                this.eventBus.emit(GAME_EVENTS.PLAYER_INVINCIBILITY_END, { player });
            }
        }
        
        // Update shield recharge
        if (player.shield && player.shield.capacity < player.shield.maxCapacity) {
            player.shield.rechargeTimer += deltaTime;
            
            if (player.shield.rechargeTimer >= player.shield.rechargeDelay) {
                player.shield.rechargeProgress += deltaTime;
                
                if (player.shield.rechargeProgress >= player.shield.rechargeRate) {
                    player.shield.capacity = Math.min(
                        player.shield.capacity + 1,
                        player.shield.maxCapacity
                    );
                    player.shield.rechargeProgress = 0;
                    
                    this.eventBus.emit(GAME_EVENTS.PLAYER_SHIELD_RECHARGED, {
                        player,
                        capacity: player.shield.capacity
                    });
                }
            }
        }
    }

    /**
     * Update physics for a group of entities
     * @param {Array} entities - Array of entities to update
     * @param {number} deltaTime - Time since last frame
     * @param {Object} gameState - Current game state
     */
    updateEntityPhysics(entities, deltaTime, gameState) {
        for (const entity of entities) {
            if (!entity.active) continue;
            
            // Basic movement update
            this.updateEntityMovement(entity, deltaTime);
            
            // Apply physics constraints
            this.applyPhysicsConstraints(entity);
            
            // Update entity-specific physics
            this.updateEntitySpecificPhysics(entity, deltaTime, gameState);
            
            // Check boundaries
            this.checkEntityBoundaries(entity);
        }
    }

    /**
     * Update basic movement for an entity
     * @param {Entity} entity - Entity to update
     * @param {number} deltaTime - Time since last frame
     */
    updateEntityMovement(entity, deltaTime) {
        // Apply velocity if entity has it
        if (entity.velocityX !== undefined) {
            entity.x += entity.velocityX * deltaTime;
        }
        if (entity.velocityY !== undefined) {
            entity.y += entity.velocityY * deltaTime;
        }
        
        // Apply acceleration if entity has it
        if (entity.accelerationX !== undefined) {
            entity.velocityX = (entity.velocityX || 0) + entity.accelerationX * deltaTime;
        }
        if (entity.accelerationY !== undefined) {
            entity.velocityY = (entity.velocityY || 0) + entity.accelerationY * deltaTime;
        }
        
        // Apply friction
        if (entity.friction) {
            entity.velocityX = (entity.velocityX || 0) * entity.friction;
            entity.velocityY = (entity.velocityY || 0) * entity.friction;
        }
        
        // Apply rotation
        if (entity.angularVelocity !== undefined) {
            entity.rotation = (entity.rotation || 0) + entity.angularVelocity * deltaTime;
        }
    }

    /**
     * Apply physics constraints to an entity
     * @param {Entity} entity - Entity to constrain
     */
    applyPhysicsConstraints(entity) {
        // Velocity limits
        if (entity.velocityX !== undefined) {
            entity.velocityX = Math.max(-this.maxVelocity, Math.min(entity.velocityX, this.maxVelocity));
        }
        if (entity.velocityY !== undefined) {
            entity.velocityY = Math.max(-this.maxVelocity, Math.min(entity.velocityY, this.maxVelocity));
        }
        
        // Keep rotation within 0-2π
        if (entity.rotation !== undefined) {
            entity.rotation = entity.rotation % (Math.PI * 2);
            if (entity.rotation < 0) {
                entity.rotation += Math.PI * 2;
            }
        }
    }

    /**
     * Update entity-specific physics behaviors
     * @param {Entity} entity - Entity to update
     * @param {number} deltaTime - Time since last frame
     * @param {Object} gameState - Current game state
     */
    updateEntitySpecificPhysics(entity, deltaTime, gameState) {
        // Rocket homing behavior
        if (entity.constructor.name === 'Rocket' && entity.target) {
            this.updateRocketHoming(entity, deltaTime);
        }
        
        // Wingman following behavior
        if (entity.constructor.name === 'Wingman' && gameState.player) {
            this.updateWingmanFollowing(entity, gameState.player, deltaTime);
        }
        
        // Mini ship AI behavior
        if (entity.constructor.name === 'MiniShip' && gameState.player) {
            this.updateMiniShipBehavior(entity, gameState.player, gameState.entities.aliens, deltaTime);
        }
        
        // Alien AI behavior
        if (entity.constructor.name === 'Alien') {
            this.updateAlienBehavior(entity, gameState.player, deltaTime);
        }
        
        // Item physics (falling, rotation)
        if (entity.constructor.name === 'Item') {
            this.updateItemPhysics(entity, deltaTime);
        }
        
        // Debris physics
        if (entity.constructor.name === 'Debris') {
            this.updateDebrisPhysics(entity, deltaTime);
        }
    }

    /**
     * Update rocket homing behavior
     * @param {Rocket} rocket - Rocket entity
     * @param {number} deltaTime - Time since last frame
     */
    updateRocketHoming(rocket, deltaTime) {
        if (!rocket.target || !rocket.target.active) {
            return;
        }
        
        const targetX = rocket.target.getCenterX();
        const targetY = rocket.target.getCenterY();
        const rocketX = rocket.getCenterX();
        const rocketY = rocket.getCenterY();
        
        // Calculate angle to target
        const targetAngle = Math.atan2(targetY - rocketY, targetX - rocketX);
        
        // Turn towards target
        let angleDiff = targetAngle - rocket.rotation;
        
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Apply turn rate limit
        const maxTurn = rocket.turnRate * deltaTime;
        if (Math.abs(angleDiff) > maxTurn) {
            angleDiff = Math.sign(angleDiff) * maxTurn;
        }
        
        rocket.rotation += angleDiff;
        
        // Update velocity based on rotation
        rocket.velocityX = Math.cos(rocket.rotation) * rocket.speed;
        rocket.velocityY = Math.sin(rocket.rotation) * rocket.speed;
    }

    /**
     * Update wingman following behavior
     * @param {Wingman} wingman - Wingman entity
     * @param {Player} player - Player to follow
     * @param {number} deltaTime - Time since last frame
     */
    updateWingmanFollowing(wingman, player, deltaTime) {
        // Calculate target position relative to player
        const targetX = player.x + wingman.offsetX;
        const targetY = player.y + wingman.offsetY;
        
        // Smooth following using lerp
        const lerpFactor = wingman.followLerpFactor || this.lerpFactor;
        wingman.x += (targetX - wingman.x) * lerpFactor;
        wingman.y += (targetY - wingman.y) * lerpFactor;
    }

    /**
     * Update mini ship AI behavior
     * @param {MiniShip} miniShip - Mini ship entity
     * @param {Player} player - Player entity
     * @param {Array} aliens - Array of alien entities
     * @param {number} deltaTime - Time since last frame
     */
    updateMiniShipBehavior(miniShip, player, aliens, deltaTime) {
        // Formation following when no enemies
        if (!aliens || aliens.length === 0) {
            const targetX = player.x + miniShip.offsetX;
            const targetY = player.y + miniShip.offsetY;
            
            const lerpFactor = miniShip.followLerpFactor || this.lerpFactor;
            miniShip.x += (targetX - miniShip.x) * lerpFactor;
            miniShip.y += (targetY - miniShip.y) * lerpFactor;
        } else {
            // Autonomous targeting behavior
            this.updateMiniShipTargeting(miniShip, aliens, deltaTime);
        }
    }

    /**
     * Update mini ship targeting behavior
     * @param {MiniShip} miniShip - Mini ship entity
     * @param {Array} aliens - Array of alien entities
     * @param {number} deltaTime - Time since last frame
     */
    updateMiniShipTargeting(miniShip, aliens, deltaTime) {
        // Find closest alien
        let closestAlien = null;
        let closestDistance = Infinity;
        
        for (const alien of aliens) {
            if (!alien.active) continue;
            
            const distance = this.calculateDistance(
                miniShip.getCenterX(),
                miniShip.getCenterY(),
                alien.getCenterX(),
                alien.getCenterY()
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestAlien = alien;
            }
        }
        
        if (closestAlien) {
            // Move towards alien
            const targetX = closestAlien.getCenterX();
            const targetY = closestAlien.getCenterY() - 100; // Stay above alien
            
            const lerpFactor = miniShip.followLerpFactor || this.lerpFactor;
            miniShip.x += (targetX - miniShip.getCenterX()) * lerpFactor;
            miniShip.y += (targetY - miniShip.getCenterY()) * lerpFactor;
        }
    }

    /**
     * Update alien AI behavior
     * @param {Alien} alien - Alien entity
     * @param {Player} player - Player entity
     * @param {number} deltaTime - Time since last frame
     */
    updateAlienBehavior(alien, player, deltaTime) {
        // Basic downward movement is handled by the alien itself
        // This can be extended for more complex AI behaviors
        
        // Fighter and Elite hovering behavior
        if (alien.type === 'fighter' || alien.type === 'elite') {
            this.updateAlienHovering(alien, deltaTime);
        }
        
        // Targeting behavior for shooting aliens
        if (alien.canShoot && player) {
            this.updateAlienTargeting(alien, player, deltaTime);
        }
    }

    /**
     * Update alien hovering behavior
     * @param {Alien} alien - Alien entity
     * @param {number} deltaTime - Time since last frame
     */
    updateAlienHovering(alien, deltaTime) {
        const hoverThreshold = this.gameHeight * alien.hoverYThreshold;
        
        if (alien.y >= hoverThreshold && !alien.isHovering) {
            alien.isHovering = true;
            alien.hoverTimer = 0;
            alien.originalSpeed = alien.speed;
            alien.speed = 0; // Stop moving down
        }
        
        if (alien.isHovering) {
            alien.hoverTimer += deltaTime;
            
            if (alien.hoverTimer >= alien.hoverDuration) {
                alien.isHovering = false;
                alien.speed = alien.originalSpeed; // Resume movement
            }
        }
    }

    /**
     * Update alien targeting behavior
     * @param {Alien} alien - Alien entity
     * @param {Player} player - Player entity
     * @param {number} deltaTime - Time since last frame
     */
    updateAlienTargeting(alien, player, deltaTime) {
        // Simple targeting - aliens shoot straight down
        // This can be enhanced for more sophisticated targeting
        alien.targetX = player.getCenterX();
        alien.targetY = player.getCenterY();
    }

    /**
     * Update item physics (falling, rotation)
     * @param {Item} item - Item entity
     * @param {number} deltaTime - Time since last frame
     */
    updateItemPhysics(item, deltaTime) {
        // Items fall slowly
        item.y += item.dropSpeed * deltaTime;
        
        // Add rotation for visual appeal
        if (item.rotation === undefined) {
            item.rotation = 0;
        }
        item.rotation += 0.002 * deltaTime; // Slow rotation
    }

    /**
     * Update debris physics
     * @param {Debris} debris - Debris entity
     * @param {number} deltaTime - Time since last frame
     */
    updateDebrisPhysics(debris, deltaTime) {
        // Apply gravity
        debris.velocityY = (debris.velocityY || 0) + this.gravity * deltaTime;
        
        // Apply rotation
        debris.rotation = (debris.rotation || 0) + debris.angularVelocity * deltaTime;
        
        // Update position
        debris.x += debris.velocityX * deltaTime;
        debris.y += debris.velocityY * deltaTime;
        
        // Apply friction
        debris.velocityX *= this.friction;
        debris.velocityY *= this.friction;
    }

    /**
     * Update particle physics
     * @param {ParticleManager} particleManager - Particle manager
     * @param {number} deltaTime - Time since last frame
     */
    updateParticlePhysics(particleManager, deltaTime) {
        // Particle physics is handled by the ParticleManager itself
        // This method can be used for global particle effects
    }

    /**
     * Check if entity is within game boundaries
     * @param {Entity} entity - Entity to check
     */
    checkEntityBoundaries(entity) {
        const margin = 50;
        
        if (entity.x < -margin || 
            entity.x > this.gameWidth + margin || 
            entity.y < -margin || 
            entity.y > this.gameHeight + margin) {
            
            this.eventBus.emit(GAME_EVENTS.ENTITY_OUT_OF_BOUNDS, {
                entity,
                bounds: {
                    left: entity.x < -margin,
                    right: entity.x > this.gameWidth + margin,
                    top: entity.y < -margin,
                    bottom: entity.y > this.gameHeight + margin
                }
            });
        }
    }

    /**
     * Handle collision physics
     * @param {Object} collisionData - Collision event data
     */
    handleCollision(collisionData) {
        const { entityA, entityB, collisionPoint } = collisionData;
        
        // Apply collision response
        this.applyCollisionResponse(entityA, entityB, collisionPoint);
        
        // Create collision effects
        this.createCollisionEffects(entityA, entityB, collisionPoint);
    }

    /**
     * Apply physics response to collision
     * @param {Entity} entityA - First entity
     * @param {Entity} entityB - Second entity
     * @param {Object} collisionPoint - Point of collision
     */
    applyCollisionResponse(entityA, entityB, collisionPoint) {
        // Simple collision response - can be enhanced for more realistic physics
        
        // If one entity is much more massive, only affect the lighter one
        const massA = entityA.mass || 1;
        const massB = entityB.mass || 1;
        
        if (massA > massB * 10) {
            // EntityA is much more massive
            this.bounceEntity(entityB, entityA);
        } else if (massB > massA * 10) {
            // EntityB is much more massive
            this.bounceEntity(entityA, entityB);
        } else {
            // Similar masses, both affected
            this.bounceEntity(entityA, entityB);
            this.bounceEntity(entityB, entityA);
        }
    }

    /**
     * Bounce an entity off another
     * @param {Entity} entity - Entity to bounce
     * @param {Entity} other - Entity to bounce off
     */
    bounceEntity(entity, other) {
        if (!entity.velocityX && !entity.velocityY) return;
        
        const dx = entity.getCenterX() - other.getCenterX();
        const dy = entity.getCenterY() - other.getCenterY();
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        const normalX = dx / distance;
        const normalY = dy / distance;
        
        // Reflect velocity
        const dotProduct = (entity.velocityX * normalX) + (entity.velocityY * normalY);
        entity.velocityX -= 2 * dotProduct * normalX;
        entity.velocityY -= 2 * dotProduct * normalY;
        
        // Apply bounce damping
        entity.velocityX *= 0.8;
        entity.velocityY *= 0.8;
    }

    /**
     * Create visual effects for collision
     * @param {Entity} entityA - First entity
     * @param {Entity} entityB - Second entity
     * @param {Object} collisionPoint - Point of collision
     */
    createCollisionEffects(entityA, entityB, collisionPoint) {
        this.eventBus.emit(GAME_EVENTS.EXPLOSION_CREATED, {
            x: collisionPoint.x,
            y: collisionPoint.y,
            radius: 20,
            color: 'orange',
            intensity: 'medium'
        });
    }

    /**
     * Calculate distance between two points
     * @param {number} x1 - First X coordinate
     * @param {number} y1 - First Y coordinate
     * @param {number} x2 - Second X coordinate
     * @param {number} y2 - Second Y coordinate
     * @returns {number} Distance between points
     */
    calculateDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate angle between two points
     * @param {number} x1 - First X coordinate
     * @param {number} y1 - First Y coordinate
     * @param {number} x2 - Second X coordinate
     * @param {number} y2 - Second Y coordinate
     * @returns {number} Angle in radians
     */
    calculateAngle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Interpolate between two values
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    /**
     * Update game boundaries
     * @param {number} width - New game width
     * @param {number} height - New game height
     */
    updateBoundaries(width, height) {
        this.gameWidth = width;
        this.gameHeight = height;
    }

    /**
     * Get physics configuration
     * @returns {Object} Physics configuration
     */
    getPhysicsConfig() {
        return {
            gravity: this.gravity,
            friction: this.friction,
            maxVelocity: this.maxVelocity,
            lerpFactor: this.lerpFactor
        };
    }

    /**
     * Set physics configuration
     * @param {Object} config - Physics configuration
     */
    setPhysicsConfig(config) {
        if (config.gravity !== undefined) this.gravity = config.gravity;
        if (config.friction !== undefined) this.friction = config.friction;
        if (config.maxVelocity !== undefined) this.maxVelocity = config.maxVelocity;
        if (config.lerpFactor !== undefined) this.lerpFactor = config.lerpFactor;
    }
}