import { checkCollision } from '../utils.js';
import { SpatialHashGrid } from './SpatialHashGrid.js';

/**
 * Optimized collision detection service using spatial partitioning
 */
export class CollisionService {
    constructor(cellSize = 64) {
        this.spatialGrid = new SpatialHashGrid(cellSize);
        this.debugMode = false;
    }

    /**
     * Enable/disable debug visualization
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Populate spatial grid with all collidable entities
     * @param {Array} bullets - Array of bullet entities
     * @param {Array} aliens - Array of alien entities
     * @param {Object} player - Player entity
     * @param {Array} items - Array of item entities
     */
    populateSpatialGrid(bullets, aliens, player, items) {
        this.spatialGrid.clear();

        // Add all active entities to spatial grid
        bullets.forEach(bullet => {
            if (bullet.active) {
                this.spatialGrid.insert(bullet);
            }
        });

        aliens.forEach(alien => {
            if (alien.active) {
                this.spatialGrid.insert(alien);
            }
        });

        if (player.active !== false) {
            this.spatialGrid.insert(player);
        }

        items.forEach(item => {
            if (item.active) {
                this.spatialGrid.insert(item);
            }
        });
    }

    /**
     * Optimized collision detection using spatial partitioning
     * @param {Game} game - The game instance
     */
    checkCollisions(game) {
        const { bullets, aliens, player, items, particleManager } = game;

        // Populate spatial grid for this frame
        this.populateSpatialGrid(bullets, aliens, player, items);

        // Bullets vs Aliens / Player (optimized)
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet.active) continue;

            // Get potential collision candidates from spatial grid
            const candidates = this.spatialGrid.getNeighbors(bullet);

            if (bullet.owner === 'player' || bullet.owner === 'miniShip' || bullet.owner === 'wingman') {
                // Check only nearby aliens
                for (const candidate of candidates) {
                    if (candidate.constructor.name === 'Alien' && candidate.active) {
                        if (checkCollision(bullet, candidate)) {
                            const destroyed = candidate.takeDamage(bullet.damage);
                            bullet.active = false;
                            particleManager.createExplosion(
                                bullet.getCenterX(),
                                bullet.getCenterY(),
                                candidate.color,
                                3
                            );
                            if (destroyed) {
                                const alienIndex = aliens.indexOf(candidate);
                                if (alienIndex !== -1) {
                                    game.handleAlienDestroyed(candidate, alienIndex, bullet.owner);
                                }
                            }
                            break;
                        }
                    }
                }
            } else if (bullet.owner === 'alien') {
                // Check collision with player
                for (const candidate of candidates) {
                    if (candidate === player && !player.invincible) {
                        if (checkCollision(bullet, player)) {
                            bullet.active = false;
                            game.handlePlayerHit('alien_bullet');
                            if (!game.running) break;
                        }
                    }
                }
            }
        }

        // Player vs Aliens (optimized)
        if (!player.invincible) {
            const playerCandidates = this.spatialGrid.getNeighbors(player);
            const playerHitbox = {
                x: player.x - player.width / 3,
                y: player.y - player.height / 3,
                width: player.width * 0.67,
                height: player.height * 0.67,
            };

            for (const candidate of playerCandidates) {
                if (candidate.constructor.name === 'Alien' && candidate.active) {
                    if (checkCollision(playerHitbox, candidate)) {
                        const alienIndex = aliens.indexOf(candidate);
                        if (alienIndex !== -1) {
                            game.handlePlayerHit(candidate, alienIndex);
                            if (!game.running) break;
                            if (player.invincible) break;
                        }
                    }
                }
            }
        }

        // Player vs Items (optimized)
        const playerItemCandidates = this.spatialGrid.getNeighbors(player);
        for (const candidate of playerItemCandidates) {
            if (candidate.constructor.name === 'Item' && candidate.active) {
                if (checkCollision(player, candidate)) {
                    candidate.applyEffect(player, game);
                    candidate.active = false;
                }
            }
        }

        // Debris vs Aliens - use spatial grid for optimization
        this.checkDebrisCollisions(particleManager, aliens, game);
    }

    /**
     * Optimized debris collision checking
     * @param {ParticleManager} particleManager - Particle manager instance
     * @param {Array} aliens - Array of alien entities
     * @param {Game} game - Game instance
     */
    checkDebrisCollisions(particleManager, aliens, game) {
        particleManager.debris.forEach(debris => {
            if (!debris.active) return;

            const debrisCandidates = this.spatialGrid.getNeighbors(debris);
            for (const candidate of debrisCandidates) {
                if (candidate.constructor.name === 'Alien' && candidate.active) {
                    if (checkCollision(debris, candidate)) {
                        const destroyed = candidate.takeDamage(debris.damage);
                        debris.active = false;
                        
                        particleManager.createExplosion(
                            debris.getCenterX(),
                            debris.getCenterY(),
                            candidate.color,
                            2
                        );
                        
                        if (destroyed) {
                            const alienIndex = aliens.indexOf(candidate);
                            if (alienIndex !== -1) {
                                game.handleAlienDestroyed(candidate, alienIndex, 'debris');
                            }
                        }
                        break;
                    }
                }
            }
        });
    }

    /**
     * Draw debug visualization of spatial grid
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    debugDraw(ctx, canvasWidth, canvasHeight) {
        if (this.debugMode) {
            ctx.save();
            
            // Reset any transformations to ensure consistent positioning
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Reset text alignment and baseline
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            this.spatialGrid.debugDraw(ctx, canvasWidth, canvasHeight);
            
            // Draw grid statistics with background (positioned below debug info)
            const stats = this.spatialGrid.getStats();
            const x = 350;
            const y = 110; // Position below viewport culler debug info
            const lineHeight = 14;
            const padding = 8;
            const overlayWidth = 160;
            const overlayHeight = 5 * lineHeight + padding * 2;
            
            // Draw semi-transparent background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x - padding, y - padding, overlayWidth, overlayHeight);
            
            // Draw border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - padding, y - padding, overlayWidth, overlayHeight);
            
            ctx.fillStyle = '#ff00ff'; // Magenta for title
            ctx.font = '11px monospace';
            ctx.fillText(`Spatial Grid Stats:`, x, y);
            
            ctx.fillStyle = 'white';
            ctx.fillText(`Cells: ${stats.totalCells}`, x, y + lineHeight);
            ctx.fillText(`Entities: ${stats.totalEntities}`, x, y + lineHeight * 2);
            ctx.fillText(`Max/Cell: ${stats.maxEntitiesPerCell}`, x, y + lineHeight * 3);
            ctx.fillText(`Avg/Cell: ${stats.avgEntitiesPerCell}`, x, y + lineHeight * 4);
            
            ctx.restore();
        }
    }

    /**
     * Get performance statistics
     * @returns {Object} Performance statistics
     */
    getStats() {
        return this.spatialGrid.getStats();
    }
}

/**
 * Legacy function for backward compatibility
 * @param {Game} game - The game instance
 */
export function checkCollisions(game) {
    // Use default collision service if not already instantiated
    if (!game.collisionService) {
        game.collisionService = new CollisionService();
    }
    game.collisionService.checkCollisions(game);
}
