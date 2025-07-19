// js/services/StateService.js

import { GAME_CONFIG } from '../config.js';
import { GAME_EVENTS } from './EventBus.js';

/**
 * Manages game state, scoring, levels, and persistence
 * Extracted from Game.js to improve separation of concerns
 */
export class StateService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // Game state
        this.state = this.createInitialState();
        
        // State history for debugging/replay
        this.stateHistory = [];
        this.maxHistorySize = 100;
        
        // Performance tracking
        this.startTime = 0;
        this.sessionStats = this.createSessionStats();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Create the initial game state
     * @returns {Object} Initial state object
     */
    createInitialState() {
        return {
            // Game flow
            running: false,
            paused: false,
            gameOver: false,
            
            // Player progress
            score: 0,
            level: 1,
            lives: GAME_CONFIG.player.initialLives,
            
            // Player power progression
            bulletPower: 1,
            killCount: 0,
            
            // Ability system
            abilities: {
                rocket: { unlocked: false, cooldown: 0, active: false },
                wingman: { unlocked: false, cooldown: 0, active: false },
                miniShip: { unlocked: false, cooldown: 0, active: false }
            },
            
            // Level progression
            levelProgress: {
                scoreForNextLevel: this.calculateScoreForLevel(2),
                aliensDefeated: 0,
                timeInLevel: 0
            },
            
            // High scores
            highScores: this.loadHighScores(),
            
            // Session data
            sessionStartTime: Date.now(),
            totalPlayTime: 0,
            
            // Game settings
            settings: {
                musicEnabled: true,
                soundEnabled: true,
                volume: 1.0
            }
        };
    }

    /**
     * Create initial session statistics
     * @returns {Object} Session stats object
     */
    createSessionStats() {
        return {
            gamesPlayed: 0,
            totalScore: 0,
            highestLevel: 1,
            aliensDefeated: 0,
            shotsfired: 0,
            accuracy: 0,
            timeAlive: 0,
            abilitiesUsed: 0
        };
    }

    /**
     * Setup event listeners for state-related events
     */
    setupEventListeners() {
        // Game flow events
        this.eventBus.on(GAME_EVENTS.GAME_START, this.handleGameStart.bind(this));
        this.eventBus.on(GAME_EVENTS.GAME_PAUSE, this.handleGamePause.bind(this));
        this.eventBus.on(GAME_EVENTS.GAME_RESUME, this.handleGameResume.bind(this));
        this.eventBus.on(GAME_EVENTS.GAME_OVER, this.handleGameOver.bind(this));
        
        // Score events
        this.eventBus.on(GAME_EVENTS.SCORE_ADD, this.handleScoreAdd.bind(this));
        this.eventBus.on(GAME_EVENTS.ALIEN_DESTROYED, this.handleAlienDestroyed.bind(this));
        
        // Player events
        this.eventBus.on(GAME_EVENTS.PLAYER_DAMAGED, this.handlePlayerDamaged.bind(this));
        this.eventBus.on(GAME_EVENTS.PLAYER_DIED, this.handlePlayerDied.bind(this));
        this.eventBus.on(GAME_EVENTS.PLAYER_POWER_UP, this.handlePlayerPowerUp.bind(this));
        this.eventBus.on(GAME_EVENTS.PLAYER_SHOOT, this.handlePlayerShoot.bind(this));
        
        // Ability events
        this.eventBus.on(GAME_EVENTS.ABILITY_ACTIVATED, this.handleAbilityActivated.bind(this));
        this.eventBus.on(GAME_EVENTS.ABILITY_UNLOCKED, this.handleAbilityUnlocked.bind(this));
        
        // Item events
        this.eventBus.on(GAME_EVENTS.ITEM_COLLECTED, this.handleItemCollected.bind(this));
    }

    /**
     * Update game state
     * @param {number} deltaTime - Time since last frame
     */
    updateState(deltaTime) {
        if (!this.state.running || this.state.paused) {
            return;
        }
        
        // Update time tracking
        this.state.totalPlayTime += deltaTime;
        this.state.levelProgress.timeInLevel += deltaTime;
        this.sessionStats.timeAlive += deltaTime;
        
        // Update ability cooldowns
        this.updateAbilityCooldowns(deltaTime);
        
        // Check for level progression
        this.checkLevelProgression();
        
        // Update session statistics
        this.updateSessionStats(deltaTime);
        
        // Save state to history periodically
        if (this.stateHistory.length === 0 || 
            Date.now() - this.stateHistory[this.stateHistory.length - 1].timestamp > 1000) {
            this.saveStateToHistory();
        }
    }

    /**
     * Update ability cooldowns
     * @param {number} deltaTime - Time since last frame
     */
    updateAbilityCooldowns(deltaTime) {
        Object.keys(this.state.abilities).forEach(abilityName => {
            const ability = this.state.abilities[abilityName];
            
            if (ability.cooldown > 0) {
                ability.cooldown = Math.max(0, ability.cooldown - deltaTime);
                
                if (ability.cooldown === 0) {
                    this.eventBus.emit(GAME_EVENTS.ABILITY_COOLDOWN_END, {
                        ability: abilityName
                    });
                }
            }
        });
    }

    /**
     * Check if player should level up
     */
    checkLevelProgression() {
        const currentScore = this.state.score;
        const requiredScore = this.state.levelProgress.scoreForNextLevel;
        
        if (currentScore >= requiredScore) {
            this.levelUp();
        }
    }

    /**
     * Handle level up
     */
    levelUp() {
        this.state.level++;
        this.state.levelProgress.scoreForNextLevel = this.calculateScoreForLevel(this.state.level + 1);
        this.state.levelProgress.timeInLevel = 0;
        
        // Update session stats
        this.sessionStats.highestLevel = Math.max(this.sessionStats.highestLevel, this.state.level);
        
        this.eventBus.emit(GAME_EVENTS.LEVEL_UP, {
            level: this.state.level,
            nextLevelScore: this.state.levelProgress.scoreForNextLevel
        });
        
        // Check for ability unlocks
        this.checkAbilityUnlocks();
    }

    /**
     * Calculate score required for a specific level
     * @param {number} level - Target level
     * @returns {number} Required score
     */
    calculateScoreForLevel(level) {
        return Math.round(
            GAME_CONFIG.levelScoreBase * 
            Math.pow(GAME_CONFIG.levelScoreExponent, level - 1)
        );
    }

    /**
     * Check for ability unlocks based on current score
     */
    checkAbilityUnlocks() {
        const score = this.state.score;
        
        // Check rocket unlock
        if (!this.state.abilities.rocket.unlocked && 
            score >= GAME_CONFIG.unlockSystem.rocketUnlockScore) {
            this.unlockAbility('rocket');
        }
        
        // Check wingman unlock
        if (!this.state.abilities.wingman.unlocked && 
            score >= GAME_CONFIG.unlockSystem.wingmanUnlockScore) {
            this.unlockAbility('wingman');
        }
        
        // Check mini ship unlock
        if (!this.state.abilities.miniShip.unlocked && 
            score >= GAME_CONFIG.unlockSystem.miniShipUnlockScore) {
            this.unlockAbility('miniShip');
        }
    }

    /**
     * Unlock an ability
     * @param {string} abilityName - Name of ability to unlock
     */
    unlockAbility(abilityName) {
        if (this.state.abilities[abilityName]) {
            this.state.abilities[abilityName].unlocked = true;
            
            this.eventBus.emit(GAME_EVENTS.ABILITY_UNLOCKED, {
                ability: abilityName,
                level: this.state.level,
                score: this.state.score
            });
        }
    }

    /**
     * Update session statistics
     * @param {number} deltaTime - Time since last frame
     */
    updateSessionStats(deltaTime) {
        // Calculate accuracy
        if (this.sessionStats.shotsired > 0) {
            this.sessionStats.accuracy = 
                (this.sessionStats.aliensDefeated / this.sessionStats.shotsFired) * 100;
        }
    }

    /**
     * Handle game start event
     */
    handleGameStart() {
        this.state.running = true;
        this.state.paused = false;
        this.state.gameOver = false;
        this.startTime = performance.now();
        this.sessionStats.gamesPlayed++;
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'gameState',
            state: this.getUIState()
        });
    }

    /**
     * Handle game pause event
     */
    handleGamePause() {
        this.state.paused = true;
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'pause',
            state: this.getUIState()
        });
    }

    /**
     * Handle game resume event
     */
    handleGameResume() {
        this.state.paused = false;
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'resume',
            state: this.getUIState()
        });
    }

    /**
     * Handle game over event
     */
    handleGameOver() {
        this.state.running = false;
        this.state.gameOver = true;
        
        // Update high scores
        this.updateHighScores(this.state.score);
        
        // Update session stats
        this.sessionStats.totalScore += this.state.score;
        
        this.eventBus.emit(GAME_EVENTS.HIGH_SCORE_UPDATE, {
            score: this.state.score,
            highScores: this.state.highScores,
            isNewHighScore: this.isNewHighScore(this.state.score)
        });
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'gameOver',
            state: this.getUIState(),
            sessionStats: this.sessionStats
        });
    }

    /**
     * Handle score addition
     * @param {Object} scoreData - Score event data
     */
    handleScoreAdd(scoreData) {
        const previousScore = this.state.score;
        this.state.score += scoreData.amount;
        
        // Check for level progression
        this.checkLevelProgression();
        
        // Check for ability unlocks
        this.checkAbilityUnlocks();
        
        this.eventBus.emit(GAME_EVENTS.SCORE_UPDATE, {
            score: this.state.score,
            previous: previousScore,
            added: scoreData.amount
        });
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'score',
            score: this.state.score
        });
    }

    /**
     * Handle alien destroyed event
     * @param {Object} alienData - Alien destruction data
     */
    handleAlienDestroyed(alienData) {
        this.state.levelProgress.aliensDefeated++;
        this.sessionStats.aliensDefeated++;
        
        // Add score for alien
        if (alienData.alien && alienData.alien.points) {
            this.handleScoreAdd({ amount: alienData.alien.points });
        }
        
        // Check for bullet power up
        this.state.killCount++;
        
        if (this.state.killCount % GAME_CONFIG.killsPerPowerUp === 0) {
            this.handlePlayerPowerUp();
        }
    }

    /**
     * Handle player damaged event
     * @param {Object} damageData - Damage event data
     */
    handlePlayerDamaged(damageData) {
        // This is handled by the player entity, but we track it for stats
        console.log('Player took damage:', damageData);
    }

    /**
     * Handle player death event
     */
    handlePlayerDied() {
        this.state.lives--;
        
        if (this.state.lives <= 0) {
            this.eventBus.emit(GAME_EVENTS.GAME_OVER);
        } else {
            this.eventBus.emit(GAME_EVENTS.PLAYER_RESPAWN, {
                lives: this.state.lives
            });
        }
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'lives',
            lives: this.state.lives
        });
    }

    /**
     * Handle player power up event
     */
    handlePlayerPowerUp() {
        const maxPower = GAME_CONFIG.maxBulletPowerLevel;
        
        if (this.state.bulletPower < maxPower) {
            this.state.bulletPower++;
            
            this.eventBus.emit(GAME_EVENTS.PLAYER_POWER_UP, {
                power: this.state.bulletPower,
                maxPower
            });
            
            this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
                type: 'bulletPower',
                power: this.state.bulletPower,
                maxPower
            });
        }
    }

    /**
     * Handle player shoot event
     */
    handlePlayerShoot() {
        this.sessionStats.shotsFired++;
    }

    /**
     * Handle ability activated event
     * @param {Object} abilityData - Ability activation data
     */
    handleAbilityActivated(abilityData) {
        const abilityName = abilityData.ability;
        const ability = this.state.abilities[abilityName];
        
        if (ability && ability.unlocked && ability.cooldown <= 0) {
            ability.cooldown = GAME_CONFIG.abilities[abilityName].maxCooldown;
            ability.active = true;
            
            this.sessionStats.abilitiesUsed++;
            
            this.eventBus.emit(GAME_EVENTS.ABILITY_COOLDOWN_START, {
                ability: abilityName,
                cooldown: ability.cooldown
            });
            
            // Handle duration-based abilities
            const duration = GAME_CONFIG.abilities[abilityName].duration;
            if (duration > 0) {
                setTimeout(() => {
                    ability.active = false;
                }, duration);
            } else {
                // Instant abilities
                ability.active = false;
            }
        }
    }

    /**
     * Handle ability unlocked event
     * @param {Object} abilityData - Ability unlock data
     */
    handleAbilityUnlocked(abilityData) {
        console.log(`Ability unlocked: ${abilityData.ability}`);
    }

    /**
     * Handle item collected event
     * @param {Object} itemData - Item collection data
     */
    handleItemCollected(itemData) {
        const item = itemData.item;
        
        switch (item.type) {
            case 'xp':
                this.handleScoreAdd({ amount: item.value });
                break;
                
            case 'life':
                if (this.state.lives < GAME_CONFIG.player.maxLives) {
                    this.state.lives++;
                    
                    this.eventBus.emit(GAME_EVENTS.PLAYER_LIVES_CHANGED, {
                        lives: this.state.lives
                    });
                    
                    this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
                        type: 'lives',
                        lives: this.state.lives
                    });
                }
                break;
                
            case 'bomb':
                // Handle bomb effect
                this.eventBus.emit(GAME_EVENTS.EXPLOSION_CREATED, {
                    x: item.x,
                    y: item.y,
                    radius: GAME_CONFIG.items.bombEffectRadius,
                    damage: GAME_CONFIG.items.bombDamage,
                    color: 'orange'
                });
                break;
                
            case 'rocket':
            case 'wingman':
            case 'miniShip':
                // Auto-activate ability items
                this.eventBus.emit(GAME_EVENTS.ABILITY_ACTIVATED, {
                    ability: item.type
                });
                break;
        }
    }

    /**
     * Load high scores from localStorage
     * @returns {Array} Array of high scores
     */
    loadHighScores() {
        try {
            const stored = localStorage.getItem(GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading high scores:', error);
            return [];
        }
    }

    /**
     * Save high scores to localStorage
     */
    saveHighScores() {
        try {
            localStorage.setItem(
                GAME_CONFIG.LOCAL_STORAGE_HISCORE_KEY,
                JSON.stringify(this.state.highScores)
            );
        } catch (error) {
            console.error('Error saving high scores:', error);
        }
    }

    /**
     * Update high scores with new score
     * @param {number} score - New score to add
     */
    updateHighScores(score) {
        this.state.highScores.push(score);
        this.state.highScores.sort((a, b) => b - a);
        
        // Keep only top 10 scores
        this.state.highScores = this.state.highScores.slice(0, 10);
        
        this.saveHighScores();
    }

    /**
     * Check if score is a new high score
     * @param {number} score - Score to check
     * @returns {boolean} True if it's a new high score
     */
    isNewHighScore(score) {
        return this.state.highScores.length === 0 || score > this.state.highScores[0];
    }

    /**
     * Save current state to history
     */
    saveStateToHistory() {
        const stateSnapshot = {
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify(this.state)) // Deep copy
        };
        
        this.stateHistory.push(stateSnapshot);
        
        // Limit history size
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
    }

    /**
     * Get UI-specific state data
     * @returns {Object} UI state object
     */
    getUIState() {
        return {
            running: this.state.running,
            paused: this.state.paused,
            gameOver: this.state.gameOver,
            score: this.state.score,
            level: this.state.level,
            lives: this.state.lives,
            bulletPower: this.state.bulletPower,
            maxBulletPower: GAME_CONFIG.maxBulletPowerLevel,
            abilities: this.state.abilities,
            highScores: this.state.highScores,
            levelProgress: this.state.levelProgress
        };
    }

    /**
     * Get current game state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get session statistics
     * @returns {Object} Session stats
     */
    getSessionStats() {
        return { ...this.sessionStats };
    }

    /**
     * Get state history
     * @returns {Array} State history
     */
    getStateHistory() {
        return [...this.stateHistory];
    }

    /**
     * Reset game state to initial values
     */
    resetState() {
        this.state = this.createInitialState();
        this.stateHistory = [];
        this.sessionStats = this.createSessionStats();
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'reset',
            state: this.getUIState()
        });
    }

    /**
     * Set specific state values
     * @param {Object} newState - State values to set
     */
    setState(newState) {
        Object.assign(this.state, newState);
        
        this.eventBus.emit(GAME_EVENTS.UI_UPDATE, {
            type: 'stateUpdate',
            state: this.getUIState()
        });
    }

    /**
     * Get debug information
     * @returns {Object} Debug info
     */
    getDebugInfo() {
        return {
            state: this.state,
            sessionStats: this.sessionStats,
            historySize: this.stateHistory.length,
            lastUpdate: this.stateHistory.length > 0 ? 
                this.stateHistory[this.stateHistory.length - 1].timestamp : null
        };
    }
}