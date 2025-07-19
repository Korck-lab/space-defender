// js/services/RenderingService.js

import { drawStarfield, drawAimCrosshair } from '../drawing.js';
import { Bullet, Rocket } from '../entities.js';
import { GAME_EVENTS } from './EventBus.js';

/**
 * Handles all rendering operations for the game
 * Extracted from Game.js to improve separation of concerns
 */
export class RenderingService {
    constructor(canvas, ctx, eventBus) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.eventBus = eventBus;
        
        // Rendering state
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.showDebugInfo = false;
        
        // Performance monitoring
        this.renderMetrics = {
            totalRenderTime: 0,
            entityRenderTime: 0,
            particleRenderTime: 0,
            uiRenderTime: 0,
            frameCount: 0
        };
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for rendering-related events
     */
    setupEventListeners() {
        this.eventBus.on(GAME_EVENTS.GAME_START, () => {
            this.resetMetrics();
        });
    }

    /**
     * Main render method - draws entire game scene
     * @param {Object} gameState - Current game state with all entities
     * @param {number} deltaTime - Time since last frame
     */
    render(gameState, deltaTime) {
        const renderStart = performance.now();
        
        this.updateFPS(deltaTime);
        
        // Clear canvas
        this.clearCanvas();
        
        // Render background
        this.renderBackground();
        
        // Render all game entities in proper order
        this.renderGameEntities(gameState);
        
        // Render UI overlays
        this.renderUI(gameState);
        
        // Render debug info if enabled
        if (this.showDebugInfo) {
            this.renderDebugInfo(gameState);
        }
        
        // Update performance metrics
        this.updateMetrics(renderStart);
    }

    /**
     * Clear the entire canvas
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render the starfield background
     */
    renderBackground() {
        drawStarfield(this.ctx);
    }

    /**
     * Render all game entities in the correct drawing order
     * @param {Object} gameState - Current game state
     */
    renderGameEntities(gameState) {
        const entityStart = performance.now();
        
        // Render entities in back-to-front order
        this.renderEntities(gameState.aliens || []);
        this.renderEntities(gameState.rockets || []);
        this.renderEntities(gameState.items || []);
        this.renderEntities(gameState.wingmen || []);
        this.renderEntities(gameState.miniShips || []);
        
        // Player is rendered separately for special handling
        if (gameState.player) {
            this.renderPlayer(gameState.player);
        }
        
        // Bullets rendered on top for visibility
        this.renderEntities(gameState.bullets || []);
        
        // Particles rendered last
        this.renderParticles(gameState.particleManager);
        
        this.renderMetrics.entityRenderTime += performance.now() - entityStart;
    }

    /**
     * Render a collection of entities
     * @param {Array} entities - Array of entities to render
     */
    renderEntities(entities) {
        for (const entity of entities) {
            if (entity.active && this.isEntityVisible(entity)) {
                this.renderEntity(entity);
                this.createEntityTrails(entity);
            }
        }
    }

    /**
     * Render a single entity
     * @param {Entity} entity - Entity to render
     */
    renderEntity(entity) {
        entity.draw(this.ctx);
    }

    /**
     * Render the player with special handling
     * @param {Player} player - Player entity
     */
    renderPlayer(player) {
        if (player.active) {
            player.draw(this.ctx);
        }
    }

    /**
     * Create particle trails for entities that need them
     * @param {Entity} entity - Entity to create trails for
     */
    createEntityTrails(entity) {
        // This logic was extracted from the original drawEntities method
        if (entity instanceof Bullet && entity.owner === "player") {
            this.eventBus.emit(GAME_EVENTS.PARTICLE_CREATE_TRAIL, {
                type: 'bullet',
                x: entity.getCenterX(),
                y: entity.y + entity.height,
                color: entity.color
            });
        } else if (entity instanceof Bullet && entity.owner === "miniShip") {
            this.eventBus.emit(GAME_EVENTS.PARTICLE_CREATE_TRAIL, {
                type: 'miniRocket',
                x: entity.getCenterX(),
                y: entity.getCenterY(),
                color: entity.config.trailColor || entity.color
            });
        } else if (entity instanceof Rocket) {
            const bottom = entity.getRotatedCenterBottom();
            this.eventBus.emit(GAME_EVENTS.PARTICLE_CREATE_TRAIL, {
                type: 'rocketFlame',
                x: bottom.x,
                y: bottom.y
            });
        }
    }

