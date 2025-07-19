// js/input.js

class InputHandler {
    constructor(canvas, game, player, abilityManager) {
        this.canvas = canvas;
        this.game = game;
        this.player = player;
        this.abilityManager = abilityManager;

        // Add mouse position tracking for aiming
        this.mouseX = 0;
        this.mouseY = 0;

        // Bind methods to ensure 'this' context is correct
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseClick = this.handleMouseClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleAbilityClick = this.handleAbilityClick.bind(this);

        this.setupListeners();
    }

    setupListeners() {
        // Mouse movement for player
        this.canvas.addEventListener('mousemove', this.handleMouseMove);

        // Mouse click for toggling autofire (or primary action)
        this.canvas.addEventListener('click', this.handleMouseClick);

        // Keyboard listeners
        document.addEventListener('keydown', this.handleKeyDown);

        // Ability Icon Clicks (using event delegation on the container)
        const abilitiesContainer = document.querySelector('.abilities-container');
        if (abilitiesContainer) {
            abilitiesContainer.addEventListener('click', this.handleAbilityClick);
        }
    }

    removeListeners() {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('click', this.handleMouseClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        const abilitiesContainer = document.querySelector('.abilities-container');
        if (abilitiesContainer) {
            abilitiesContainer.removeEventListener('click', this.handleAbilityClick);
        }
    }

    // --- Event Handlers ---

    handleMouseMove(event) {
        if (this.game.isRunning() && !this.game.isPaused()) {
            // Calculate mouse position relative to canvas (important if canvas has offset/styling)
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width; // Handle CSS scaling
            const scaleY = this.canvas.height / rect.height; // Add Y scaling factor

            // Use clientX/Y for position relative to viewport
            const mouseX = (event.clientX - rect.left) * scaleX;
            const mouseY = (event.clientY - rect.top) * scaleY;

            // Update both the player target and the stored mouse position
            this.player.targetX = mouseX;
            this.player.targetY = mouseY; // Add Y target position

            // Store mouse position for aiming crosshair
            this.mouseX = mouseX;
            this.mouseY = mouseY;
        }
    }

    handleMouseClick(event) {
        if (this.game.isRunning() && !this.game.isPaused()) {
            // Toggle autofire
            this.player.autoFire = !this.player.autoFire;
            // console.log("Autofire:", this.player.autoFire); // Optional debug
        }
        // Could potentially be used for firing if autofire is off
    }

    handleKeyDown(event) {
        if (!this.game.isRunning()) return; // Ignore if game not active

        // Pause Toggle
        if (event.code === 'Escape') {
            event.preventDefault();
            this.game.togglePause();
            return; // Don't process other keys if paused/resumed
        }

        // Ignore keys if paused
        if (this.game.isPaused()) return;

        // Abilities
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.game.togglePlayerBulletMode(); // Delegate to game logic
                break;
            case 'Digit1': // New keybinding for rocket
            case 'Numpad1':
                event.preventDefault();
                this.game.activateAbility('rocket');
                break;
            case 'Digit2': // New keybinding for wingman
            case 'Numpad2':
                event.preventDefault();
                this.game.activateAbility('wingman');
                break;
            case 'Digit3': // New keybinding for miniShip
            case 'Numpad3':
                event.preventDefault();
                this.game.activateAbility('miniShip');
                break;
            // Keep old keybindings as alternatives for now
            case 'KeyR':
                event.preventDefault();
                this.game.activateAbility('rocket');
                break;
            case 'KeyW':
                event.preventDefault();
                this.game.activateAbility('wingman');
                break;
            case 'KeyM':
                event.preventDefault();
                this.game.activateAbility('miniShip');
                break;
        }
    }

    handleAbilityClick(event) {
        if (!this.game.isRunning() || this.game.isPaused()) return;

        // Find the clicked ability element by traversing up from the target
        let clickedAbility = event.target.closest('.ability');
        if (clickedAbility && clickedAbility.id) {
            // Extract the ability key from the ID (e.g., "ability-rocket" -> "rocket")
            const key = clickedAbility.id.replace('ability-', '');
            if (key === 'bulletMode') {
                this.game.togglePlayerBulletMode();
            } else {
                this.game.activateAbility(key);
            }
        }
    }

    // Add getter method for the mouse position
    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }
}

// Export InputHandler for ES module imports
export { InputHandler };

