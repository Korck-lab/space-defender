// js/services/EntityService.js

import { Alien, Bullet, Rocket, Item, Debris } from '../entities.js';
import { GAME_CONFIG } from '../config.js';
import { GAME_EVENTS } from './EventBus.js';

/**
 * Manages entity lifecycle, spawning, updating, and cleanup
 * Extracted from Game.js to improve separation of concerns
 */
export class EntityService {
    constructor(eventBus, gameWidth, gameHeight) {
        this.eventBus = eventBus;
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        
        // Entity collections
        this.entities = {
            bullets: [],
            rockets: [],
            aliens: [],
            items: [],
            wingmen: [],
            miniShips: [],
            debris: []
        };
        
        // Spawn timers and configuration
        this.alienSpawnTimer = 0;
        this.alienSpawnInterval = GAME_CONFIG.aliens.initialSpawnInterval;
        
        // Level scaling
        this.alienBaseSpeed = GAME_CONFIG.aliens.initialSpeed;
        this.alienBaseHealth = GAME_CONFIG.aliens.initialHealth;
        this.minAliensOnScreen = GAME_CONFIG.aliens.minOnScreenBase;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for entity-related events
     */
    setupEventListeners() {
        this.eventBus.on(GAME_EVENTS.BULLET_FIRED, this.handleBulletFired.bind(this));
        this.eventBus.on(GAME_EVENTS.ENTITY_DESTROYED, this.handleEntityDestroyed.bind(this));
        this.eventBus.on(GAME_EVENTS.LEVEL_UP, this.handleLevelUp.bind(this));
        this.eventBus.on(GAME_EVENTS.ALIEN_DESTROYED, this.handleAlienDestroyed.bind(this));
    }

    /**
     * Update all entities for the current frame
     * @param {number} deltaTime - Time since last frame
     * @param {Object} gameState - Current game state
     */
    updateEntities(deltaTime, gameState) {
        // Update all entity types
        this.updateEntityGroup(deltaTime, this.entities.bullets, gameState);
        this.updateEntityGroup(deltaTime, this.entities.rockets, gameState);
        this.updateEntityGroup(deltaTime, this.entities.aliens, gameState);
        this.updateEntityGroup(deltaTime, this.entities.items, gameState);
        this.updateEntityGroup(deltaTime, this.entities.wingmen, gameState);
        this.updateEntityGroup(deltaTime, this.entities.miniShips, gameState);
        this.updateEntityGroup(deltaTime, this.entities.debris, gameState);
        
        // Handle spawning
        this.spawnAliens(deltaTime, gameState);
        
        // Clean up inactive entities
        this.cleanupInactiveEntities();
    }

    /**
     * Update a group of entities
     * @param {number} deltaTime - Time since last frame
     * @param {Array} entities - Array of entities to update
     * @param {Object} gameState - Current game state
     */
    updateEntityGroup(deltaTime, entities, gameState) {
        for (let i = entities.length - 1; i >= 0; i--) {
            const entity = entities[i];
            if (!entity.active) continue;
            
            entity.update(deltaTime, gameState);
            
            // Handle offscreen entities
            this.handleOffscreenEntity(entity, i, entities);
            
            // Handle special entity behaviors
            this.handleSpecialEntityBehaviors(entity, gameState);
        }
    }

    /**
     * Handle entities that have moved offscreen
     * @param {Entity} entity - Entity to check
     * @param {number} index - Index in entity array
     * @param {Array} entities - Entity array
     */
    handleOffscreenEntity(entity, index, entities) {
        if (entity.isOffscreen(this.gameWidth, this.gameHeight)) {
            if (entity instanceof Alien && entity.y > this.gameHeight) {
                this.handleAlienLeak(entity, index);
            } else if (
                entity instanceof Bullet ||
                entity instanceof Rocket ||
                entity instanceof Item ||
                entity instanceof Debris
            ) {
                entity.active = false;
                this.eventBus.emit(GAME_EVENTS.ENTITY_DESTROYED, {
                    entity,
                    reason: 'offscreen'
                });
            }
        }
    }

    /**
     * Handle special behaviors for specific entity types
     * @param {Entity} entity - Entity to check
     * @param {Object} gameState - Current game state
     */
    handleSpecialEntityBehaviors(entity, gameState) {
        // Handle rocket explosions
        if (entity instanceof Rocket) {
            if (entity.y <= 0 || (entity.target && entity.shouldExplode())) {
                this.handleRocketExplosion(entity, gameState);
            }
        }
    }

    /**
     * Spawn new alien entities based on game level and timing
     * @param {number} deltaTime - Time since last frame
     * @param {Object} gameState - Current game state
     */
    spawnAliens(deltaTime, gameState) {
        this.alienSpawnTimer += deltaTime;
        const activeAlienCount = this.entities.aliens.filter(a => a.active).length;
        
        // Determine if we should spawn based on timer and alien count
        const shouldSpawn = this.alienSpawnTimer >= this.alienSpawnInterval || 
                           activeAlienCount < this.minAliensOnScreen;
                           
        if (shouldSpawn) {
            this.spawnSingleAlien(gameState);
            this.alienSpawnTimer = 0;
        }
    }

    /**
     * Spawn a single alien entity
     * @param {Object} gameState - Current game state
     */
    spawnSingleAlien(gameState) {
        const level = gameState.level || 1;
        
        // Calculate alien properties based on level
        const speed = this.calculateAlienSpeed(level);
        const health = this.calculateAlienHealth(level);
        
        // Determine alien type
        const alienType = this.determineAlienType();
        const typeConfig = GAME_CONFIG.aliens[alienType];
        
        // Calculate size and points
        const size = typeConfig.sizeMin + Math.random() * typeConfig.sizeRange;
        const points = Math.round(GAME_CONFIG.aliens.basePoints * typeConfig.pointsMultiplier);
        const color = this.getAlienColor(alienType);
        
        // Find non-overlapping spawn position
        const spawnX = this.findValidSpawnPosition(size);
        
        // Create and add alien
        const alien = new Alien(
            spawnX,
            -size,
            size,
            size,
            speed,
            health,
            points,
            color,
            alienType,
            typeConfig,
            gameState // Pass game state instead of full game reference
        );
        
        this.entities.aliens.push(alien);
        
        this.eventBus.emit(GAME_EVENTS.ENTITY_CREATED, {
            entity: alien,
            type: 'alien'
        });
    }

    /**
     * Find a valid spawn position that doesn't overlap with existing aliens
     * @param {number} size - Size of the alien to spawn
     * @returns {number} X coordinate for spawning
     */
    findValidSpawnPosition(size) {
        let spawnX;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            spawnX = Math.random() * (this.gameWidth - size);
            attempts++;
            
            if (attempts >= maxAttempts) {
                break;
            }
        } while (this.isPositionOverlappingAliens(spawnX, -size, size, size));
        
        return spawnX;
    }

