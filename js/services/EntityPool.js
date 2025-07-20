// js/services/EntityPool.js

/**
 * Object pool for efficient entity management
 * Reduces garbage collection pressure by reusing objects
 */
export class EntityPool {
    constructor(EntityClass, initialSize = 50, maxSize = 200) {
        this.EntityClass = EntityClass;
        this.available = [];
        this.active = [];
        this.maxSize = maxSize;
        this.totalCreated = 0;
        this.totalAcquired = 0;
        this.totalReleased = 0;

        // Pre-allocate initial objects
        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.createNewEntity());
        }
    }

    /**
     * Create a new entity instance
     * @returns {Object} New entity instance
     */
    createNewEntity() {
        this.totalCreated++;
        try {
            // Try to create with no parameters first
            return new this.EntityClass();
        } catch (error) {
            // If that fails, try to create with default parameters
            // This handles entities that require constructor parameters
            if (this.EntityClass.name === 'Bullet') {
                // Create bullet with default parameters that will be overridden in init
                return new this.EntityClass(0, 0, {width: 4, height: 8, color: 'yellow'}, 0, 0, 1, 'player');
            } else if (this.EntityClass.name === 'Alien') {
                // Create alien with default parameters
                return new this.EntityClass(0, 0, 20, 1, 10, 'red', null);
            } else if (this.EntityClass.name === 'Item') {
                // Create item with default parameters
                return new this.EntityClass(0, 0, 'star', 10);
            } else if (this.EntityClass.name === 'Debris') {
                // Create debris with default parameters
                return new this.EntityClass(0, 0, 5, 2, 'orange', 1);
            } else {
                // For other entities, try to create with minimal parameters
                return new this.EntityClass(0, 0);
            }
        }
    }

    /**
     * Acquire an entity from the pool
     * @param {...any} args - Arguments to pass to entity initialization
     * @returns {Object} Entity instance
     */
    acquire(...args) {
        let entity;
        
        if (this.available.length > 0) {
            entity = this.available.pop();
        } else {
            entity = this.createNewEntity();
        }

        this.active.push(entity);
        this.totalAcquired++;

        // Initialize/reset the entity with provided arguments
        if (entity.init && typeof entity.init === 'function') {
            entity.init(...args);
        } else if (entity.reset && typeof entity.reset === 'function') {
            entity.reset();
            // Set common properties if provided
            if (args.length > 0) {
                this.initializeEntity(entity, ...args);
            }
        } else {
            // Fallback: directly set properties for entities without init/reset
            if (args.length > 0) {
                this.initializeEntity(entity, ...args);
            }
        }

        entity.active = true;
        return entity;
    }

    /**
     * Initialize entity with specific parameters based on entity type
     * @param {Object} entity - Entity to initialize
     * @param {...any} args - Initialization arguments
     */
    initializeEntity(entity, ...args) {
        if (this.EntityClass.name === 'Bullet' && args.length >= 6) {
            const [x, y, config, speedX, speedY, damage, owner, target] = args;
            entity.x = x;
            entity.y = y;
            entity.width = config.width;
            entity.height = config.height;
            entity.color = config.color;
            entity.speedX = speedX;
            entity.speedY = speedY;
            entity.damage = damage;
            entity.owner = owner || 'player';
            entity.config = config;
            entity.isHoming = owner === "miniShip";
            entity.target = target;
            entity.turnRate = config.turnRate || 0;
        } else if (this.EntityClass.name === 'Alien' && args.length >= 6) {
            const [x, y, size, speed, health, color, gameRef] = args;
            entity.x = x;
            entity.y = y;
            entity.width = size;
            entity.height = size;
            entity.color = color;
            entity.speed = speed;
            entity.health = health;
            entity.maxHealth = health;
            entity.gameRef = gameRef;
        } else {
            // Generic initialization for other entity types
            const [x, y, ...otherArgs] = args;
            if (x !== undefined) entity.x = x;
            if (y !== undefined) entity.y = y;
        }
    }

    /**
     * Release an entity back to the pool
     * @param {Object} entity - Entity to release
     * @returns {boolean} True if successfully released
     */
    release(entity) {
        const index = this.active.indexOf(entity);
        if (index === -1) {
            console.warn('Attempting to release entity that is not active in pool');
            return false;
        }

        // Remove from active array
        this.active.splice(index, 1);
        this.totalReleased++;

        // Reset entity state
        if (entity.reset && typeof entity.reset === 'function') {
            entity.reset();
        } else {
            // Default reset behavior
            entity.active = false;
            entity.x = 0;
            entity.y = 0;
            entity.velocityX = 0;
            entity.velocityY = 0;
        }

        // Return to available pool if under max size
        if (this.available.length < this.maxSize) {
            this.available.push(entity);
        }
        // Otherwise let it be garbage collected

        return true;
    }

    /**
     * Release all active entities
     */
    releaseAll() {
        while (this.active.length > 0) {
            this.release(this.active[0]);
        }
    }

    /**
     * Get pool statistics
     * @returns {Object} Pool statistics
     */
    getStats() {
        return {
            available: this.available.length,
            active: this.active.length,
            totalCreated: this.totalCreated,
            totalAcquired: this.totalAcquired,
            totalReleased: this.totalReleased,
            efficiency: this.totalAcquired > 0 
                ? ((this.totalAcquired - this.totalCreated) / this.totalAcquired * 100).toFixed(1) + '%'
                : '0%',
            entityType: this.EntityClass.name
        };
    }

    /**
     * Clean up unused entities to free memory
     * @param {number} keepCount - Number of entities to keep in available pool
     */
    cleanup(keepCount = 10) {
        if (this.available.length > keepCount) {
            this.available.splice(keepCount);
        }
    }

    /**
     * Get all active entities
     * @returns {Array} Array of active entities
     */
    getActiveEntities() {
        return [...this.active];
    }

    /**
     * Update all active entities
     * @param {number} deltaTime - Time since last frame
     * @param {...any} args - Additional arguments for update
     */
    updateAll(deltaTime, ...args) {
        // Update in reverse order to handle removals safely
        for (let i = this.active.length - 1; i >= 0; i--) {
            const entity = this.active[i];
            if (entity.update && typeof entity.update === 'function') {
                entity.update(deltaTime, ...args);
            }

            // Auto-release inactive entities
            if (!entity.active) {
                this.release(entity);
            }
        }
    }

    /**
     * Draw all active entities
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawAll(ctx) {
        this.active.forEach(entity => {
            if (entity.draw && typeof entity.draw === 'function' && entity.active) {
                entity.draw(ctx);
            }
        });
    }
}

/**
 * Pool manager for handling multiple entity pools
 */
