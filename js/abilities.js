// js/abilities.js

class AbilityManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.abilities = {};
        this.unlockThresholds = {}; // Store score needed to unlock
        this.unlockedAbilities = new Set(); // Track currently unlocked abilities (for this life)
        this.initializeAbilities();
    }

    initializeAbilities() {
        const config = GAME_CONFIG.abilities;
        const unlockConfig = GAME_CONFIG.unlockSystem;

        for (const key in config) {
            if (!GAME_CONFIG.abilities.hasOwnProperty(key)) continue; // Ensure it's an ability config

            this.abilities[key] = {
                key: key,
                cooldown: 0,
                maxCooldown: config[key].maxCooldown,
                duration: 0,
                maxDuration: config[key].duration,
                ready: false, // Start locked abilities as not ready
                active: false,
                element: document.getElementById(`ability-${key}`),
                timerElement: document.getElementById(`${key}Timer`),
            };
            // Store unlock threshold if it exists
            const unlockKey = `${key}UnlockScore`;
            if (unlockConfig[unlockKey]) {
                this.unlockThresholds[key] = unlockConfig[unlockKey];
            } else {
                 this.unlockedAbilities.add(key); // Assume unlocked if no threshold (like bulletMode)
                 this.abilities[key].ready = true; // Make ready if unlocked by default
            }
        }
        this.updateAllUI(); // Initial UI setup (shows locked state)
    }

    // NEW: Check unlock status based on current life score
    checkUnlocks(currentLifeScore) {
        let newlyUnlocked = false;
        for (const key in this.unlockThresholds) {
            if (!this.unlockedAbilities.has(key) && currentLifeScore >= this.unlockThresholds[key]) {
                this.unlockedAbilities.add(key);
                this.abilities[key].ready = true; // Becomes ready immediately upon unlock
                this.abilities[key].cooldown = 0; // Ensure cooldown is zeroed
                newlyUnlocked = true;
                 console.log(`Ability Unlocked: ${key}`);
                 // Optional: Add a visual/sound effect for unlock
            }
        }
        if (newlyUnlocked) {
            this.updateAllUI(); // Update UI to show unlocked state
        }
    }

    isUnlocked(key) {
        return this.unlockedAbilities.has(key);
    }

    isReady(key) {
        const ability = this.abilities[key];
        // Must be unlocked AND cooldown ready
        return ability && this.isUnlocked(key) && ability.ready;
    }

    isActive(key) {
        // Must be unlocked AND duration active
        const ability = this.abilities[key];
        return ability && this.isUnlocked(key) && ability.active;
    }

    activate(key) {
        const ability = this.abilities[key];
        // Check if ready (which includes unlocked check)
        if (!ability || !this.isReady(key)) return false;

        if (key === 'bulletMode') {
            this.triggerVisualFeedback(key);
            return true; // Bullet mode doesn't have cooldown/duration here
        }

        ability.ready = false;
        ability.cooldown = ability.maxCooldown;

        if (ability.maxDuration > 0) {
            ability.active = true;
            ability.duration = ability.maxDuration;
            if (ability.timerElement) {
                this.uiManager.updateDurationTimer(ability.timerElement, ability.duration, true);
            }
        }

        this.triggerVisualFeedback(key);
        this.updateAbilityUI(key);

        return true;
    }

    update(deltaTime) {
        let uiNeedsUpdate = false;
        for (const key in this.abilities) {
            const ability = this.abilities[key];

            // Don't update cooldown/duration if not unlocked (unless it's bullet mode)
            if (!this.isUnlocked(key) && key !== 'bulletMode') continue;

            if (!ability.ready) {
                ability.cooldown -= deltaTime;
                if (ability.cooldown <= 0) {
                    ability.cooldown = 0;
                    ability.ready = true;
                    if (this.isUnlocked(key)) { // Only flash if unlocked
                       this.uiManager.triggerAbilityReadyFlash(ability.element);
                    }
                }
                uiNeedsUpdate = true;
            }

            if (ability.active) {
                ability.duration -= deltaTime;
                if (ability.timerElement) {
                   this.uiManager.updateDurationTimer(ability.timerElement, ability.duration);
                }
                if (ability.duration <= 0) {
                    ability.duration = 0;
                    ability.active = false;
                     if (ability.timerElement) {
                        this.uiManager.updateDurationTimer(ability.timerElement, 0, false);
                     }
                    uiNeedsUpdate = true;
                }
            }
        }

        if (uiNeedsUpdate) {
            this.updateAllUI();
        }
    }

    triggerVisualFeedback(key) {
        const ability = this.abilities[key];
        if (ability && ability.element && this.isUnlocked(key)) { // Only feedback if unlocked
            this.uiManager.triggerAbilityFeedback(ability.element);
        }
        if (key === 'bulletMode') {
             this.uiManager.updateBulletModeIcon( /* need current mode */ );
        }
    }

     updateBulletModeVisuals(mode) {
        const ability = this.abilities['bulletMode'];
        if (ability && ability.element) {
           this.uiManager.updateBulletModeIcon(ability.element, mode);
        }
    }

    updateAbilityUI(key) {
        const ability = this.abilities[key];
        if (!ability || !ability.element) return;

        const isLocked = !this.isUnlocked(key);
        this.uiManager.updateAbilityLockState(ability.element, isLocked);

        if (!isLocked) {
            const cooldownPercent = ability.maxCooldown > 0 ? (ability.cooldown / ability.maxCooldown) : 0;
            this.uiManager.updateAbilityCooldownVisual(ability.element, cooldownPercent, !ability.ready);
            this.uiManager.updateAbilityActiveState(ability.element, ability.active);
        } else {
             // Ensure locked state visuals override others
             this.uiManager.updateAbilityCooldownVisual(ability.element, 0, false); // Hide cooldown overlay
             this.uiManager.updateAbilityActiveState(ability.element, false); // Hide active state
        }
    }

    updateAllUI() {
        for (const key in this.abilities) {
            this.updateAbilityUI(key);
        }
        // Ensure bullet mode visual is correct initially/on reset
        this.updateBulletModeVisuals('spread');
    }

    // Reset unlocks when player dies
    resetUnlocksOnDeath() {
        this.unlockedAbilities.clear();
        // Add back abilities that are unlocked by default (like bulletMode)
        for (const key in this.abilities) {
            if (!this.unlockThresholds[key]) {
                 this.unlockedAbilities.add(key);
                 this.abilities[key].ready = true; // Ensure default unlocked are ready
                 this.abilities[key].cooldown = 0;
                 this.abilities[key].active = false;
            } else {
                // Explicitly mark others as not ready if locked again
                 this.abilities[key].ready = false;
                 this.abilities[key].cooldown = 0; // Reset cooldown even if locked
                 this.abilities[key].active = false;
                 this.abilities[key].duration = 0;
            }
        }
        this.updateAllUI(); // Update visuals to locked state
    }

    // Full reset for new game
    reset() {
         this.resetUnlocksOnDeath(); // Start by resetting unlocks
         // Ensure all timers/cooldowns are zeroed
         for (const key in this.abilities) {
             const ability = this.abilities[key];
             ability.cooldown = 0;
             ability.duration = 0;
             ability.active = false;
             if (ability.timerElement) {
                 this.uiManager.updateDurationTimer(ability.timerElement, 0, false);
             }
             // Readiness is handled by resetUnlocksOnDeath
         }
         this.updateAllUI();
    }
}