    /**
     * Check if a position would overlap with existing aliens
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width of entity
     * @param {number} height - Height of entity
     * @returns {boolean} True if position overlaps
     */
    isPositionOverlappingAliens(x, y, width, height) {
        const margin = width * 0.5;
        
        const rect = {
            x: x - margin,
            y: y - margin,
            width: width + margin * 2,
            height: height + margin * 2
        };
        
        return this.entities.aliens.some(alien => {
            if (!alien.active) return false;
            
            return rect.x < alien.x + alien.width &&
                   rect.x + rect.width > alien.x &&
                   rect.y < alien.y + alien.height &&
                   rect.y + rect.height > alien.y;
        });
    }

    /**
     * Calculate alien speed based on current level
     * @param {number} level - Current game level
     * @returns {number} Calculated speed
     */
    calculateAlienSpeed(level) {
        const multiplier = Math.max(
            Math.pow(GAME_CONFIG.aliens.levelSpeedMultiplier, level - 1),
            GAME_CONFIG.aliens.levelSpeedMinFactor
        );
        return this.alienBaseSpeed * multiplier;
    }

    /**
     * Calculate alien health based on current level
     * @param {number} level - Current game level
     * @returns {number} Calculated health
     */
    calculateAlienHealth(level) {
        const multiplier = Math.max(
            Math.pow(GAME_CONFIG.aliens.levelHealthMultiplier, level - 1),
            GAME_CONFIG.aliens.levelHealthMinFactor
        );
        return this.alienBaseHealth * multiplier;
    }

