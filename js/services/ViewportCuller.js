// js/services/ViewportCuller.js

/**
 * Viewport culling service for rendering optimization
 * Only renders entities that are visible within the viewport
 */
export class ViewportCuller {
    constructor(canvasWidth, canvasHeight, margin = 50) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.margin = margin; // Extra margin to handle entities entering viewport
        this.culledCount = 0;
        this.totalCount = 0;
    }

    /**
     * Update viewport dimensions
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    updateViewport(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * Check if an entity is within the viewport
     * @param {Object} entity - Entity with x, y, width, height properties
     * @returns {boolean} True if entity is visible
     */
    isInViewport(entity) {
        if (!entity || entity.active === false) {
            return false;
        }

        const entityLeft = entity.x;
        const entityRight = entity.x + (entity.width || 0);
        const entityTop = entity.y;
        const entityBottom = entity.y + (entity.height || 0);

        const viewportLeft = -this.margin;
        const viewportRight = this.canvasWidth + this.margin;
        const viewportTop = -this.margin;
        const viewportBottom = this.canvasHeight + this.margin;

        // Check if entity is completely outside viewport
        const isOutside = (
            entityRight < viewportLeft ||
            entityLeft > viewportRight ||
            entityBottom < viewportTop ||
            entityTop > viewportBottom
        );

        return !isOutside;
    }

    /**
     * Filter entities to only those visible in viewport
     * @param {Array} entities - Array of entities to filter
     * @returns {Array} Array of visible entities
     */
    getVisibleEntities(entities) {
        this.totalCount = entities.length;
        const visible = entities.filter(entity => this.isInViewport(entity));
        this.culledCount = this.totalCount - visible.length;
        return visible;
    }

    /**
     * Render only visible entities
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} entities - Array of entities to render
     * @param {Function} renderFunction - Function to render each entity
     */
    renderVisible(ctx, entities, renderFunction) {
        const visibleEntities = this.getVisibleEntities(entities);
        
        visibleEntities.forEach(entity => {
            if (renderFunction) {
                renderFunction(ctx, entity);
            } else if (entity.draw && typeof entity.draw === 'function') {
                entity.draw(ctx);
            }
        });
    }

    /**
     * Batch render multiple entity arrays
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} entityArrays - Array of {entities, renderFunction} objects
     */
    renderVisibleBatch(ctx, entityArrays) {
        let totalCulled = 0;
        let totalEntities = 0;

        entityArrays.forEach(({ entities, renderFunction }) => {
            const visible = this.getVisibleEntities(entities);
            totalCulled += this.culledCount;
            totalEntities += this.totalCount;

            visible.forEach(entity => {
                if (renderFunction) {
                    renderFunction(ctx, entity);
                } else if (entity.draw && typeof entity.draw === 'function') {
                    entity.draw(ctx);
                }
            });
        });

        this.culledCount = totalCulled;
        this.totalCount = totalEntities;
    }

    /**
     * Check if a point is within the viewport
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if point is visible
     */
    isPointInViewport(x, y) {
        return (
            x >= -this.margin &&
            x <= this.canvasWidth + this.margin &&
            y >= -this.margin &&
            y <= this.canvasHeight + this.margin
        );
    }

    /**
     * Check if a circular entity is within viewport
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} radius - Entity radius
     * @returns {boolean} True if circle is visible
     */
    isCircleInViewport(x, y, radius) {
        const viewportLeft = -this.margin;
        const viewportRight = this.canvasWidth + this.margin;
        const viewportTop = -this.margin;
        const viewportBottom = this.canvasHeight + this.margin;

        // Check if circle is completely outside viewport
        return !(
            x + radius < viewportLeft ||
            x - radius > viewportRight ||
            y + radius < viewportTop ||
            y - radius > viewportBottom
        );
    }

    /**
     * Get entities that are about to enter the viewport
     * Useful for pre-loading or preparation
     * @param {Array} entities - Array of entities to check
     * @param {number} lookaheadMargin - Additional margin for lookahead
     * @returns {Array} Array of entities about to enter viewport
     */
    getUpcomingEntities(entities, lookaheadMargin = 100) {
        const originalMargin = this.margin;
        this.margin = lookaheadMargin;
        
        const upcoming = entities.filter(entity => {
            const inLookahead = this.isInViewport(entity);
            const inCurrentViewport = this.isInViewport(entity);
            return inLookahead && !inCurrentViewport;
        });
        
        this.margin = originalMargin;
        return upcoming;
    }

    /**
     * Optimize entity updates based on viewport visibility
     * @param {Array} entities - Array of entities to update
     * @param {number} deltaTime - Time since last frame
     * @param {Function} updateFunction - Function to update each entity
     * @param {boolean} updateOffscreen - Whether to update offscreen entities
     */
    updateVisible(entities, deltaTime, updateFunction, updateOffscreen = false) {
        entities.forEach(entity => {
            const isVisible = this.isInViewport(entity);
            
            if (isVisible || updateOffscreen) {
                if (updateFunction) {
                    updateFunction(entity, deltaTime, isVisible);
                } else if (entity.update && typeof entity.update === 'function') {
                    entity.update(deltaTime);
                }
            }
        });
    }

    /**
     * Get culling statistics
     * @returns {Object} Culling statistics
     */
    getStats() {
        return {
            totalEntities: this.totalCount,
            culledEntities: this.culledCount,
            visibleEntities: this.totalCount - this.culledCount,
            cullingRatio: this.totalCount > 0 
                ? ((this.culledCount / this.totalCount) * 100).toFixed(1) + '%'
                : '0%',
            viewport: {
                width: this.canvasWidth,
                height: this.canvasHeight,
                margin: this.margin
            }
        };
    }

    /**
     * Set culling margin
     * @param {number} margin - New margin value
     */
    setMargin(margin) {
        this.margin = margin;
    }

    /**
     * Reset culling statistics
     */
    resetStats() {
        this.culledCount = 0;
        this.totalCount = 0;
    }

    /**
     * Debug visualization of viewport bounds
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    debugDraw(ctx) {
        ctx.save();
        
        // Reset any transformations to ensure consistent positioning
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Reset text alignment and baseline
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Draw viewport bounds
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw margin bounds
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            -this.margin, 
            -this.margin, 
            this.canvasWidth + 2 * this.margin, 
            this.canvasHeight + 2 * this.margin
        );
        
        // Draw statistics with background
        const stats = this.getStats();
        const x = 350;
        const y = 20;
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
        
        ctx.fillStyle = '#00ffff'; // Cyan for title
        ctx.font = '11px monospace';
        ctx.fillText(`Debug Info (F2 to toggle)`, x, y);
        
        ctx.fillStyle = 'white';
        ctx.fillText(`Visible: ${stats.visibleEntities}`, x, y + lineHeight);
        ctx.fillText(`Culled: ${stats.culledEntities}`, x, y + lineHeight * 2);
        ctx.fillText(`Ratio: ${stats.cullingRatio}`, x, y + lineHeight * 3);
        ctx.fillText(`Grid Visible`, x, y + lineHeight * 4);
        
        ctx.restore();
    }
}