export class PoolManager {
    constructor() {
        this.pools = new Map();
    }

    /**
     * Create a new pool for an entity type
     * @param {string} name - Pool name
     * @param {Function} EntityClass - Entity constructor
     * @param {number} initialSize - Initial pool size
     * @param {number} maxSize - Maximum pool size
     * @returns {EntityPool} Created pool
     */
    createPool(name, EntityClass, initialSize = 50, maxSize = 200) {
        const pool = new EntityPool(EntityClass, initialSize, maxSize);
        this.pools.set(name, pool);
        return pool;
    }

    /**
     * Get a pool by name
     * @param {string} name - Pool name
     * @returns {EntityPool|null} Pool instance or null if not found
     */
    getPool(name) {
        return this.pools.get(name) || null;
    }

    /**
     * Acquire entity from named pool
     * @param {string} poolName - Pool name
     * @param {...any} args - Arguments for entity initialization
     * @returns {Object|null} Entity instance or null if pool not found
     */
    acquire(poolName, ...args) {
        const pool = this.getPool(poolName);
        return pool ? pool.acquire(...args) : null;
    }

    /**
     * Release entity to its pool
     * @param {string} poolName - Pool name
     * @param {Object} entity - Entity to release
     * @returns {boolean} True if successfully released
     */
    release(poolName, entity) {
        const pool = this.getPool(poolName);
        return pool ? pool.release(entity) : false;
    }

    /**
     * Update all entities in all pools
     * @param {number} deltaTime - Time since last frame
     * @param {...any} args - Additional arguments
     */
    updateAll(deltaTime, ...args) {
        this.pools.forEach(pool => {
            pool.updateAll(deltaTime, ...args);
        });
    }

    /**
     * Draw all entities in all pools
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawAll(ctx) {
        this.pools.forEach(pool => {
            pool.drawAll(ctx);
        });
    }

    /**
     * Get statistics for all pools
     * @returns {Object} Statistics for all pools
     */
    getStats() {
        const stats = {};
        this.pools.forEach((pool, name) => {
            stats[name] = pool.getStats();
        });
        return stats;
    }

    /**
     * Cleanup all pools
     * @param {number} keepCount - Number of entities to keep per pool
     */
    cleanup(keepCount = 10) {
        this.pools.forEach(pool => {
            pool.cleanup(keepCount);
        });
    }

    /**
     * Release all entities in all pools
     */
    releaseAll() {
        this.pools.forEach(pool => {
            pool.releaseAll();
        });
    }
}