    /**
     * Render particle systems
     * @param {ParticleManager} particleManager - Particle manager instance
     */
    renderParticles(particleManager) {
        if (particleManager) {
            const particleStart = performance.now();
            particleManager.draw(this.ctx);
            this.renderMetrics.particleRenderTime += performance.now() - particleStart;
        }
    }

    /**
     * Render UI elements and overlays
     * @param {Object} gameState - Current game state
     */
    renderUI(gameState) {
        const uiStart = performance.now();
        
        // Render aim crosshair if game is running
        if (gameState.running && !gameState.paused && gameState.inputHandler) {
            const mousePos = gameState.inputHandler.getMousePosition();
            drawAimCrosshair(this.ctx, mousePos.x, mousePos.y);
        }
        
        this.renderMetrics.uiRenderTime += performance.now() - uiStart;
    }

    /**
     * Render debug information
     * @param {Object} gameState - Current game state
     */
    renderDebugInfo(gameState) {
        const debugY = 30;
        const lineHeight = 20;
        let currentY = debugY;
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';
        
        // FPS
        this.ctx.fillText(`FPS: ${this.fps}`, 10, currentY);
        currentY += lineHeight;
        
        // Entity counts
        const entityCounts = this.getEntityCounts(gameState);
        Object.entries(entityCounts).forEach(([type, count]) => {
            this.ctx.fillText(`${type}: ${count}`, 10, currentY);
            currentY += lineHeight;
        });
        
        // Render performance
        this.ctx.fillText(`Render Time: ${this.renderMetrics.totalRenderTime.toFixed(2)}ms`, 10, currentY);
        currentY += lineHeight;
    }

    /**
     * Check if entity is visible within the viewport
     * @param {Entity} entity - Entity to check
     * @returns {boolean} True if entity is visible
     */
    isEntityVisible(entity) {
        const margin = 50; // Allow some margin for partially visible entities
        return !(
            entity.x + entity.width < -margin ||
            entity.x > this.canvas.width + margin ||
            entity.y + entity.height < -margin ||
            entity.y > this.canvas.height + margin
        );
    }

    /**
     * Get counts of all entity types for debug display
     * @param {Object} gameState - Current game state
     * @returns {Object} Entity counts by type
     */
    getEntityCounts(gameState) {
        return {
            'Aliens': (gameState.aliens || []).filter(e => e.active).length,
            'Bullets': (gameState.bullets || []).filter(e => e.active).length,
            'Rockets': (gameState.rockets || []).filter(e => e.active).length,
            'Items': (gameState.items || []).filter(e => e.active).length,
            'Wingmen': (gameState.wingmen || []).filter(e => e.active).length,
            'MiniShips': (gameState.miniShips || []).filter(e => e.active).length,
            'Particles': gameState.particleManager ? gameState.particleManager.getParticleCount() : 0
        };
    }

    /**
     * Update FPS calculation
     * @param {number} deltaTime - Time since last frame
     */
    updateFPS(deltaTime) {
        this.frameCount++;
        
        if (this.frameCount % 60 === 0) { // Update FPS every 60 frames
            this.fps = Math.round(1000 / deltaTime);
        }
    }

    /**
     * Update rendering performance metrics
     * @param {number} renderStart - Start time of render operation
     */
    updateMetrics(renderStart) {
        this.renderMetrics.totalRenderTime = performance.now() - renderStart;
        this.renderMetrics.frameCount++;
        
        // Reset accumulated metrics every 60 frames
        if (this.renderMetrics.frameCount % 60 === 0) {
            this.renderMetrics.entityRenderTime = 0;
            this.renderMetrics.particleRenderTime = 0;
            this.renderMetrics.uiRenderTime = 0;
        }
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.renderMetrics = {
            totalRenderTime: 0,
            entityRenderTime: 0,
            particleRenderTime: 0,
            uiRenderTime: 0,
            frameCount: 0
        };
        this.frameCount = 0;
    }

    /**
     * Toggle debug information display
     */
    toggleDebugInfo() {
        this.showDebugInfo = !this.showDebugInfo;
    }

    /**
     * Get current rendering performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return { ...this.renderMetrics, fps: this.fps };
    }

    /**
     * Resize the rendering context
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.eventBus.emit(GAME_EVENTS.RENDERER_RESIZED, {
            width,
            height
        });
    }
}

// Add new event constants for rendering
export const RENDERING_EVENTS = {
    PARTICLE_CREATE_TRAIL: 'particle.createTrail',
    RENDERER_RESIZED: 'renderer.resized'
};