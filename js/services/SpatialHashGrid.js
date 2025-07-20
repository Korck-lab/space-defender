// js/services/SpatialHashGrid.js

/**
 * Spatial Hash Grid for optimized collision detection
 * Reduces collision checks from O(n*m) to O(k) where k << n*m
 */
export class SpatialHashGrid {
    constructor(cellSize = 64) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.entityCells = new Map(); // Track which cells each entity occupies
    }

    /**
     * Clear the grid for the next frame
     */
    clear() {
        this.grid.clear();
        this.entityCells.clear();
    }

    /**
     * Get cell key for given coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} Cell key
     */
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Get all cell keys that an entity occupies
     * @param {Object} entity - Entity with x, y, width, height properties
     * @returns {Array<string>} Array of cell keys
     */
    getEntityCellKeys(entity) {
        const cellKeys = [];
        
        const startX = Math.floor(entity.x / this.cellSize);
        const endX = Math.floor((entity.x + entity.width) / this.cellSize);
        const startY = Math.floor(entity.y / this.cellSize);
        const endY = Math.floor((entity.y + entity.height) / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                cellKeys.push(`${x},${y}`);
            }
        }

        return cellKeys;
    }

    /**
     * Insert entity into the spatial grid
     * @param {Object} entity - Entity to insert
     */
    insert(entity) {
        const cellKeys = this.getEntityCellKeys(entity);
        this.entityCells.set(entity, cellKeys);

        cellKeys.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            this.grid.get(cellKey).push(entity);
        });
    }

    /**
     * Get potential collision candidates for an entity
     * @param {Object} entity - Entity to check
     * @returns {Array} Array of potential collision entities
     */
    getNeighbors(entity) {
        const neighbors = new Set();
        const cellKeys = this.getEntityCellKeys(entity);

        cellKeys.forEach(cellKey => {
            const cellEntities = this.grid.get(cellKey);
            if (cellEntities) {
                cellEntities.forEach(neighbor => {
                    if (neighbor !== entity) {
                        neighbors.add(neighbor);
                    }
                });
            }
        });

        return Array.from(neighbors);
    }

    /**
     * Query entities in a specific region
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width of query region
     * @param {number} height - Height of query region
     * @returns {Array} Array of entities in the region
     */
    queryRegion(x, y, width, height) {
        const entities = new Set();
        
        const startX = Math.floor(x / this.cellSize);
        const endX = Math.floor((x + width) / this.cellSize);
        const startY = Math.floor(y / this.cellSize);
        const endY = Math.floor((y + height) / this.cellSize);

        for (let cellX = startX; cellX <= endX; cellX++) {
            for (let cellY = startY; cellY <= endY; cellY++) {
                const cellKey = `${cellX},${cellY}`;
                const cellEntities = this.grid.get(cellKey);
                if (cellEntities) {
                    cellEntities.forEach(entity => entities.add(entity));
                }
            }
        }

        return Array.from(entities);
    }

    /**
     * Get statistics about the grid for debugging
     * @returns {Object} Grid statistics
     */
    getStats() {
        const totalCells = this.grid.size;
        const totalEntities = Array.from(this.entityCells.keys()).length;
        const cellOccupancy = Array.from(this.grid.values()).map(cell => cell.length);
        const maxEntitiesPerCell = Math.max(...cellOccupancy, 0);
        const avgEntitiesPerCell = cellOccupancy.length > 0 
            ? cellOccupancy.reduce((sum, count) => sum + count, 0) / cellOccupancy.length 
            : 0;

        return {
            totalCells,
            totalEntities,
            maxEntitiesPerCell,
            avgEntitiesPerCell: avgEntitiesPerCell.toFixed(2),
            cellSize: this.cellSize
        };
    }

    /**
     * Visualize the grid for debugging (optional)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    debugDraw(ctx, canvasWidth, canvasHeight) {
        ctx.save();
        
        // Reset any transformations to ensure consistent positioning
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;

        // Draw grid lines
        for (let x = 0; x < canvasWidth; x += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }

        for (let y = 0; y < canvasHeight; y += this.cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }

        // Highlight occupied cells
        ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        this.grid.forEach((entities, cellKey) => {
            if (entities.length > 0) {
                const [cellX, cellY] = cellKey.split(',').map(Number);
                const x = cellX * this.cellSize;
                const y = cellY * this.cellSize;
                ctx.fillRect(x, y, this.cellSize, this.cellSize);
            }
        });

        ctx.restore();
    }
}