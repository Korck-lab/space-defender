// js/services/PerformanceMonitor.js

/**
 * Performance monitoring service for tracking game performance metrics
 */
export class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameTime = 0;
        this.avgFrameTime = 0;
        this.maxFrameTime = 0;
        this.minFrameTime = Infinity;
        
        // Performance history for averaging
        this.frameTimeHistory = [];
        this.historySize = 60; // Track last 60 frames
        
        // Metrics
        this.collisionChecks = 0;
        this.entitiesRendered = 0;
        this.entitiesCulled = 0;
        this.memoryUsage = 0;
        
        // Benchmarking
        this.benchmarks = new Map();
    }

    /**
     * Update performance metrics - call this every frame
     * @param {number} timestamp - Current timestamp
     */
    update(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.frameCount++;
        
        // Calculate frame time
        this.frameTime = deltaTime;
        this.frameTimeHistory.push(deltaTime);
        
        if (this.frameTimeHistory.length > this.historySize) {
            this.frameTimeHistory.shift();
        }
        
        // Update min/max frame times
        this.maxFrameTime = Math.max(this.maxFrameTime, deltaTime);
        this.minFrameTime = Math.min(this.minFrameTime, deltaTime);
        
        // Calculate average frame time
        this.avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
        
        // Calculate FPS
        this.fps = Math.round(1000 / this.avgFrameTime);
        
        // Update memory usage if available
        if (performance.memory) {
            this.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        
        // Reset frame-specific counters
        this.collisionChecks = 0;
        this.entitiesRendered = 0;
        this.entitiesCulled = 0;
    }

    /**
     * Start a performance benchmark
     * @param {string} label - Benchmark label
     */
    startBenchmark(label) {
        this.benchmarks.set(label, {
            startTime: performance.now(),
            endTime: null,
            duration: 0
        });
    }

    /**
     * End a performance benchmark
     * @param {string} label - Benchmark label
     * @returns {number} Duration in milliseconds
     */
    endBenchmark(label) {
        const benchmark = this.benchmarks.get(label);
        if (benchmark) {
            benchmark.endTime = performance.now();
            benchmark.duration = benchmark.endTime - benchmark.startTime;
            return benchmark.duration;
        }
        return 0;
    }

    /**
     * Get benchmark duration
     * @param {string} label - Benchmark label
     * @returns {number} Duration in milliseconds
     */
    getBenchmarkDuration(label) {
        const benchmark = this.benchmarks.get(label);
        return benchmark ? benchmark.duration : 0;
    }

    /**
     * Record collision check count
     * @param {number} count - Number of collision checks performed
     */
    recordCollisionChecks(count) {
        this.collisionChecks += count;
    }

    /**
     * Record rendering statistics
     * @param {number} rendered - Number of entities rendered
     * @param {number} culled - Number of entities culled
     */
    recordRenderingStats(rendered, culled) {
        this.entitiesRendered += rendered;
        this.entitiesCulled += culled;
    }

    /**
     * Get current performance statistics
     * @returns {Object} Performance statistics
     */
    getStats() {
        return {
            fps: this.fps,
            frameTime: {
                current: this.frameTime.toFixed(2),
                average: this.avgFrameTime.toFixed(2),
                min: this.minFrameTime.toFixed(2),
                max: this.maxFrameTime.toFixed(2)
            },
            memory: {
                used: this.memoryUsage.toFixed(1),
                available: performance.memory ? (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(1) : 'N/A'
            },
            rendering: {
                entitiesRendered: this.entitiesRendered,
                entitiesCulled: this.entitiesCulled,
                cullingRatio: this.entitiesRendered + this.entitiesCulled > 0 
                    ? ((this.entitiesCulled / (this.entitiesRendered + this.entitiesCulled)) * 100).toFixed(1) + '%'
                    : '0%'
            },
            collision: {
                checks: this.collisionChecks
            },
            benchmarks: Object.fromEntries(
                Array.from(this.benchmarks.entries()).map(([label, data]) => [
                    label, 
                    data.duration.toFixed(3) + 'ms'
                ])
            )
        };
    }

    /**
     * Reset performance statistics
     */
    reset() {
        this.frameCount = 0;
        this.maxFrameTime = 0;
        this.minFrameTime = Infinity;
        this.frameTimeHistory = [];
        this.benchmarks.clear();
    }

    /**
     * Check if performance is below acceptable thresholds
     * @returns {Object} Performance warnings
     */
    getPerformanceWarnings() {
        const warnings = [];
        
        if (this.fps < 30) {
            warnings.push(`Low FPS: ${this.fps}`);
        }
        
        if (this.avgFrameTime > 33.33) { // >30fps threshold
            warnings.push(`High frame time: ${this.avgFrameTime.toFixed(1)}ms`);
        }
        
        if (this.memoryUsage > 100) { // >100MB
            warnings.push(`High memory usage: ${this.memoryUsage.toFixed(1)}MB`);
        }
        
        return warnings;
    }

    /**
     * Draw performance overlay
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawOverlay(ctx, x = 10, y = 40) {
        const stats = this.getStats();
        const warnings = this.getPerformanceWarnings();
        
        ctx.save();
        
        // Reset any transformations to ensure consistent positioning
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Reset text alignment and baseline
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Fixed overlay dimensions to prevent shifting
        const lineHeight = 14;
        const padding = 8;
        const overlayWidth = 320;
        const overlayHeight = 180; // Fixed height to accommodate all possible content
        const maxY = y + overlayHeight - padding - lineHeight; // Maximum Y position for text
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - padding, y - padding, overlayWidth, overlayHeight);
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - padding, y - padding, overlayWidth, overlayHeight);
        
        ctx.font = '11px monospace';
        ctx.fillStyle = 'white';
        
        let currentY = y + 15; // Start text inside the overlay with proper padding
        
        // Performance stats
        ctx.fillStyle = '#00ff00'; // Green for title
        ctx.fillText(`Performance Monitor (F1 to toggle)`, x, currentY);
        currentY += lineHeight;
        
        ctx.fillStyle = 'white';
        ctx.fillText(`FPS: ${stats.fps}`, x, currentY);
        currentY += lineHeight;
        ctx.fillText(`Frame: ${stats.frameTime.current}ms (avg: ${stats.frameTime.average}ms)`, x, currentY);
        currentY += lineHeight;
        ctx.fillText(`Memory: ${stats.memory.used}MB`, x, currentY);
        currentY += lineHeight;
        ctx.fillText(`Rendered: ${stats.rendering.entitiesRendered}`, x, currentY);
        currentY += lineHeight;
        ctx.fillText(`Culled: ${stats.rendering.entitiesCulled} (${stats.rendering.cullingRatio})`, x, currentY);
        currentY += lineHeight;
        
        // Benchmarks
        if (Object.keys(stats.benchmarks).length > 0 && currentY < maxY) {
            ctx.fillStyle = '#ffff00'; // Yellow for benchmark title
            ctx.fillText(`Benchmarks:`, x, currentY);
            currentY += lineHeight;
            ctx.fillStyle = 'white';
            for (const [label, duration] of Object.entries(stats.benchmarks)) {
                if (currentY < maxY) {
                    ctx.fillText(`  ${label}: ${duration}`, x, currentY);
                    currentY += lineHeight;
                }
            }
        }
        
        // Warnings
        if (warnings.length > 0 && currentY < maxY) {
            ctx.fillStyle = '#ff6600'; // Orange for warnings
            ctx.fillText(`Warnings:`, x, currentY);
            currentY += lineHeight;
            warnings.forEach(warning => {
                if (currentY < maxY) {
                    ctx.fillText(`  ${warning}`, x, currentY);
                    currentY += lineHeight;
                }
            });
        }
        
        ctx.restore();
    }

    /**
     * Log performance statistics to console
     */
    logStats() {
        const stats = this.getStats();
        const warnings = this.getPerformanceWarnings();
        
        console.group('Performance Monitor');
        console.log('FPS:', stats.fps);
        console.log('Frame Time:', stats.frameTime);
        console.log('Memory:', stats.memory);
        console.log('Rendering:', stats.rendering);
        console.log('Collision Checks:', stats.collision.checks);
        
        if (Object.keys(stats.benchmarks).length > 0) {
            console.log('Benchmarks:', stats.benchmarks);
        }
        
        if (warnings.length > 0) {
            console.warn('Performance Warnings:', warnings);
        }
        
        console.groupEnd();
    }
}