    /**
     * Determine what type of alien to spawn based on spawn ratios
     * @returns {string} Alien type ('scout', 'fighter', or 'elite')
     */
    determineAlienType() {
        const rand = Math.random();
        
        if (rand < GAME_CONFIG.aliens.spawnRatioScout) {
            return 'scout';
        } else if (rand < GAME_CONFIG.aliens.spawnRatioScout + GAME_CONFIG.aliens.spawnRatioFighter) {
            return 'fighter';
        } else {
            return 'elite';
        }
    }

    /**
     * Get color for alien based on type
     * @param {string} alienType - Type of alien
     * @returns {string} Color string
     */
    getAlienColor(alienType) {
        const config = GAME_CONFIG.aliens[alienType];
        
        if (alienType === 'scout') {
            const hue = config.colorHueMin + Math.random() * config.colorHueRange;
            return `hsl(${hue}, ${config.saturation}, ${config.lightness})`;
        } else {
            return config.color;
        }
    }

    /**
     * Handle alien that leaked past the player
     * @param {Alien} alien - Alien that leaked
     * @param {number} index - Index in aliens array
     */
    handleAlienLeak(alien, index) {
        if (alien.type === 'scout') {
            // Scouts spawn fighters when they escape
            this.spawnFightersFromScout(alien);
        } else if (alien.type === 'fighter' || alien.type === 'elite') {
            // Fighters and elites kill the player when they escape
            this.eventBus.emit(GAME_EVENTS.PLAYER_DAMAGED, {
                damage: 1,
                source: 'alien_leak',
                alien
            });
        }
        
        alien.active = false;
        this.eventBus.emit(GAME_EVENTS.ALIEN_DESTROYED, {
            alien,
            reason: 'leaked'
        });
    }

    /**
     * Spawn fighters from a scout that escaped
     * @param {Alien} scout - Scout alien that escaped
     */
    spawnFightersFromScout(scout) {
        const fighterCount = GAME_CONFIG.aliens.scout.fighterSpawnCount;
        
        for (let i = 0; i < fighterCount; i++) {
            // Create fighters with similar properties to the scout
            const fighter = new Alien(
                scout.x + (i - fighterCount / 2) * 50,
                -30,
                GAME_CONFIG.aliens.fighter.sizeMin,
                GAME_CONFIG.aliens.fighter.sizeMin,
                scout.speed * GAME_CONFIG.aliens.fighter.speedMultiplier,
                scout.health * GAME_CONFIG.aliens.fighter.healthMultiplier,
                scout.points * GAME_CONFIG.aliens.fighter.pointsMultiplier,
                GAME_CONFIG.aliens.fighter.color,
                'fighter',
                GAME_CONFIG.aliens.fighter,
                scout.gameRef
            );
            
            this.entities.aliens.push(fighter);
        }
    }

    /**
     * Handle rocket explosion
     * @param {Rocket} rocket - Rocket that exploded
     * @param {Object} gameState - Current game state
     */
    handleRocketExplosion(rocket, gameState) {
        this.eventBus.emit(GAME_EVENTS.EXPLOSION_CREATED, {
            x: rocket.getCenterX(),
            y: rocket.getCenterY(),
            radius: GAME_CONFIG.rocket.explosionRadius,
            damage: GAME_CONFIG.rocket.damage,
            color: rocket.color
        });
        
        rocket.active = false;
    }

    /**
     * Clean up inactive entities from all collections
     */
    cleanupInactiveEntities() {
        Object.keys(this.entities).forEach(key => {
            this.entities[key] = this.entities[key].filter(entity => entity.active);
        });
    }

    /**
     * Handle bullet fired event
     * @param {Object} bulletData - Bullet creation data
     */
    handleBulletFired(bulletData) {
        const bullet = new Bullet(
            bulletData.x,
            bulletData.y,
            bulletData.speedX,
            bulletData.speedY,
            bulletData.damage,
            bulletData.color,
            bulletData.owner,
            bulletData.config
        );
        
        this.entities.bullets.push(bullet);
    }

