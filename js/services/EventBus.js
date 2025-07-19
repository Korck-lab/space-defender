// js/services/EventBus.js

/**
 * Event-driven communication system for decoupling game components
 * Replaces direct method calls with event emission/listening
 */
export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }

    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Optional context for 'this' binding
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push({
            callback,
            context
        });
    }

    /**
     * Register a one-time event listener (auto-removes after first trigger)
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Optional context for 'this' binding
     */
    once(event, callback, context = null) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        
        this.onceListeners.get(event).push({
            callback,
            context
        });
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.findIndex(listener => listener.callback === callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
            
            // Clean up empty arrays
            if (listeners.length === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Emit an event to all registered listeners
     * @param {string} event - Event name
     * @param {*} data - Data to pass to listeners
     */
    emit(event, data = null) {
        // Handle regular listeners
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            listeners.forEach(({ callback, context }) => {
                try {
                    if (context) {
                        callback.call(context, data);
                    } else {
                        callback(data);
                    }
                } catch (error) {
                    console.error(`Error in event listener for '${event}':`, error);
                }
            });
        }

        // Handle once listeners
        if (this.onceListeners.has(event)) {
            const onceListeners = this.onceListeners.get(event);
            onceListeners.forEach(({ callback, context }) => {
                try {
                    if (context) {
                        callback.call(context, data);
                    } else {
                        callback(data);
                    }
                } catch (error) {
                    console.error(`Error in once listener for '${event}':`, error);
                }
            });
            
            // Clear once listeners after execution
            this.onceListeners.delete(event);
        }
    }

    /**
     * Remove all listeners for a specific event
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        this.listeners.delete(event);
        this.onceListeners.delete(event);
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.listeners.clear();
        this.onceListeners.clear();
    }

    /**
     * Get the number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        const regularCount = this.listeners.has(event) ? this.listeners.get(event).length : 0;
        const onceCount = this.onceListeners.has(event) ? this.onceListeners.get(event).length : 0;
        return regularCount + onceCount;
    }

    /**
     * Get all registered event names
     * @returns {Array<string>} Array of event names
     */
    getEventNames() {
        return [
            ...new Set([
                ...this.listeners.keys(),
                ...this.onceListeners.keys()
            ])
        ];
    }
}

// Event name constants to prevent typos and provide better IDE support
export const GAME_EVENTS = {
    // Game state events
    GAME_START: 'game.start',
    GAME_PAUSE: 'game.pause',
    GAME_RESUME: 'game.resume',
    GAME_OVER: 'game.over',
    LEVEL_UP: 'game.levelUp',
    
    // Score events
    SCORE_UPDATE: 'score.update',
    SCORE_ADD: 'score.add',
    HIGH_SCORE_UPDATE: 'score.highScore.update',
    
    // Player events
    PLAYER_DAMAGED: 'player.damaged',
    PLAYER_DIED: 'player.died',
    PLAYER_RESPAWN: 'player.respawn',
    PLAYER_SHOOT: 'player.shoot',
    PLAYER_POWER_UP: 'player.powerUp',
    PLAYER_LIVES_CHANGED: 'player.livesChanged',
    
    // Entity events
    ENTITY_CREATED: 'entity.created',
    ENTITY_DESTROYED: 'entity.destroyed',
    ALIEN_DESTROYED: 'alien.destroyed',
    BULLET_FIRED: 'bullet.fired',
    
    // Ability events
    ABILITY_UNLOCKED: 'ability.unlocked',
    ABILITY_ACTIVATED: 'ability.activated',
    ABILITY_COOLDOWN_START: 'ability.cooldown.start',
    ABILITY_COOLDOWN_END: 'ability.cooldown.end',
    
    // Collision events
    COLLISION_DETECTED: 'collision.detected',
    EXPLOSION_CREATED: 'explosion.created',
    
    // UI events
    UI_UPDATE: 'ui.update',
    UI_SHOW_MESSAGE: 'ui.showMessage',
    UI_HIDE_MESSAGE: 'ui.hideMessage',
    
    // Audio events
    AUDIO_PLAY_SOUND: 'audio.playSound',
    AUDIO_PLAY_MUSIC: 'audio.playMusic',
    AUDIO_STOP_MUSIC: 'audio.stopMusic',
    
    // Item events
    ITEM_COLLECTED: 'item.collected',
    POWERUP_SPAWNED: 'powerup.spawned'
};