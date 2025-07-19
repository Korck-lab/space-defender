// js/entities/base/Entity.js

/**
 * Base entity class for all game objects
 * Provides common functionality for position, collision, and lifecycle management
 */
export class Entity {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.active = true;
        this.rotation = 0;
        
        // Physics properties (optional)
        this.velocityX = 0;
        this.velocityY = 0;
        this.accelerationX = 0;
        this.accelerationY = 0;
        this.angularVelocity = 0;
        this.friction = 1.0;
        this.mass = 1;
        
        // Lifecycle tracking
        this.age = 0;
        this.maxAge = Infinity;
        
        // Visual properties
        this.alpha = 1.0;
        this.scale = 1.0;
        this.visible = true;
    }

    /**
     * Update entity state
     * @param {number} deltaTime - Time since last frame
     * @param {...any} args - Additional arguments for specific entity types
     */
    update(deltaTime, ...args) {
        this.age += deltaTime;
        
        if (this.age >= this.maxAge) {
            this.active = false;
        }
    }

    /**
     * Draw the entity (to be overridden by subclasses)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        // Default drawing implementation
        if (!this.visible) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // Apply rotation if needed
        if (this.rotation !== 0) {
            ctx.translate(this.getCenterX(), this.getCenterY());
            ctx.rotate(this.rotation);
            ctx.translate(-this.getCenterX(), -this.getCenterY());
        }
        
        // Apply scale if needed
        if (this.scale !== 1.0) {
            ctx.scale(this.scale, this.scale);
        }
        
        // Draw basic rectangle
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.restore();
    }

    /**
     * Check if entity is outside the screen boundaries
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} margin - Extra margin for boundary check
     * @returns {boolean} True if entity is offscreen
     */
    isOffscreen(canvasWidth, canvasHeight, margin = 50) {
        return (
            this.x < -margin ||
            this.x > canvasWidth + margin ||
            this.y < -margin ||
            this.y > canvasHeight + margin + this.height
        );
    }

    /**
     * Set entity rotation
     * @param {number} rotation - Rotation in radians
     */
    setRotation(rotation) {
        this.rotation = rotation;
    }

    /**
     * Get center X coordinate
     * @returns {number} Center X position
     */
    getCenterX() {
        return this.x + this.width / 2.0;
    }

    /**
     * Get center Y coordinate
     * @returns {number} Center Y position
     */
    getCenterY() {
        return this.y + this.height / 2.0;
    }

    /**
     * Get bottom Y coordinate
     * @returns {number} Bottom Y position
     */
    getBottom() {
        return this.y + this.height;
    }

    /**
     * Get top Y coordinate
     * @returns {number} Top Y position
     */
    getTop() {
        return this.y;
    }

    /**
     * Get left X coordinate
     * @returns {number} Left X position
     */
    getLeft() {
        return this.x;
    }

    /**
     * Get right X coordinate
     * @returns {number} Right X position
     */
    getRight() {
        return this.x + this.width;
    }

    /**
     * Get axis-aligned bounding box
     * @returns {Object} Bounding box with left, right, top, bottom properties
     */
    getBoundingBox() {
        return {
            left: this.getLeft(),
            right: this.getRight(),
            top: this.getTop(),
            bottom: this.getBottom(),
        };
    }

    /**
     * Get rotated rectangle corners
     * @returns {Array} Array of corner points after rotation
     */
    getRotatedRect() {
        const centerX = this.getCenterX();
        const centerY = this.getCenterY();
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        const corners = [
            { x: -halfWidth, y: -halfHeight }, // Top-left relative to center
            { x: halfWidth, y: -halfHeight },  // Top-right relative to center
            { x: halfWidth, y: halfHeight },   // Bottom-right relative to center
            { x: -halfWidth, y: halfHeight },  // Bottom-left relative to center
        ];

        const rotatedCorners = corners.map((corner) => {
            // Apply 2D rotation formula
            const rotatedRelX = corner.x * cos - corner.y * sin;
            const rotatedRelY = corner.x * sin + corner.y * cos;

            // Add center coordinates back to get absolute position
            return {
                x: rotatedRelX + centerX,
                y: rotatedRelY + centerY,
            };
        });
        
        return rotatedCorners;
    }

    /**
     * Calculate the coordinates of the center-bottom point after rotation
     * @returns {Object} Rotated center-bottom coordinates {x, y}
     */
    getRotatedCenterBottom() {
        const centerX = this.getCenterX();
        const centerY = this.getCenterY();
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        // Coordinates of the center-bottom point relative to the entity's center
        const relX = 0;
        const relY = this.height / 2;

        // Apply 2D rotation formula
        const rotatedRelX = relX * cos - relY * sin;
        const rotatedRelY = relX * sin + relY * cos;

        // Add center coordinates back to get final absolute position
        const finalX = rotatedRelX + centerX;
        const finalY = rotatedRelY + centerY;
        
        return { x: finalX, y: finalY };
    }

    /**
     * Check collision with another entity
     * @param {Entity} other - Other entity to check collision with
     * @returns {boolean} True if entities are colliding
     */
    collidesWith(other) {
        // Simple AABB collision detection
        return !(
            this.getRight() < other.getLeft() ||
            this.getLeft() > other.getRight() ||
            this.getBottom() < other.getTop() ||
            this.getTop() > other.getBottom()
        );
    }

    /**
     * Calculate distance to another entity
     * @param {Entity} other - Other entity
     * @returns {number} Distance between entity centers
     */
    distanceTo(other) {
        const dx = this.getCenterX() - other.getCenterX();
        const dy = this.getCenterY() - other.getCenterY();
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate angle to another entity
     * @param {Entity} other - Other entity
     * @returns {number} Angle in radians
     */
    angleTo(other) {
        const dx = other.getCenterX() - this.getCenterX();
        const dy = other.getCenterY() - this.getCenterY();
        return Math.atan2(dy, dx);
    }

    /**
     * Move entity towards another entity
     * @param {Entity} target - Target entity
     * @param {number} speed - Movement speed
     * @param {number} deltaTime - Time since last frame
     */
    moveTowards(target, speed, deltaTime) {
        const angle = this.angleTo(target);
        this.x += Math.cos(angle) * speed * deltaTime;
        this.y += Math.sin(angle) * speed * deltaTime;
    }

    /**
     * Set entity position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Set entity size
     * @param {number} width - Width
     * @param {number} height - Height
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * Set entity velocity
     * @param {number} vx - X velocity
     * @param {number} vy - Y velocity
     */
    setVelocity(vx, vy) {
        this.velocityX = vx;
        this.velocityY = vy;
    }

    /**
     * Add velocity to current velocity
     * @param {number} vx - X velocity to add
     * @param {number} vy - Y velocity to add
     */
    addVelocity(vx, vy) {
        this.velocityX += vx;
        this.velocityY += vy;
    }

    /**
     * Get current velocity as vector
     * @returns {Object} Velocity vector {x, y}
     */
    getVelocity() {
        return {
            x: this.velocityX,
            y: this.velocityY
        };
    }

    /**
     * Get current speed (magnitude of velocity)
     * @returns {number} Current speed
     */
    getSpeed() {
        return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    }

    /**
     * Destroy the entity (mark as inactive)
     */
    destroy() {
        this.active = false;
    }

    /**
     * Reset entity to initial state (to be overridden by subclasses)
     */
    reset() {
        this.active = true;
        this.age = 0;
        this.alpha = 1.0;
        this.scale = 1.0;
        this.visible = true;
        this.rotation = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.accelerationX = 0;
        this.accelerationY = 0;
        this.angularVelocity = 0;
    }

    /**
     * Clone this entity (shallow copy)
     * @returns {Entity} Cloned entity
     */
    clone() {
        const cloned = new this.constructor();
        Object.assign(cloned, this);
        return cloned;
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            type: this.constructor.name,
            position: { x: this.x, y: this.y },
            size: { width: this.width, height: this.height },
            velocity: { x: this.velocityX, y: this.velocityY },
            rotation: this.rotation,
            active: this.active,
            age: this.age
        };
    }
}