    /**
     * Handle entity destroyed event
     * @param {Object} entityData - Entity destruction data
     */
    handleEntityDestroyed(entityData) {
        // Additional cleanup logic if needed
        console.log(`Entity destroyed: ${entityData.entity.constructor.name} (${entityData.reason})`);
    }

    /**
     * Handle level up event
     * @param {Object} levelData - Level up data
     */
    handleLevelUp(levelData) {
        const level = levelData.level;
        
        // Update spawn interval
        this.alienSpawnInterval = Math.max(
            GAME_CONFIG.aliens.initialSpawnInterval * 
            Math.pow(GAME_CONFIG.aliens.levelSpawnIntervalMultiplier, level - 1),
            GAME_CONFIG.aliens.initialSpawnInterval * GAME_CONFIG.aliens.levelSpawnIntervalMinFactor
        );
        
        // Update minimum aliens on screen
        this.minAliensOnScreen = Math.round(
            GAME_CONFIG.aliens.minOnScreenBase + 
            (level - 1) * GAME_CONFIG.aliens.minOnScreenLevelScale
        );
    }

    /**
     * Handle alien destroyed event
     * @param {Object} alienData - Alien destruction data
     */
    handleAlienDestroyed(alienData) {
        // Handle drops and other alien destruction logic
        if (alienData.alien && alienData.alien.type) {
            const dropChance = GAME_CONFIG.aliens[alienData.alien.type].dropChance;
            
            if (Math.random() < dropChance) {
                this.spawnItemDrop(alienData.alien);
            }
        }
    }

    /**
     * Spawn an item drop from a destroyed alien
     * @param {Alien} alien - Alien that was destroyed
     */
    spawnItemDrop(alien) {
        // Determine item type
        const itemType = this.determineItemType();
        
        const item = new Item(
            alien.getCenterX(),
            alien.getCenterY(),
            itemType
        );
        
        this.entities.items.push(item);
        
        this.eventBus.emit(GAME_EVENTS.POWERUP_SPAWNED, {
            item,
            type: itemType,
            x: alien.getCenterX(),
            y: alien.getCenterY()
        });
    }

    /**
     * Determine what type of item to drop
     * @returns {string} Item type
     */
    determineItemType() {
        const rand = Math.random();
        
        if (rand < 0.4) return 'xp';
        if (rand < 0.6) return 'life';
        if (rand < 0.8) return 'bomb';
        
        // Ability items
        if (rand < 0.9) return 'rocket';
        if (rand < 0.95) return 'wingman';
        return 'miniShip';
    }

    /**
     * Get all entities by type
     * @param {string} type - Entity type
     * @returns {Array} Array of entities
     */
    getEntities(type) {
        return this.entities[type] || [];
    }

    /**
     * Get all entities as a flat array
     * @returns {Array} All entities
     */
    getAllEntities() {
        return Object.values(this.entities).flat();
    }

    /**
     * Get entity counts for debugging
     * @returns {Object} Entity counts by type
     */
    getEntityCounts() {
        const counts = {};
        Object.keys(this.entities).forEach(key => {
            counts[key] = this.entities[key].filter(e => e.active).length;
        });
        return counts;
    }

    /**
     * Clear all entities
     */
    clearAllEntities() {
        Object.keys(this.entities).forEach(key => {
            this.entities[key] = [];
        });
    }

    /**
     * Add an entity to the appropriate collection
     * @param {Entity} entity - Entity to add
     * @param {string} type - Entity type
     */
    addEntity(entity, type) {
        if (this.entities[type]) {
            this.entities[type].push(entity);
            
            this.eventBus.emit(GAME_EVENTS.ENTITY_CREATED, {
                entity,
                type
            });
        }
    }

    /**
     * Remove an entity from its collection
     * @param {Entity} entity - Entity to remove
     * @param {string} type - Entity type
     */
    removeEntity(entity, type) {
        if (this.entities[type]) {
            const index = this.entities[type].indexOf(entity);
            if (index > -1) {
                this.entities[type].splice(index, 1);
                
                this.eventBus.emit(GAME_EVENTS.ENTITY_DESTROYED, {
                    entity,
                    type,
                    reason: 'manual_removal'
                });
            }
        }
    }
}