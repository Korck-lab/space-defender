// js/game_refactored.js
// Refactored Game class using the new service architecture

import { GAME_CONFIG, GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { EventBus, GAME_EVENTS } from './services/EventBus.js';
import { RenderingService } from './services/RenderingService.js';
import { EntityService } from './services/EntityService.js';
import { PhysicsService } from './services/PhysicsService.js';
import { StateService } from './services/StateService.js';
import { UIManager } from './ui.js';
import { AbilityManager } from './abilities.js';
import { AudioManager } from './audio.js';
import { InputHandler } from './input.js';
import { checkCollisions as collisionService } from './services/CollisionService.js';
import { initStarfield, loadShipImage } from './drawing.js';
import { Player } from './entities/player/Player.js';

/**
 * Main Game class using the new service-based architecture
 * Coordinates between services rather than managing everything directly
 */
export class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Game dimensions
        this.width = GAME_WIDTH;
        this.height = GAME_HEIGHT;
        
        // Set up canvas
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.handleWindowResize();
        
        // Initialize event bus first (other services depend on it)
        this.eventBus = new EventBus();
        
        // Initialize core services
        this.renderingService = new RenderingService(canvas, ctx, this.eventBus);
        this.entityService = new EntityService(this.eventBus, this.width, this.height);
        this.physicsService = new PhysicsService(this.eventBus, this.width, this.height);
        this.stateService = new StateService(this.eventBus);
        
        // Initialize legacy managers (to be refactored later)
        this.uiManager = new UIManager();
        this.abilityManager = new AbilityManager(this.uiManager);
        this.audioManager = new AudioManager();
        this.inputHandler = new InputHandler();
        
        // Initialize player
        this.player = new Player(this.width, this.height);
        
        // Game loop properties
        this.running = false;
        this.paused = false;
        this.lastTimestamp = 0;
        this.animationFrameId = null;
        
        // Initialize graphics
        this.initializeGraphics();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup input handlers
        this.setupInputHandlers();
        
        console.log("Game initialized with new service architecture");
    }

    /**
     * Initialize graphics systems
     */
    initializeGraphics() {
        initStarfield(this.width, this.height);
        loadShipImage();
    }

    /**
     * Setup event listeners for game coordination
     */
    setupEventListeners() {
        // Game state events
        this.eventBus.on(GAME_EVENTS.GAME_START, this.handleGameStart.bind(this));
        this.eventBus.on(GAME_EVENTS.GAME_PAUSE, this.handleGamePause.bind(this));
        this.eventBus.on(GAME_EVENTS.GAME_RESUME, this.handleGameResume.bind(this));
        this.eventBus.on(GAME_EVENTS.GAME_OVER, this.handleGameOver.bind(this));
        
        // Player events
        this.eventBus.on(GAME_EVENTS.PLAYER_SHOOT, this.handlePlayerShoot.bind(this));
        this.eventBus.on(GAME_EVENTS.PLAYER_DIED, this.handlePlayerDied.bind(this));
        
        // UI update events
        this.eventBus.on(GAME_EVENTS.UI_UPDATE, this.handleUIUpdate.bind(this));
        
        // Ability events
        this.eventBus.on(GAME_EVENTS.ABILITY_ACTIVATED, this.handleAbilityActivated.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.handleWindowResize.bind(this));
    }

    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleMouseMove(x, y);
        });
        
        // Mouse click
        this.canvas.addEventListener('click', (e) => {
            this.handleMouseClick(e);
        });
        
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        // Touch support
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.handleMouseMove(x, y);
        });
    }

    /**
     * Start the game
     */
    start() {
        console.log("Starting game...");
        
        // Reset state
        this.stateService.resetState();
        
        // Reset player
        this.player.resetAfterDeath();
        
        // Clear entities
        this.entityService.clearAllEntities();
        
        // Start game loop
        this.running = true;
        this.paused = false;
        this.lastTimestamp = performance.now();
        
        // Emit game start event
        this.eventBus.emit(GAME_EVENTS.GAME_START);
        
        // Start game loop
        this.gameLoop(this.lastTimestamp);
        
        // Start audio
        this.audioManager.playIntroMusic().catch(e => 
            console.error("Failed to start audio:", e)
        );
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (!this.running) return;
        
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        // Update game state
        this.update(deltaTime);
        
        // Render frame
        this.render(deltaTime);
        
        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Update game logic
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (this.paused) return;
        
        // Update state service
        this.stateService.updateState(deltaTime);
        
        // Update player
        this.player.update(deltaTime, this.width);
        
        // Create game state for services
        const gameState = this.createGameState();
        
        // Update physics
        this.physicsService.updatePhysics(deltaTime, gameState);
        
        // Update entities
        this.entityService.updateEntities(deltaTime, gameState);
        
        // Handle collisions
        this.handleCollisions();
        
        // Update legacy managers
        this.abilityManager.update(deltaTime);
        
        // Handle player shooting
        this.handlePlayerShooting(timestamp);
    }

    /**
     * Render the game
     * @param {number} deltaTime - Time since last frame
     */
    render(deltaTime) {
        const gameState = this.createGameState();
        this.renderingService.render(gameState, deltaTime);
    }

    /**
     * Create game state object for services
     * @returns {Object} Current game state
     */
    createGameState() {
        const state = this.stateService.getState();
        
        return {
            // Game state
            running: this.running,
            paused: this.paused,
            
            // State service data
            ...state,
            
            // Player
            player: this.player,
            
            // Entities
            entities: {
                bullets: this.entityService.getEntities('bullets'),
                rockets: this.entityService.getEntities('rockets'),
                aliens: this.entityService.getEntities('aliens'),
                items: this.entityService.getEntities('items'),
                wingmen: this.entityService.getEntities('wingmen'),
                miniShips: this.entityService.getEntities('miniShips'),
                debris: this.entityService.getEntities('debris')
            },
            
            // Managers
            particleManager: null, // TODO: Move to service
            inputHandler: this.inputHandler,
            
            // Canvas dimensions
            width: this.width,
            height: this.height
        };
    }

    /**
     * Handle collisions using the collision service
     */
    handleCollisions() {
        const gameState = this.createGameState();
        
        // Use the existing collision service
        // Note: This will need to be updated to work with the new entity structure
        collisionService({
            bullets: gameState.entities.bullets,
            aliens: gameState.entities.aliens,
            player: this.player,
            items: gameState.entities.items,
            particleManager: null // TODO: Implement particle manager service
        });
    }

    /**
     * Handle player shooting
     * @param {number} currentTime - Current timestamp
     */
    handlePlayerShooting(currentTime) {
        if (!this.player.autoFire || !this.player.canShoot(currentTime)) {
            return;
        }
        
        this.player.recordShot(currentTime);
        
        // Emit shoot event
        this.eventBus.emit(GAME_EVENTS.PLAYER_SHOOT, {
            player: this.player,
            weaponPositions: this.player.getWeaponPositions(),
            bulletMode: this.player.bulletMode,
            powerLevel: this.player.getBulletPowerLevel()
        });
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (!this.running) return;
        
        this.paused = !this.paused;
        
        if (this.paused) {
            this.eventBus.emit(GAME_EVENTS.GAME_PAUSE);
        } else {
            this.eventBus.emit(GAME_EVENTS.GAME_RESUME);
            this.lastTimestamp = performance.now();
        }
    }

    /**
     * Handle mouse movement
     * @param {number} x - Mouse X coordinate
     * @param {number} y - Mouse Y coordinate
     */
    handleMouseMove(x, y) {
        if (!this.running || this.paused) return;
        
        this.player.setTarget(x, y);
        this.inputHandler.setMousePosition(x, y);
    }

    /**
     * Handle mouse click
     * @param {Event} e - Mouse event
     */
    handleMouseClick(e) {
        if (!this.running || this.paused) return;
        
        // Toggle auto-fire
        this.player.autoFire = !this.player.autoFire;
        console.log(`Auto-fire ${this.player.autoFire ? 'enabled' : 'disabled'}`);
    }

    /**
     * Handle keyboard input
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        switch(e.code) {
            case 'Escape':
                if (this.running) {
                    this.togglePause();
                }
                break;
                
            case 'Space':
                if (this.running && !this.paused) {
                    this.player.switchWeaponMode();
                }
                break;
                
            case 'Digit1':
                if (this.running && !this.paused) {
                    this.eventBus.emit(GAME_EVENTS.ABILITY_ACTIVATED, { ability: 'rocket' });
                }
                break;
                
            case 'Digit2':
                if (this.running && !this.paused) {
                    this.eventBus.emit(GAME_EVENTS.ABILITY_ACTIVATED, { ability: 'wingman' });
                }
                break;
                
            case 'Digit3':
                if (this.running && !this.paused) {
                    this.eventBus.emit(GAME_EVENTS.ABILITY_ACTIVATED, { ability: 'miniShip' });
                }
                break;
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        const scaleX = window.innerWidth / this.width;
        const scaleY = window.innerHeight / this.height;
        const scale = Math.min(scaleX, scaleY);
        
        this.canvas.style.width = (this.width * scale) + 'px';
        this.canvas.style.height = (this.height * scale) + 'px';
    }

    // Event handlers
    handleGameStart() {
        this.uiManager.showGameScreen();
    }

    handleGamePause() {
        this.uiManager.showPauseScreen(this.stateService.getUIState());
    }

    handleGameResume() {
        this.uiManager.showGameScreen();
    }

    handleGameOver() {
        this.running = false;
        this.uiManager.showGameOverScreen(this.stateService.getUIState());
    }

    handlePlayerShoot(data) {
        // Create bullets based on weapon mode and power level
        // This will be handled by the EntityService
        console.log("Player shot:", data);
    }

    handlePlayerDied() {
        this.player.resetAfterDeath();
    }

    handleUIUpdate(data) {
        this.uiManager.updateUI(data);
    }

    handleAbilityActivated(data) {
        this.abilityManager.activateAbility(data.ability);
    }

    // Legacy methods for compatibility
    isRunning() {
        return this.running;
    }

    isPaused() {
        return this.paused;
    }

    // Getters for external access
    get highScores() {
        return this.stateService.getState().highScores;
    }
}